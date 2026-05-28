import { NextResponse, type NextRequest } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { createServerClient, isSupabaseConfigured } from '@/lib/supabase/server';
import { CONVERSATION_MODEL, getAnthropicClient, isAnthropicConfigured } from '@/lib/conversation/anthropic';
import { buildSystemPrompt, type ConversationMemberContext } from '@/lib/conversation/system-prompt';

export const runtime = 'nodejs';

interface ConversationTurn {
  role: 'ai' | 'elderly';
  text: string;
}

interface RequestBody {
  member: ConversationMemberContext;
  history: ConversationTurn[];
}

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

export async function POST(request: NextRequest) {
  // 1. 환경변수 검증
  if (!isAnthropicConfigured()) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY가 설정되지 않았습니다.' }, { status: 500 });
  }
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'Supabase가 설정되지 않았습니다.' }, { status: 500 });
  }

  // 2. 인증 (v1 — admin 로그인 필요. 추후 어르신 세션 토큰 별도 발급)
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
  }

  // 3. 페이로드 파싱·검증
  let body: RequestBody;
  try {
    body = (await request.json()) as RequestBody;
  } catch {
    return badRequest('JSON 본문이 올바르지 않습니다.');
  }
  if (!body.member || typeof body.member !== 'object') return badRequest('member 누락');
  if (!body.member.name || !body.member.age || !body.member.cognitiveLevel) return badRequest('member 필수 필드 누락 (name/age/cognitiveLevel)');
  if (!Array.isArray(body.history)) return badRequest('history는 배열이어야 합니다.');

  // 4. Anthropic 메시지 형식으로 변환
  //    ai → assistant, elderly → user
  const messages: Anthropic.MessageParam[] = body.history
    .filter((t) => t.text && t.text.trim().length > 0)
    .map((t) => ({
      role: t.role === 'ai' ? ('assistant' as const) : ('user' as const),
      content: t.text,
    }));

  // 첫 발화는 user여야 함. 비어있으면 시작 트리거 추가.
  if (messages.length === 0) {
    messages.push({ role: 'user', content: '(세션 시작 — 어르신과 첫 인사를 나눠 주세요.)' });
  } else if (messages[0].role === 'assistant') {
    return badRequest('history의 첫 발화는 어르신(elderly) 발화여야 합니다.');
  }

  // 5. 시스템 프롬프트 빌드 (프롬프트 캐싱: 회원별로 안정적)
  const systemPrompt = buildSystemPrompt(body.member);

  // 6. Claude 호출
  const client = getAnthropicClient();
  try {
    const response = await client.messages.create({
      model: CONVERSATION_MODEL,
      max_tokens: 1024,
      system: [
        {
          type: 'text',
          text: systemPrompt,
          cache_control: { type: 'ephemeral' },
        },
      ],
      messages,
    });

    const textBlock = response.content.find((b): b is Anthropic.TextBlock => b.type === 'text');
    const text = textBlock?.text?.trim() ?? '';

    return NextResponse.json({
      text,
      stop_reason: response.stop_reason,
      usage: {
        input_tokens: response.usage.input_tokens,
        output_tokens: response.usage.output_tokens,
        cache_creation_input_tokens: response.usage.cache_creation_input_tokens ?? 0,
        cache_read_input_tokens: response.usage.cache_read_input_tokens ?? 0,
      },
    });
  } catch (e) {
    if (e instanceof Anthropic.RateLimitError) {
      return NextResponse.json({ error: 'Anthropic 호출량 한도 초과 — 잠시 후 다시 시도하세요.' }, { status: 429 });
    }
    if (e instanceof Anthropic.AuthenticationError) {
      return NextResponse.json({ error: 'Anthropic API 키가 유효하지 않습니다.' }, { status: 500 });
    }
    if (e instanceof Anthropic.APIError) {
      return NextResponse.json({ error: `Anthropic API 오류 (${e.status}): ${e.message}` }, { status: 502 });
    }
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: `예상치 못한 오류: ${msg}` }, { status: 500 });
  }
}
