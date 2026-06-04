'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Orb from '@/components/Orb';

type UIState = 'init' | 'greeting' | 'idle' | 'listening' | 'thinking' | 'speaking' | 'error' | 'ended';
type SessionMode = 'voice' | 'stenographer';

interface Turn {
  role: 'ai' | 'elderly';
  text: string;
}

// VAD 파라미터 — 어르신 발화 특성 반영 (말 사이 긴 호흡 허용)
const VAD_SILENCE_THRESHOLD = 0.012; // RMS 정규화값
const VAD_SILENCE_DURATION_MS = 1200; // 말 끝난 뒤 전송까지 무음 대기 (체감 지연 핵심)
const MIN_RECORDING_MS = 800; // 너무 짧으면 무시
const MAX_RECORDING_MS = 60_000; // 1분 자동 종료
// 녹음 중 관찰된 최대 RMS가 이 값 미만이면 실질적으로 무음 — 업로드 스킵 (Whisper 환각 방지)
const MIN_PEAK_RMS_FOR_SPEECH = 0.025;

export default function ConversationView({
  sessionId,
  memberName,
  mode = 'voice',
}: {
  sessionId: string;
  memberName: string;
  mode?: SessionMode;
}) {
  const isSteno = mode === 'stenographer';

  const [uiState, setUiState] = useState<UIState>('init');
  const [lastTurn, setLastTurn] = useState<Turn | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [hasMicPermission, setHasMicPermission] = useState<boolean | null>(null);
  // 속기사 모드 — 진행자가 회원 발화를 타이핑
  const [input, setInput] = useState('');

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const vadRafRef = useRef<number | null>(null);
  const silenceStartRef = useRef<number | null>(null);
  const recordingStartRef = useRef<number>(0);
  const peakRmsRef = useRef<number>(0);
  const greetingFetchedRef = useRef(false);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  // 스트리밍 오디오 재생 중단 플래그 (탭 중단·세션 종료 시)
  const playbackCancelRef = useRef(false);
  // 다른 useCallback 안에서 startRecording을 호출할 때 사용 — useCallback 순환 의존 회피용.
  const startRecordingRef = useRef<() => void>(() => {});
  const autoListenTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scheduleAutoListen = useCallback(() => {
    if (autoListenTimerRef.current) clearTimeout(autoListenTimerRef.current);
    autoListenTimerRef.current = setTimeout(() => {
      startRecordingRef.current();
    }, 250);
  }, []);

  // ─────────────────────────────────────────────
  //  AI 응답 재생이 끝난 뒤 다음 청취 단계로 진입
  //  음성: 자동 녹음 / 속기사: 타이핑 입력 대기
  // ─────────────────────────────────────────────
  const enterListening = useCallback(() => {
    if (isSteno) {
      setUiState('listening');
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setUiState('idle');
      scheduleAutoListen();
    }
  }, [isSteno, scheduleAutoListen]);

  // ─────────────────────────────────────────────
  //  base64 → Audio 엘리먼트
  // ─────────────────────────────────────────────
  const buildAudio = useCallback((base64: string, mime: string): HTMLAudioElement => {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const blob = new Blob([bytes], { type: mime });
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    audio.addEventListener('ended', () => URL.revokeObjectURL(url), { once: true });
    return audio;
  }, []);

  // ─────────────────────────────────────────────
  //  SSE 스트림 소비 — 문장 단위 오디오 청크를 순차 재생.
  //  첫 청크가 도착하면 즉시 재생 시작 (전체 응답 완료를 기다리지 않음).
  // ─────────────────────────────────────────────
  const consumeStream = useCallback(
    async (res: Response): Promise<{ aiText: string; ended: boolean; skipped: boolean }> => {
      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buf = '';
      let aiText = '';
      let ended = false;
      let skipped = false;
      let displayText = '';
      let speakingShown = false;

      const queue: { b64: string; mime: string }[] = [];
      let playing = false;
      let streamEnded = false;
      let resolvePlayback!: () => void;
      const playbackDone = new Promise<void>((r) => {
        resolvePlayback = r;
      });

      const playNext = () => {
        if (playing) return;
        if (playbackCancelRef.current) {
          resolvePlayback();
          return;
        }
        const item = queue.shift();
        if (!item) {
          if (streamEnded) resolvePlayback();
          return;
        }
        playing = true;
        if (!speakingShown) {
          speakingShown = true;
          setUiState('speaking');
        }
        const audio = buildAudio(item.b64, item.mime);
        audioRef.current = audio;
        const cont = () => {
          playing = false;
          playNext();
        };
        audio.onended = cont;
        audio.onerror = cont;
        audio.play().catch(cont);
      };

      try {
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += decoder.decode(value, { stream: true });
          let idx: number;
          while ((idx = buf.indexOf('\n\n')) !== -1) {
            const rawEvt = buf.slice(0, idx);
            buf = buf.slice(idx + 2);
            const dataLine = rawEvt.split('\n').find((l) => l.startsWith('data:'));
            if (!dataLine) continue;
            let evt: {
              type?: string;
              text?: string;
              ai_text?: string;
              ended?: boolean;
              error?: string;
              audio_base64?: string;
              audio_mime?: string;
            };
            try {
              evt = JSON.parse(dataLine.slice(dataLine.indexOf(':') + 1).trim());
            } catch {
              continue;
            }
            if (evt.type === 'audio' && evt.audio_base64) {
              displayText += (displayText ? ' ' : '') + (evt.text ?? '');
              setLastTurn({ role: 'ai', text: displayText });
              queue.push({ b64: evt.audio_base64, mime: evt.audio_mime ?? 'audio/mpeg' });
              playNext();
            } else if (evt.type === 'done') {
              aiText = evt.ai_text || displayText;
              ended = Boolean(evt.ended);
            } else if (evt.type === 'skipped') {
              skipped = true;
            } else if (evt.type === 'error') {
              throw new Error(evt.error || '스트림 오류');
            }
            // meta/transcript 등은 무시
          }
        }
      } finally {
        streamEnded = true;
        if (!playing && queue.length === 0) resolvePlayback();
      }
      await playbackDone;
      return { aiText, ended, skipped };
    },
    [buildAudio],
  );

  // 세션 종료(캡 도달) 처리 — UI 종료 + 백엔드 마무리(추출) 신호
  const finishEnded = useCallback(() => {
    setUiState('ended');
    fetch('/admin/api/conversation/end', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId }),
      keepalive: true,
    }).catch(() => {});
  }, [sessionId]);

  // ─────────────────────────────────────────────
  //  AI 인사 fetch + 재생
  // ─────────────────────────────────────────────
  const playGreeting = useCallback(async () => {
    setUiState('greeting');
    playbackCancelRef.current = false;
    try {
      const res = await fetch('/admin/api/conversation/greeting', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      });
      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error ?? `HTTP ${res.status}`);
      }
      await consumeStream(res);
      enterListening();
    } catch (e) {
      setErrorMessage(e instanceof Error ? e.message : String(e));
      setUiState('error');
    }
  }, [sessionId, consumeStream, enterListening]);

  // ─────────────────────────────────────────────
  //  첫 진입 — (음성) 마이크 권한 요청 후 greeting / (속기사) 바로 greeting
  // ─────────────────────────────────────────────
  const startSession = useCallback(async () => {
    if (greetingFetchedRef.current) return;
    greetingFetchedRef.current = true;
    if (!isSteno) {
      try {
        // 마이크 권한 사전 요청 (브라우저는 사용자 제스처 안에서 요청해야 안정적)
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        // 스트림은 일단 닫고 — 녹음 시작할 때 다시 받음
        stream.getTracks().forEach((t) => t.stop());
        setHasMicPermission(true);
      } catch {
        setHasMicPermission(false);
        setErrorMessage('마이크 권한이 필요합니다.');
        setUiState('error');
        greetingFetchedRef.current = false;
        return;
      }
    }
    await playGreeting();
  }, [isSteno, playGreeting]);

  // ─────────────────────────────────────────────
  //  녹음 종료 (수동/자동 공통)
  // ─────────────────────────────────────────────
  const stopRecording = useCallback(() => {
    if (vadRafRef.current !== null) {
      cancelAnimationFrame(vadRafRef.current);
      vadRafRef.current = null;
    }
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== 'inactive') {
      recorder.stop();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
      analyserRef.current = null;
    }
  }, []);

  // ─────────────────────────────────────────────
  //  업로드 + 응답 재생 (음성)
  // ─────────────────────────────────────────────
  const processAudio = useCallback(async (audioBlob: Blob) => {
    setUiState('thinking');
    playbackCancelRef.current = false;
    try {
      const formData = new FormData();
      // Whisper가 받는 확장자/타입 — webm/opus 그대로 OK
      formData.append('audio', audioBlob, 'recording.webm');
      formData.append('sessionId', sessionId);

      const res = await fetch('/admin/api/conversation/voice', {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error ?? `HTTP ${res.status}`);
      }

      // 캡 도달 등 — 스트림이 아니라 JSON 응답
      const ctype = res.headers.get('content-type') ?? '';
      if (ctype.includes('application/json')) {
        const data = await res.json();
        if (data.ended) finishEnded();
        else enterListening();
        return;
      }

      const { ended, skipped } = await consumeStream(res);
      if (skipped) enterListening();
      else if (ended) finishEnded();
      else enterListening();
    } catch (e) {
      setErrorMessage(e instanceof Error ? e.message : String(e));
      setUiState('error');
    }
  }, [sessionId, consumeStream, enterListening, finishEnded]);

  // ─────────────────────────────────────────────
  //  녹음 시작 + VAD (음성)
  // ─────────────────────────────────────────────
  const startRecording = useCallback(async () => {
    setErrorMessage(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      audioChunksRef.current = [];

      // 음성 STT용 — 24kbps opus면 한국어 음성 인식에 충분, 업로드 시간/4G 대역 절약.
      const recorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus',
        audioBitsPerSecond: 24_000,
      });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) audioChunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const recordedMs = Date.now() - recordingStartRef.current;
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        audioChunksRef.current = [];
        if (recordedMs < MIN_RECORDING_MS) {
          enterListening();
          return;
        }
        // 녹음 동안 한 번도 충분한 볼륨이 안 잡혔다면 발화 없음 — 업로드 스킵
        if (peakRmsRef.current < MIN_PEAK_RMS_FOR_SPEECH) {
          enterListening();
          return;
        }
        void processAudio(blob);
      };

      recorder.start();
      recordingStartRef.current = Date.now();
      peakRmsRef.current = 0;
      setUiState('listening');

      // VAD 셋업 (자동 무음 감지)
      const audioCtx = new AudioContext();
      audioContextRef.current = audioCtx;
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 2048;
      source.connect(analyser);
      analyserRef.current = analyser;

      const buffer = new Float32Array(analyser.fftSize);
      silenceStartRef.current = null;

      const tick = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getFloatTimeDomainData(buffer);
        let sumSquares = 0;
        for (let i = 0; i < buffer.length; i++) sumSquares += buffer[i] * buffer[i];
        const rms = Math.sqrt(sumSquares / buffer.length);
        if (rms > peakRmsRef.current) peakRmsRef.current = rms;

        const elapsed = Date.now() - recordingStartRef.current;
        if (elapsed > MAX_RECORDING_MS) {
          stopRecording();
          return;
        }

        if (rms < VAD_SILENCE_THRESHOLD) {
          if (silenceStartRef.current === null) silenceStartRef.current = Date.now();
          else if (Date.now() - silenceStartRef.current > VAD_SILENCE_DURATION_MS && elapsed > MIN_RECORDING_MS + 500) {
            stopRecording();
            return;
          }
        } else {
          silenceStartRef.current = null;
        }
        vadRafRef.current = requestAnimationFrame(tick);
      };
      vadRafRef.current = requestAnimationFrame(tick);
    } catch (e) {
      setErrorMessage(e instanceof Error ? e.message : String(e));
      setUiState('error');
    }
  }, [processAudio, stopRecording, enterListening]);

  // ─────────────────────────────────────────────
  //  타이핑 전송 + 응답 재생 (속기사)
  // ─────────────────────────────────────────────
  const submitText = useCallback(async () => {
    const text = input.trim();
    if (!text || uiState !== 'listening') return;
    setInput('');
    setUiState('thinking');
    playbackCancelRef.current = false;
    try {
      const res = await fetch('/admin/api/conversation/text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, text }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error ?? `HTTP ${res.status}`);
      }

      const ctype = res.headers.get('content-type') ?? '';
      if (ctype.includes('application/json')) {
        const data = await res.json();
        if (data.ended) finishEnded();
        else enterListening();
        return;
      }

      const { ended } = await consumeStream(res);
      if (ended) finishEnded();
      else enterListening();
    } catch (e) {
      setErrorMessage(e instanceof Error ? e.message : String(e));
      setUiState('error');
    }
  }, [input, uiState, sessionId, consumeStream, enterListening, finishEnded]);

  const handleInputKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Enter = 전송, Shift+Enter = 줄바꿈
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void submitText();
    }
  };

  // ─────────────────────────────────────────────
  //  오브 탭 — 상태별 동작
  // ─────────────────────────────────────────────
  const handleTapOrb = useCallback(() => {
    if (uiState === 'init') {
      void startSession();
    } else if (isSteno) {
      // 속기사 모드: 청취 단계 입력은 타이핑이므로 오브 탭은 init에서만 동작
      if (uiState === 'speaking') {
        playbackCancelRef.current = true;
        audioRef.current?.pause();
        enterListening();
      }
      return;
    } else if (uiState === 'idle') {
      void startRecording();
    } else if (uiState === 'listening') {
      stopRecording();
    } else if (uiState === 'speaking') {
      // 재생 중단 → idle 복귀
      playbackCancelRef.current = true;
      audioRef.current?.pause();
      setUiState('idle');
    }
    // thinking·greeting·error 상태에선 탭 무시
  }, [uiState, isSteno, startSession, startRecording, stopRecording, enterListening]);

  // startRecording이 정의된 후 ref 동기화 — scheduleAutoListen에서 호출용
  useEffect(() => {
    startRecordingRef.current = () => {
      void startRecording();
    };
  }, [startRecording]);

  // ─────────────────────────────────────────────
  //  세션 종료
  // ─────────────────────────────────────────────
  const endSession = useCallback(async (opts?: { confirm?: boolean }) => {
    if (opts?.confirm && !confirm('대화를 마치시겠어요?')) return;
    if (autoListenTimerRef.current) clearTimeout(autoListenTimerRef.current);
    playbackCancelRef.current = true;
    stopRecording();
    audioRef.current?.pause();
    setUiState('ended');
    try {
      await fetch('/admin/api/conversation/end', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
        keepalive: true,
      });
    } catch {
      // best-effort — UI는 이미 ended 상태
    }
  }, [sessionId, stopRecording]);

  // 탭/창 닫힘 시 best-effort로 종료 신호 전송 (sendBeacon은 동기적·신뢰성↑)
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

  // 언마운트 시 정리
  useEffect(() => {
    return () => {
      if (autoListenTimerRef.current) clearTimeout(autoListenTimerRef.current);
      playbackCancelRef.current = true;
      stopRecording();
      audioRef.current?.pause();
    };
  }, [stopRecording]);

  // ─────────────────────────────────────────────
  //  UI 텍스트
  // ─────────────────────────────────────────────
  const mainText =
    uiState === 'init'
      ? `${memberName}님, 반가워요`
      : uiState === 'greeting'
      ? '인사를 준비하고 있어요'
      : uiState === 'idle'
      ? lastTurn && lastTurn.role === 'ai'
        ? lastTurn.text
        : '말씀하실 준비가 되시면\n원을 가볍게 눌러 주세요'
      : uiState === 'listening'
      ? isSteno
        ? lastTurn?.text ?? '회원님 말씀을 입력해 주세요'
        : '천천히 말씀해 주세요'
      : uiState === 'thinking'
      ? isSteno
        ? 'AI가 답을 준비하고 있어요'
        : '듣고 있어요, 잠시만요'
      : uiState === 'speaking'
      ? lastTurn?.text ?? ''
      : uiState === 'ended'
      ? '오늘 이야기 들려주셔서 감사해요'
      : '잠시 문제가 있었어요';

  const hintText =
    uiState === 'init'
      ? '아래 원을 한 번 눌러 시작하세요'
      : uiState === 'idle'
      ? '' // 곧 자동으로 듣기 시작
      : uiState === 'listening'
      ? isSteno
        ? '회원님이 말씀하신 그대로 입력하고 Enter (Shift+Enter 줄바꿈)'
        : '말씀이 끝나면 잠시 기다리시거나, 원을 한 번 눌러 보내세요'
      : uiState === 'ended'
      ? '대화가 마무리되었어요. 창을 닫으셔도 돼요.'
      : uiState === 'error'
      ? errorMessage ?? ''
      : '';

  const orbState: 'idle' | 'listening' | 'speaking' | 'thinking' =
    uiState === 'listening' ? 'listening'
      : uiState === 'thinking' || uiState === 'greeting' ? 'thinking'
      : uiState === 'speaking' ? 'speaking'
      : 'idle';

  const orbInteractive =
    uiState !== 'ended' &&
    (uiState === 'init' ||
      (!isSteno && (uiState === 'idle' || uiState === 'listening' || uiState === 'speaking')) ||
      (isSteno && uiState === 'speaking'));

  const showStenoInput = isSteno && (uiState === 'listening' || uiState === 'thinking' || uiState === 'speaking');

  return (
    <div className="relative min-h-screen w-full bg-white overflow-hidden">
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-white via-white to-slate-50/40" aria-hidden />

      {/* 세션 ID — 우상단 (개발용) */}
      <div className="absolute top-0 right-0 pt-safe">
        <div className="px-5 pt-5">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-50 ring-1 ring-slate-100 text-[10px] font-mono text-slate-400">
            <span className={`inline-block w-1.5 h-1.5 rounded-full ${uiState === 'error' ? 'bg-red-500' : 'bg-emerald-500'}`} />
            {sessionId.slice(0, 8)}
          </span>
        </div>
      </div>

      <main className="relative flex flex-col items-center justify-center min-h-svh px-6 pt-safe pb-32">
        <div className="h-6 mb-8" />

        {orbInteractive ? (
          <button
            onClick={handleTapOrb}
            aria-label={uiState === 'listening' ? '말씀 마치기' : '대화 시작하기'}
            className="rounded-full transition-transform duration-200 active:scale-95 hover:scale-[1.02] cursor-pointer"
          >
            <Orb size="lg" state={orbState} />
          </button>
        ) : (
          <Orb size="lg" state={orbState} />
        )}

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

        {/* 속기사 모드 — 회원 발화 타이핑 입력 */}
        {showStenoInput && (
          <div className="mt-8 w-full max-w-md mx-auto animate-fade-in">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleInputKey}
              disabled={uiState !== 'listening'}
              rows={2}
              placeholder={uiState === 'listening' ? '회원님이 말씀하신 그대로 입력하고 Enter' : 'AI 응답 준비 중…'}
              className="w-full px-4 py-3 rounded-2xl bg-white ring-1 ring-slate-200 text-[16px] text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300 resize-none disabled:opacity-50 shadow-sm word-keep-all"
            />
            <div className="mt-2 flex justify-end">
              <button
                type="button"
                onClick={() => void submitText()}
                disabled={uiState !== 'listening' || !input.trim()}
                className="px-5 py-2 rounded-full bg-slate-900 text-white text-[13px] font-semibold hover:bg-slate-800 active:scale-[0.99] transition disabled:opacity-40 disabled:cursor-not-allowed"
              >
                전송
              </button>
            </div>
          </div>
        )}

        {uiState === 'error' && (
          <button
            onClick={() => {
              setErrorMessage(null);
              setUiState(isSteno ? 'listening' : 'idle');
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
          <p className="text-[11px] text-slate-300 tracking-wide">
            {!isSteno && hasMicPermission === false
              ? '마이크 권한을 허용해 주세요'
              : isSteno
              ? 'remAIn · 속기사 모드'
              : 'remAIn · 음성 대화'}
          </p>
        </div>
      </div>
    </div>
  );
}
