import { useEffect, useState } from 'react';
import { Zap } from 'lucide-react';

export default function SplashScreen({ onComplete }) {
  const [progress, setProgress] = useState(0);
  const [fade, setFade] = useState(false);

  useEffect(() => {
    // Animate progress bar
    const steps = [
      { target: 30, delay: 0, duration: 200 },
      { target: 65, delay: 200, duration: 250 },
      { target: 85, delay: 450, duration: 200 },
      { target: 100, delay: 650, duration: 200 },
    ];

    steps.forEach(({ target, delay, duration }) => {
      setTimeout(() => {
        setProgress(target);
      }, delay);
    });

    // Fade out
    setTimeout(() => setFade(true), 1000);
    setTimeout(() => onComplete(), 1350);
  }, [onComplete]);

  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center"
      style={{
        backgroundColor: 'rgb(var(--clr-surface))',
        opacity: fade ? 0 : 1,
        transition: 'opacity 0.35s ease',
        pointerEvents: fade ? 'none' : 'all',
      }}
    >
      {/* Logo mark */}
      <div className="flex flex-col items-center gap-5">
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center relative"
          style={{
            backgroundColor: 'rgb(var(--clr-primary))',
            boxShadow: '0 0 0 0 rgb(var(--clr-primary) / 0.4)',
            animation: 'splashPulse 1.2s ease-in-out infinite',
          }}
        >
          <Zap className="w-8 h-8 text-white" strokeWidth={2.5} />
        </div>

        <div className="text-center">
          <h1
            className="text-xl font-display font-semibold tracking-tight"
            style={{ color: 'rgb(var(--clr-ink))' }}
          >
            ReminderFlow
          </h1>
          <p
            className="text-xs mt-1"
            style={{ color: 'rgb(var(--clr-ink-muted))' }}
          >
            Loading your workspace...
          </p>
        </div>

        {/* Progress bar */}
        <div
          className="w-48 h-0.5 rounded-full overflow-hidden"
          style={{ backgroundColor: 'rgb(var(--clr-border))' }}
        >
          <div
            className="h-full rounded-full"
            style={{
              backgroundColor: 'rgb(var(--clr-primary))',
              width: `${progress}%`,
              transition: 'width 0.2s ease',
            }}
          />
        </div>
      </div>

      <style>{`
        @keyframes splashPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgb(var(--clr-primary) / 0.35); }
          50% { box-shadow: 0 0 0 16px rgb(var(--clr-primary) / 0); }
        }
      `}</style>
    </div>
  );
}
