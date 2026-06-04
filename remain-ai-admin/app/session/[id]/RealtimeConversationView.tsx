'use client';

/**
 * Realtime 모드 — OpenAI gpt-realtime과 WebRTC peer connection을 직접 맺어 wav-to-wav 대화.
 *
 * 흐름:
 *  1) 시작 버튼 탭 → 마이크 권한 → Claude로 인사 텍스트 fetch + ephemeral token fetch (병렬)
 *  2) RTCPeerConnection 생성 → mic track add → DataChannel("oai-events") open
 *  3) SDP offer/answer 교환 (OpenAI Realtime endpoint)
 *  4) DataChannel open 직후 첫 response.create로 Claude 인사 텍스트 낭독 지시
 *  5) 이후 server VAD가 자동으로 어르신 발화 끝점 감지 → Realtime이 즉시 응답 → 오디오 트랙 재생
 *  6) 어르신/AI transcript는 별도 REST(/api/conversation/turn)로 DB 저장
 *  7) AI 응답 끝날 때마다 백그라운드 Claude 코치(/api/conversation/coach) 호출 → instructions 갱신
 *  8) function call(tool)은 /api/conversation/tool로 위임 후 function_call_output을 다시 송신
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import Orb from '@/components/Orb';

type UIState =
  | 'init'
  | 'connecting'
  | 'greeting'
  | 'idle'
  | 'listening'
  | 'thinking'
  | 'speaking'
  | 'error'
  | 'ended';

interface Turn { role: 'ai' | 'elderly'; text: string }

const REALTIME_BASE_URL = 'https://api.openai.com/v1/realtime';

export default function RealtimeConversationView({
  sessionId,
  memberName,
}: {
  sessionId: string;
  memberName: string;
}) {
  const [uiState, setUiState] = useState<UIState>('init');
  const [lastTurn, setLastTurn] = useState<Turn | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const dcRef = useRef<RTCDataChannel | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const audioElRef = useRef<HTMLAudioElement | null>(null);
  const startedRef = useRef(false);
  const greetingSpokenRef = useRef(false);
  // 현재 AI 응답의 transcript 누적 (delta 이벤트들)
  const aiBufferRef = useRef('');
  // 다음 AI 응답이 wrapup 단계인지 (turn 저장 응답에서 받아 다음 response 전에 instructions에 반영)
  const pendingWrapupRef = useRef<string | null>(null);

  // ─────────────────────────────────────────────
  // 이벤트 송신 헬퍼
  // ─────────────────────────────────────────────
  const sendEvent = useCallback((evt: Record<string, unknown>) => {
    const dc = dcRef.current;
    if (!dc || dc.readyState !== 'open') return;
    dc.send(JSON.stringify(evt));
  }, []);

  // session.update로 instructions 갱신
  const updateInstructions = useCallback((instructions: string) => {
    sendEvent({ type: 'session.update', session: { instructions } });
  }, [sendEvent]);

  // ─────────────────────────────────────────────
  // 백엔드 호출 헬퍼
  // ─────────────────────────────────────────────
  const saveTurn = useCallback(
    async (role: 'ai' | 'elderly', text: string) => {
      try {
        const res = await fetch('/admin/api/conversation/turn', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId, role, text }),
        });
        if (!res.ok) return null;
        return (await res.json()) as {
          ended?: boolean;
          wrapupMode?: boolean;
          wrapupSuffix?: string;
        };
      } catch (e) {
        console.error('[realtime] saveTurn 실패', e);
        return null;
      }
    },
    [sessionId],
  );

  const runCoach = useCallback(async () => {
    try {
      const res = await fetch('/admin/api/conversation/coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      });
      if (!res.ok) return;
      const data = (await res.json()) as { instructions?: string };
      if (data.instructions) {
        // wrapup 가이드가 pending이면 함께 합쳐서 주입
        const pend = pendingWrapupRef.current;
        const merged = pend ? `${data.instructions}\n\n${pend}` : data.instructions;
        updateInstructions(merged);
      }
    } catch (e) {
      console.error('[realtime] coach 실패', e);
    }
  }, [sessionId, updateInstructions]);

  const callTool = useCallback(
    async (name: string, args: Record<string, unknown>): Promise<{ output: string; ended?: boolean; wrapupMode?: boolean }> => {
      try {
        const res = await fetch('/admin/api/conversation/tool', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId, name, arguments: args }),
        });
        if (!res.ok) return { output: '도구 실행 실패' };
        return (await res.json()) as { output: string; ended?: boolean; wrapupMode?: boolean };
      } catch (e) {
        console.error('[realtime] tool 실패', e);
        return { output: '도구 실행 실패' };
      }
    },
    [sessionId],
  );

  // ─────────────────────────────────────────────
  // 세션 종료 (사용자/탭 닫힘)
  // ─────────────────────────────────────────────
  const cleanup = useCallback(() => {
    try { dcRef.current?.close(); } catch {}
    dcRef.current = null;
    try { pcRef.current?.close(); } catch {}
    pcRef.current = null;
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;
    if (audioElRef.current) {
      audioElRef.current.pause();
      audioElRef.current.srcObject = null;
    }
  }, []);

  const endSession = useCallback(
    async (opts?: { confirm?: boolean }) => {
      if (opts?.confirm && !confirm('대화를 마치시겠어요?')) return;
      cleanup();
      setUiState('ended');
      try {
        await fetch('/admin/api/conversation/end', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId }),
          keepalive: true,
        });
      } catch {
        // best-effort
      }
    },
    [cleanup, sessionId],
  );

  // ─────────────────────────────────────────────
  // 이벤트 dispatcher
  // ─────────────────────────────────────────────
  const handleRealtimeEvent = useCallback(
    async (evt: { type?: string } & Record<string, unknown>) => {
      switch (evt.type) {
        case 'input_audio_buffer.speech_started':
          setUiState('listening');
          break;
        case 'input_audio_buffer.speech_stopped':
          setUiState('thinking');
          break;
        case 'response.created':
          setUiState('thinking');
          aiBufferRef.current = '';
          break;
        case 'response.audio_transcript.delta': {
          const delta = (evt as { delta?: string }).delta ?? '';
          if (delta) {
            aiBufferRef.current += delta;
            setLastTurn({ role: 'ai', text: aiBufferRef.current });
            setUiState('speaking');
          }
          break;
        }
        case 'response.audio_transcript.done': {
          const text = (evt as { transcript?: string }).transcript || aiBufferRef.current;
          aiBufferRef.current = '';
          if (!greetingSpokenRef.current) {
            // 첫 응답 = Claude가 준 인사를 낭독 — 이미 서버가 turn 0에 저장해뒀으므로 스킵.
            greetingSpokenRef.current = true;
            setUiState('idle');
            break;
          }
          if (text.trim()) {
            const result = await saveTurn('ai', text.trim());
            if (result?.ended) {
              await endSession();
              return;
            }
            if (result?.wrapupMode && result.wrapupSuffix) {
              // 다음 어르신 발화 처리되기 전에 코치 결과와 함께 instructions 주입.
              pendingWrapupRef.current = result.wrapupSuffix;
            }
            // 백그라운드 코치 — 다음 어르신 발화 처리 전까지 끝나면 적용
            runCoach();
          }
          setUiState('idle');
          break;
        }
        case 'conversation.item.input_audio_transcription.completed': {
          const text = (evt as { transcript?: string }).transcript ?? '';
          if (text.trim().length >= 1) {
            setLastTurn({ role: 'elderly', text: text.trim() });
            saveTurn('elderly', text.trim());
          }
          break;
        }
        case 'response.function_call_arguments.done': {
          const name = (evt as { name?: string }).name ?? '';
          const callId = (evt as { call_id?: string }).call_id ?? '';
          const rawArgs = (evt as { arguments?: string }).arguments ?? '{}';
          let args: Record<string, unknown> = {};
          try { args = JSON.parse(rawArgs); } catch {}
          const result = await callTool(name, args);
          // function_call_output 송신
          sendEvent({
            type: 'conversation.item.create',
            item: {
              type: 'function_call_output',
              call_id: callId,
              output: JSON.stringify({ result: result.output }),
            },
          });
          // 후속 응답 트리거
          sendEvent({ type: 'response.create' });
          if (result.ended) {
            // tool이 end_session을 호출한 경우 — 마지막 응답 끝나면 자연 종료. 안전상 cleanup 예약.
            setTimeout(() => endSession(), 5000);
          }
          break;
        }
        case 'error':
          console.error('[realtime] OpenAI error', evt);
          setErrorMessage(String((evt as { error?: { message?: string } }).error?.message ?? '실시간 오류'));
          setUiState('error');
          break;
      }
    },
    [callTool, endSession, runCoach, saveTurn, sendEvent],
  );

  // ─────────────────────────────────────────────
  // 시작 — 마이크/세션/peer connection
  // ─────────────────────────────────────────────
  const handleStart = useCallback(async () => {
    if (startedRef.current) return;
    startedRef.current = true;
    setErrorMessage(null);
    setUiState('connecting');

    try {
      // 1. 마이크 + 백엔드 호출 병렬
      const [stream, sessionRes, greetingRes] = await Promise.all([
        navigator.mediaDevices.getUserMedia({ audio: true }),
        fetch('/admin/api/realtime/session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId }),
        }),
        fetch('/admin/api/realtime/greeting', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId }),
        }),
      ]);
      localStreamRef.current = stream;

      if (!sessionRes.ok) {
        const d = await sessionRes.json().catch(() => ({}));
        throw new Error((d as { error?: string }).error ?? `세션 발급 실패 ${sessionRes.status}`);
      }
      if (!greetingRes.ok) {
        const d = await greetingRes.json().catch(() => ({}));
        throw new Error((d as { error?: string }).error ?? `인사 생성 실패 ${greetingRes.status}`);
      }
      const sess = (await sessionRes.json()) as { clientSecret: string; model: string };
      const greet = (await greetingRes.json()) as { text: string };

      // 2. peer connection
      const pc = new RTCPeerConnection();
      pcRef.current = pc;

      // 원격 오디오 트랙 → <audio> 자동 재생
      pc.ontrack = (e) => {
        if (audioElRef.current && e.streams[0]) {
          audioElRef.current.srcObject = e.streams[0];
        }
      };

      // 마이크 track add
      stream.getTracks().forEach((t) => pc.addTrack(t, stream));

      // 이벤트 채널
      const dc = pc.createDataChannel('oai-events');
      dcRef.current = dc;
      dc.onmessage = (e) => {
        try {
          const evt = JSON.parse(e.data);
          void handleRealtimeEvent(evt);
        } catch {}
      };
      dc.onopen = () => {
        setUiState('greeting');
        // 인사: 다음 response에 정확히 이 문장을 낭독하도록 instructions를 한 번만 덮어쓰고
        // response.create 후 곧바로 base 톤 instructions(서버가 이미 세션 만들 때 주입한 것)이 다음 턴부터 적용.
        sendEvent({
          type: 'response.create',
          response: {
            modalities: ['audio', 'text'],
            instructions: `다음 문장을 어르신께 그대로, 따뜻하고 차분한 톤으로 들려주세요. 다른 말 덧붙이지 마세요.\n\n"${greet.text}"`,
          },
        });
      };

      // 3. SDP offer → OpenAI → answer
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      const sdpRes = await fetch(`${REALTIME_BASE_URL}?model=${encodeURIComponent(sess.model)}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${sess.clientSecret}`,
          'Content-Type': 'application/sdp',
          'OpenAI-Beta': 'realtime=v1',
        },
        body: offer.sdp,
      });
      if (!sdpRes.ok) {
        const t = await sdpRes.text().catch(() => '');
        throw new Error(`SDP 교환 실패 (${sdpRes.status}): ${t.slice(0, 200)}`);
      }
      const answerSdp = await sdpRes.text();
      await pc.setRemoteDescription({ type: 'answer', sdp: answerSdp });
      // dc.onopen이 트리거되면 그때 인사 response.create.
    } catch (e) {
      console.error('[realtime] start 실패', e);
      setErrorMessage(e instanceof Error ? e.message : String(e));
      setUiState('error');
      cleanup();
      startedRef.current = false;
    }
  }, [cleanup, handleRealtimeEvent, sendEvent, sessionId]);

  // ─────────────────────────────────────────────
  // 탭 닫힘 best-effort
  // ─────────────────────────────────────────────
  useEffect(() => {
    const handler = () => {
      const payload = JSON.stringify({ sessionId });
      const blob = new Blob([payload], { type: 'application/json' });
      navigator.sendBeacon('/admin/api/conversation/end', blob);
    };
    window.addEventListener('beforeunload', handler);
    window.addEventListener('pagehide', handler);
    return () => {
      window.removeEventListener('beforeunload', handler);
      window.removeEventListener('pagehide', handler);
    };
  }, [sessionId]);

  // 언마운트 정리
  useEffect(() => {
    return () => cleanup();
  }, [cleanup]);

  // ─────────────────────────────────────────────
  // UI 텍스트
  // ─────────────────────────────────────────────
  const mainText =
    uiState === 'init'
      ? `${memberName}님, 반가워요`
      : uiState === 'connecting'
      ? '연결을 준비하고 있어요'
      : uiState === 'greeting'
      ? '인사를 준비하고 있어요'
      : uiState === 'idle'
      ? lastTurn && lastTurn.role === 'ai'
        ? lastTurn.text
        : '편하게 말씀해 주세요'
      : uiState === 'listening'
      ? '듣고 있어요'
      : uiState === 'thinking'
      ? '대답을 준비하고 있어요'
      : uiState === 'speaking'
      ? lastTurn?.text ?? ''
      : uiState === 'ended'
      ? '오늘 이야기 들려주셔서 감사해요'
      : '잠시 문제가 있었어요';

  const hintText =
    uiState === 'init'
      ? '아래 원을 한 번 눌러 시작하세요'
      : uiState === 'idle'
      ? '말씀하시면 자동으로 인식돼요'
      : uiState === 'ended'
      ? '대화가 마무리되었어요. 창을 닫으셔도 돼요.'
      : uiState === 'error'
      ? errorMessage ?? ''
      : '';

  const orbState: 'idle' | 'listening' | 'speaking' | 'thinking' =
    uiState === 'listening' ? 'listening'
      : uiState === 'thinking' || uiState === 'greeting' || uiState === 'connecting' ? 'thinking'
      : uiState === 'speaking' ? 'speaking'
      : 'idle';

  const orbInteractive = uiState === 'init';

  return (
    <div className="relative min-h-screen w-full bg-white overflow-hidden">
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-white via-white to-slate-50/40" aria-hidden />

      <div className="absolute top-0 right-0 pt-safe">
        <div className="px-5 pt-5">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-50 ring-1 ring-slate-100 text-[10px] font-mono text-slate-400">
            <span className={`inline-block w-1.5 h-1.5 rounded-full ${uiState === 'error' ? 'bg-red-500' : 'bg-emerald-500'}`} />
            {sessionId.slice(0, 8)} · realtime
          </span>
        </div>
      </div>

      <main className="relative flex flex-col items-center justify-center min-h-svh px-6 pt-safe pb-32">
        <div className="h-6 mb-8" />

        {orbInteractive ? (
          <button
            onClick={() => void handleStart()}
            aria-label="대화 시작하기"
            className="rounded-full transition-transform duration-200 active:scale-95 hover:scale-[1.02] cursor-pointer"
          >
            <Orb size="lg" state={orbState} />
          </button>
        ) : (
          <Orb size="lg" state={orbState} />
        )}

        {/* 원격 오디오 트랙 재생 — 화면에 안 보임 */}
        <audio ref={audioElRef} autoPlay playsInline className="hidden" />

        <div className="mt-12 sm:mt-14 text-center max-w-md mx-auto px-2">
          <p
            key={mainText}
            className="text-[22px] sm:text-[26px] font-medium text-slate-800 leading-[1.45] tracking-tight whitespace-pre-line animate-fade-in-up"
          >
            {mainText}
          </p>
          {hintText && (
            <p key={`hint-${hintText}`} className="mt-3 text-sm text-slate-400 animate-fade-in">
              {hintText}
            </p>
          )}
        </div>

        {uiState === 'error' && (
          <button
            onClick={() => {
              setErrorMessage(null);
              startedRef.current = false;
              setUiState('init');
            }}
            className="mt-6 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-[13px] font-semibold text-slate-700 transition"
          >
            다시 시도
          </button>
        )}
      </main>

      <div className="absolute bottom-0 inset-x-0 pb-safe">
        <div className="px-6 pb-6 flex flex-col items-center gap-3">
          {uiState !== 'init' && uiState !== 'ended' && uiState !== 'error' && (
            <button
              onClick={() => void endSession({ confirm: true })}
              className="px-4 py-2 rounded-full bg-slate-50 ring-1 ring-slate-200 text-[12px] font-medium text-slate-500 hover:bg-slate-100 active:scale-[0.99] transition"
            >
              대화 마치기
            </button>
          )}
          <p className="text-[11px] text-slate-300 tracking-wide">remAIn · 실시간 음성</p>
        </div>
      </div>
    </div>
  );
}
