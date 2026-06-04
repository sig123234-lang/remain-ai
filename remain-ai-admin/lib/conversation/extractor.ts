/**
 * 세션 종료 후 Claude로 구조화 데이터 추출.
 *
 *  - keyMemories: 1~5개 핵심 기억
 *  - emotionalTreasures: 어르신이 깊이 반응한 발화/주제
 *  - entities: mentioned people / places / timeperiods
 *  - guardianReport: summary, impressiveExcerpts, mainTopic, emotionalTone
 *  - reportStatus: 'draft' (관리자 검토 대기) — 발송은 별도 액션
 *
 * 출력은 단일 JSON. 모델은 opus-4-7 (품질 우선).
 */

import 'server-only';
import Anthropic from '@anthropic-ai/sdk';
import { getAnthropicClient } from './anthropic';
import type { ConversationMemberContext } from './system-prompt';
import type { TurnRow } from '@/lib/sessions-server';

const EXTRACTION_MODEL = 'claude-opus-4-8';

export interface KeyMemory {
  title: string;
  period?: string;
  description: string;
  people?: string[];
  places?: string[];
  emotionalWeight: number; // 0~1
  supportingQuote?: string;
}

export interface EmotionalTreasure {
  quote: string;
  context: string;
  type: 'explicit' | 'implicit';
}

export interface MentionedPerson {
  name: string;
  relation?: string;
  aliveStatus: 'alive' | 'deceased' | 'unknown';
}

export interface MentionedPlace {
  name: string;
  period?: string;
}

export interface ImpressiveExcerpt {
  context: string;
  elderlyQuote: string;
  significance: string;
}

export interface GuardianReport {
  summary: string;
  impressiveExcerpts: ImpressiveExcerpt[];
  mainTopic: string;
  emotionalTone: string;
}

export type ReportStatus = 'draft' | 'reviewed' | 'sent';

export interface SessionExtraction {
  extractedAt: string;
  keyMemories: KeyMemory[];
  emotionalTreasures: EmotionalTreasure[];
  entities: {
    people: MentionedPerson[];
    places: MentionedPlace[];
    timeperiods: string[];
  };
  guardianReport: GuardianReport;
  reportStatus: ReportStatus;
}

const EXTRACTION_PROMPT = `당신은 한국 어르신 회상치료 세션의 전체 대화를 분석해서 구조화된 데이터를 추출하는 분석가입니다.
대화 로그(어르신·AI 발화 순서대로)와 회원 정보를 받아, 다음 스키마의 JSON 하나만 출력하세요.
JSON 외 다른 텍스트(설명·라벨·마크다운 코드블록) 절대 포함 금지.

# 출력 스키마

\`\`\`
{
  "keyMemories": [               // 1~5개. 어르신이 자발적으로 풀어낸 의미 있는 기억만.
    {
      "title": "한 줄 제목 (한국어)",
      "period": "1950년대 / 어린 시절 / 신혼 시절 등 자유 텍스트, 모르면 생략",
      "description": "2~3문장 설명",
      "people": ["등장 인물 이름/관계"],
      "places": ["장소"],
      "emotionalWeight": 0.0~1.0,  // 어르신이 얼마나 깊이 반응했는지
      "supportingQuote": "어르신 발화 그대로 인용 (1문장)"
    }
  ],
  "emotionalTreasures": [        // 보물 = 어르신이 명시적("아직도 생각나", "보고 싶어")으로 또는 암묵적(목소리·반복)으로 깊이 반응한 발화.
    {
      "quote": "어르신 원문 인용",
      "context": "맥락 한 문장",
      "type": "explicit" | "implicit"
    }
  ],
  "entities": {
    "people": [
      { "name": "이름 또는 관계 (어머니 등)", "relation": "가능하면 관계", "aliveStatus": "alive"|"deceased"|"unknown" }
    ],
    "places": [
      { "name": "장소", "period": "관련 시기" }
    ],
    "timeperiods": ["언급된 시기들"]
  },
  "guardianReport": {
    "summary": "보호자에게 전달할 3~5문장 요약. 따뜻하고 객관적인 어조. 어르신의 자기 표현을 존중.",
    "impressiveExcerpts": [      // 보호자에게 인상 깊을 만한 발화 2~4개
      {
        "context": "어떤 흐름에서 나온 발화인지",
        "elderlyQuote": "어르신 발화 그대로",
        "significance": "왜 의미 있는지 1문장"
      }
    ],
    "mainTopic": "오늘 대화의 중심 주제 (한 구절)",
    "emotionalTone": "전반적 감정 톤 (예: 그리움·따뜻함·차분함)"
  }
}
\`\`\`

# 규칙

- 어르신의 발화에 명백히 등장하지 않은 인물·장소·사건은 추가 금지 (환각 금지)
- 가족 사망 상태는 대화에서 명확히 시사된 경우만 'deceased'로, 아니면 'unknown'
- 보호자 요약은 의료·진단·약물 언급 금지
- 위기 신호("죽고 싶다" 등)가 있었으면 summary에 "관리자 확인 권고" 한 문장 포함
- 대화가 너무 짧거나(턴 5개 미만) 의미 있는 회상이 없으면 keyMemories: [], treasures: [] 빈 배열로

JSON만 출력하세요.`;

function buildExtractionInput(member: ConversationMemberContext, turns: TurnRow[]): string {
  const lines: string[] = [];
  lines.push(`# 회원 정보`);
  lines.push(`- 이름: ${member.name} (${member.age}세)`);
  lines.push(`- 인지 수준: ${member.cognitiveLevel}`);
  if (member.facility) lines.push(`- 시설: ${member.facility}`);
  if (member.familyStatus) {
    lines.push(`- 가족 생존: 아버지=${member.familyStatus.father}, 어머니=${member.familyStatus.mother}, 배우자=${member.familyStatus.spouse}`);
  }
  lines.push('');
  lines.push(`# 대화 로그 (총 ${turns.length}턴)`);
  for (const t of turns) {
    const speaker = t.role === 'ai' ? 'AI' : member.name;
    lines.push(`[${t.turnIndex}] ${speaker}: ${t.text}`);
  }
  return lines.join('\n');
}

function safeParseJson<T>(raw: string): T | null {
  // 모델이 코드블록 등을 추가했을 수 있으니 첫 { … 마지막 } 만 발라냄
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start < 0 || end <= start) return null;
  const slice = raw.slice(start, end + 1);
  try {
    return JSON.parse(slice) as T;
  } catch {
    return null;
  }
}

export async function extractSession(
  member: ConversationMemberContext,
  turns: TurnRow[],
): Promise<SessionExtraction | null> {
  if (turns.length === 0) return null;

  const client = getAnthropicClient();
  const input = buildExtractionInput(member, turns);

  let raw: string;
  try {
    const response = await client.messages.create({
      model: EXTRACTION_MODEL,
      max_tokens: 3000,
      system: [{ type: 'text', text: EXTRACTION_PROMPT, cache_control: { type: 'ephemeral' } }],
      messages: [{ role: 'user', content: input }],
    });
    const block = response.content.find((b): b is Anthropic.TextBlock => b.type === 'text');
    raw = block?.text ?? '';
  } catch (e) {
    console.error('[extractSession] Claude 실패', e);
    return null;
  }

  const parsed = safeParseJson<Omit<SessionExtraction, 'extractedAt' | 'reportStatus'>>(raw);
  if (!parsed) {
    console.error('[extractSession] JSON 파싱 실패 — raw:', raw.slice(0, 300));
    return null;
  }

  return {
    ...parsed,
    extractedAt: new Date().toISOString(),
    reportStatus: 'draft',
  };
}
