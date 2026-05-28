'use client';

import type { MemoryImagePrompt, ReportStyle } from '@/lib/guardian-reports';
import { styleLabel } from '@/lib/guardian-reports';

/**
 * 회원님 기억 기반 AI 생성 이미지 — 지브리풍 일러스트 mock.
 * 백엔드 연결 전: SVG로 레이어드 풍경(노을 + 한옥 + 마루의 두 인물 + 산 + 나무) 표현.
 * 백엔드 연결 후: imageUrl이 있으면 실제 이미지를 표시.
 */

// 스타일별 팔레트 정의 — anime_warm을 기본으로 가장 풍부하게.
const PALETTES: Record<ReportStyle, {
  skyTop: string;
  skyMid: string;
  skyBottom: string;
  sunCore: string;
  sunHalo: string;
  cloud: string;
  farMountain: string;
  midHill: string;
  ground: string;
  groundDark: string;
  treeDark: string;
  treeMid: string;
  treeLight: string;
  trunk: string;
  roof: string;
  roofRidge: string;
  wall: string;
  pillar: string;
  paper: string;     // 한지문 — 따뜻한 빛
  pathLight: string;
  pathBorder: string;
  figure: string;
  birds: string;
  villageRoof: string;
  villageWall: string;
}> = {
  anime_warm: {
    skyTop: '#fde68a', skyMid: '#fed7aa', skyBottom: '#fcd34d',
    sunCore: '#fef3c7', sunHalo: '#fde68a',
    cloud: '#ffffff',
    farMountain: '#c4b5fd', midHill: '#86efac',
    ground: '#fed7aa', groundDark: '#fdba74',
    treeDark: '#15803d', treeMid: '#16a34a', treeLight: '#4ade80', trunk: '#7c2d12',
    roof: '#7c2d12', roofRidge: '#451a03',
    wall: '#fef3c7', pillar: '#7c2d12', paper: '#fcd34d',
    pathLight: '#fde68a', pathBorder: '#d97706',
    figure: '#1e293b', birds: '#475569',
    villageRoof: '#92400e', villageWall: '#fef3c7',
  },
  watercolor_warm: {
    skyTop: '#fef3c7', skyMid: '#fed7aa', skyBottom: '#fdba74',
    sunCore: '#fef3c7', sunHalo: '#fde68a',
    cloud: '#ffffff',
    farMountain: '#a5b4fc', midHill: '#bef264',
    ground: '#fed7aa', groundDark: '#fdba74',
    treeDark: '#16a34a', treeMid: '#22c55e', treeLight: '#4ade80', trunk: '#92400e',
    roof: '#92400e', roofRidge: '#451a03',
    wall: '#fef3c7', pillar: '#92400e', paper: '#fde68a',
    pathLight: '#fde68a', pathBorder: '#d97706',
    figure: '#334155', birds: '#475569',
    villageRoof: '#92400e', villageWall: '#fef3c7',
  },
  pencil_sketch: {
    skyTop: '#f1f5f9', skyMid: '#e2e8f0', skyBottom: '#cbd5e1',
    sunCore: '#ffffff', sunHalo: '#f8fafc',
    cloud: '#ffffff',
    farMountain: '#94a3b8', midHill: '#cbd5e1',
    ground: '#e2e8f0', groundDark: '#cbd5e1',
    treeDark: '#475569', treeMid: '#64748b', treeLight: '#94a3b8', trunk: '#334155',
    roof: '#334155', roofRidge: '#1e293b',
    wall: '#e2e8f0', pillar: '#334155', paper: '#f1f5f9',
    pathLight: '#e2e8f0', pathBorder: '#94a3b8',
    figure: '#0f172a', birds: '#334155',
    villageRoof: '#475569', villageWall: '#e2e8f0',
  },
  soft_illustration: {
    skyTop: '#fce7f3', skyMid: '#e9d5ff', skyBottom: '#bae6fd',
    sunCore: '#ffffff', sunHalo: '#fbcfe8',
    cloud: '#ffffff',
    farMountain: '#a5b4fc', midHill: '#86efac',
    ground: '#fce7f3', groundDark: '#fbcfe8',
    treeDark: '#15803d', treeMid: '#16a34a', treeLight: '#4ade80', trunk: '#92400e',
    roof: '#7c2d12', roofRidge: '#451a03',
    wall: '#fef3c7', pillar: '#7c2d12', paper: '#fbcfe8',
    pathLight: '#fce7f3', pathBorder: '#c084fc',
    figure: '#1e293b', birds: '#475569',
    villageRoof: '#92400e', villageWall: '#fef3c7',
  },
  oil_painting_warm: {
    skyTop: '#fef3c7', skyMid: '#fcd34d', skyBottom: '#f97316',
    sunCore: '#fef3c7', sunHalo: '#fbbf24',
    cloud: '#fef3c7',
    farMountain: '#7c2d12', midHill: '#a16207',
    ground: '#c2410c', groundDark: '#7c2d12',
    treeDark: '#14532d', treeMid: '#15803d', treeLight: '#16a34a', trunk: '#451a03',
    roof: '#451a03', roofRidge: '#1c1917',
    wall: '#fbbf24', pillar: '#451a03', paper: '#fcd34d',
    pathLight: '#fbbf24', pathBorder: '#7c2d12',
    figure: '#1c1917', birds: '#451a03',
    villageRoof: '#451a03', villageWall: '#fbbf24',
  },
};

