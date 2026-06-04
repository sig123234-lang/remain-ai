// 실제 파이프라인 시뮬레이션 — haiku 스트림 → 첫 문장 경계 → gpt-4o-mini-tts.
// "말 끝난 직후(STT 제외) 첫 소리까지" 시간을 측정.
// 실행: node --env-file=.env.local scripts/pipeline-probe.mjs
import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const SYSTEM = `당신은 "remAIn"이라는 AI 대화 동반자입니다. 한국 요양시설 어르신과 회상치료. 존댓말, "회원님" 호칭, 한 번에 한 질문 1~3문장. 응답 텍스트만 출력.`;
const MESSAGES = [
  { role: 'user', content: '오늘 점심에 김치찌개를 먹었어요.' },
  { role: 'assistant', content: '김치찌개 드셨군요. 어떤 김치로 끓이신 게 제일 맛있으세요?' },
  { role: 'user', content: '어머니가 담가주신 묵은지로 끓인 게 최고였지.' },
];
const SENTENCE = /^[\s\S]*?(?:[.!?。！？…]+["')\]」』]*\s*|\n+)/;
const CLAUSE = /^[\s\S]*?[,，、](\s*)/;

async function tts(text) {
  const r = await openai.audio.speech.create({ model: 'gpt-4o-mini-tts', voice: 'nova', input: text, response_format: 'mp3', speed: 0.85 });
  return Buffer.from(await r.arrayBuffer());
}

async function run(label, splitRe) {
  const t0 = Date.now();
  const stream = await anthropic.messages.create({ model: 'claude-haiku-4-5-20251001', max_tokens: 512, system: SYSTEM, messages: MESSAGES, stream: true });
  let buf = '', firstChunk = null, firstAudioAt = null;
  for await (const ev of stream) {
    if (ev.type === 'content_block_delta' && ev.delta?.type === 'text_delta') {
      buf += ev.delta.text;
      const m = buf.match(splitRe);
      if (m && m[0].trim() && firstChunk === null) {
        firstChunk = m[0].trim();
        await tts(firstChunk);
        firstAudioAt = Date.now() - t0;
        break; // 첫 소리까지만 측정
      }
    }
  }
  console.log(`${label}: 첫 청크="${firstChunk}" → 첫 소리 @${firstAudioAt}ms`);
}

console.log('말 끝난 직후(STT 제외) → 첫 소리까지:');
await run('문장 단위', SENTENCE);
await run('절(쉼표) 단위', CLAUSE);
