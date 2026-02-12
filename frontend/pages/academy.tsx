import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from './_app';
import { useLanguage } from '@/lib/LanguageContext';
import { TranslationKey } from '@/lib/i18n';
import Navbar from '@/components/Navbar';
import Link from 'next/link';

/* ── Topic data ── */
interface Topic {
  id: number;
  titleKey: TranslationKey;
  descKey: TranslationKey;
  contentKey: TranslationKey;
}

interface Level {
  level: number;
  icon: string;
  titleKey: TranslationKey;
  descKey: TranslationKey;
  color: string;
  borderColor: string;
  bgColor: string;
  textColor: string;
  topics: Topic[];
}

const LEVELS: Level[] = [
  {
    level: 1,
    icon: '🔰',
    titleKey: 'academy.level1.title',
    descKey: 'academy.level1.desc',
    color: 'primary',
    borderColor: 'border-primary-500/30',
    bgColor: 'bg-primary-500/10',
    textColor: 'text-primary-400',
    topics: [
      { id: 1, titleKey: 'academy.t1.title', descKey: 'academy.t1.desc', contentKey: 'academy.t1.content' },
      { id: 2, titleKey: 'academy.t2.title', descKey: 'academy.t2.desc', contentKey: 'academy.t2.content' },
      { id: 3, titleKey: 'academy.t3.title', descKey: 'academy.t3.desc', contentKey: 'academy.t3.content' },
    ],
  },
  {
    level: 2,
    icon: '⚡',
    titleKey: 'academy.level2.title',
    descKey: 'academy.level2.desc',
    color: 'emerald',
    borderColor: 'border-emerald-500/30',
    bgColor: 'bg-emerald-500/10',
    textColor: 'text-emerald-400',
    topics: [
      { id: 4, titleKey: 'academy.t4.title', descKey: 'academy.t4.desc', contentKey: 'academy.t4.content' },
      { id: 5, titleKey: 'academy.t5.title', descKey: 'academy.t5.desc', contentKey: 'academy.t5.content' },
      { id: 6, titleKey: 'academy.t6.title', descKey: 'academy.t6.desc', contentKey: 'academy.t6.content' },
      { id: 7, titleKey: 'academy.t7.title', descKey: 'academy.t7.desc', contentKey: 'academy.t7.content' },
    ],
  },
  {
    level: 3,
    icon: '👁',
    titleKey: 'academy.level3.title',
    descKey: 'academy.level3.desc',
    color: 'cyan',
    borderColor: 'border-cyan-500/30',
    bgColor: 'bg-cyan-500/10',
    textColor: 'text-cyan-400',
    topics: [
      { id: 8, titleKey: 'academy.t8.title', descKey: 'academy.t8.desc', contentKey: 'academy.t8.content' },
      { id: 9, titleKey: 'academy.t9.title', descKey: 'academy.t9.desc', contentKey: 'academy.t9.content' },
      { id: 10, titleKey: 'academy.t10.title', descKey: 'academy.t10.desc', contentKey: 'academy.t10.content' },
    ],
  },
];

