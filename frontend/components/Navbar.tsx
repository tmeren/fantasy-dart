import { useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useAuth } from '../pages/_app';
import { useLanguage, LanguageToggle } from '@/lib/LanguageContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  const links = [
    { href: '/tournament', label: t('nav.tournament') },
    { href: '/markets', label: t('nav.markets') },
    { href: '/leaderboard', label: t('nav.leaderboard') },
    { href: '/academy', label: t('nav.academy') },
  ];

  const isActive = (href: string) => router.pathname === href || router.pathname.startsWith(href + '/');

  return (
    <nav className="bg-dark-900/80 backdrop-blur-sm border-b border-dark-700 sticky top-0 z-50">
      <div className="w-full px-4 py-3 flex items-center justify-between">
        <Link href="/dashboard" className="text-xl font-bold text-primary-400 shrink-0">
          {t('nav.brand')}
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-5">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`text-sm font-medium transition-colors ${
                isActive(link.href) ? 'text-white' : 'text-dark-300 hover:text-white'
              }`}
            >
              {link.label}
            </Link>
          ))}
          {user?.is_admin && (
            <Link href="/admin" className="text-yellow-400 text-sm font-medium">{t('nav.admin')}</Link>
          )}
          <LanguageToggle />
          <div className="flex items-center gap-3 pl-4 border-l border-dark-700">
            <div className="text-right">
              <div className="text-xs text-dark-400">{user?.name}</div>
              <div className="text-primary-400 font-bold text-sm">{user?.balance.toFixed(0)} {t('nav.tokens')}</div>
            </div>
            <button onClick={logout} className="text-dark-400 hover:text-red-400 text-sm">{t('nav.logout')}</button>
          </div>
        </div>

        {/* Mobile: balance + hamburger */}
        <div className="flex md:hidden items-center gap-3">
          <div className="text-primary-400 font-bold text-sm">{user?.balance.toFixed(0)} RTB</div>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="text-dark-300 hover:text-white p-1"
            aria-label="Menu"
          >
            {menuOpen ? (
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile dropdown */}
      {menuOpen && (
        <div className="md:hidden border-t border-dark-700 bg-dark-900/95 backdrop-blur-sm">
          <div className="px-4 py-3 space-y-1">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className={`block py-2.5 px-3 rounded-lg text-sm font-medium transition-colors ${
                  isActive(link.href) ? 'bg-primary-600/20 text-white' : 'text-dark-300 hover:bg-dark-800 hover:text-white'
                }`}
              >
                {link.label}
              </Link>
            ))}
            {user?.is_admin && (
              <Link
                href="/admin"
                onClick={() => setMenuOpen(false)}
                className="block py-2.5 px-3 rounded-lg text-sm font-medium text-yellow-400 hover:bg-dark-800"
              >
                {t('nav.admin')}
              </Link>
            )}
          </div>
          <div className="px-4 py-3 border-t border-dark-700 flex items-center justify-between">
            <div>
              <div className="text-xs text-dark-400">{user?.name}</div>
              <div className="text-primary-400 font-bold text-sm">{user?.balance.toFixed(0)} {t('nav.tokens')}</div>
            </div>
            <div className="flex items-center gap-3">
              <LanguageToggle />
              <button onClick={() => { logout(); setMenuOpen(false); }} className="text-red-400 text-sm font-medium">
                {t('nav.logout')}
              </button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
