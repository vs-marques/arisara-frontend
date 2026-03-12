/**
 * Caminho: src/components/layout/PublicLayout.tsx
 * Descrição: Layout público com sistema de tema dinâmico e glassmorphism
 * Versão: 3.4 – 2025-01-27
 * Histórico de Modificações:
 * - 2025-01-27: Unificado gradientes com a tela de login para consistência visual
 * - 2025-01-27: Ajustado modo escuro para azul marinho profundo e laranja escuro desbotado
 * - 2025-01-27: Aumentado intensidade das cores do fundo para melhor destaque
 * - 2025-01-27: Ajustado fundo para tons intermediários e suavizado sombra do card
 * - 2025-01-27: Aplicado glassmorphism no card e ajustado fundo para cores mais suaves
 * - 2025-01-27: Alterado fundo para degradê diagonal azul e laranja
 * - 2025-01-27: Atualizado botão de configurações para usar glassmorphism
 * - 2025-01-27: Implementado sistema de tema dinâmico
 * - 2025-07-24: Estrutura inicial de layout público
 */

import React, { useState } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Settings, Sun, Moon } from 'lucide-react';

interface PublicLayoutProps {
  children: React.ReactNode;
}

const PublicLayout: React.FC<PublicLayoutProps> = ({ children }) => {
  const { theme, toggleTheme } = useTheme();
  const { language, setLanguage } = useLanguage();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden transition-all duration-500 ease-in-out">
      {/* Gradiente do modo claro */}
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-100 via-blue-200 to-orange-200 dark:hidden" />
      
      {/* Gradiente do modo escuro */}
      <div className="absolute inset-0 bg-gradient-to-br from-black via-[#252440] to-[#000020] hidden dark:block" />
      
      {/* Padrão de fundo */}
      <div className="fixed inset-0 opacity-20 dark:opacity-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_25%,rgba(59,130,246,0.08),transparent_50%),radial-gradient(circle_at_75%_75%,rgba(249,115,22,0.08),transparent_50%)] dark:bg-[radial-gradient(circle_at_25%_25%,rgba(30,58,138,0.15),transparent_50%),radial-gradient(circle_at_75%_75%,rgba(194,65,12,0.12),transparent_50%)]" />
      </div>

      {/* Botão flutuante de configurações */}
      <div className="fixed top-4 right-4 z-[9999]">
        {/* Botão principal */}
        <button
          onClick={() => setIsSettingsOpen(!isSettingsOpen)}
          className="glass-button flex items-center justify-center w-12 h-12 rounded-full transition-all duration-300 ease-in-out group shadow-lg hover:shadow-xl"
          style={{ boxShadow: '0 4px 24px rgba(33,150,243,0.08)' }}
          aria-label="Configurações"
        >
          <Settings className="w-5 h-5 text-gray-700 dark:text-gray-300" />
        </button>

        {/* Menu dropdown */}
        {isSettingsOpen && (
          <>
            {/* Backdrop */}
            <div 
              className="fixed inset-0 z-[9998]" 
              onClick={() => setIsSettingsOpen(false)}
            />
            
            {/* Menu */}
            <div className="absolute top-full right-0 mt-3 w-48 glass-card rounded-lg shadow-2xl z-[9999] overflow-hidden border border-gray-200/20 dark:border-slate-700/30"
                 style={{ boxShadow: '0 4px 24px rgba(33,150,243,0.08)' }}>
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
                          setLanguage(lang.code as any);
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
      </div>

      {/* Card de login com glassmorphism */}
      <div className="relative z-10 bg-white/30 dark:bg-slate-900/30 backdrop-blur-xl rounded-2xl border border-white/50 dark:border-slate-700/50 p-12 max-w-xl w-full mx-4 transition-all duration-500 ease-in-out"
           style={{ 
             boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08), 0 2px 8px rgba(0, 0, 0, 0.04)',
             background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.35) 0%, rgba(255, 255, 255, 0.15) 100%)',
             backdropFilter: 'blur(16px) saturate(150%)'
           }}>
        {children}
      </div>
    </div>
  );
};

export default PublicLayout; 