/** 지브리풍 노을 풍경 — 한옥 마루에 앉은 두 인물 */
function GhibliScene({ style, idSuffix }: { style: ReportStyle; idSuffix: string }) {
  const p = PALETTES[style];
  const skyGradId = `mi-sky-${idSuffix}`;
  const sunGlowId = `mi-sun-${idSuffix}`;
  const groundGradId = `mi-ground-${idSuffix}`;

  return (
    <svg
      viewBox="0 0 400 300"
      className="absolute inset-0 w-full h-full"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden
    >
      <defs>
        <linearGradient id={skyGradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"  stopColor={p.skyTop} />
          <stop offset="55%" stopColor={p.skyMid} />
          <stop offset="100%" stopColor={p.skyBottom} stopOpacity="0.85" />
        </linearGradient>
        <radialGradient id={sunGlowId} cx="0.3" cy="0.36" r="0.55">
          <stop offset="0%"  stopColor={p.sunCore} stopOpacity="0.95" />
          <stop offset="35%" stopColor={p.sunHalo} stopOpacity="0.55" />
          <stop offset="100%" stopColor={p.sunHalo} stopOpacity="0" />
        </radialGradient>
        <linearGradient id={groundGradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={p.ground} />
          <stop offset="100%" stopColor={p.groundDark} />
        </linearGradient>
      </defs>

      {/* 하늘 */}
      <rect width="400" height="200" fill={`url(#${skyGradId})`} />
      {/* 햇살 글로우 */}
      <rect width="400" height="220" fill={`url(#${sunGlowId})`} />

      {/* 해 */}
      <circle cx="118" cy="108" r="34" fill={p.sunCore} opacity="0.7" />
      <circle cx="118" cy="108" r="22" fill={p.sunHalo} opacity="0.95" />

      {/* 멀리 새 두 마리 */}
      <g stroke={p.birds} strokeWidth="1.4" fill="none" strokeLinecap="round" opacity="0.7">
        <path d="M270 70 q3 -3 6 0 q3 -3 6 0" />
        <path d="M291 64 q2 -2 4 0 q2 -2 4 0" />
      </g>

      {/* 푹신한 구름 (지브리 스타일) */}
      <g fill={p.cloud} opacity="0.88">
        <ellipse cx="205" cy="58" rx="22" ry="9" />
        <ellipse cx="222" cy="62" rx="28" ry="11" />
        <ellipse cx="250" cy="54" rx="20" ry="8" />
        <ellipse cx="235" cy="64" rx="16" ry="6.5" />
      </g>
      <g fill={p.cloud} opacity="0.75">
        <ellipse cx="340" cy="32" rx="24" ry="8" />
        <ellipse cx="362" cy="36" rx="17" ry="6.5" />
      </g>

      {/* 멀리 산 (보라/푸른) */}
      <path
        d="M0 155 Q40 138 80 150 Q120 134 160 150 Q200 138 240 150 Q280 140 320 148 Q360 142 400 148 L400 180 L0 180 Z"
        fill={p.farMountain}
        opacity="0.55"
      />

      {/* 중간 언덕 (초록) */}
      <path
        d="M0 175 Q60 162 130 173 Q200 162 280 173 Q340 168 400 172 L400 210 L0 210 Z"
        fill={p.midHill}
        opacity="0.7"
      />
      <path
        d="M0 188 Q70 175 150 186 Q220 176 300 184 Q360 180 400 184 L400 220 L0 220 Z"
        fill={p.midHill}
        opacity="0.85"
      />

      {/* 멀리 마을 (작은 집들) */}
      <g opacity="0.55">
        <g transform="translate(48 178)">
          <rect x="0" y="0" width="7" height="5" fill={p.villageWall} />
          <polygon points="-1.5,0 8.5,0 3.5,-3.5" fill={p.villageRoof} />
        </g>
        <g transform="translate(60 180)">
          <rect x="0" y="0" width="6" height="4" fill={p.villageWall} />
          <polygon points="-1,0 7,0 3,-2.5" fill={p.villageRoof} />
        </g>
        <g transform="translate(310 182)">
          <rect x="0" y="0" width="6" height="4" fill={p.villageWall} />
          <polygon points="-1,0 7,0 3,-2.5" fill={p.villageRoof} />
        </g>
      </g>

      {/* 지면 */}
      <rect y="210" width="400" height="100" fill={`url(#${groundGradId})`} />

      {/* 우측 둥근 나무 (지브리 시그니처) */}
      <g transform="translate(358 198)">
        {/* 줄기 */}
        <rect x="-2" y="0" width="4" height="22" fill={p.trunk} />
        {/* 잎 — 부드럽게 뭉친 형태 */}
        <ellipse cx="0"  cy="-4"  rx="22" ry="20" fill={p.treeDark} opacity="0.75" />
        <ellipse cx="-6" cy="-13" rx="13" ry="13" fill={p.treeMid} opacity="0.95" />
        <ellipse cx="7"  cy="-8"  rx="11" ry="11" fill={p.treeMid} opacity="0.85" />
        <ellipse cx="-2" cy="-18" rx="9"  ry="9"  fill={p.treeLight} opacity="0.85" />
        <ellipse cx="10" cy="-15" rx="6"  ry="6"  fill={p.treeLight} opacity="0.75" />
      </g>

      {/* 한옥 (중앙) — 디테일 풍부 */}
      <g transform="translate(180 235)">
        {/* 처마 그림자 */}
        <rect x="-58" y="-10" width="116" height="36" fill={p.roofRidge} opacity="0.12" />

        {/* 지붕 (한옥 곡선) */}
        <path
          d="M-72 -16 Q-82 -30 -56 -36 L56 -36 Q82 -30 72 -16 Z"
          fill={p.roof}
        />
        {/* 지붕 능선 */}
        <rect x="-72" y="-18" width="144" height="3.5" fill={p.roofRidge} />
        {/* 기와 줄 (수평 라인) */}
        <g stroke={p.roofRidge} strokeWidth="0.5" opacity="0.45">
          <path d="M-70 -22 Q-78 -28 -56 -32 L56 -32 Q78 -28 70 -22" fill="none" />
          <path d="M-69 -27 Q-76 -31 -55 -34 L55 -34 Q76 -31 69 -27" fill="none" />
        </g>
        {/* 기와 짧은 세로 (질감) */}
        <g stroke={p.roofRidge} strokeWidth="0.4" opacity="0.35">
          <line x1="-50" y1="-31" x2="-50" y2="-17" />
          <line x1="-30" y1="-33" x2="-30" y2="-17" />
          <line x1="-10" y1="-34" x2="-10" y2="-17" />
          <line x1="10"  y1="-34" x2="10"  y2="-17" />
          <line x1="30"  y1="-33" x2="30"  y2="-17" />
          <line x1="50"  y1="-31" x2="50"  y2="-17" />
        </g>
        {/* 처마 양끝 곡선 강조 (한옥 시그니처) */}
        <path d="M-72 -16 Q-82 -27 -74 -34" stroke={p.roofRidge} strokeWidth="1.4" fill="none" />
        <path d="M72 -16 Q82 -27 74 -34" stroke={p.roofRidge} strokeWidth="1.4" fill="none" />
        {/* 처마 끝 장식점 */}
        <circle cx="-74" cy="-15" r="1.5" fill={p.roofRidge} />
        <circle cx="74" cy="-15" r="1.5" fill={p.roofRidge} />

        {/* 벽 */}
        <rect x="-58" y="-13" width="116" height="38" fill={p.wall} opacity="0.96" />

        {/* 기둥 (3개) */}
        <rect x="-58" y="-13" width="3.5" height="38" fill={p.pillar} />
        <rect x="-1.8" y="-13" width="3" height="38" fill={p.pillar} opacity="0.85" />
        <rect x="54.5" y="-13" width="3.5" height="38" fill={p.pillar} />

        {/* 한지문 (왼쪽 + 오른쪽) — 안쪽 따뜻한 빛 */}
        <rect x="-51" y="-5" width="26" height="24" fill={p.paper} opacity="0.85" stroke={p.pillar} strokeWidth="0.7" />
        <rect x="2"   y="-5" width="26" height="24" fill={p.paper} opacity="0.85" stroke={p.pillar} strokeWidth="0.7" />
        {/* 한지문 격자 (더 촘촘) */}
        <g stroke={p.pillar} strokeWidth="0.5" opacity="0.45">
          <line x1="-38" y1="-5" x2="-38" y2="19" />
          <line x1="-51" y1="3"  x2="-25" y2="3" />
          <line x1="-51" y1="11" x2="-25" y2="11" />
          <line x1="15"  y1="-5" x2="15"  y2="19" />
          <line x1="2"   y1="3"  x2="28"  y2="3" />
          <line x1="2"   y1="11" x2="28"  y2="11" />
        </g>
        {/* 한지문 안쪽 따뜻한 발광 */}
        <rect x="-50" y="-4" width="24" height="22" fill={p.sunCore} opacity="0.18" />
        <rect x="3"   y="-4" width="24" height="22" fill={p.sunCore} opacity="0.18" />

        {/* 마루 (나무 결) */}
        <rect x="-72" y="25" width="144" height="8" fill={p.pillar} />
        <rect x="-72" y="33" width="144" height="2" fill={p.roofRidge} />
        {/* 마루 판자 결 */}
        <g stroke={p.roofRidge} strokeWidth="0.4" opacity="0.4">
          <line x1="-50" y1="25" x2="-50" y2="33" />
          <line x1="-25" y1="25" x2="-25" y2="33" />
          <line x1="0"   y1="25" x2="0"   y2="33" />
          <line x1="25"  y1="25" x2="25"  y2="33" />
          <line x1="50"  y1="25" x2="50"  y2="33" />
        </g>

        {/* 마루 위 작은 디테일 — 등불 + 신발 두 켤레 (인물 부재 = 시적 여백) */}
        {/* 등불 (왼쪽) */}
        <g transform="translate(-44 19)">
          <rect x="-2.5" y="-5" width="5" height="6" rx="0.5" fill={p.sunCore} stroke={p.pillar} strokeWidth="0.5" />
          <rect x="-3" y="-5.8" width="6" height="1" fill={p.pillar} />
          <rect x="-0.5" y="-7" width="1" height="1.5" fill={p.pillar} />
          {/* 빛 후광 */}
          <ellipse cx="0" cy="-3" rx="8" ry="6" fill={p.sunHalo} opacity="0.45" />
        </g>
        {/* 신발 두 켤레 (오른쪽 마루 끝) */}
        <g transform="translate(35 23)" opacity="0.85">
          {/* 큰 신발 (누나) */}
          <ellipse cx="0" cy="0" rx="3.2" ry="1.6" fill={p.pillar} />
          <ellipse cx="0" cy="-0.5" rx="2.8" ry="1.3" fill={p.figure} />
          {/* 작은 신발 (동생) */}
          <ellipse cx="7" cy="0.5" rx="2.4" ry="1.3" fill={p.pillar} />
          <ellipse cx="7" cy="0.1" rx="2.0" ry="1.0" fill={p.figure} />
        </g>
      </g>

      {/* 마당 — 돌담 길 */}
      <g opacity="0.55">
        <path
          d="M196 295 Q198 270 199 250 L201 250 Q202 270 204 295 Z"
          fill={p.pathLight}
          stroke={p.pathBorder}
          strokeWidth="0.6"
        />
      </g>

      {/* 풀 더미 (foreground) */}
      <g fill={p.treeMid} opacity="0.7">
        <path d="M50 248 q1 -10 3 -10 q-2 5 0 10 z" />
        <path d="M82 252 q1 -8 2 -8 q-1 4 0 8 z" />
        <path d="M120 247 q1 -9 3 -9 q-2 5 0 9 z" />
        <path d="M305 252 q1 -8 3 -8 q-2 4 0 8 z" />
        <path d="M338 245 q1 -10 2 -10 q-1 5 0 10 z" />
      </g>

      {/* 햇살 입자 (subtle highlight overlay) */}
      <g opacity="0.18">
        <line x1="110" y1="80"  x2="160" y2="200" stroke={p.sunCore} strokeWidth="0.6" />
        <line x1="125" y1="85"  x2="180" y2="220" stroke={p.sunCore} strokeWidth="0.5" />
        <line x1="100" y1="100" x2="60"  y2="200" stroke={p.sunCore} strokeWidth="0.5" />
      </g>
    </svg>
  );
}

export default function MemoryImage({
  prompt,
  caption = true,
}: {
  prompt: MemoryImagePrompt;
  caption?: boolean;
}) {
  const { description, style, imageUrl } = prompt;

  return (
    <figure className="space-y-3">
      <div className="relative aspect-[4/3] rounded-2xl overflow-hidden ring-1 ring-slate-100 shadow-[0_8px_24px_-12px_rgba(15,23,42,0.18)]">
        {imageUrl ? (
          // 백엔드 연결 후 실제 이미지
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl} alt={description} className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <>
            <GhibliScene style={style} idSuffix={style} />

            {/* 미세한 그레인 — 손그림 질감 */}
            <svg className="absolute inset-0 w-full h-full opacity-[0.08] mix-blend-overlay pointer-events-none" aria-hidden>
              <filter id={`mi-grain-${style}`}>
                <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" stitchTiles="stitch" />
                <feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.6 0" />
              </filter>
              <rect width="100%" height="100%" filter={`url(#mi-grain-${style})`} />
            </svg>

            {/* 상단 메타 배지 */}
            <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-white/85 backdrop-blur-md ring-1 ring-white/60 text-[10px] font-semibold text-slate-700">
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3 text-violet-500" aria-hidden>
                  <path d="M12 2l1.4 4.6L18 8l-4.6 1.4L12 14l-1.4-4.6L6 8l4.6-1.4z" />
                </svg>
                AI 생성 이미지
              </span>
              <span className="inline-flex items-center px-2 py-1 rounded-full bg-white/85 backdrop-blur-md ring-1 ring-white/60 text-[10px] font-semibold text-slate-600">
                {styleLabel(style)}
              </span>
            </div>

            {/* 하단 description 캡션 */}
            {caption && (
              <div className="absolute bottom-0 left-0 right-0 px-4 py-3 bg-gradient-to-t from-slate-900/70 via-slate-900/35 to-transparent">
                <p className="text-white text-[12px] sm:text-[13px] font-medium leading-relaxed drop-shadow word-keep-all">
                  {description}
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </figure>
  );
}