export default function Academy() {
  const { user, loading } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();

  const [expandedTopics, setExpandedTopics] = useState<Set<number>>(new Set());
  const [collapsedLevels, setCollapsedLevels] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (!loading && !user) router.replace('/');
  }, [user, loading, router]);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500" />
      </div>
    );
  }

  const toggleTopic = (id: number) => {
    setExpandedTopics((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleLevel = (level: number) => {
    setCollapsedLevels((prev) => {
      const next = new Set(prev);
      if (next.has(level)) next.delete(level);
      else next.add(level);
      return next;
    });
  };

  const expandAll = () => {
    setExpandedTopics(new Set(LEVELS.flatMap((l) => l.topics.map((t) => t.id))));
    setCollapsedLevels(new Set());
  };

  const collapseAll = () => {
    setExpandedTopics(new Set());
  };

  return (
    <div className="min-h-screen">
      <Navbar />

      {/* Background effects */}
      <div className="fixed inset-0 pointer-events-none -z-10">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-primary-500/5 rounded-full blur-[120px]" />
        <div className="absolute top-1/3 -right-32 w-64 h-64 bg-cyan-500/5 rounded-full blur-[80px]" />
      </div>

      <div className="w-full px-4 py-6 sm:py-12 max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-black mb-4">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-400 via-emerald-300 to-cyan-400">
              {t('academy.title')}
            </span>
          </h1>
          <p className="text-dark-300 text-lg mb-6">{t('academy.subtitle')}</p>

          {/* Progress + controls */}
          <div className="flex items-center justify-center gap-6">
            <span className="text-dark-400 text-sm">
              {expandedTopics.size}/10 {t('academy.progress')}
            </span>
            <div className="flex gap-2">
              <button onClick={expandAll} className="text-xs px-3 py-1 rounded-lg bg-dark-800 border border-dark-600 text-dark-300 hover:text-white transition-colors">
                {t('academy.expandAll')}
              </button>
              <button onClick={collapseAll} className="text-xs px-3 py-1 rounded-lg bg-dark-800 border border-dark-600 text-dark-300 hover:text-white transition-colors">
                {t('academy.collapseAll')}
              </button>
            </div>
          </div>

          {/* Progress bar */}
          <div className="mt-4 max-w-xs mx-auto h-2 rounded-full bg-dark-800 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-primary-500 via-emerald-500 to-cyan-500 transition-all duration-500"
              style={{ width: `${(expandedTopics.size / 10) * 100}%` }}
            />
          </div>
        </div>

        {/* Levels */}
        <div className="space-y-8">
          {LEVELS.map((level) => {
            const isCollapsed = collapsedLevels.has(level.level);
            return (
              <div key={level.level} className="animate-fade-in-up" style={{ animationDelay: `${(level.level - 1) * 0.1}s` }}>
                {/* Level Header */}
                <button
                  onClick={() => toggleLevel(level.level)}
                  className={`w-full flex items-center gap-4 p-5 rounded-xl ${level.bgColor} border ${level.borderColor} hover:brightness-110 transition-all`}
                >
                  <span className="text-3xl">{level.icon}</span>
                  <div className="text-left flex-1">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-bold uppercase tracking-widest ${level.textColor}`}>
                        Level {level.level}
                      </span>
                    </div>
                    <h2 className="text-xl font-bold">{t(level.titleKey)}</h2>
                    <p className="text-dark-400 text-sm">{t(level.descKey)}</p>
                  </div>
                  <span className={`text-dark-400 transition-transform ${isCollapsed ? '' : 'rotate-180'}`}>
                    ▼
                  </span>
                </button>

                {/* Topics */}
                {!isCollapsed && (
                  <div className="mt-3 space-y-3 pl-4 border-l-2 border-dark-700 ml-6">
                    {level.topics.map((topic) => {
                      const isExpanded = expandedTopics.has(topic.id);
                      return (
                        <div key={topic.id} className="bg-dark-800/40 backdrop-blur-sm rounded-xl border border-dark-700 overflow-hidden transition-all">
                          {/* Topic header */}
                          <button
                            onClick={() => toggleTopic(topic.id)}
                            className="w-full text-left p-5 flex items-start gap-4 hover:bg-dark-700/20 transition-colors"
                          >
                            <span className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold ${isExpanded ? level.bgColor + ' ' + level.textColor : 'bg-dark-700 text-dark-400'} transition-colors`}>
                              {topic.id}
                            </span>
                            <div className="flex-1 min-w-0">
                              <h3 className="font-bold text-lg">{t(topic.titleKey)}</h3>
                              <p className="text-dark-400 text-sm mt-1">{t(topic.descKey)}</p>
                            </div>
                            <span className={`text-dark-500 text-sm transition-transform flex-shrink-0 mt-1 ${isExpanded ? 'rotate-180' : ''}`}>
                              ▼
                            </span>
                          </button>

                          {/* Topic content */}
                          {isExpanded && (
                            <div className="px-5 pb-5 pt-0">
                              <div className={`border-t ${level.borderColor} pt-4 mt-1`}>
                                {t(topic.contentKey).split('\n\n').map((paragraph, i) => (
                                  <p key={i} className="text-dark-300 leading-relaxed mb-3 last:mb-0">
                                    {paragraph}
                                  </p>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Back to dashboard */}
        <div className="text-center mt-12">
          <Link
            href="/dashboard"
            className="text-dark-400 hover:text-white text-sm transition-colors"
          >
            ← Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
