import React, { useState } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { ChevronDown, Globe } from 'lucide-react';

/**
 * Componente seletor de idioma
 * 
 * Permite selecionar entre os idiomas disponíveis
 * com interface dropdown e glassmorphism.
 * 
 * @version 1.0.0
 * @author Arisara Team
 */
export const LanguageSelector: React.FC = () => {
  const { language, setLanguage, t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);

  const languages = [
    { code: 'pt-BR', name: t('language.pt-BR'), flag: '🇧🇷' },
    { code: 'en', name: t('language.en'), flag: '🇺🇸' },
    { code: 'es', name: t('language.es'), flag: '🇪🇸' },
  ] as const;

  const currentLanguage = languages.find(lang => lang.code === language);

  const handleLanguageChange = (langCode: typeof language) => {
    setLanguage(langCode);
    setIsOpen(false);
  };

  return (
    <div className="relative">
      {/* Botão principal */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="glass-button flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200 group"
        title={t('language.select')}
        aria-label={t('language.select')}
      >
        <Globe className="w-4 h-4" />
        <span className="text-lg">{currentLanguage?.flag}</span>
        <span className="hidden sm:block text-sm font-medium">
          {currentLanguage?.name}
        </span>
        <ChevronDown 
          className={`w-4 h-4 transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`} 
        />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* Menu */}
          <div className="absolute top-full right-0 mt-2 w-48 glass-card rounded-lg shadow-lg z-20 overflow-hidden">
            <div className="py-1">
              {languages.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => handleLanguageChange(lang.code)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-all duration-200 hover:bg-white/10 ${
                    language === lang.code 
                      ? 'bg-white/20 text-blue-600 dark:text-blue-400' 
                      : 'text-gray-700 dark:text-gray-300'
                  }`}
                >
                  <span className="text-lg">{lang.flag}</span>
                  <span className="text-sm font-medium">{lang.name}</span>
                  {language === lang.code && (
                    <div className="ml-auto w-2 h-2 bg-blue-500 rounded-full" />
                  )}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default LanguageSelector; 