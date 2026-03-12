import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

const LANGUAGES = [
  { code: 'th' as const, labelKey: 'settings.common.languageOption_th' },
  { code: 'en' as const, labelKey: 'settings.common.languageOption_en' },
] as const;

interface SidebarLanguageSelectorProps {
  showLabel?: boolean;
}

export default function SidebarLanguageSelector({ showLabel = true }: SidebarLanguageSelectorProps) {
  const { t, i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  const currentCode = (i18n.language?.slice(0, 2) || 'th') as 'th' | 'en';

  const handleSelect = (code: 'th' | 'en') => {
    i18n.changeLanguage(code);
    setOpen(false);
  };

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  return (
    <div className="sidebar-language-wrap" ref={wrapRef}>
      <button
        type="button"
        className="sidebar-footer-button"
        title={!showLabel ? t('settings.common.language') : undefined}
        aria-label={t('settings.common.language')}
        aria-expanded={open}
        aria-haspopup="true"
        onClick={() => setOpen((prev) => !prev)}
      >
        <Globe className="w-5 h-5 shrink-0" />
        {showLabel && <span>{t('settings.common.language')}</span>}
      </button>
      {open && (
        <>
          <div
            className="sidebar-language-backdrop"
            aria-hidden
            onClick={() => setOpen(false)}
          />
          <div
            className="sidebar-language-dropdown"
            role="menu"
            aria-label={t('settings.common.language')}
          >
            {LANGUAGES.map(({ code, labelKey }) => (
              <button
                key={code}
                type="button"
                role="menuitem"
                className={`sidebar-language-option ${currentCode === code ? 'active' : ''}`}
                onClick={() => handleSelect(code)}
              >
                {t(labelKey)}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
