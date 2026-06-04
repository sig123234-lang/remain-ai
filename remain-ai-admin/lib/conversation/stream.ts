/**
 * 대화 응답 스트리밍 — LLM 토큰을 받아 문장 경계마다 즉시 TTS 합성하고
 * 오디오 청크를 SSE로 흘려보낸다. 첫 소리까지의 지연 = TTFT + 첫 문장 생성 + 첫 문장 TTS.
 *
 * SSE 이벤트 (data: <json>\n\n):
 *   { type: 'meta', wrapupMode, turnCount }      — 선택, 가장 먼저
 *   { type: 'transcript', text }                 — 음성 모드 STT 결과 (선택)
 *   { type: 'skipped', reason }                   — 발화 너무 짧음 → 응답 없음
 *   { type: 'audio', seq, text, audio_base64, audio_mime }  — 문장 1개 분량 오디오
 *   { type: 'done', ai_text, ended }             — 응답 완료
 *   { type: 'error', error }
 */

import type Anthropic from '@anthropic-ai/sdk';
import { CONVERSATION_MODEL, streamAssistantText } from './anthropic';
import { synthesizeSpeech } from './openai';

const SSE_HEADERS = {
  'Content-Type': 'text/event-stream; charset=utf-8',
  'Cache-Control': 'no-cache, no-transform',
  Connection: 'keep-alive',
  // nginx 등 프록시 버퍼링 비활성화 — 청크 즉시 전달
  'X-Accel-Buffering': 'no',
} as const;

