import { useState, useEffect, useRef, ReactNode } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useAuth } from './_app';
import { useLanguage, LanguageToggle } from '@/lib/LanguageContext';

/** Parse i18n strings containing <link>...</link> and render as Next.js Link */
function renderLinked(text: string, href: string): ReactNode {
  const match = text.match(/^(.*?)<link>(.*?)<\/link>(.*)$/);
  if (!match) return text;
  const [, before, linkText, after] = match;
  return (
    <>
      {before}
      <Link href={href} className="text-primary-400 hover:underline" target="_blank" onClick={(e) => e.stopPropagation()}>
        {linkText}
      </Link>
      {after}
    </>
  );
}

/** Generate deterministic star positions (CSS-only twinkle via globals.css) */
function useStars(count: number) {
  const [stars, setStars] = useState<{ top: string; left: string; duration: string; delay: string }[]>([]);
  useEffect(() => {
    setStars(
      Array.from({ length: count }, (_, i) => ({
        top: `${(((i * 7 + 13) * 17) % 100)}%`,
        left: `${(((i * 11 + 3) * 23) % 100)}%`,
        duration: `${2 + (i % 4)}s`,
        delay: `${(i % 7) * 0.4}s`,
      }))
    );
  }, [count]);
  return stars;
}

export default function Home() {
  const { user, loading, login, register } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();
  const [mode, setMode] = useState<'landing' | 'login' | 'register'>('landing');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const [privacyConsent, setPrivacyConsent] = useState(false);
  const [termsConsent, setTermsConsent] = useState(false);
  const [whatsappConsent, setWhatsappConsent] = useState(false);
  const stars = useStars(40);

  // Scroll-reveal observer
  const observerRef = useRef<IntersectionObserver | null>(null);
  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) e.target.classList.add('revealed');
        });
      },
      { threshold: 0.15 }
    );
    document.querySelectorAll('.reveal-on-scroll').forEach((el) => observerRef.current?.observe(el));
    return () => observerRef.current?.disconnect();
  }, [mode]);

  useEffect(() => {
    if (!loading && user) {
      router.push('/dashboard');
    }
  }, [user, loading, router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await login(email);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ageConfirmed) {
      setError(t('landing.ageRequired'));
      return;
    }
    if (!privacyConsent || !termsConsent) {
      setError(t('landing.consentRequired'));
      return;
    }
    setError('');
    try {
      await register(email, name, {
        privacy_consent: privacyConsent,
        terms_consent: termsConsent,
        age_confirmed: ageConfirmed,
        whatsapp_consent: whatsappConsent,
      });
      router.push('/welcome');
    } catch (err: any) {
      setError(err.message);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Sci-Fi Background Effects */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Star field */}
        <div className="star-field">
          {stars.map((s, i) => (
            <div
              key={i}
              className="star"
              style={{
                top: s.top,
                left: s.left,
                '--twinkle-duration': s.duration,
                '--twinkle-delay': s.delay,
              } as React.CSSProperties}
            />
          ))}
        </div>
        {/* Radial glow from top center — floating */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-primary-500/8 rounded-full blur-[120px] animate-float-slow" />
        {/* Side accents — floating */}
        <div className="absolute top-1/3 -left-32 w-64 h-64 bg-cyan-500/5 rounded-full blur-[80px] animate-float-slow-reverse" />
        <div className="absolute top-2/3 -right-32 w-64 h-64 bg-primary-500/5 rounded-full blur-[80px] animate-float-slow" />
        {/* Grid overlay */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(rgba(34,197,94,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(34,197,94,0.3) 1px, transparent 1px)`,
            backgroundSize: '60px 60px',
          }}
        />
        {/* Scan line sweep */}
        <div className="absolute left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-primary-400/20 to-transparent animate-scan-sweep" />
      </div>

      {/* Language Toggle */}
      <div className="absolute top-4 right-4 z-50">
        <LanguageToggle />
      </div>

      {/* Hero Section */}
      <div className="relative w-full px-4 pt-20 pb-12 max-w-7xl mx-auto">
        <div className="text-center max-w-4xl mx-auto">
          {/* Tagline */}
          <div className="inline-flex items-center gap-2 bg-primary-500/10 border border-primary-500/20 rounded-full px-4 py-1.5 mb-8 animate-badge-pulse">
            <span className="w-2 h-2 bg-primary-400 rounded-full animate-pulse" />
            <span className="text-primary-400 text-sm font-medium tracking-wide uppercase">
              {t('landing.tagline') || 'Season 1 — Live Now'}
            </span>
          </div>

          {/* Title */}
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-black mb-6 leading-tight">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-400 via-emerald-300 to-cyan-400 animate-shimmer">
              {t('landing.title1')}
            </span>
            <br />
            <span className="text-white">{t('landing.title2')}</span>
          </h1>

          {/* Subtitle */}
          <p className="text-lg md:text-xl text-dark-300 mb-10 max-w-2xl mx-auto leading-relaxed">
            {t('landing.subtitle')}
          </p>

          {/* CTA Buttons (Landing Mode) */}
          {mode === 'landing' && (
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
              <button
                onClick={() => setMode('register')}
                className="relative group text-lg px-8 py-4 rounded-xl font-bold text-white bg-gradient-to-r from-primary-600 to-emerald-600 hover:from-primary-500 hover:to-emerald-500 transition-all duration-300 shadow-lg shadow-primary-500/25 hover:shadow-primary-500/40 animate-glow-ring"
              >
                <span className="relative z-10">{t('landing.getStarted')}</span>
              </button>
              <button
                onClick={() => setMode('login')}
                className="text-lg px-8 py-4 rounded-xl font-semibold text-dark-200 border border-dark-500 hover:border-primary-500/50 hover:text-white bg-dark-800/50 backdrop-blur-sm transition-all duration-300"
              >
                {t('landing.haveAccount')}
              </button>
            </div>
          )}

          {/* Login Form */}
          {mode === 'login' && (
            <div className="max-w-md mx-auto mt-8">
              <div className="bg-dark-800/60 backdrop-blur-md rounded-2xl border border-dark-600 p-8 shadow-2xl">
                <h2 className="text-2xl font-bold mb-6">{t('landing.welcomeBack')}</h2>
                <form onSubmit={handleLogin}>
                  <input
                    type="email"
                    placeholder={t('landing.yourEmail')}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="input mb-4"
                    required
                    autoFocus
                  />
                  {error && <p className="text-red-400 text-sm mb-4">{error}</p>}
                  <button type="submit" className="w-full py-3 rounded-xl font-bold text-white bg-gradient-to-r from-primary-600 to-emerald-600 hover:from-primary-500 hover:to-emerald-500 transition-all duration-300">
                    {t('landing.login')}
                  </button>
                </form>
                <p className="text-dark-400 mt-4 text-sm">
                  {t('landing.noAccount')}{' '}
                  <button onClick={() => { setMode('register'); setError(''); }} className="text-primary-400 hover:underline">
                    {t('landing.register')}
                  </button>
                </p>
                <button
                  onClick={() => { setMode('landing'); setError(''); }}
                  className="text-dark-500 hover:text-dark-300 text-sm mt-2 transition-colors"
                >
                  ← {t('landing.back') || 'Back'}
                </button>
              </div>
            </div>
          )}

          {/* Register Form */}
          {mode === 'register' && (
            <div className="max-w-md mx-auto mt-8">
              <div className="bg-dark-800/60 backdrop-blur-md rounded-2xl border border-dark-600 p-8 shadow-2xl">
                <h2 className="text-2xl font-bold mb-2">{t('landing.joinFun')}</h2>
                <p className="text-dark-400 text-sm mb-6">{t('landing.joinDesc') || 'Get 1,000 RTB to start predicting'}</p>
                <form onSubmit={handleRegister}>
                  <input
                    type="text"
                    placeholder={t('landing.yourName')}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="input mb-4"
                    required
                    autoFocus
                  />
                  <input
                    type="email"
                    placeholder={t('landing.yourEmail')}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="input mb-4"
                    required
                  />
                  <label className="flex items-start gap-3 mb-3 text-left cursor-pointer">
                    <input
                      type="checkbox"
                      checked={ageConfirmed}
                      onChange={(e) => setAgeConfirmed(e.target.checked)}
                      className="mt-1 accent-primary-500"
                    />
                    <span className="text-sm text-dark-300">
                      {t('landing.ageConfirm')}
                    </span>
                  </label>
                  <label className="flex items-start gap-3 mb-3 text-left cursor-pointer">
                    <input
                      type="checkbox"
                      checked={privacyConsent}
                      onChange={(e) => setPrivacyConsent(e.target.checked)}
                      className="mt-1 accent-primary-500"
                    />
                    <span className="text-sm text-dark-300">
                      {renderLinked(t('landing.agreePrivacy'), '/privacy')}
                    </span>
                  </label>
                  <label className="flex items-start gap-3 mb-3 text-left cursor-pointer">
                    <input
                      type="checkbox"
                      checked={termsConsent}
                      onChange={(e) => setTermsConsent(e.target.checked)}
                      className="mt-1 accent-primary-500"
                    />
                    <span className="text-sm text-dark-300">
                      {renderLinked(t('landing.agreeTerms'), '/terms')}
                    </span>
                  </label>
                  <label className="flex items-start gap-3 mb-4 text-left cursor-pointer">
                    <input
                      type="checkbox"
                      checked={whatsappConsent}
                      onChange={(e) => setWhatsappConsent(e.target.checked)}
                      className="mt-1 accent-primary-500"
                    />
                    <span className="text-sm text-dark-400">
                      {t('landing.agreeWhatsapp')}
                    </span>
                  </label>
                  {error && <p className="text-red-400 text-sm mb-4">{error}</p>}
                  <button type="submit" className="w-full py-3 rounded-xl font-bold text-white bg-gradient-to-r from-primary-600 to-emerald-600 hover:from-primary-500 hover:to-emerald-500 transition-all duration-300">
                    {t('landing.createAccount')}
                  </button>
                </form>
                <p className="text-dark-400 mt-4 text-sm">
                  {t('landing.alreadyHave')}{' '}
                  <button onClick={() => { setMode('login'); setError(''); }} className="text-primary-400 hover:underline">
                    {t('landing.login')}
                  </button>
                </p>
                <button
                  onClick={() => { setMode('landing'); setError(''); }}
                  className="text-dark-500 hover:text-dark-300 text-sm mt-2 transition-colors"
                >
                  ← {t('landing.back') || 'Back'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Stats Bar */}
      {mode === 'landing' && (
        <div className="relative border-y border-dark-700/50 bg-dark-900/40 backdrop-blur-sm reveal-on-scroll">
          <div className="w-full px-4 py-6 max-w-7xl mx-auto">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
              <div>
                <div className="text-2xl md:text-3xl font-black text-primary-400">20</div>
                <div className="text-xs md:text-sm text-dark-400 uppercase tracking-wider mt-1">{t('landing.statPlayers') || 'Players'}</div>
              </div>
              <div>
                <div className="text-2xl md:text-3xl font-black text-emerald-400">190</div>
                <div className="text-xs md:text-sm text-dark-400 uppercase tracking-wider mt-1">{t('landing.statMatches') || 'Matches'}</div>
              </div>
              <div>
                <div className="text-2xl md:text-3xl font-black text-cyan-400">9</div>
                <div className="text-xs md:text-sm text-dark-400 uppercase tracking-wider mt-1">{t('landing.statPropTypes') || 'Prop Market Types'}</div>
              </div>
              <div>
                <div className="text-2xl md:text-3xl font-black text-amber-400">1,000</div>
                <div className="text-xs md:text-sm text-dark-400 uppercase tracking-wider mt-1">{t('landing.statStarting') || 'Starting RTB'}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Features Section */}
      {mode === 'landing' && (
        <div className="relative w-full px-4 py-20 max-w-7xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">
            {t('landing.howItWorks') || 'How It Works'}
          </h2>
          <p className="text-dark-400 text-center mb-12 max-w-xl mx-auto">
            {t('landing.howItWorksDesc') || 'Predict match outcomes, track Elo ratings, and climb the leaderboard.'}
          </p>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {/* Feature 1 */}
            <div className="group bg-dark-800/30 backdrop-blur-sm rounded-2xl border border-dark-700 hover:border-primary-500/30 p-8 transition-all duration-300 animate-fade-in-up" style={{ animationDelay: '0s' }}>
              <div className="w-14 h-14 rounded-xl bg-primary-500/10 border border-primary-500/20 flex items-center justify-center mb-6 group-hover:bg-primary-500/20 transition-colors">
                <span className="text-2xl">🎯</span>
              </div>
              <h3 className="text-xl font-bold mb-3">{t('feature.placeBets')}</h3>
              <p className="text-dark-400 leading-relaxed">
                {t('feature.placeBetsDesc')}
              </p>
            </div>

            {/* Feature 2 */}
            <div className="group bg-dark-800/30 backdrop-blur-sm rounded-2xl border border-dark-700 hover:border-emerald-500/30 p-8 transition-all duration-300 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
              <div className="w-14 h-14 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-6 group-hover:bg-emerald-500/20 transition-colors">
                <span className="text-2xl">📊</span>
              </div>
              <h3 className="text-xl font-bold mb-3">{t('feature.trackLive')}</h3>
              <p className="text-dark-400 leading-relaxed">
                {t('feature.trackLiveDesc')}
              </p>
            </div>

            {/* Feature 3 */}
            <div className="group bg-dark-800/30 backdrop-blur-sm rounded-2xl border border-dark-700 hover:border-cyan-500/30 p-8 transition-all duration-300 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
              <div className="w-14 h-14 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center mb-6 group-hover:bg-cyan-500/20 transition-colors">
                <span className="text-2xl">🏆</span>
              </div>
              <h3 className="text-xl font-bold mb-3">{t('feature.climbLeaderboard')}</h3>
              <p className="text-dark-400 leading-relaxed">
                {t('feature.climbLeaderboardDesc')}
              </p>
            </div>
          </div>

          {/* Secondary Features Row */}
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto mt-8">
            {/* Prop Markets Feature */}
            <div className="group bg-dark-800/30 backdrop-blur-sm rounded-2xl border border-dark-700 hover:border-amber-500/30 p-8 transition-all duration-300 animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
              <div className="w-14 h-14 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-6 group-hover:bg-amber-500/20 transition-colors">
                <span className="text-2xl">🎰</span>
              </div>
              <h3 className="text-xl font-bold mb-3">{t('feature.propMarkets') || 'Prop Markets'}</h3>
              <p className="text-dark-400 leading-relaxed">
                {t('feature.propMarketsDesc') || 'Predict 180s, exact scores, first leg winners, and more. 9 unique prop markets per match.'}
              </p>
            </div>

            {/* Acca Builder Feature */}
            <div className="group bg-dark-800/30 backdrop-blur-sm rounded-2xl border border-dark-700 hover:border-violet-500/30 p-8 transition-all duration-300 animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
              <div className="w-14 h-14 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center mb-6 group-hover:bg-violet-500/20 transition-colors">
                <span className="text-2xl">📋</span>
              </div>
              <h3 className="text-xl font-bold mb-3">{t('feature.accaBuilder') || 'Acca Builder'}</h3>
              <p className="text-dark-400 leading-relaxed">
                {t('feature.accaBuilderDesc') || 'Build accumulators across multiple markets. Kelly Criterion advisor helps you stake smart.'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Disclaimer */}
      <div className="relative w-full px-4 pb-12 max-w-7xl mx-auto">
        <div className="max-w-3xl mx-auto bg-amber-950/20 border border-amber-500/20 rounded-2xl p-6">
          <div className="flex items-start gap-3">
            <span className="text-amber-400 text-lg mt-0.5">⚠</span>
            <div>
              <h4 className="text-amber-400 font-bold mb-2">{t('disclaimer.title')}</h4>
              <ul className="text-amber-200/60 text-sm space-y-1">
                <li>• {t('disclaimer.1')}</li>
                <li>• {t('disclaimer.2')}</li>
                <li>• {t('disclaimer.3')}</li>
                <li>• {t('disclaimer.4')}</li>
                <li>• {t('disclaimer.5')}</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="relative border-t border-dark-700/50 py-6">
        <div className="w-full px-4 max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-dark-500">
          <span>{t('footer.copyright')}</span>
          <div className="flex gap-4">
            <Link href="/privacy" className="hover:text-primary-400 transition-colors">
              {t('footer.privacy')}
            </Link>
            <Link href="/terms" className="hover:text-primary-400 transition-colors">
              {t('footer.terms')}
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
