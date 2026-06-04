import OpenAI from 'openai';

let _client: OpenAI | null = null;

export function getOpenAIClient(): OpenAI {
  if (_client) return _client;
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY가 설정되지 않았습니다. .env.local 확인.');
  }
  _client = new OpenAI({ apiKey });
  return _client;
}

export function isOpenAIConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY);
}

export const STT_MODEL = 'whisper-1';
// 실측(2026-06): tts-1 한 문장 ~4.3초 vs gpt-4o-mini-tts ~2.6초. 동일 API·동일 voice.
export const TTS_MODEL = 'gpt-4o-mini-tts';
// 한국어 노인 회상치료 — 차분하고 따뜻한 톤. alloy(중성)/nova(여성, 따뜻)/shimmer(여성, 부드러움) 중 nova.
export const TTS_VOICE: 'alloy' | 'echo' | 'fable' | 'nova' | 'onyx' | 'shimmer' = 'nova';
// 어르신이 따라가기 좋게 평소보다 조금 느리게. 0.25~4.0 범위, 1.0이 기본.
export const TTS_SPEED = 0.85;

// Whisper에게 "이런 종류의 대화"라는 힌트. 환각 줄임 + 회상치료 어휘 우선.
// prompt는 출력 텍스트에 포함되지 않음 — bias용으로만 사용됨.
const STT_PROMPT = '한국어 회상치료 대화입니다. 어르신께서 자신의 인생, 가족, 어린 시절, 고향, 추억에 대해 이야기하십니다. 존댓말과 일상 표현 위주로 전사하세요.';

// Whisper가 무음/노이즈 시 자주 만들어내는 환각 — 학습 데이터의 YouTube/방송 클로징 멘트.
// 이런 패턴이 감지되면 어르신 실제 발화가 아니라고 판단해 빈 응답으로 처리.
const HALLUCINATION_PATTERNS: RegExp[] = [
  /시청.{0,5}(해|하)?\s*주셔서\s*감사/,
  /구독\s*(과|하고|하기|부탁)/,
  /좋아요\s*(와|하고|하기|부탁|눌러)/,
  /(다음|새|또 다른)\s*(영상|편)/,
  /이덕영/,
  /MBC|KBS|SBS|YTN|JTBC|TBS\s*뉴스/i,
  /(뉴스|방송)\s*(데스크|클로징|마치)/,
  /시청자\s*여러분/,
  /thank\s*you\s*for\s*watching/i,
  /please\s*(subscribe|like)/i,
  /자막\s*(제작|업데이트|by)/,
];

function looksLikeHallucination(text: string): boolean {
  const t = text.trim();
  if (!t) return false;
  return HALLUCINATION_PATTERNS.some((p) => p.test(t));
}

export async function transcribeAudio(file: File): Promise<string> {
  const client = getOpenAIClient();
  const result = await client.audio.transcriptions.create({
    file,
    model: STT_MODEL,
    language: 'ko',
    prompt: STT_PROMPT,
    temperature: 0,
  });
  const text = result.text.trim();
  if (looksLikeHallucination(text)) {
    console.warn('[transcribeAudio] hallucination 감지 — 빈 응답 처리:', text);
    return '';
  }
  return text;
}

export async function synthesizeSpeech(text: string): Promise<Buffer> {
  const client = getOpenAIClient();
  const response = await client.audio.speech.create({
    model: TTS_MODEL,
    voice: TTS_VOICE,
    input: text,
    response_format: 'mp3',
    speed: TTS_SPEED,
  });
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}