// 문장 경계 추출 — 종결부호(. ! ? … 。 ！ ？) 또는 줄바꿈까지를 한 문장으로.
// 부호 뒤 따라오는 닫는 따옴표/괄호/공백도 함께 포함.
const LEADING_SENTENCE = /^[\s\S]*?(?:[.!?。！？…]+["')\]」』]*\s*|\n+)/;
// 종결부호 없이 너무 길어지면 강제로 끊는 한도 (재생 시작을 너무 늦추지 않기 위함).
const MAX_PENDING_CHARS = 140;

function takeSentences(buffer: string): { sentences: string[]; rest: string } {
  const sentences: string[] = [];
  let rest = buffer;
  for (;;) {
    const m = rest.match(LEADING_SENTENCE);
    if (!m || !m[0]) break;
    sentences.push(m[0]);
    rest = rest.slice(m[0].length);
  }
  return { sentences, rest };
}

export interface ConversationStreamOptions {
  /** LLM 모드: 시스템 프롬프트 (string 또는 캐시 breakpoint를 포함한 블록 배열) + 메시지 히스토리 */
  systemPrompt?: string | Anthropic.TextBlockParam[];
  messages?: Anthropic.MessageParam[];
  maxTokens?: number;
  /** TTS만 모드: LLM 없이 이 텍스트를 그대로 합성 (인사 재사용 등) */
  fixedText?: string;
  /** 응답 완료 시 호출 — AI 턴 DB 저장 등. 전체 텍스트 인자. */
  onComplete?: (fullText: string) => Promise<void> | void;
  /** 첫 'meta' 이벤트에 실어 보낼 부가 정보 */
  meta?: Record<string, unknown>;
  /** done 이벤트의 ended 플래그 */
  ended?: boolean;
  /** done 직전(오디오 전부 전송 후)에 한 번 보낼 추가 이벤트들 */
  prelude?: Record<string, unknown>[];
  /** 실측용 — 요청 수신 시각(Date.now()). 단계별 누적 지연 로깅. */
  t0?: number;
  /** 로그 라벨 (voice/text/greeting) */
  label?: string;
}

/**
 * SSE 스트리밍 Response 생성. LLM/TTS 모드 모두 지원.
 */
export function createConversationStream(opts: ConversationStreamOptions): Response {
  const encoder = new TextEncoder();

  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      let closed = false;
      const send = (obj: unknown) => {
        if (closed) return;
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`));
      };

      const t0 = opts.t0 ?? Date.now();
      const tag = `[timing:${opts.label ?? 'stream'}]`;
      const since = () => `${Date.now() - t0}ms`;

      // ─────────────────────────────────────────────
      // TTS 큐 — LLM 루프는 문장이 떨어지자마자 합성을 시작(promise)하고 enqueue만,
      // 별도 컨슈머가 순서대로 await + SSE 송신. 합성과 LLM 토큰 수신이 겹쳐 첫 소리 단축.
      // ─────────────────────────────────────────────
      type TtsItem = { seq: number; text: string; audio: Promise<Buffer> };
      const queue: TtsItem[] = [];
      let producerDone = false;
      let pushedSeq = 0;
      let waiter: (() => void) | null = null;
      const wakeConsumer = () => { const w = waiter; waiter = null; w?.(); };
      const waitForItem = () => new Promise<void>((r) => { waiter = r; });

      const enqueue = (raw: string) => {
        const text = raw.trim();
        if (!text) return;
        const seq = pushedSeq++;
        const synthStart = Date.now();
        // 즉시 합성 시작. 결과는 promise — 컨슈머가 순서 맞춰 await.
        const audio = synthesizeSpeech(text).then((buf) => {
          if (seq === 0) console.log(`${tag} 첫 TTS 합성 ${Date.now() - synthStart}ms`);
          return buf;
        });
        queue.push({ seq, text, audio });
        wakeConsumer();
      };

      const consumer = (async () => {
        for (;;) {
          if (queue.length === 0) {
            if (producerDone) return;
            await waitForItem();
            continue;
          }
          const item = queue.shift()!;
          let buf: Buffer;
          try {
            buf = await item.audio;
          } catch (e) {
            console.error(`${tag} TTS 합성 실패 (seq=${item.seq})`, e);
            continue;
          }
          if (closed) return;
          if (item.seq === 0) console.log(`${tag} 첫 오디오 전송 @${since()}`);
          send({
            type: 'audio',
            seq: item.seq,
            text: item.text,
            audio_base64: buf.toString('base64'),
            audio_mime: 'audio/mpeg',
          });
        }
      })();

      try {
        if (opts.prelude) for (const p of opts.prelude) send(p);
        if (opts.meta) send({ type: 'meta', ...opts.meta });

        let full = '';

        if (typeof opts.fixedText === 'string') {
          // LLM 생략 — 고정 텍스트를 문장 단위로 합성
          full = opts.fixedText.trim();
          const { sentences, rest } = takeSentences(full + '\n');
          for (const s of sentences) enqueue(s);
          enqueue(rest);
        } else {
          let buffer = '';
          let firstToken = true;
          const systemBlocks: Anthropic.TextBlockParam[] | undefined =
            typeof opts.systemPrompt === 'string'
              ? [{ type: 'text', text: opts.systemPrompt, cache_control: { type: 'ephemeral' } }]
              : opts.systemPrompt;

          for await (const delta of streamAssistantText({
            model: CONVERSATION_MODEL,
            max_tokens: opts.maxTokens ?? 512,
            system: systemBlocks,
            messages: opts.messages ?? [],
          })) {
            if (firstToken) {
              firstToken = false;
              console.log(`${tag} LLM 첫 토큰(TTFT) @${since()}`);
            }
            full += delta;
            buffer += delta;
            const { sentences, rest } = takeSentences(buffer);
            buffer = rest;
            for (const s of sentences) enqueue(s);
            // 첫 청크는 절(쉼표) 경계에서도 일찍 내보내 첫 소리를 앞당김
            if (pushedSeq === 0) {
              const cm = buffer.match(/^[\s\S]*?[,，、]\s*/);
              if (cm && cm[0].trim().length >= 1) {
                enqueue(cm[0]);
                buffer = buffer.slice(cm[0].length);
              }
            }
            // 종결부호 없이 너무 길면 강제 flush (마지막 공백 기준)
            if (buffer.length > MAX_PENDING_CHARS) {
              const cut = buffer.lastIndexOf(' ');
              if (cut > 0) {
                enqueue(buffer.slice(0, cut));
                buffer = buffer.slice(cut + 1);
              }
            }
          }
          enqueue(buffer);
          full = full.trim();
        }

        producerDone = true;
        wakeConsumer();
        await consumer;

        console.log(`${tag} 응답 완료 @${since()} (문장 ${pushedSeq}개, ${full.length}자)`);
        send({ type: 'done', ai_text: full, ended: opts.ended ?? false });

        if (opts.onComplete) {
          try {
            await opts.onComplete(full);
          } catch (e) {
            console.error('[stream] onComplete 실패', e);
          }
        }
      } catch (e) {
        console.error('[stream] 오류', e);
        send({ type: 'error', error: e instanceof Error ? e.message : String(e) });
        // consumer가 waitForItem에서 멈춰 있을 수 있어 풀어줌
        producerDone = true;
        wakeConsumer();
        try { await consumer; } catch { /* 무시 */ }
      } finally {
        closed = true;
        controller.close();
      }
    },
  });

  return new Response(body, { headers: SSE_HEADERS });
}
