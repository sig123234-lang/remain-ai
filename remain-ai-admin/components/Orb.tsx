'use client';

type OrbSize = 'sm' | 'md' | 'lg';
type OrbState = 'idle' | 'listening' | 'speaking' | 'thinking';

const SIZE_CLASS: Record<OrbSize, string> = {
  sm: 'w-[160px] h-[160px]',
  md: 'w-[200px] h-[200px] sm:w-[220px] sm:h-[220px]',
  lg: 'w-[260px] h-[260px] sm:w-[300px] sm:h-[300px]',
};

const GLOW_INSET: Record<OrbSize, string> = {
  sm: '-inset-6',
  md: '-inset-7',
  lg: '-inset-8',
};

/**
 * 수채화 풍 블루 클라우드 오브.
 * state에 따라 모션 변화. 백엔드 연결 전에는 idle만 사용.
 */
export default function Orb({
  state = 'idle',
  size = 'lg',
}: {
  state?: OrbState;
  size?: OrbSize;
}) {
  const breatheClass =
    state === 'listening'
      ? 'animate-orb-listen'
      : state === 'speaking'
      ? 'animate-pulse-soft'
      : 'animate-orb-breathe';

  const rotateClass = state === 'thinking' ? 'animate-spin-orb' : '';

  return (
    <div className={`relative ${SIZE_CLASS[size]} ${breatheClass}`}>
      <div
        className={`absolute ${GLOW_INSET[size]} rounded-full blur-3xl opacity-60`}
        style={{
          background:
            'radial-gradient(circle, rgba(120, 175, 245, 0.32) 0%, rgba(180, 215, 255, 0.12) 50%, transparent 75%)',
        }}
        aria-hidden
      />

      <div className={`absolute inset-0 rounded-full overflow-hidden ${rotateClass}`}>
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(circle at 32% 28%, #ffffff 0%, transparent 42%),' +
              'radial-gradient(circle at 72% 72%, #5e9aed 0%, transparent 55%),' +
              'radial-gradient(circle at 25% 78%, #b9d4f4 0%, transparent 50%),' +
              'linear-gradient(160deg, #f3f8ff 0%, #c2daf6 100%)',
          }}
          aria-hidden
        />
        <div
          className="absolute -inset-6 animate-drift"
          style={{
            background:
              'radial-gradient(circle at 45% 55%, rgba(100, 155, 235, 0.55) 0%, transparent 50%)',
            filter: 'blur(18px)',
          }}
          aria-hidden
        />
        <div
          className="absolute -inset-6 animate-drift"
          style={{
            background:
              'radial-gradient(circle at 65% 35%, rgba(225, 238, 255, 0.7) 0%, transparent 55%)',
            filter: 'blur(22px)',
            animationDelay: '-5s',
          }}
          aria-hidden
        />
        <div
          className="absolute -inset-6 animate-drift"
          style={{
            background:
              'radial-gradient(circle at 35% 70%, rgba(155, 195, 240, 0.45) 0%, transparent 50%)',
            filter: 'blur(20px)',
            animationDelay: '-9s',
          }}
          aria-hidden
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(circle at 35% 22%, rgba(255,255,255,0.55) 0%, transparent 32%)',
          }}
          aria-hidden
        />
      </div>
    </div>
  );
}
