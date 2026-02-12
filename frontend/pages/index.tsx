import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from './_app';
import Link from 'next/link';

export default function Home() {
  const { user, loading, login, register } = useAuth();
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
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="text-center max-w-4xl mx-auto">
          <h1 className="text-5xl md:text-7xl font-bold mb-6">
            <span className="text-primary-400">Fantasy</span> Darts Betting
          </h1>
          <p className="text-xl text-dark-300 mb-8">
            Bet on your friends with fantasy tokens. No real money. Just bragging rights.
          </p>

          {mode === 'landing' && (
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => setMode('register')}
                className="btn-primary text-lg px-8 py-3"
              >
                Get Started - It's Free
              </button>
              <button
                onClick={() => setMode('login')}
                className="btn-secondary text-lg px-8 py-3"
              >
                I Have an Account
              </button>
            </div>
          )}

          {mode === 'login' && (
            <div className="card max-w-md mx-auto mt-8">
              <h2 className="text-2xl font-bold mb-4">Welcome Back</h2>
              <form onSubmit={handleLogin}>
                <input
                  type="email"
                  placeholder="Your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input mb-4"
                  required
                />
                {error && <p className="text-red-400 text-sm mb-4">{error}</p>}
                <button type="submit" className="btn-primary w-full">
                  Login
                </button>
              </form>
              <p className="text-dark-400 mt-4">
                Don't have an account?{' '}
                <button onClick={() => setMode('register')} className="text-primary-400 hover:underline">
                  Register
                </button>
              </p>
            </div>
          )}

          {mode === 'register' && (
            <div className="card max-w-md mx-auto mt-8">
              <h2 className="text-2xl font-bold mb-4">Join the Fun</h2>
              <form onSubmit={handleRegister}>
                <input
                  type="text"
                  placeholder="Your name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="input mb-4"
                  required
                />
                <input
                  type="email"
                  placeholder="Your email"
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
                    I confirm I am 18+ years old and understand this is a fantasy game with no real money involved.
                  </span>
                </label>
                {error && <p className="text-red-400 text-sm mb-4">{error}</p>}
                <button type="submit" className="btn-primary w-full">
                  Create Account & Get 100 Tokens
                </button>
              </form>
              <p className="text-dark-400 mt-4">
                Already have an account?{' '}
                <button onClick={() => setMode('login')} className="text-primary-400 hover:underline">
                  Login
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
              <h3 className="text-xl font-bold mb-2">Place Bets</h3>
              <p className="text-dark-400">
                Use your 100 starting tokens to bet on tournament outcomes.
              </p>
            </div>
            <div className="card text-center">
              <div className="text-4xl mb-4">📊</div>
              <h3 className="text-xl font-bold mb-2">Track Live</h3>
              <p className="text-dark-400">
                See what everyone's betting on in real-time.
              </p>
            </div>
            <div className="card text-center">
              <div className="text-4xl mb-4">🏆</div>
              <h3 className="text-xl font-bold mb-2">Climb Leaderboard</h3>
              <p className="text-dark-400">
                Compete with friends to become the top bettor.
              </p>
            </div>
          </div>
        )}

        {/* Disclaimer */}
        <div className="mt-20 max-w-3xl mx-auto">
          <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-xl p-6">
            <h4 className="text-yellow-400 font-bold text-lg mb-2">Important Notice</h4>
            <ul className="text-yellow-200/80 text-sm space-y-1">
              <li>• This is a FANTASY game - tokens have NO cash value</li>
              <li>• No real money is exchanged or can be won</li>
              <li>• For entertainment purposes only among friends</li>
              <li>• This is NOT gambling and should not be treated as such</li>
              <li>• Participants must be 18+ years old</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
