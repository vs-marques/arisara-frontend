import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';

const LANGUAGES = [
  { code: 'th' as const, labelKey: 'settings.common.languageOption_th' },
  { code: 'en' as const, labelKey: 'settings.common.languageOption_en' },
];

export default function FloatingLanguageSelector() {
  const { t, i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const currentCode = (i18n.language?.slice(0, 2) || 'th') as 'th' | 'en';

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [isOpen]);

  const handleSelect = (code: 'th' | 'en') => {
    i18n.changeLanguage(code);
    setIsOpen(false);
  };

  return (
    <div className="fixed top-5 right-5 z-50" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-label={t('settings.common.language')}
        aria-expanded={isOpen}
        className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-black/40 backdrop-blur-md text-white/80 hover:text-white hover:bg-white/10 hover:border-white/20 transition-all duration-200 shadow-lg"
      >
        <Globe className="h-5 w-5" />
      </button>

      {isOpen && (
        <div
          className="absolute top-full right-0 mt-2 min-w-[140px] rounded-xl border border-white/10 bg-black/60 backdrop-blur-xl shadow-xl py-1.5"
          role="menu"
        >
          {LANGUAGES.map(({ code, labelKey }) => (
            <button
              key={code}
              type="button"
              role="menuitem"
              onClick={() => handleSelect(code)}
              className={`w-full px-4 py-2.5 text-left text-sm transition-colors ${
                currentCode === code
                  ? 'bg-[#EC4899]/20 text-[#EC4899]'
                  : 'text-white/90 hover:bg-white/10 hover:text-white'
              }`}
            >
              {t(labelKey)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
