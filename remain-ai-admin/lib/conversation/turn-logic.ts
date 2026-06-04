/**
 * voice·text 라우트 공통 — 턴 캡, 마무리 단계 지시문, 메시지 히스토리 구성.
 */

import type Anthropic from '@anthropic-ai/sdk';
import type { TurnRow } from '@/lib/sessions-server';

// 한 세션의 최대 턴 수 (AI + 어르신 합계). 도달하면 더 이상 진행 불가.
export const TURN_CAP = 60;
// 남은 턴 수가 이 값 이하면 AI에게 마무리 모드 지시.
export const WRAPUP_REMAINING = 4;

/**
 * 남은 턴 수에 따라 마무리 단계 지시문을 시스템 프롬프트에 덧붙임.
 * remainingAfter: 이 AI 응답을 포함한 뒤 남게 될 턴 수.
 */
export function buildWrapupSuffix(remainingAfter: number): string {
  const isFinalAI = remainingAfter <= 0;
  if (isFinalAI) {
    return `

# 대화 마무리 — 마지막 응답
이번 응답이 오늘 대화의 마지막입니다.
- 새 질문은 절대 하지 마세요.
- 1~2문장으로 따뜻하게 종결하세요.
- 예: "오늘 좋은 이야기 들려주셔서 정말 고마워요. 다음에 또 만나뵐게요. 편안한 하루 보내세요."`;
  }
  return `

# 대화 마무리 단계
오늘 대화가 거의 끝나갑니다 (앞으로 ${remainingAfter}턴 남음).
- 새 질문 하지 말고, 이번 응답부터 마무리 톤으로 전환하세요.
- 1~2문장으로 짧게, 지금까지의 이야기에 감사를 표하면서 자연스럽게 종결로 이끄세요.
- 어르신이 더 말씀하시고 싶어 보여도 너무 길게 끌지 마세요.`;
}

/**
 * 기존 턴 + 이번 어르신 발화로 Claude 메시지 배열 구성.
 * 마지막 메시지에 cache_control(ephemeral)을 달아 대화 prefix를 증분 캐싱 → 후반 턴 TTFT 단축.
 */
export function buildConversationMessages(
  existingTurns: TurnRow[],
  userText: string,
): Anthropic.MessageParam[] {
  const history: Anthropic.MessageParam[] = existingTurns.map((t) => ({
    role: t.role === 'ai' ? ('assistant' as const) : ('user' as const),
    content: t.text,
  }));
  history.push({ role: 'user', content: userText });

  // 마지막 메시지를 블록 형태로 바꿔 캐시 브레이크포인트 부착
  const last = history[history.length - 1];
  if (typeof last.content === 'string') {
    history[history.length - 1] = {
      role: last.role,
      content: [{ type: 'text', text: last.content, cache_control: { type: 'ephemeral' } }],
    };
  }
  return history;
}
