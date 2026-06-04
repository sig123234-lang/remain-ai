/**
 * Fast Mode 권한 / 작동 여부 진단.
 *
 *   GET /admin/api/debug/fast-mode
 *
 * 결과:
 *   - fastMode.ok: true → 권한 있음, Fast Mode 작동
 *   - fastMode.ok: false → 권한 없거나 호출 실패 (reason에 사유)
 */

import { NextResponse } from 'next/server';
import { CONVERSATION_MODEL, FAST_MODE_BETA, getAnthropicClient, isAnthropicConfigured } from '@/lib/conversation/anthropic';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  if (!isAnthropicConfigured()) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY 미설정' }, { status: 500 });
  }
  const client = getAnthropicClient();

  // 1차: Fast Mode (beta + speed:'fast')
  let fastResult: Record<string, unknown>;
  try {
    const response = await (client.beta.messages.create as unknown as (p: unknown) => Promise<{
      usage?: { speed?: string };
      content: { type: string; text?: string }[];
    }>)({
      model: CONVERSATION_MODEL,
      max_tokens: 50,
      speed: 'fast',
      betas: [FAST_MODE_BETA],
      messages: [{ role: 'user', content: '"네"라고만 한 단어로 대답하세요.' }],
    });
    fastResult = {
      ok: true,
      speedReported: response.usage?.speed ?? null,
      sample: response.content.find((b) => b.type === 'text')?.text ?? null,
    };
  } catch (e) {
    fastResult = {
      ok: false,
      reason: e instanceof Error ? e.message : String(e),
      hint: 'Anthropic 계정의 Fast Mode beta 권한이 아직 부여 안 됐을 수 있습니다. claude.com/fast-mode 에서 신청 후 1~5영업일 대기.',
    };
  }

  // 2차: Standard 호출 (정상 동작 확인용)
  let standardResult: Record<string, unknown>;
  try {
    const response = await client.messages.create({
      model: CONVERSATION_MODEL,
      max_tokens: 50,
      messages: [{ role: 'user', content: '"네"라고만 한 단어로 대답하세요.' }],
    });
    const textBlock = response.content.find((b) => b.type === 'text');
    standardResult = {
      ok: true,
      sample: textBlock && 'text' in textBlock ? textBlock.text : null,
    };
  } catch (e) {
    standardResult = { ok: false, reason: e instanceof Error ? e.message : String(e) };
  }

  return NextResponse.json({
    model: CONVERSATION_MODEL,
    beta: FAST_MODE_BETA,
    fastMode: fastResult,
    standard: standardResult,
    verdict: fastResult.ok
      ? '✓ Fast Mode 작동 중 — 대화 응답이 약 2.5배 빨라집니다.'
      : '✗ Fast Mode 미적용 — 표준 모드로 자동 fallback 중. 승인 메일 받기 전까지는 평소 속도.',
  });
}
