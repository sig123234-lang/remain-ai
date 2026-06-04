'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import PageHeader from '@/components/PageHeader';
import { Card, CardBody, CardHeader, EmptyState, Pill, StatusDot } from '@/components/Card';
import NewMemberDrawer, { type NewMemberInput, type NewMemberSubmitResult } from '@/components/NewMemberDrawer';
import { cognitiveBadge, timeAgoKo, type Member } from '@/lib/members';
import type { Facility } from '@/lib/facilities';
import { createMember } from './actions';

type CogFilter = 'all' | 'normal' | 'MCI' | 'moderate';

export default function MembersClient({
  initial,
  source,
  facilities: allFacilities,
}: {
  initial: Member[];
  source: 'db' | 'unconfigured';
  facilities: Facility[];
}) {
  const router = useRouter();
  const [members, setMembers] = useState<Member[]>(initial);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [cogFilter, setCogFilter] = useState<CogFilter>('all');
  const [facilityFilter, setFacilityFilter] = useState<string>('all');

  const facilityOptions = useMemo(() => {
    const set = new Set(members.map((m) => m.facility));
    return ['all', ...Array.from(set)];
  }, [members]);

  const filtered = useMemo(() => {
    let arr = members;
    if (cogFilter !== 'all') arr = arr.filter((m) => m.cognitiveLevel === cogFilter);
    if (facilityFilter !== 'all') arr = arr.filter((m) => m.facility === facilityFilter);
    const q = query.trim();
    if (q) {
      arr = arr.filter(
        (m) =>
          m.name.includes(q) ||
          m.facility.includes(q) ||
          (m.guardianName ?? '').includes(q),
      );
    }
    return arr;
  }, [members, query, cogFilter, facilityFilter]);

  const guardians = useMemo(
    () => members.filter((m) => m.guardianName),
    [members],
  );

  async function handleCreated(input: NewMemberInput): Promise<NewMemberSubmitResult> {
    const result = await createMember(input);
    if (result.ok && result.member) {
      setMembers([result.member, ...members]);
      setDrawerOpen(false);
      return { ok: true };
    }
    return { ok: false, error: result.error };
  }

  return (
    <>
      {source === 'unconfigured' && (
        <div className="mb-4 rounded-xl bg-amber-50 ring-1 ring-amber-200 px-3 py-2 text-[12px] text-amber-800 flex items-center gap-2">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-500" />
          <span>Supabase 미연결 — .env.local 설정 후 사용 가능합니다.</span>
        </div>
      )}
      <PageHeader
        title="회원 관리"
        description="회원님과 보호자 정보를 등록하고 관리합니다."
        actions={
          <button
            onClick={() => setDrawerOpen(true)}
            className="px-4 py-2 rounded-xl bg-slate-900 text-white text-[13px] font-semibold hover:bg-slate-800 active:scale-[0.99] transition flex items-center gap-1.5"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4" aria-hidden>
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            신규 등록
          </button>
        }
      />

      {/* 검색바 */}
      <Card className="px-4 py-3">
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="이름, 보호자명, 시설명으로 검색"
            className="flex-1 px-3 py-2 rounded-lg bg-slate-50 ring-1 ring-slate-100 text-[13px] text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300 dark:text-slate-200 dark:bg-slate-800/50 dark:ring-slate-800 dark:placeholder:text-slate-500"
          />
          <div className="flex gap-2">
            <select
              value={cogFilter}
              onChange={(e) => setCogFilter(e.target.value as CogFilter)}
              className="px-3 py-2 rounded-lg bg-slate-50 ring-1 ring-slate-100 text-[13px] text-slate-700 dark:text-slate-300 dark:bg-slate-800/50 dark:ring-slate-800"
            >
              <option value="all">전체 인지수준</option>
              <option value="normal">정상</option>
              <option value="MCI">MCI</option>
              <option value="moderate">중등도</option>
            </select>
            <select
              value={facilityFilter}
              onChange={(e) => setFacilityFilter(e.target.value)}
              className="px-3 py-2 rounded-lg bg-slate-50 ring-1 ring-slate-100 text-[13px] text-slate-700 dark:text-slate-300 dark:bg-slate-800/50 dark:ring-slate-800"
            >
              {facilityOptions.map((f) => (
                <option key={f} value={f}>{f === 'all' ? '전체 시설' : f}</option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      {/* 회원님 리스트 */}
      <div className="mt-6">
        <Card>
          <CardHeader
            title="회원님 목록"
            description="이름 · 나이 · 인지수준 · 보호자 · 세션 수"
            action={<Pill>{filtered.length}명</Pill>}
          />
          <CardBody>
            {filtered.length === 0 ? (
              <EmptyState
                title={members.length === 0 ? '아직 등록된 회원님이 없어요' : '검색 결과가 없어요'}
                hint={members.length === 0 ? '우상단 "신규 등록" 버튼으로 시작하세요' : '필터를 조정해 보세요'}
              />
            ) : (
              <>
                {/* 데스크탑 테이블 */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-[13px]">
                    <thead>
                      <tr className="text-left text-slate-400 uppercase tracking-wider text-[10px] font-semibold border-b border-slate-100 dark:text-slate-500 dark:border-slate-800">
                        <th className="py-3 px-2">이름</th>
                        <th className="py-3 px-2">나이</th>
                        <th className="py-3 px-2">인지수준</th>
                        <th className="py-3 px-2">시설</th>
                        <th className="py-3 px-2">보호자</th>
                        <th className="py-3 px-2">세션</th>
                        <th className="py-3 px-2">마지막</th>
                        <th className="py-3 px-2">상태</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {filtered.map((m) => (
                        <tr
                          key={m.id}
                          onClick={() => router.push(`/members/${m.id}`)}
                          className="hover:bg-slate-50 transition cursor-pointer dark:hover:bg-slate-800/50"
                        >
                          <td className="py-2.5 px-2">
                            <div className="flex items-center gap-2">
                              <div className="grid place-items-center w-7 h-7 rounded-full bg-slate-100 text-slate-600 text-[11px] font-bold shrink-0 dark:text-slate-400 dark:bg-slate-800">
                                {m.name.charAt(0)}
                              </div>
                              <span className="font-semibold text-slate-900 dark:text-slate-100">{m.name}</span>
                            </div>
                          </td>
                          <td className="py-2.5 px-2 tabular-nums text-slate-700 dark:text-slate-300">{m.age}세</td>
                          <td className="py-2.5 px-2 text-slate-700 dark:text-slate-300">{cognitiveBadge(m.cognitiveLevel)}</td>
                          <td className="py-2.5 px-2 text-slate-500 dark:text-slate-400">{m.facility}</td>
                          <td className="py-2.5 px-2 text-slate-700 dark:text-slate-300">
                            {m.guardianName ? (
                              <>
                                {m.guardianName}
                                <span className="text-slate-400 text-[11px] ml-1 dark:text-slate-500">{m.guardianRelation}</span>
                              </>
                            ) : (
                              <span className="text-slate-300">미등록</span>
                            )}
                          </td>
                          <td className="py-2.5 px-2 tabular-nums text-slate-700 dark:text-slate-300">{m.sessionCount}</td>
                          <td className="py-2.5 px-2 text-slate-500 tabular-nums dark:text-slate-400">{timeAgoKo(m.lastSessionAt)}</td>
                          <td className="py-2.5 px-2">
                            {m.inActiveSession ? (
                              <span className="inline-flex items-center gap-1.5">
                                <StatusDot tone="success" />
                                <span className="text-[11px] font-semibold text-emerald-700">진행 중</span>
                              </span>
                            ) : (
                              <span className="text-slate-300">·</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {/* 모바일 카드 리스트 */}
                <ul className="md:hidden divide-y divide-slate-100 -mx-2 dark:divide-slate-800">
                  {filtered.map((m) => (
                    <li key={m.id}>
                      <Link
                        href={`/members/${m.id}`}
                        className="py-3 px-2 flex items-center gap-3 hover:bg-slate-50 transition dark:hover:bg-slate-800/50"
                      >
                        <div className="grid place-items-center w-9 h-9 rounded-full bg-slate-100 text-slate-600 text-[12px] font-bold shrink-0 dark:text-slate-400 dark:bg-slate-800">
                          {m.name.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-[14px] font-semibold text-slate-900 dark:text-slate-100">{m.name}</span>
                            <span className="text-[12px] text-slate-400 dark:text-slate-500">{m.age}세</span>
                            {m.inActiveSession && <Pill tone="success">진행 중</Pill>}
                          </div>
                          <div className="text-[11px] text-slate-400 mt-0.5 truncate dark:text-slate-500">
                            {cognitiveBadge(m.cognitiveLevel)} · {m.facility} · {m.sessionCount}회차
                            {m.guardianName && <> · {m.guardianName}({m.guardianRelation})</>}
                          </div>
                        </div>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-slate-300 shrink-0" aria-hidden>
                          <path d="M9 6l6 6-6 6" />
                        </svg>
                      </Link>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </CardBody>
        </Card>
      </div>

      {/* 보호자 요약 */}
      <div className="mt-6">
        <Card>
          <CardHeader
            title="보호자"
            description="리포트 수신 대상 — guardianName/guardianRelation 필수"
            action={<Pill>{guardians.length}명</Pill>}
          />
          <CardBody>
            {guardians.length === 0 ? (
              <EmptyState title="아직 등록된 보호자가 없어요" hint="회원님 등록 시 함께 추가됩니다" />
            ) : (
              <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                {guardians.slice(0, 5).map((m) => (
                  <li key={m.id} className="py-2.5 flex items-center gap-3">
                    <div className="grid place-items-center w-8 h-8 rounded-full bg-slate-100 text-slate-600 text-[11px] font-bold shrink-0 dark:text-slate-400 dark:bg-slate-800">
                      {m.guardianName?.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-semibold text-slate-800 dark:text-slate-200">
                        {m.guardianName}님 <span className="font-normal text-slate-400 dark:text-slate-500">{m.guardianRelation}</span>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5 dark:text-slate-500">→ {m.name} 회원님 · {m.facility}</div>
                    </div>
                  </li>
                ))}
                {guardians.length > 5 && (
                  <li className="py-3 text-center text-[12px] text-slate-400 dark:text-slate-500">+{guardians.length - 5}명 더</li>
                )}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>

      <NewMemberDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onSubmit={handleCreated}
        facilities={allFacilities}
      />
    </>
  );
}
