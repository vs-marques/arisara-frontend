import React, { createContext, useContext, useEffect, useState } from 'react';

/**
 * Tipos de tema disponíveis
 */
export type ThemeType = 'light' | 'dark';

/**
 * Interface do contexto de tema
 */
interface ThemeContextType {
  theme: ThemeType;
  toggleTheme: () => void;
  setTheme: (theme: ThemeType) => void;
}

/**
 * Contexto de tema
 */
const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

/**
 * Hook personalizado para usar o contexto de tema
 */
export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme deve ser usado dentro de um ThemeProvider');
  }
  return context;
};

/**
 * Provider do contexto de tema
 * 
 * Gerencia o estado do tema (light/dark) e aplica as variáveis CSS
 * correspondentes, incluindo glassmorphism adaptativo.
 * 
 * @version 1.0.0
 * @author Arisara Team
 */
export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<ThemeType>('light');

  // Carregar tema do localStorage na inicialização
  useEffect(() => {
    const savedTheme = localStorage.getItem('app-theme') as ThemeType;
    if (savedTheme && (savedTheme === 'light' || savedTheme === 'dark')) {
      setThemeState(savedTheme);
    } else {
      // Detectar preferência do sistema
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setThemeState(prefersDark ? 'dark' : 'light');
    }
  }, []);

  // Aplicar tema ao documento
  useEffect(() => {
    const root = document.documentElement;
    
    if (theme === 'dark') {
      root.classList.add('dark');
      applyDarkTheme(root);
    } else {
      root.classList.remove('dark');
      applyLightTheme(root);
    }
    
    // Salvar no localStorage
    localStorage.setItem('app-theme', theme);
  }, [theme]);

  // Aplicar variáveis CSS do tema claro
  const applyLightTheme = (root: HTMLElement) => {
    // Cores base
    root.style.setProperty('--bg-primary', '#ffffff');
    root.style.setProperty('--bg-secondary', '#f8fafc');
    root.style.setProperty('--bg-tertiary', '#f1f5f9');
    root.style.setProperty('--text-primary', '#1e293b');
    root.style.setProperty('--text-secondary', '#64748b');
    root.style.setProperty('--text-muted', '#94a3b8');
    
    // Glassmorphism light
    root.style.setProperty('--glass-white', 'rgba(255, 255, 255, 0.25)');
    root.style.setProperty('--glass-white-medium', 'rgba(255, 255, 255, 0.15)');
    root.style.setProperty('--glass-white-light', 'rgba(255, 255, 255, 0.08)');
    root.style.setProperty('--glass-white-heavy', 'rgba(255, 255, 255, 0.35)');
    
    // Bordas glass
    root.style.setProperty('--glass-border-light', 'rgba(255, 255, 255, 0.18)');
    root.style.setProperty('--glass-border-medium', 'rgba(255, 255, 255, 0.12)');
    root.style.setProperty('--glass-border-heavy', 'rgba(255, 255, 255, 0.25)');
    
    // Sombras glass
    root.style.setProperty('--glass-shadow', '0 8px 32px 0 rgba(31, 38, 135, 0.37)');
    root.style.setProperty('--glass-shadow-hover', '0 12px 40px 0 rgba(31, 38, 135, 0.45)');
    root.style.setProperty('--glass-shadow-light', '0 4px 16px 0 rgba(31, 38, 135, 0.25)');
    root.style.setProperty('--glass-shadow-heavy', '0 16px 48px 0 rgba(31, 38, 135, 0.55)');
    
    // Cores primárias
    root.style.setProperty('--primary-blue', '#1e40af');
    root.style.setProperty('--primary-orange', '#ff6b35');
    root.style.setProperty('--glass-blue', 'rgba(30, 64, 175, 0.15)');
    root.style.setProperty('--glass-orange', 'rgba(255, 107, 53, 0.15)');
  };

  // Aplicar variáveis CSS do tema escuro
  const applyDarkTheme = (root: HTMLElement) => {
    // Cores base
    root.style.setProperty('--bg-primary', '#0f172a');
    root.style.setProperty('--bg-secondary', '#1e293b');
    root.style.setProperty('--bg-tertiary', '#334155');
    root.style.setProperty('--text-primary', '#f8fafc');
    root.style.setProperty('--text-secondary', '#cbd5e1');
    root.style.setProperty('--text-muted', '#94a3b8');
    
    // Glassmorphism dark (mais sutil)
    root.style.setProperty('--glass-white', 'rgba(255, 255, 255, 0.08)');
    root.style.setProperty('--glass-white-medium', 'rgba(255, 255, 255, 0.05)');
    root.style.setProperty('--glass-white-light', 'rgba(255, 255, 255, 0.03)');
    root.style.setProperty('--glass-white-heavy', 'rgba(255, 255, 255, 0.12)');
    
    // Bordas glass dark
    root.style.setProperty('--glass-border-light', 'rgba(255, 255, 255, 0.08)');
    root.style.setProperty('--glass-border-medium', 'rgba(255, 255, 255, 0.05)');
    root.style.setProperty('--glass-border-heavy', 'rgba(255, 255, 255, 0.12)');
    
    // Sombras glass dark
    root.style.setProperty('--glass-shadow', '0 8px 32px 0 rgba(0, 0, 0, 0.5)');
    root.style.setProperty('--glass-shadow-hover', '0 12px 40px 0 rgba(0, 0, 0, 0.6)');
    root.style.setProperty('--glass-shadow-light', '0 4px 16px 0 rgba(0, 0, 0, 0.4)');
    root.style.setProperty('--glass-shadow-heavy', '0 16px 48px 0 rgba(0, 0, 0, 0.7)');
    
    // Cores primárias (dark)
    root.style.setProperty('--primary-blue', '#3b82f6');
    root.style.setProperty('--primary-orange', '#fb923c');
    root.style.setProperty('--glass-blue', 'rgba(59, 130, 246, 0.15)');
    root.style.setProperty('--glass-orange', 'rgba(251, 146, 60, 0.15)');
  };

  // Alternar entre temas
  const toggleTheme = () => {
    setThemeState(prev => prev === 'light' ? 'dark' : 'light');
  };

  // Definir tema específico
  const setTheme = (newTheme: ThemeType) => {
    setThemeState(newTheme);
  };

  const value: ThemeContextType = {
    theme,
    toggleTheme,
    setTheme,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

export default ThemeProvider; 