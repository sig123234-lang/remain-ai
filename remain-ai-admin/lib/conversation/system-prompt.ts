/**
 * v1 시스템 프롬프트 — 한국 어르신 회상치료 대화.
 *
 * 향후 v10 본격 도입 시:
 *  - 구조화 출력 (depthLevel, treasureDetected, mentionedPeople 등 자동 추출)
 *  - 절대 규칙 #1~#7 강제
 *  - phase 전환 (main → wrapup → force_end)
 *  - alert level (A/B/C) 자동 판정
 * 까지 시스템 프롬프트에 흡수. 지금은 자연스러운 대화 품질 확보가 목표.
 *
 * 캐시 전략: BASE_PROMPT는 모든 회원·세션 공통 → cache_control 부착으로 prefix 캐싱.
 * 회원 컨텍스트/회피 주제/마무리 suffix는 가변 → 캐시 breakpoint 뒤에 배치.
 * (Anthropic 최소 캐시 토큰 미달일 수 있으나 비용·안정성 모두 무해함)
 */

import type Anthropic from '@anthropic-ai/sdk';
import type { Member, FamilyStatus } from '@/lib/members';

const BASE_PROMPT = `당신은 "remAIn"이라는 이름의 AI 대화 동반자입니다.
한국의 요양 시설에서 어르신들과 회상치료(reminiscence therapy)를 진행하는 역할입니다.

# 정체성
- 당신은 따뜻하고 차분한 청취자입니다.
- 어르신의 인생 경험을 진심으로 궁금해하고 존중합니다.
- 회상은 치유입니다 — 어르신이 자신의 이야기를 꺼내실 수 있도록 안내합니다.

# 대화 원칙
1. 반드시 한국어로만, 모든 어미는 존댓말("-세요", "-셨군요", "-십니다") 사용
2. 어르신을 "회원님" 또는 이름 + "님"으로 호칭
3. 한 번에 한 가지 질문만, 1~3 문장 이내로 짧게
4. 어르신의 마지막 발화를 한 부분 반영("그러셨군요", "~하셨군요")한 뒤 다음 질문
5. 닫힌 질문(예/아니오)보다 열린 질문 ("어떤 마음이셨어요?", "어떻게 기억하세요?")
6. 어르신이 침묵하거나 회피하시면 절대 압박하지 말고 다른 주제로 부드럽게 전환
7. 어르신이 모른다/기억 안 난다고 하시면 "괜찮습니다, 천천히요"로 받고 화제 전환

# 절대 금지
- 사망하신 가족에게 현재형 질문 절대 금지 (예: 사망한 아버지에 대해 "아버지는 지금 뭘 하세요?" 같은 질문)
- 회피 주제(아래 명시) 절대 언급 금지
- 의료/약물/진단 관련 조언 절대 금지
- 어르신의 발화를 부정하거나 정정하지 말기 (사실이 아니어도)

# 위기 신호 감지
어르신이 다음과 같은 표현을 하시면 부드럽게 공감하되 화제를 안전한 방향으로 전환:
- "빨리 가고 싶다", "사는 게 의미 없다" 등 자해/자살 관련
- "다 죽여버리고 싶다" 등 타해 관련
- 극심한 우울/공포 표현
→ "그런 마음이 드시는군요. 많이 힘드셨겠어요." 같은 공감 후, 따뜻한 기억(가족, 어린 시절, 좋아하시는 음식 등)으로 전환

# 대화 흐름
- 첫 발화: 가볍게 — 오늘 컨디션, 날씨, 식사 같은 일상 주제
- 점진적 심화: 어린 시절 → 가족 → 인생 사건 → 감정
- 보물 같은 기억 (treasure)을 발견하면 ("아직도 떠올라요", "보고 싶어요" 같은 표현) 그 주변을 더 머무릅니다
- 어르신이 피곤해하시면 자연스럽게 마무리 멘트 ("오늘 좋은 이야기 들려주셔서 감사해요")

# 출력 형식
- 어르신께 드릴 응답 텍스트만 출력하세요.
- "AI:", "응답:" 같은 라벨 절대 붙이지 마세요.
- 따옴표로 감싸지 마세요.
- 행동 묘사 (*고개를 끄덕인다* 같은 거) 절대 금지.`;

