import React from 'react';

/**
 * Componente de demonstração do sistema Glassmorphism
 * 
 * Este componente mostra todos os tokens e classes disponíveis
 * para implementação do design system glassmorphism.
 * 
 * @version 1.0.0
 * @author Arisara Team
 */
export const GlassmorphismDemo: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-orange-50 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="glass-card mb-8 p-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            🎨 Glassmorphism Design System
          </h1>
          <p className="text-gray-600">
            Demonstração completa dos componentes e tokens disponíveis
          </p>
        </div>

        {/* Cards Section */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold text-gray-800 mb-6">Cards</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="glass-card p-6">
              <h3 className="text-lg font-semibold mb-2">Card Padrão</h3>
              <p className="text-gray-600">
                Card com glassmorphism padrão e hover effect
              </p>
            </div>
            
            <div className="glass-card-light p-6">
              <h3 className="text-lg font-semibold mb-2">Card Leve</h3>
              <p className="text-gray-600">
                Menos transparência, ideal para elementos secundários
              </p>
            </div>
            
            <div className="glass-card-heavy p-6">
              <h3 className="text-lg font-semibold mb-2">Card Pesado</h3>
              <p className="text-gray-600">
                Mais transparência, ideal para modais e overlays
              </p>
            </div>
          </div>
        </section>

        {/* Brand Colors Section */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold text-gray-800 mb-6">Cores da Marca</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="glass-blue p-6">
              <h3 className="text-lg font-semibold mb-2 text-white">Tema Azul</h3>
              <p className="text-blue-100">
                Variante azul com glassmorphism
              </p>
            </div>
            
            <div className="glass-orange p-6">
              <h3 className="text-lg font-semibold mb-2 text-white">Tema Laranja</h3>
              <p className="text-orange-100">
                Variante laranja com glassmorphism
              </p>
            </div>
          </div>
        </section>

        {/* Interactive Elements */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold text-gray-800 mb-6">Elementos Interativos</h2>
          <div className="glass-card p-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Input com Glassmorphism
                </label>
                <input 
                  type="text" 
                  className="glass-input w-full px-4 py-2 rounded-lg"
                  placeholder="Digite algo aqui..."
                />
              </div>
              
              <div className="flex gap-4">
                <button className="glass-button px-6 py-2 rounded-lg">
                  Botão Glass
                </button>
                <button className="glass-button px-6 py-2 rounded-lg glass-float">
                  Botão Flutuante
                </button>
                <button className="glass-button px-6 py-2 rounded-lg glass-glow">
                  Botão Brilhante
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Modal Demo */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold text-gray-800 mb-6">Modal Demo</h2>
          <div className="relative">
            <div className="glass-backdrop absolute inset-0 rounded-lg"></div>
            <div className="glass-modal relative p-6 rounded-lg">
              <h3 className="text-lg font-semibold mb-2">Modal Glassmorphism</h3>
              <p className="text-gray-600 mb-4">
                Exemplo de modal com backdrop blur e glassmorphism pesado
              </p>
              <div className="flex gap-2">
                <button className="glass-button px-4 py-2 rounded">
                  Confirmar
                </button>
                <button className="glass-button px-4 py-2 rounded">
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Design Tokens */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold text-gray-800 mb-6">Design Tokens</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="glass-card p-6">
              <h3 className="text-lg font-semibold mb-4">Glass Backgrounds</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>--glass-white:</span>
                  <code className="bg-gray-100 px-2 rounded">rgba(255, 255, 255, 0.25)</code>
                </div>
                <div className="flex justify-between">
                  <span>--glass-white-medium:</span>
                  <code className="bg-gray-100 px-2 rounded">rgba(255, 255, 255, 0.15)</code>
                </div>
                <div className="flex justify-between">
                  <span>--glass-white-light:</span>
                  <code className="bg-gray-100 px-2 rounded">rgba(255, 255, 255, 0.08)</code>
                </div>
                <div className="flex justify-between">
                  <span>--glass-white-heavy:</span>
                  <code className="bg-gray-100 px-2 rounded">rgba(255, 255, 255, 0.35)</code>
                </div>
              </div>
            </div>
            
            <div className="glass-card p-6">
              <h3 className="text-lg font-semibold mb-4">Blur Levels</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>--blur-light:</span>
                  <code className="bg-gray-100 px-2 rounded">blur(8px)</code>
                </div>
                <div className="flex justify-between">
                  <span>--blur-medium:</span>
                  <code className="bg-gray-100 px-2 rounded">blur(12px)</code>
                </div>
                <div className="flex justify-between">
                  <span>--blur-heavy:</span>
                  <code className="bg-gray-100 px-2 rounded">blur(20px)</code>
                </div>
                <div className="flex justify-between">
                  <span>--blur-extra:</span>
                  <code className="bg-gray-100 px-2 rounded">blur(32px)</code>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Usage Guidelines */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold text-gray-800 mb-6">Guias de Uso</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="glass-card p-6">
              <h3 className="text-lg font-semibold mb-4 text-green-600">✅ Recomendado</h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>• Sidebar e navegação</li>
                <li>• Cards de dashboard</li>
                <li>• Modais e overlays</li>
                <li>• Elementos de destaque</li>
                <li>• Botões de ação principal</li>
              </ul>
            </div>
            
            <div className="glass-card p-6">
              <h3 className="text-lg font-semibold mb-4 text-red-600">❌ Evitar</h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>• Texto longo</li>
                <li>• Elementos críticos de UX</li>
                <li>• Áreas com muito conteúdo</li>
                <li>• Elementos que precisam de alto contraste</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Footer */}
        <div className="glass-card p-6 text-center">
          <p className="text-gray-600">
            Sistema de Design Glassmorphism da Pontua - Versão 1.0.0
          </p>
          <p className="text-sm text-gray-500 mt-2">
            Compatível com navegadores modernos e com fallbacks para navegadores antigos
          </p>
        </div>
      </div>
    </div>
  );
};

export default GlassmorphismDemo; 