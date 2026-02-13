import Link from 'next/link';
import { useLanguage, LanguageToggle } from '@/lib/LanguageContext';

const SECTIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;

export default function Terms() {
  const { t } = useLanguage();

  return (
    <div className="min-h-screen relative">
      {/* Language Toggle */}
      <div className="absolute top-4 right-4 z-50">
        <LanguageToggle />
      </div>

      <div className="w-full px-4 py-12 max-w-3xl mx-auto">
        {/* Back link */}
        <Link
          href="/"
          className="inline-block text-dark-400 hover:text-primary-400 text-sm mb-8 transition-colors"
        >
          {t('privacy.backHome')}
        </Link>

        {/* Title */}
        <h1 className="text-3xl md:text-4xl font-bold mb-2">
          {t('terms.title')}
        </h1>
        <p className="text-dark-400 text-sm mb-10">
          {t('terms.lastUpdated')}
        </p>

        {/* Sections */}
        <div className="space-y-8">
          {SECTIONS.map((n) => (
            <section key={n}>
              <h2 className="text-xl font-bold text-primary-400 mb-3">
                {t(`terms.s${n}.title` as any)}
              </h2>
              <div className="text-dark-300 leading-relaxed whitespace-pre-line">
                {t(`terms.s${n}.content` as any)}
              </div>
            </section>
          ))}
        </div>

        {/* Important notice banner */}
        <div className="mt-12 bg-amber-950/20 border border-amber-500/20 rounded-2xl p-6">
          <div className="flex items-start gap-3">
            <span className="text-amber-400 text-lg mt-0.5">⚠</span>
            <div>
              <h4 className="text-amber-400 font-bold mb-2">{t('disclaimer.title')}</h4>
              <ul className="text-amber-200/60 text-sm space-y-1">
                <li>• {t('disclaimer.1')}</li>
                <li>• {t('disclaimer.2')}</li>
                <li>• {t('disclaimer.4')}</li>
                <li>• {t('disclaimer.5')}</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Footer nav */}
        <div className="mt-16 pt-8 border-t border-dark-700 flex flex-wrap gap-4 text-sm text-dark-500">
          <Link href="/privacy" className="hover:text-primary-400 transition-colors">
            {t('footer.privacy')}
          </Link>
          <span>·</span>
          <Link href="/" className="hover:text-primary-400 transition-colors">
            {t('privacy.backHome')}
          </Link>
        </div>
      </div>
    </div>
  );
}