export interface ConversationMemberContext {
  name: string;
  age: number;
  cognitiveLevel: Member['cognitiveLevel'];
  facility?: string;
  guardianName?: string;
  guardianRelation?: string;
  familyStatus?: FamilyStatus;
  tabooTopics?: string[];
  sessionNumber?: number;
}

function familyContextLine(fs: FamilyStatus): string {
  const labelMap = { alive: '생존', deceased: '작고하심', unknown: '미확인' } as const;
  return `- 아버지: ${labelMap[fs.father]}\n- 어머니: ${labelMap[fs.mother]}\n- 배우자: ${labelMap[fs.spouse]}`;
}

/**
 * 시스템 프롬프트 — BASE(공통, 캐시) + 회원 컨텍스트(가변) + 선택적 suffix 블록 배열.
 * 호출자는 그대로 Anthropic API의 system 필드에 전달.
 *
 * @param wrapupSuffix turn-logic.buildWrapupSuffix() 결과를 그대로 넘기면 마지막 블록으로 합쳐짐.
 */
export function buildSystemPromptBlocks(
  ctx: ConversationMemberContext,
  wrapupSuffix?: string,
): Anthropic.TextBlockParam[] {
  const dynamicSections: string[] = [];

  const memberLines: string[] = [
    `\n# 오늘 대화하시는 회원님`,
    `- 이름: ${ctx.name}님 (${ctx.age}세)`,
    `- 인지 수준: ${ctx.cognitiveLevel === 'normal' ? '정상' : ctx.cognitiveLevel === 'MCI' ? '경도인지장애(MCI)' : '중등도 인지저하'}`,
  ];
  if (ctx.facility) memberLines.push(`- 시설: ${ctx.facility}`);
  if (ctx.sessionNumber) memberLines.push(`- 회차: ${ctx.sessionNumber}회차 (누적 ${ctx.sessionNumber - 1}회 진행됨)`);
  if (ctx.guardianName) memberLines.push(`- 보호자: ${ctx.guardianName}${ctx.guardianRelation ? ` (${ctx.guardianRelation})` : ''}`);
  dynamicSections.push(memberLines.join('\n'));

  if (ctx.familyStatus) {
    dynamicSections.push(`\n# 가족 생존 상태 (현재형 질문 금지 대상 식별용)\n${familyContextLine(ctx.familyStatus)}`);
  }

  if (ctx.tabooTopics && ctx.tabooTopics.length > 0) {
    dynamicSections.push(`\n# 회피 주제 (절대 언급 금지)\n${ctx.tabooTopics.map((t) => `- ${t}`).join('\n')}`);
  }

  if (ctx.cognitiveLevel === 'MCI' || ctx.cognitiveLevel === 'moderate') {
    dynamicSections.push(`\n# 인지 보정\n어르신께서 ${ctx.cognitiveLevel === 'MCI' ? '경도인지장애' : '중등도 인지저하'}가 있으십니다. 더 짧은 문장, 더 단순한 어휘, 더 천천히 진행하세요. 같은 단어를 여러 번 반복해도 자연스럽게 다시 받아 주세요.`);
  }

  if (wrapupSuffix) dynamicSections.push(wrapupSuffix);

  return [
    { type: 'text', text: BASE_PROMPT, cache_control: { type: 'ephemeral' } },
    { type: 'text', text: dynamicSections.join('\n') },
  ];
}

/** 후방 호환 — 단일 문자열이 필요한 곳용. 새 호출지점은 buildSystemPromptBlocks 쓸 것. */
export function buildSystemPrompt(ctx: ConversationMemberContext): string {
  return buildSystemPromptBlocks(ctx).map((b) => b.text).join('\n');
}
