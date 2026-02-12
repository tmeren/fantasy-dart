import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from './_app';
import { useLanguage } from '@/lib/LanguageContext';

const STEPS = [
  { key: 1, icon: '🔍', color: 'primary' },
  { key: 2, icon: '🎯', color: 'emerald' },
  { key: 3, icon: '📊', color: 'cyan' },
  { key: 4, icon: '🏆', color: 'amber' },
] as const;

const colorMap: Record<string, { bg: string; border: string; text: string }> = {
  primary: { bg: 'bg-primary-500/10', border: 'border-primary-500/20', text: 'text-primary-400' },
  emerald: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', text: 'text-emerald-400' },
  cyan: { bg: 'bg-cyan-500/10', border: 'border-cyan-500/20', text: 'text-cyan-400' },
  amber: { bg: 'bg-amber-500/10', border: 'border-amber-500/20', text: 'text-amber-400' },
};

export default function Welcome() {
  const { user, loading } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/');
    }
  }, [user, loading, router]);

  // Trigger entrance animation after mount
  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center">
      {/* Background effects (same as landing) */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-primary-500/8 rounded-full blur-[120px] animate-float-slow" />
        <div className="absolute top-1/3 -left-32 w-64 h-64 bg-cyan-500/5 rounded-full blur-[80px] animate-float-slow-reverse" />
        <div className="absolute top-2/3 -right-32 w-64 h-64 bg-primary-500/5 rounded-full blur-[80px] animate-float-slow" />
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(rgba(34,197,94,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(34,197,94,0.3) 1px, transparent 1px)`,
            backgroundSize: '60px 60px',
          }}
        />
      </div>

      <div className="relative container mx-auto px-4 py-12 max-w-2xl">
        {/* Title */}
        <div
          className={`text-center mb-12 transition-all duration-700 ${
            visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
          }`}
        >
          <h1 className="text-4xl md:text-5xl font-black mb-4">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-400 via-emerald-300 to-cyan-400">
              {t('welcome.title')}
            </span>
          </h1>
          <p className="text-dark-300 text-lg">
            {t('welcome.subtitle')}
          </p>
        </div>

        {/* Steps */}
        <div className="space-y-6 mb-12">
          {STEPS.map((step, idx) => {
            const c = colorMap[step.color];
            return (
              <div
                key={step.key}
                className={`animate-step-enter flex items-start gap-5 bg-dark-800/40 backdrop-blur-sm rounded-2xl border border-dark-700 p-6 transition-all duration-300 ${
                  visible ? '' : 'opacity-0'
                }`}
                style={{ animationDelay: `${0.3 + idx * 0.15}s` }}
              >
                {/* Step number + icon */}
                <div className="flex-shrink-0">
                  <div className={`w-14 h-14 rounded-xl ${c.bg} border ${c.border} flex items-center justify-center`}>
                    <span className="text-2xl">{step.icon}</span>
                  </div>
                </div>
                {/* Content */}
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <span className={`text-xs font-bold uppercase tracking-widest ${c.text}`}>
                      Step {step.key}
                    </span>
                  </div>
                  <h3 className="text-xl font-bold mb-1">
                    {t(`welcome.step${step.key}.title` as any)}
                  </h3>
                  <p className="text-dark-400 leading-relaxed">
                    {t(`welcome.step${step.key}.desc` as any)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* CTA */}
        <div
          className={`text-center transition-all duration-700 ${
            visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
          }`}
          style={{ transitionDelay: '1s' }}
        >
          <button
            onClick={() => router.push('/dashboard')}
            className="text-lg px-10 py-4 rounded-xl font-bold text-white bg-gradient-to-r from-primary-600 to-emerald-600 hover:from-primary-500 hover:to-emerald-500 transition-all duration-300 shadow-lg shadow-primary-500/25 hover:shadow-primary-500/40 animate-glow-ring"
          >
            {t('welcome.cta')}
          </button>
          <div className="mt-4">
            <button
              onClick={() => router.push('/dashboard')}
              className="text-dark-500 hover:text-dark-300 text-sm transition-colors"
            >
              {t('welcome.skip')} →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
