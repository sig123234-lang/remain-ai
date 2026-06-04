import Anthropic from '@anthropic-ai/sdk';

let _client: Anthropic | null = null;

export function getAnthropicClient(): Anthropic {
  if (_client) return _client;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY가 설정되지 않았습니다. .env.local 확인.');
  }
  _client = new Anthropic({ apiKey });
  return _client;
}

export function isAnthropicConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

// 대화 모델 — 속도가 핵심. 실측(2026-06): opus-4-8 standard는 TTFT ~9초로 대화에 부적합.
// haiku-4-5는 TTFT ~0.7초. 회상치료 일상 대화에 충분.
export const CONVERSATION_MODEL = 'claude-opus-4-8';

// Fast Mode (research preview) — opus 전용 + 조직 fast-mode 한도가 0이라 현재 사용 불가.
// (켜면 매 턴 429/400으로 실패 후 fallback해 오히려 지연만 늘어남) → 비활성.
// 한도 풀리면 true로. 디버그 라우트(/api/debug/fast-mode)에서 상태 확인 가능.
export const FAST_MODE_BETA = 'fast-mode-2026-02-01';
export const USE_FAST_MODE = false;

/**
 * messages.create 래퍼 — USE_FAST_MODE면 beta endpoint + speed:'fast'로 호출,
 * 실패 시 일반 endpoint로 자동 fallback. 호출 측은 fast/standard 차이 신경 X.
 */
export async function createMessage(
  params: Anthropic.MessageCreateParamsNonStreaming,
): Promise<Anthropic.Message> {
  const client = getAnthropicClient();
  if (USE_FAST_MODE) {
    try {
      // SDK 타이핑이 beta 옵션을 완전히 노출하지 않을 수 있어서 캐스팅.
      return await (client.beta.messages.create as unknown as (p: unknown) => Promise<Anthropic.Message>)({
        ...params,
        speed: 'fast',
        betas: [FAST_MODE_BETA],
      });
    } catch (e) {
      console.warn('[anthropic] Fast Mode 실패 → standard로 fallback:', e instanceof Error ? e.message : String(e));
    }
  }
  return client.messages.create(params);
}

/**
 * 스트리밍 변형 — 텍스트 델타를 토큰 단위로 yield.
 * USE_FAST_MODE면 beta endpoint(speed:'fast')로 스트림 시도, 요청 단계 실패 시 standard 스트림으로 fallback.
 * 첫 토큰(TTFT)부터 흘려보내 문장 단위 TTS와 겹쳐 처리하기 위함.
 */
export async function* streamAssistantText(
  params: Anthropic.MessageCreateParamsNonStreaming,
): AsyncGenerator<string, void, unknown> {
  const client = getAnthropicClient();

  const openStream = async (useFast: boolean): Promise<AsyncIterable<unknown>> => {
    if (useFast) {
      return (await (client.beta.messages.create as unknown as (p: unknown) => Promise<AsyncIterable<unknown>>)({
        ...params,
        stream: true,
        speed: 'fast',
        betas: [FAST_MODE_BETA],
      }));
    }
    return (await (client.messages.create as unknown as (p: unknown) => Promise<AsyncIterable<unknown>>)({
      ...params,
      stream: true,
    }));
  };

  let stream: AsyncIterable<unknown>;
  if (USE_FAST_MODE) {
    try {
      stream = await openStream(true);
    } catch (e) {
      console.warn('[anthropic] Fast Mode 스트림 실패 → standard로 fallback:', e instanceof Error ? e.message : String(e));
      stream = await openStream(false);
    }
  } else {
    stream = await openStream(false);
  }

  for await (const event of stream as AsyncIterable<{ type?: string; delta?: { type?: string; text?: string } }>) {
    if (event.type === 'content_block_delta' && event.delta?.type === 'text_delta' && event.delta.text) {
      yield event.delta.text;
    }
  }
}
