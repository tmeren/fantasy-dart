import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from './_app';
import { useLanguage, LanguageToggle } from '@/lib/LanguageContext';
import Link from 'next/link';

export default function Home() {
  const { user, loading, login, register } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();
  const [mode, setMode] = useState<'landing' | 'login' | 'register'>('landing');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [ageConfirmed, setAgeConfirmed] = useState(false);

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
      setError('You must confirm you are 18+ to continue');
      return;
    }
    setError('');
    try {
      await register(email, name);
      router.push('/dashboard');
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
    <div className="min-h-screen">
      {/* Language Toggle — top right */}
      <div className="absolute top-4 right-4 z-50">
        <LanguageToggle />
      </div>

      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="text-center max-w-4xl mx-auto">
          <h1 className="text-5xl md:text-7xl font-bold mb-6">
            <span className="text-primary-400">{t('landing.title1')}</span> {t('landing.title2')}
          </h1>
          <p className="text-xl text-dark-300 mb-8">
            {t('landing.subtitle')}
          </p>

          {mode === 'landing' && (
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => setMode('register')}
                className="btn-primary text-lg px-8 py-3"
              >
                {t('landing.getStarted')}
              </button>
              <button
                onClick={() => setMode('login')}
                className="btn-secondary text-lg px-8 py-3"
              >
                {t('landing.haveAccount')}
              </button>
            </div>
          )}

          {mode === 'login' && (
            <div className="card max-w-md mx-auto mt-8">
              <h2 className="text-2xl font-bold mb-4">{t('landing.welcomeBack')}</h2>
              <form onSubmit={handleLogin}>
                <input
                  type="email"
                  placeholder={t('landing.yourEmail')}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input mb-4"
                  required
                />
                {error && <p className="text-red-400 text-sm mb-4">{error}</p>}
                <button type="submit" className="btn-primary w-full">
                  {t('landing.login')}
                </button>
              </form>
              <p className="text-dark-400 mt-4">
                {t('landing.noAccount')}{' '}
                <button onClick={() => setMode('register')} className="text-primary-400 hover:underline">
                  {t('landing.register')}
                </button>
              </p>
            </div>
          )}

          {mode === 'register' && (
            <div className="card max-w-md mx-auto mt-8">
              <h2 className="text-2xl font-bold mb-4">{t('landing.joinFun')}</h2>
              <form onSubmit={handleRegister}>
                <input
                  type="text"
                  placeholder={t('landing.yourName')}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="input mb-4"
                  required
                />
                <input
                  type="email"
                  placeholder={t('landing.yourEmail')}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input mb-4"
                  required
                />
                <label className="flex items-start gap-3 mb-4 text-left">
                  <input
                    type="checkbox"
                    checked={ageConfirmed}
                    onChange={(e) => setAgeConfirmed(e.target.checked)}
                    className="mt-1"
                  />
                  <span className="text-sm text-dark-300">
                    {t('landing.ageConfirm')}
                  </span>
                </label>
                {error && <p className="text-red-400 text-sm mb-4">{error}</p>}
                <button type="submit" className="btn-primary w-full">
                  {t('landing.createAccount')}
                </button>
              </form>
              <p className="text-dark-400 mt-4">
                {t('landing.alreadyHave')}{' '}
                <button onClick={() => setMode('login')} className="text-primary-400 hover:underline">
                  {t('landing.login')}
                </button>
              </p>
            </div>
          )}
        </div>

        {/* Features */}
        {mode === 'landing' && (
          <div className="grid md:grid-cols-3 gap-8 mt-20 max-w-5xl mx-auto">
            <div className="card text-center">
              <div className="text-4xl mb-4">🎯</div>
              <h3 className="text-xl font-bold mb-2">{t('feature.placeBets')}</h3>
              <p className="text-dark-400">
                {t('feature.placeBetsDesc')}
              </p>
            </div>
            <div className="card text-center">
              <div className="text-4xl mb-4">📊</div>
              <h3 className="text-xl font-bold mb-2">{t('feature.trackLive')}</h3>
              <p className="text-dark-400">
                {t('feature.trackLiveDesc')}
              </p>
            </div>
            <div className="card text-center">
              <div className="text-4xl mb-4">🏆</div>
              <h3 className="text-xl font-bold mb-2">{t('feature.climbLeaderboard')}</h3>
              <p className="text-dark-400">
                {t('feature.climbLeaderboardDesc')}
              </p>
            </div>
          </div>
        )}

        {/* Disclaimer */}
        <div className="mt-20 max-w-3xl mx-auto">
          <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-xl p-6">
            <h4 className="text-yellow-400 font-bold text-lg mb-2">{t('disclaimer.title')}</h4>
            <ul className="text-yellow-200/80 text-sm space-y-1">
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
  );
}
