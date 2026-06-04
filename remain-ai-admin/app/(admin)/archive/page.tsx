import PageHeader from '@/components/PageHeader';
import { Card, CardBody, CardHeader, EmptyState, Pill } from '@/components/Card';
import { fetchMembers } from '@/lib/members-server';
import { fetchMemberExtractedSessions } from '@/lib/sessions-server';
import MemberPicker from './MemberPicker';

export const dynamic = 'force-dynamic';

function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}

export default async function ArchivePage({
  searchParams,
}: {
  searchParams: Promise<{ member?: string }>;
}) {
  const { member: memberId } = await searchParams;
  const { members } = await fetchMembers();
  const sessions = memberId ? await fetchMemberExtractedSessions(memberId) : [];

  // 모든 세션의 추출 데이터를 합쳐서 카드별 집계
  const allMemories = sessions.flatMap((s) => s.extraction.keyMemories.map((m) => ({ ...m, sessionId: s.sessionId, sessionNumber: s.sessionNumber, startedAt: s.startedAt })));
  const allTreasures = sessions.flatMap((s) => s.extraction.emotionalTreasures.map((t) => ({ ...t, sessionId: s.sessionId, sessionNumber: s.sessionNumber, startedAt: s.startedAt })));
  const allPeople = new Map<string, { name: string; relation?: string; aliveStatus: 'alive' | 'deceased' | 'unknown'; count: number }>();
  const allPlaces = new Map<string, { name: string; period?: string; count: number }>();
  const allTimeperiods = new Map<string, number>();
  for (const s of sessions) {
    for (const p of s.extraction.entities.people) {
      const prev = allPeople.get(p.name);
      allPeople.set(p.name, { name: p.name, relation: p.relation, aliveStatus: p.aliveStatus, count: (prev?.count ?? 0) + 1 });
    }
    for (const pl of s.extraction.entities.places) {
      const prev = allPlaces.get(pl.name);
      allPlaces.set(pl.name, { name: pl.name, period: pl.period, count: (prev?.count ?? 0) + 1 });
    }
    for (const tp of s.extraction.entities.timeperiods) {
      allTimeperiods.set(tp, (allTimeperiods.get(tp) ?? 0) + 1);
    }
  }

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="기억 아카이브"
        description="세션에서 추출된 기억·인물·장소·사건을 회원님별로 모아 봅니다."
      />

      <Card className="px-4 py-3">
        <MemberPicker members={members} selectedId={memberId ?? ''} />
      </Card>

      {!memberId ? (
        <div className="mt-6">
          <Card>
            <CardBody>
              <EmptyState title="회원님을 선택해 주세요" hint="위 드롭다운에서 회원을 선택하면 누적된 기억을 볼 수 있어요" />
            </CardBody>
          </Card>
        </div>
      ) : sessions.length === 0 ? (
        <div className="mt-6">
          <Card>
            <CardBody>
              <EmptyState
                title="아직 추출된 기억이 없어요"
                hint="세션이 종료되면 자동으로 추출됩니다. 진행 중인 세션이라면 먼저 종료해 주세요."
              />
            </CardBody>
          </Card>
        </div>
      ) : (
        <>
          {/* keyMemories */}
          <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader title="핵심 기억" description="시기·인물·장소·감정 무게로 정리" action={<Pill>{allMemories.length}개</Pill>} />
              <CardBody>
                {allMemories.length === 0 ? (
                  <EmptyState title="추출된 핵심 기억이 없어요" hint="짧거나 의미 있는 회상이 적은 세션입니다" />
                ) : (
                  <ul className="space-y-4">
                    {allMemories.map((m, i) => (
                      <li key={`${m.sessionId}-${i}`} className="border-l-2 border-slate-200 pl-4 dark:border-slate-700">
                        <div className="flex items-center gap-2 flex-wrap">
                          <div className="text-[14px] font-semibold text-slate-900 dark:text-slate-100">{m.title}</div>
                          {m.period && <Pill>{m.period}</Pill>}
                          <span className="text-[11px] text-slate-400 dark:text-slate-500">{m.sessionNumber}회차 · {formatDate(m.startedAt)}</span>
                        </div>
                        <p className="mt-1.5 text-[13px] text-slate-700 leading-relaxed dark:text-slate-300">{m.description}</p>
                        {m.supportingQuote && (
                          <blockquote className="mt-2 pl-3 border-l-2 border-amber-200 text-[12px] text-slate-600 italic dark:text-slate-400">
                            "{m.supportingQuote}"
                          </blockquote>
                        )}
                        <div className="mt-2 flex items-center gap-2 flex-wrap text-[11px] text-slate-500 dark:text-slate-400">
                          <span>감정 무게 <span className="text-slate-700 font-semibold dark:text-slate-300">{(m.emotionalWeight * 100).toFixed(0)}%</span></span>
                          {m.people && m.people.length > 0 && <span>· 인물: {m.people.join(', ')}</span>}
                          {m.places && m.places.length > 0 && <span>· 장소: {m.places.join(', ')}</span>}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </CardBody>
            </Card>

            <Card>
              <CardHeader title="감정적 보물" description="어르신이 깊이 반응한 발화" action={<Pill tone="warning">{allTreasures.length}개</Pill>} />
              <CardBody>
                {allTreasures.length === 0 ? (
                  <EmptyState title="감지된 보물이 없어요" hint="'보고 싶', '아직도 생각나' 등 매칭 시 자동 기록" />
                ) : (
                  <ul className="space-y-3">
                    {allTreasures.map((t, i) => (
                      <li key={`${t.sessionId}-${i}`} className="rounded-lg bg-amber-50/60 ring-1 ring-amber-100 p-3">
                        <blockquote className="text-[13px] text-slate-800 leading-relaxed dark:text-slate-200">"{t.quote}"</blockquote>
                        <div className="mt-1.5 text-[11px] text-slate-500 dark:text-slate-400">{t.context} · {t.type === 'explicit' ? '명시적' : '암묵적'} · {t.sessionNumber}회차</div>
                      </li>
                    ))}
                  </ul>
                )}
              </CardBody>
            </Card>
          </div>

          {/* 엔티티 그래프 */}
          <div className="mt-6">
            <Card>
              <CardHeader title="엔티티 그래프" description="누적 등장 인물·장소·시기" />
              <CardBody>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <div className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold mb-2 dark:text-slate-500">인물 ({allPeople.size})</div>
                    {allPeople.size === 0 ? (
                      <div className="text-[12px] text-slate-400 dark:text-slate-500">없음</div>
                    ) : (
                      <ul className="space-y-1">
                        {[...allPeople.values()].sort((a, b) => b.count - a.count).map((p) => (
                          <li key={p.name} className="text-[12px] text-slate-700 flex items-center gap-1.5 dark:text-slate-300">
                            <span className="font-medium">{p.name}</span>
                            {p.relation && p.relation !== p.name && <span className="text-slate-400 dark:text-slate-500">({p.relation})</span>}
                            {p.aliveStatus === 'deceased' && <Pill>작고</Pill>}
                            <span className="text-slate-400 ml-auto tabular-nums dark:text-slate-500">{p.count}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <div>
                    <div className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold mb-2 dark:text-slate-500">장소 ({allPlaces.size})</div>
                    {allPlaces.size === 0 ? (
                      <div className="text-[12px] text-slate-400 dark:text-slate-500">없음</div>
                    ) : (
                      <ul className="space-y-1">
                        {[...allPlaces.values()].sort((a, b) => b.count - a.count).map((p) => (
                          <li key={p.name} className="text-[12px] text-slate-700 flex items-center gap-1.5 dark:text-slate-300">
                            <span className="font-medium">{p.name}</span>
                            {p.period && <span className="text-slate-400 dark:text-slate-500">({p.period})</span>}
                            <span className="text-slate-400 ml-auto tabular-nums dark:text-slate-500">{p.count}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <div>
                    <div className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold mb-2 dark:text-slate-500">시기 ({allTimeperiods.size})</div>
                    {allTimeperiods.size === 0 ? (
                      <div className="text-[12px] text-slate-400 dark:text-slate-500">없음</div>
                    ) : (
                      <ul className="space-y-1">
                        {[...allTimeperiods.entries()].sort((a, b) => b[1] - a[1]).map(([tp, count]) => (
                          <li key={tp} className="text-[12px] text-slate-700 flex items-center gap-1.5 dark:text-slate-300">
                            <span className="font-medium">{tp}</span>
                            <span className="text-slate-400 ml-auto tabular-nums dark:text-slate-500">{count}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </CardBody>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
