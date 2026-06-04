// 대화 파이프라인 지연 실측 — LLM TTFT/총생성 + TTS.
// 실행: node --env-file=.env.local scripts/latency-probe.mjs
import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const SYSTEM = `당신은 "remAIn"이라는 이름의 AI 대화 동반자입니다. 한국의 요양 시설에서 어르신들과 회상치료를 진행합니다.
# 대화 원칙
1. 반드시 한국어 존댓말. 2. "회원님" 호칭. 3. 한 번에 한 가지 질문, 1~3문장 이내로 짧게.
4. 어르신 마지막 발화를 반영한 뒤 다음 질문. 5. 열린 질문. 6. 압박 금지. 7. 모른다 하시면 화제 전환.
# 출력: 응답 텍스트만. 라벨/따옴표/행동묘사 금지.`;

const MESSAGES = [
  { role: 'user', content: '오늘 점심에 김치찌개를 먹었어요.' },
  { role: 'assistant', content: '김치찌개 드셨군요. 따끈한 국물이 참 좋으셨겠어요. 어떤 김치로 끓이신 게 제일 맛있으세요?' },
  { role: 'user', content: '어머니가 담가주신 묵은지로 끓인 게 최고였지.' },
];

async function timeLLM(label, opts) {
  const t0 = Date.now();
  let ttft = null;
  let text = '';
  try {
    const stream = await opts();
    for await (const ev of stream) {
      if (ev.type === 'content_block_delta' && ev.delta?.type === 'text_delta') {
        if (ttft === null) ttft = Date.now() - t0;
        text += ev.delta.text;
      }
    }
    console.log(`${label}: TTFT ${ttft}ms · 총 ${Date.now() - t0}ms · ${text.length}자`);
    console.log(`   → "${text.slice(0, 60)}${text.length > 60 ? '…' : ''}"`);
    return { ttft, total: Date.now() - t0, text };
  } catch (e) {
    console.log(`${label}: 실패 — ${e?.message ?? e}`);
    return null;
  }
}

async function main() {
  console.log('=== LLM (opus-4-8) ===');
  await timeLLM('opus fast  ', () =>
    anthropic.beta.messages.create({
      model: 'claude-opus-4-8', max_tokens: 512, system: SYSTEM, messages: MESSAGES,
      stream: true, speed: 'fast', betas: ['fast-mode-2026-02-01'],
    }),
  );
  await timeLLM('opus std   ', () =>
    anthropic.messages.create({ model: 'claude-opus-4-8', max_tokens: 512, system: SYSTEM, messages: MESSAGES, stream: true }),
  );

  console.log('\n=== LLM 비교 (sonnet-4-6 / haiku-4-5) ===');
  await timeLLM('sonnet fast', () =>
    anthropic.beta.messages.create({
      model: 'claude-sonnet-4-6', max_tokens: 512, system: SYSTEM, messages: MESSAGES,
      stream: true, speed: 'fast', betas: ['fast-mode-2026-02-01'],
    }),
  );
  await timeLLM('sonnet std ', () =>
    anthropic.messages.create({ model: 'claude-sonnet-4-6', max_tokens: 512, system: SYSTEM, messages: MESSAGES, stream: true }),
  );
  await timeLLM('haiku std  ', () =>
    anthropic.messages.create({ model: 'claude-haiku-4-5-20251001', max_tokens: 512, system: SYSTEM, messages: MESSAGES, stream: true }),
  );

  console.log('\n=== TTS (openai tts-1) ===');
  const sentence = '묵은지로 끓인 김치찌개가 제일이라고 하시는군요. 어머니 손맛이 많이 그리우시겠어요.';
  for (const model of ['tts-1', 'gpt-4o-mini-tts']) {
    const t0 = Date.now();
    try {
      const r = await openai.audio.speech.create({ model, voice: 'nova', input: sentence, response_format: 'mp3', speed: 0.85 });
      const buf = Buffer.from(await r.arrayBuffer());
      console.log(`${model.padEnd(16)}: ${Date.now() - t0}ms · ${(buf.length / 1024).toFixed(0)}KB`);
    } catch (e) {
      console.log(`${model.padEnd(16)}: 실패 — ${e?.message ?? e}`);
    }
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
