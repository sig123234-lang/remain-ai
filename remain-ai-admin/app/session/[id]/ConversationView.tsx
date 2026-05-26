'use client';

import { useState } from 'react';
import Orb from '@/components/Orb';

type UIState = 'idle' | 'listening' | 'speaking' | 'thinking';

export default function ConversationView({ sessionId }: { sessionId: string }) {
  const [uiState, setUiState] = useState<UIState>('idle');

  // 백엔드 연결 전 — 탭하면 시각적으로만 listening으로 전환 (실제 STT/TTS/LLM은 추후 연결)
  const handleTapOrb = () => {
    if (uiState === 'idle') {
      setUiState('listening');
      // 5초 후 다시 idle (mock)
      setTimeout(() => setUiState('idle'), 5000);
    }
  };

  const mainText =
    uiState === 'idle'
      ? '당신의 이야기를 듣고 싶어요.\n시작해 볼까요?'
      : uiState === 'listening'
      ? '천천히 말씀해 주세요'
      : uiState === 'speaking'
      ? '편안하게 들으세요'
      : '잠시만 기다려 주세요';

  const hintText =
    uiState === 'idle'
      ? '아래 원을 가볍게 눌러 시작해 보세요'
      : uiState === 'listening'
      ? '편안하게, 그대로 들려주세요'
      : '';

  return (
    <div className="relative min-h-screen w-full bg-white overflow-hidden">
      {/* 미세 배경 톤 */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-white via-white to-slate-50/40" aria-hidden />

      {/* 세션 ID — 우상단 작게 (개발 단계 한정) */}
      <div className="absolute top-0 right-0 pt-safe">
        <div className="px-5 pt-5">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-50 ring-1 ring-slate-100 text-[10px] font-mono text-slate-400">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500" />
            {sessionId}
          </span>
        </div>
      </div>

      {/* 메인 — 오브 + 텍스트 */}
      <main className="relative flex flex-col items-center justify-center min-h-svh px-6 pt-safe pb-32">
        <div className="h-6 mb-8" />

        {/* idle 상태에는 오브 자체가 탭 영역 */}
        {uiState === 'idle' ? (
          <button
            onClick={handleTapOrb}
            aria-label="대화 시작하기"
            className="rounded-full transition-transform duration-200 active:scale-95 hover:scale-[1.02] cursor-pointer"
          >
            <Orb size="lg" state="idle" />
          </button>
        ) : (
          <Orb size="lg" state={uiState} />
        )}

        <div className="mt-12 sm:mt-14 text-center max-w-md mx-auto px-2">
          <p
            key={mainText}
            className="text-[22px] sm:text-[26px] font-medium text-slate-800 leading-[1.45] tracking-tight whitespace-pre-line animate-fade-in-up"
          >
            {mainText}
          </p>
          {hintText && (
            <p key={`hint-${hintText}`} className="mt-3 text-sm text-slate-400 animate-fade-in">
              {hintText}
            </p>
          )}
        </div>
      </main>

      {/* 백엔드 연결 안내 (개발 단계) */}
      <div className="absolute bottom-0 inset-x-0 pb-safe">
        <div className="px-6 pb-6 text-center">
          <p className="text-[11px] text-slate-300 tracking-wide">
            데모 페이지 · 음성/대화 백엔드 연결 후 활성화됩니다
          </p>
        </div>
      </div>
    </div>
  );
}
