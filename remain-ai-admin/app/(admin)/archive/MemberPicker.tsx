'use client';

import { useRouter } from 'next/navigation';
import type { Member } from '@/lib/members';

export default function MemberPicker({
  members,
  selectedId,
}: {
  members: Member[];
  selectedId: string;
}) {
  const router = useRouter();

  return (
    <select
      value={selectedId}
      onChange={(e) => {
        const id = e.target.value;
        if (id) router.push(`/archive?member=${id}`);
        else router.push('/archive');
      }}
      className="flex-1 px-3 py-2 rounded-lg bg-slate-50 ring-1 ring-slate-100 text-[13px] text-slate-700 dark:text-slate-300 dark:bg-slate-800/50 dark:ring-slate-800"
    >
      <option value="">
        {members.length === 0 ? '등록된 회원이 없습니다' : '회원님 선택'}
      </option>
      {members.map((m) => (
        <option key={m.id} value={m.id}>
          {m.name} ({m.age}세) · {m.facility}
        </option>
      ))}
    </select>
  );
}
