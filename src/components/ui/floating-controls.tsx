/**
 * Caminho: src/components/ui/floating-controls.tsx
 * Descrição: Controles flutuantes de tema e idioma
 * Versão: 1.2.0 – 2025-01-27
 * Histórico de Modificações:
 * - 2025-01-27: Adicionado modal de configurações de perfil
 * - 2025-01-27: Atualizado para usar elementos visuais da tela de login
 * - 2025-01-27: Criação do componente
 */

import React, { useState } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Settings, Moon, Sun } from 'lucide-react';
import ConfigModal from '@/components/ConfigModal';

const FloatingControls: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const { language, setLanguage } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [configModalOpen, setConfigModalOpen] = useState(false);

  const handleLanguageChange = (langCode: typeof language) => {
    setLanguage(langCode);
    setIsOpen(false);
  };

  return (
    <div className="fixed top-4 right-4 z-[9999]">
      {/* Botão principal */}
      <button
        onClick={() => setConfigModalOpen(true)}
        className="glass-button flex items-center justify-center w-12 h-12 rounded-full transition-all duration-300 ease-in-out group shadow-lg hover:shadow-xl"
        style={{ boxShadow: '0 4px 24px rgba(33,150,243,0.08)' }}
        title="Configurações"
        aria-label="Configurações"
      >
        <Settings className="w-5 h-5 text-gray-700 dark:text-gray-300" />
      </button>

      {/* Menu dropdown */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-[9998]" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* Menu */}
          <div 
            className="absolute top-full right-0 mt-2 w-48 glass-card rounded-lg shadow-2xl z-[9999] overflow-hidden border border-gray-200/20 dark:border-slate-700/30"
            style={{ boxShadow: '0 4px 24px rgba(33,150,243,0.08)' }}
          >
            <div className="p-4">
              {/* Seção de Tema */}
              <div className="mb-4">
                <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wide">
                  Tema
                </h4>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      if (theme !== 'light') toggleTheme();
                    }}
                    className={`flex items-center justify-center w-10 h-10 rounded-full transition-all duration-200 ${
                      theme === 'light' 
                        ? 'bg-gray-600 text-white' 
                        : 'bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 text-gray-600 dark:text-gray-300'
                    }`}
                    style={{ 
                      boxShadow: theme === 'light' 
                        ? '0 2px 8px rgba(0,0,0,0.15)' 
                        : 'none' 
                    }}
                    title="Tema Claro"
                  >
                    <Sun className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => {
                      if (theme !== 'dark') toggleTheme();
                    }}
                    className={`flex items-center justify-center w-10 h-10 rounded-full transition-all duration-200 ${
                      theme === 'dark' 
                        ? 'bg-gray-600 text-white' 
                        : 'bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 text-gray-600 dark:text-gray-300'
                    }`}
                    style={{ 
                      boxShadow: theme === 'dark' 
                        ? '0 2px 8px rgba(0,0,0,0.15)' 
                        : 'none' 
                    }}
                    title="Tema Escuro"
                  >
                    <Moon className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Seção de Idioma */}
              <div>
                <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wide">
                  Idioma
                </h4>
                <div className="flex gap-2">
                  {[
                    { code: 'pt-BR', flag: '🇧🇷' },
                    { code: 'en', flag: '🇺🇸' },
                    { code: 'es', flag: '🇪🇸' }
                  ].map((lang) => (
                    <button
                      key={lang.code}
                      onClick={() => {
                        handleLanguageChange(lang.code as any);
                      }}
                      className={`flex items-center justify-center w-10 h-10 rounded-full transition-all duration-200 text-lg ${
                        language === lang.code 
                          ? 'bg-gray-600 text-white' 
                          : 'bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600'
                      }`}
                      style={{ 
                        boxShadow: language === lang.code 
                          ? '0 2px 8px rgba(0,0,0,0.15)' 
                          : 'none' 
                      }}
                      title={lang.code === 'pt-BR' ? 'Português' : lang.code === 'en' ? 'English' : 'Español'}
                    >
                      {lang.flag}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Modal de Configurações */}
      <ConfigModal
        isOpen={configModalOpen}
        onClose={() => setConfigModalOpen(false)}
      />
    </div>
  );
};

export default FloatingControls; 