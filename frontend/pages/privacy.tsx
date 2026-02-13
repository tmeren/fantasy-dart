import Link from 'next/link';
import { useLanguage, LanguageToggle } from '@/lib/LanguageContext';

const SECTIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9] as const;

export default function Privacy() {
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
          {t('privacy.title')}
        </h1>
        <p className="text-dark-400 text-sm mb-10">
          {t('privacy.lastUpdated')}
        </p>

        {/* Sections */}
        <div className="space-y-8">
          {SECTIONS.map((n) => (
            <section key={n}>
              <h2 className="text-xl font-bold text-primary-400 mb-3">
                {t(`privacy.s${n}.title` as any)}
              </h2>
              <div className="text-dark-300 leading-relaxed whitespace-pre-line">
                {t(`privacy.s${n}.content` as any)}
              </div>
            </section>
          ))}
        </div>

        {/* Footer nav */}
        <div className="mt-16 pt-8 border-t border-dark-700 flex flex-wrap gap-4 text-sm text-dark-500">
          <Link href="/terms" className="hover:text-primary-400 transition-colors">
            {t('footer.terms')}
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
