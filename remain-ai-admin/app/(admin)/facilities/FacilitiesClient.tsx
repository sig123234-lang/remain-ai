'use client';

import { useState, useTransition } from 'react';
import PageHeader from '@/components/PageHeader';
import { Card, CardBody, CardHeader, EmptyState, Pill } from '@/components/Card';
import type { Facility } from '@/lib/facilities';
import { createFacility, deleteFacility, updateFacility } from './actions';

function dateKo(iso: string): string {
  const ms = new Date(iso).getTime() + 9 * 3_600_000;
  const d = new Date(ms);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

const inputCls =
  'w-full px-3 py-2.5 rounded-xl bg-slate-50 ring-1 ring-slate-100 text-[14px] text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300';

function BuildingGlyph({ name }: { name: string }) {
  return (
    <div className="grid place-items-center w-10 h-10 rounded-xl bg-slate-100 text-slate-700 shrink-0">
      <span className="text-[14px] font-bold">{name.charAt(0)}</span>
    </div>
  );
}

function PhoneIcon({ className = 'w-3.5 h-3.5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  );
}

function PinIcon({ className = 'w-3.5 h-3.5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

function UserIcon({ className = 'w-3.5 h-3.5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

export default function FacilitiesClient({
  initial,
  source,
}: {
  initial: Facility[];
  source: 'db' | 'mock';
}) {
  const [facilities, setFacilities] = useState<Facility[]>(initial);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<Facility | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Facility | null>(null);
  const [rowError, setRowError] = useState<{ id: string; message: string } | null>(null);
  const [, startTransition] = useTransition();

  function refresh(next: Facility[]) {
    setFacilities(next);
  }

  function openCreate() {
    setEditing(null);
    setDrawerOpen(true);
  }
  function openEdit(f: Facility) {
    setEditing(f);
    setDrawerOpen(true);
  }

  async function handleDelete(f: Facility) {
    setRowError(null);
    const res = await deleteFacility(f.id);
    if (!res.ok) {
      setRowError({ id: f.id, message: res.error ?? '삭제 실패' });
      setConfirmDelete(null);
      return;
    }
    setConfirmDelete(null);
    startTransition(() => refresh(facilities.filter((x) => x.id !== f.id)));
  }

  return (
    <>
      {source === 'mock' && (
        <div className="mb-4 rounded-xl bg-amber-50 ring-1 ring-amber-200 px-3 py-2 text-[12px] text-amber-800 flex items-center gap-2">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-500" />
          <span>Supabase 미연결 — 시설 등록을 사용하려면 .env.local 설정이 필요합니다.</span>
        </div>
      )}

      <PageHeader
        title="시설 관리"
        description="요양원·복지센터 등 시설을 등록·관리합니다."
        actions={
          <button
            onClick={openCreate}
            className="px-4 py-2 rounded-xl bg-slate-900 text-white text-[13px] font-semibold hover:bg-slate-800 active:scale-[0.99] transition flex items-center gap-1.5"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4" aria-hidden>
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            새 시설 등록
          </button>
        }
      />

      <Card>
        <CardHeader title="시설 목록" action={<Pill>{facilities.length}곳</Pill>} />
        <CardBody>
          {facilities.length === 0 ? (
            <EmptyState
              title="아직 등록된 시설이 없어요"
              hint='우상단 "새 시설 등록" 버튼으로 시작하세요'
            />
          ) : (
            <ul className="divide-y divide-slate-100">
              {facilities.map((f) => (
                <li key={f.id} className="py-3 flex items-start gap-3">
                  <BuildingGlyph name={f.name} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[14px] font-semibold text-slate-900 truncate">{f.name}</span>
                      {typeof f.memberCount === 'number' && (
                        <span className="text-[11px] text-slate-400">회원 <span className="tabular-nums">{f.memberCount}</span>명</span>
                      )}
                    </div>
                    <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[12px] text-slate-500">
                      {f.address && (
                        <span className="inline-flex items-center gap-1.5"><PinIcon /><span className="truncate">{f.address}</span></span>
                      )}
                      {f.phone && (
                        <span className="inline-flex items-center gap-1.5"><PhoneIcon /><span className="tabular-nums">{f.phone}</span></span>
                      )}
                      {(f.managerName || f.managerPhone) && (
                        <span className="inline-flex items-center gap-1.5">
                          <UserIcon />
                          <span>
                            {f.managerName ?? '관리자'}
                            {f.managerPhone && <span className="ml-1 tabular-nums text-slate-400">{f.managerPhone}</span>}
                          </span>
                        </span>
                      )}
                    </div>
                    <div className="mt-1 text-[11px] text-slate-300">등록 {dateKo(f.createdAt)}</div>
                    {rowError?.id === f.id && (
                      <div className="mt-1.5 text-[11px] text-red-700">{rowError.message}</div>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => openEdit(f)}
                      className="px-3 py-1.5 rounded-lg text-[12px] font-semibold text-slate-600 hover:bg-slate-100 transition"
                    >
                      수정
                    </button>
                    <button
                      onClick={() => { setRowError(null); setConfirmDelete(f); }}
                      className="px-3 py-1.5 rounded-lg text-[12px] font-semibold text-red-600 hover:bg-red-50 transition"
                    >
                      삭제
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>

      {drawerOpen && (
        <FacilityFormDrawer
          editing={editing}
          onClose={() => setDrawerOpen(false)}
          onSaved={(updated) => {
            setDrawerOpen(false);
            if (editing) {
              refresh(facilities.map((x) => (x.id === updated.id ? { ...x, ...updated } : x)));
            } else {
              refresh([...facilities, updated]);
            }
          }}
        />
      )}

      {confirmDelete && (
        <ConfirmDialog
          title={`"${confirmDelete.name}" 시설을 삭제할까요?`}
          description="회원이 한 명이라도 등록된 시설은 삭제할 수 없습니다. 먼저 회원을 다른 시설로 옮기거나 삭제해 주세요."
          confirmLabel="삭제"
          tone="danger"
          onCancel={() => setConfirmDelete(null)}
          onConfirm={() => handleDelete(confirmDelete)}
        />
      )}
    </>
  );
}

// ─────────────────────────────────────────────
//  등록/수정 드로어
// ─────────────────────────────────────────────
function FacilityFormDrawer({
  editing,
  onClose,
  onSaved,
}: {
  editing: Facility | null;
  onClose: () => void;
  onSaved: (f: Facility) => void;
}) {
  const [name, setName] = useState(editing?.name ?? '');
  const [phone, setPhone] = useState(editing?.phone ?? '');
  const [managerName, setManagerName] = useState(editing?.managerName ?? '');
  const [managerPhone, setManagerPhone] = useState(editing?.managerPhone ?? '');
  const [address, setAddress] = useState(editing?.address ?? '');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);
    const payload = { name, phone, managerName, managerPhone, address };
    if (editing) {
      const res = await updateFacility({ id: editing.id, ...payload });
      setSubmitting(false);
      if (!res.ok) { setError(res.error ?? '저장 실패'); return; }
      onSaved({
        ...editing,
        name: name.trim(),
        phone: phone.trim() || undefined,
        managerName: managerName.trim() || undefined,
        managerPhone: managerPhone.trim() || undefined,
        address: address.trim() || undefined,
      });
    } else {
      const res = await createFacility(payload);
      setSubmitting(false);
      if (!res.ok || !res.facility) { setError(res.error ?? '등록 실패'); return; }
      onSaved(res.facility);
    }
  }

  return (
    <>
      <button
        aria-label="닫기"
        onClick={onClose}
        className="fixed inset-0 z-40 bg-slate-900/30 backdrop-blur-sm animate-fade-in"
      />
      <aside
        role="dialog"
        aria-label={editing ? '시설 수정' : '새 시설 등록'}
        className="fixed top-0 right-0 bottom-0 z-50 w-full sm:w-[480px] max-w-[100vw] bg-white shadow-2xl flex flex-col animate-fade-in-up overflow-hidden"
      >
        <div className="px-5 py-4 border-b border-slate-100 flex items-start justify-between gap-3">
          <div>
            <div className="text-[18px] font-bold text-slate-900 tracking-tight">
              {editing ? '시설 수정' : '새 시설 등록'}
            </div>
            <div className="text-[12px] text-slate-400 mt-0.5">시설명만 필수, 나머지는 선택 입력입니다.</div>
          </div>
          <button onClick={onClose} aria-label="닫기" className="grid place-items-center w-9 h-9 rounded-full hover:bg-slate-100 active:scale-95 transition">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 text-slate-700" aria-hidden>
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
          <section>
            <div className="text-[11px] uppercase tracking-wider font-semibold text-slate-400 mb-3">기본</div>
            <label className="block text-[12px] font-semibold text-slate-500 mb-1.5">
              시설명 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="예: 한울요양원 A동"
              className={inputCls}
              autoFocus
            />
          </section>

          <section>
            <div className="text-[11px] uppercase tracking-wider font-semibold text-slate-400 mb-3">연락처</div>
            <div className="space-y-3">
              <div>
                <label className="block text-[12px] font-semibold text-slate-500 mb-1.5">대표 전화</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="02-0000-0000"
                  className={inputCls}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[12px] font-semibold text-slate-500 mb-1.5">관리자 이름</label>
                  <input
                    type="text"
                    value={managerName}
                    onChange={(e) => setManagerName(e.target.value)}
                    placeholder="예: 김원장"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="block text-[12px] font-semibold text-slate-500 mb-1.5">관리자 번호</label>
                  <input
                    type="tel"
                    value={managerPhone}
                    onChange={(e) => setManagerPhone(e.target.value)}
                    placeholder="010-0000-0000"
                    className={inputCls}
                  />
                </div>
              </div>
            </div>
          </section>

          <section>
            <div className="text-[11px] uppercase tracking-wider font-semibold text-slate-400 mb-3">주소</div>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="서울특별시 ○○구 ○○로 00"
              className={inputCls}
            />
          </section>
        </div>

        <div className="border-t border-slate-100 bg-white">
          {error && (
            <div className="mx-5 mt-3 rounded-xl bg-red-50 ring-1 ring-red-200 px-3 py-2 text-[12px] text-red-700 animate-fade-in">
              {error}
            </div>
          )}
          <div className="px-5 py-3 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-slate-50 ring-1 ring-slate-200 text-slate-700 text-[13px] font-semibold hover:bg-slate-100 active:scale-[0.99] transition"
            >
              취소
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="px-4 py-2.5 rounded-xl bg-slate-900 text-white text-[13px] font-semibold hover:bg-slate-800 active:scale-[0.99] transition disabled:opacity-60"
            >
              {submitting ? '저장 중…' : editing ? '저장' : '등록'}
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}

// ─────────────────────────────────────────────
//  공용 확인 다이얼로그
// ─────────────────────────────────────────────
function ConfirmDialog({
  title,
  description,
  confirmLabel,
  tone = 'default',
  onConfirm,
  onCancel,
}: {
  title: string;
  description?: string;
  confirmLabel: string;
  tone?: 'default' | 'danger';
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const [busy, setBusy] = useState(false);
  return (
    <>
      <button aria-label="닫기" onClick={onCancel} className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm animate-fade-in" />
      <div role="dialog" aria-label={title} className="fixed left-1/2 top-1/2 z-50 w-[92%] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white shadow-2xl animate-fade-in-up p-5">
        <div className="text-[16px] font-bold text-slate-900 tracking-tight">{title}</div>
        {description && <p className="mt-2 text-[13px] text-slate-500 leading-relaxed">{description}</p>}
        <div className="mt-5 grid grid-cols-2 gap-2">
          <button onClick={onCancel} className="px-4 py-2.5 rounded-xl bg-slate-50 ring-1 ring-slate-200 text-slate-700 text-[13px] font-semibold hover:bg-slate-100 transition">
            취소
          </button>
          <button
            onClick={async () => { setBusy(true); try { await onConfirm(); } finally { setBusy(false); } }}
            disabled={busy}
            className={`px-4 py-2.5 rounded-xl text-white text-[13px] font-semibold transition disabled:opacity-60 ${tone === 'danger' ? 'bg-red-600 hover:bg-red-700' : 'bg-slate-900 hover:bg-slate-800'}`}
          >
            {busy ? '처리 중…' : confirmLabel}
          </button>
        </div>
      </div>
    </>
  );
}
