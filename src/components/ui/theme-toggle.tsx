import React from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { Moon, Sun } from 'lucide-react';

/**
 * Componente de toggle de tema
 * 
 * Permite alternar entre tema claro e escuro com
 * animações suaves e glassmorphism.
 * 
 * @version 1.0.0
 * @author Arisara Team
 */
export const ThemeToggle: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const { t } = useLanguage();

  return (
    <button
      onClick={toggleTheme}
      className="glass-button relative flex items-center justify-center w-12 h-12 rounded-full transition-all duration-300 ease-in-out group"
      title={t('theme.toggle')}
      aria-label={t('theme.toggle')}
    >
      {/* Ícone do Sol */}
      <Sun 
        className={`absolute w-5 h-5 transition-all duration-300 ease-in-out ${
          theme === 'light' 
            ? 'opacity-100 rotate-0 scale-100 text-yellow-500' 
            : 'opacity-0 rotate-90 scale-0'
        }`}
      />
      
      {/* Ícone da Lua */}
      <Moon 
        className={`absolute w-5 h-5 transition-all duration-300 ease-in-out ${
          theme === 'dark' 
            ? 'opacity-100 rotate-0 scale-100 text-blue-400' 
            : 'opacity-0 -rotate-90 scale-0'
        }`}
      />
      
      {/* Efeito de hover */}
      <div className="absolute inset-0 rounded-full bg-gradient-to-r from-yellow-400/20 to-blue-400/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      
      {/* Ripple effect */}
      <div className="absolute inset-0 rounded-full bg-white/10 scale-0 group-active:scale-100 transition-transform duration-200" />
    </button>
  );
};

export default ThemeToggle; 