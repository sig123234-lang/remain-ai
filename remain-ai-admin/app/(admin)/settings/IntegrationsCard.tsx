'use client';

import { useState } from 'react';
import { Card, CardBody, CardHeader, Pill } from '@/components/Card';

export interface IntegrationStatus {
  id: 'anthropic' | 'openai_stt' | 'openai_tts' | 'supabase';
  name: string;
  detail: string;
  connected: boolean;
}

interface TestState {
  status: 'idle' | 'loading' | 'ok' | 'error';
  message?: string;
  text?: string;
  usage?: { input: number; output: number; cacheWrite: number; cacheRead: number };
}

export default function IntegrationsCard({ integrations }: { integrations: IntegrationStatus[] }) {
  const [test, setTest] = useState<TestState>({ status: 'idle' });

  async function runAnthropicTest() {
    setTest({ status: 'loading' });
    try {
      // basePath '/admin' 적용 — next.config.ts와 동기화 필요
      const res = await fetch('/admin/api/conversation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          member: { name: '테스트', age: 80, cognitiveLevel: 'normal' },
          history: [],
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setTest({ status: 'error', message: data.error ?? `HTTP ${res.status}` });
        return;
      }
      setTest({
        status: 'ok',
        text: data.text,
        usage: {
          input: data.usage.input_tokens,
          output: data.usage.output_tokens,
          cacheWrite: data.usage.cache_creation_input_tokens,
          cacheRead: data.usage.cache_read_input_tokens,
        },
      });
    } catch (e) {
      setTest({ status: 'error', message: e instanceof Error ? e.message : String(e) });
    }
  }

  return (
    <Card>
      <CardHeader title="외부 연동 (API 키)" description=".env.local에서 키 읽고 실연결 상태를 표시합니다" />
      <CardBody>
        <ul className="divide-y divide-slate-100 dark:divide-slate-800">
          {integrations.map((s) => (
            <li key={s.id} className="py-3 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="text-[14px] font-semibold text-slate-800 dark:text-slate-100">{s.name}</div>
                <div className="text-[12px] text-slate-400 dark:text-slate-500 mt-0.5">{s.detail}</div>
              </div>
              {s.id === 'anthropic' && s.connected && (
                <button
                  onClick={runAnthropicTest}
                  disabled={test.status === 'loading'}
                  className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-[12px] font-semibold text-slate-700 dark:text-slate-200 disabled:opacity-60 transition"
                >
                  {test.status === 'loading' ? '호출 중…' : '테스트'}
                </button>
              )}
              {s.connected ? (
                <Pill tone="success">연결됨</Pill>
              ) : (
                <Pill tone="warning">미연결</Pill>
              )}
            </li>
          ))}
        </ul>

        {test.status === 'ok' && (
          <div className="mt-4 rounded-xl bg-emerald-50 ring-1 ring-emerald-200 dark:bg-emerald-950/40 dark:ring-emerald-900/60 p-4">
            <div className="text-[12px] font-semibold text-emerald-800 dark:text-emerald-300 mb-2">✓ Claude 응답 정상</div>
            <div className="text-[13px] text-slate-800 dark:text-slate-100 leading-relaxed whitespace-pre-wrap">
              {test.text}
            </div>
            {test.usage && (
              <div className="mt-3 pt-3 border-t border-emerald-200 dark:border-emerald-900/60 text-[11px] text-emerald-900 dark:text-emerald-300 tabular-nums grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div><span className="text-emerald-600 dark:text-emerald-500">입력</span> {test.usage.input}</div>
                <div><span className="text-emerald-600 dark:text-emerald-500">출력</span> {test.usage.output}</div>
                <div><span className="text-emerald-600 dark:text-emerald-500">캐시 쓰기</span> {test.usage.cacheWrite}</div>
                <div><span className="text-emerald-600 dark:text-emerald-500">캐시 읽기</span> {test.usage.cacheRead}</div>
              </div>
            )}
          </div>
        )}

        {test.status === 'error' && (
          <div className="mt-4 rounded-xl bg-red-50 ring-1 ring-red-200 dark:bg-red-950/40 dark:ring-red-900/60 px-4 py-3 text-[13px] text-red-700 dark:text-red-300">
            <div className="font-semibold mb-1">✗ 호출 실패</div>
            <div className="text-[12px]">{test.message}</div>
          </div>
        )}
      </CardBody>
    </Card>
  );
}
