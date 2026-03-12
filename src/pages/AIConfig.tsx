import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import Layout from '../components/Layout';
import { useRequireAuth } from '../hooks/useRequireAuth';
import { Bot, Save, RotateCcw, Sparkles, BookOpen, Sliders, ChevronDown, ChevronUp, Loader2, AlertCircle, CheckCircle2, Plus, X } from 'lucide-react';
import { API_ENDPOINTS, getAuthHeaders } from '../config/api';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../components/ui/dialog';

interface FewShotExample {
  user?: string;
  assistant?: string;
  context?: string;
}

// Alinhado ao catálogo versionado do backend (config/capability_catalog.json): slug + label para hint e dropdown.
const CAPABILITY_PROFILES: { slug: string; label: string; keywords: string[] }[] = [
  { slug: 'real_estate', label: 'imobiliário', keywords: ['imobiliária', 'imobiliaria', 'imóvel', 'imovel', 'apartamento', 'casa', 'corretor', 'aluguel', 'venda', 'propriedade', 'residencial', 'comercial'] },
  { slug: 'automotive', label: 'automotivo', keywords: ['automóvel', 'carro', 'veículo', 'concessionária', 'seminovo', 'financiamento', 'zero km', 'seguro auto', 'motorista', 'transfer'] },
  { slug: 'healthcare', label: 'saúde', keywords: ['clínica', 'clinica', 'consultório', 'médico', 'odontologia', 'estética', 'laboratório', 'agendamento', 'convênio', 'consulta'] },
  { slug: 'financial_services', label: 'serviços financeiros', keywords: ['crédito', 'consórcio', 'investimento', 'empréstimo', 'simulação', 'contabilidade'] },
  { slug: 'retail', label: 'varejo / e-commerce', keywords: ['loja', 'e-commerce', 'produto', 'carrinho', 'pedido', 'entrega', 'whatsapp', 'venda online'] },
];

function detectPossibleCapability(prompt: string): { slug: string; label: string } | null {
  if (!prompt?.trim()) return null;
  const lower = prompt.toLowerCase();
  for (const profile of CAPABILITY_PROFILES) {
    if (profile.keywords.some((k) => lower.includes(k))) return { slug: profile.slug, label: profile.label };
  }
  return null;
}

function useCapabilityLabel() {
  const { t } = useTranslation();
  return (slug: string | null | undefined) => {
    if (!slug) return '';
    return t(`aiConfig.capabilityLabels.${slug}`, { defaultValue: slug });
  };
}

export default function AIConfig() {
  useRequireAuth();
  const { t } = useTranslation();
  const capabilityLabel = useCapabilityLabel();
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [companyId, setCompanyId] = useState<string | null>(null);

  const [systemPrompt, setSystemPrompt] = useState('');
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(4000);
  const [selectedModel, setSelectedModel] = useState('gpt-4o');
  const [fewShotExamples, setFewShotExamples] = useState<FewShotExample[]>([]);
  const [specialistSettings, setSpecialistSettings] = useState<{ is_specialist?: boolean; capability?: string | null } | null>(null);
  const [showSuggestActivateModal, setShowSuggestActivateModal] = useState(false);
  const [showSuggestSelectModal, setShowSuggestSelectModal] = useState(false);
  const [showSuggestRemoveModal, setShowSuggestRemoveModal] = useState(false);
  const [pendingSuggestCapability, setPendingSuggestCapability] = useState<string | null>(null);
  const [pendingSuggestCapabilities, setPendingSuggestCapabilities] = useState<{ slug: string; label: string; score: number }[]>([]);
  const [selectedCapabilitySlug, setSelectedCapabilitySlug] = useState<string | null>(null);

  const models = [
    { id: 'gpt-4o' },
    { id: 'gpt-4o-mini' },
    { id: 'gpt-3.5-turbo' },
  ];

  // Buscar configuração ao carregar
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        setLoading(true);
        setError(null);

        // Buscar company_id do usuário
        const headers = getAuthHeaders();
        const meRes = await fetch(API_ENDPOINTS.auth.me, { headers });
        if (!meRes.ok) throw new Error(t('aiConfig.errors.loadUser'));
        
        const userData = await meRes.json();
        const userCompanyId = userData.company_id;
        
        if (!userCompanyId) {
          throw new Error(t('aiConfig.errors.noCompany'));
        }
        
        setCompanyId(userCompanyId);

        // Buscar configuração de IA
        const configRes = await fetch(API_ENDPOINTS.aiConfig.get(userCompanyId), { headers });
        if (!configRes.ok) throw new Error(t('aiConfig.errors.loadConfig'));
        
        const config = await configRes.json();
        
        setSystemPrompt(config.prompt_base || '');
        setTemperature(config.temperature || 0.7);
        setMaxTokens(config.max_tokens || 4000);
        setSelectedModel(config.llm_model || 'gpt-4o');
        setFewShotExamples(config.few_shot_examples || []);
        setSpecialistSettings(config.extra_config?.specialist_settings ?? null);
      } catch (err: any) {
        setError(err.message || t('aiConfig.errors.loadConfig'));
      } finally {
        setLoading(false);
      }
    };

    fetchConfig();
  }, []);

  // Salvar configuração
  const handleSave = async (payloadSpecialistSettings?: { is_specialist: boolean; capability: string | null; activation_method?: string }) => {
    if (!companyId) {
      setError(t('aiConfig.errors.companyNotFound'));
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const headers = getAuthHeaders();
      const body: Record<string, unknown> = {
        prompt_base: systemPrompt,
        llm_model: selectedModel,
        temperature: temperature,
        max_tokens: maxTokens,
        few_shot_examples: fewShotExamples,
      };
      if (payloadSpecialistSettings !== undefined) {
        body.specialist_settings = payloadSpecialistSettings;
      }

      const response = await fetch(API_ENDPOINTS.aiConfig.update(companyId), {
        method: 'PUT',
        headers,
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || t('aiConfig.errors.saveConfig'));
      }

      const data = await response.json();
      if (data.specialist_settings) setSpecialistSettings(data.specialist_settings);

      // Modal de ativar especialista deve aparecer antes do "Configuration saved!" quando o backend sugerir
      const singleCap = typeof data.suggest_capability === 'string' ? data.suggest_capability : null;
      const listCap = Array.isArray(data.suggest_capabilities) ? data.suggest_capabilities : [];

      if (singleCap) {
        setPendingSuggestCapability(singleCap);
        setPendingSuggestCapabilities([]);
        setShowSuggestActivateModal(true);
      } else if (listCap.length > 0) {
        setPendingSuggestCapability(null);
        setPendingSuggestCapabilities(listCap);
        setSelectedCapabilitySlug(listCap[0]?.slug ?? null);
        setShowSuggestSelectModal(true);
      } else if (data.suggest_remove_capability) {
        setShowSuggestRemoveModal(true);
      } else {
        setShowSuccessModal(true);
      }
    } catch (err: any) {
      setError(err.message || t('aiConfig.errors.saveConfig'));
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmActivateSpecialist = async () => {
    if (!companyId || !pendingSuggestCapability) return;
    const capabilitySlug = pendingSuggestCapability;
    setShowSuggestActivateModal(false);
    setPendingSuggestCapability(null);
    try {
      setSaving(true);
      const headers = getAuthHeaders();
      const response = await fetch(API_ENDPOINTS.aiConfig.update(companyId), {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          prompt_base: systemPrompt,
          llm_model: selectedModel,
          temperature: temperature,
          max_tokens: maxTokens,
          few_shot_examples: fewShotExamples,
          specialist_settings: { is_specialist: true, capability: capabilitySlug, activation_method: 'prompt_detection_confirmed' },
        }),
      });
      if (!response.ok) throw new Error('Falha ao ativar especialista');
      const data = await response.json();
      if (data.specialist_settings) setSpecialistSettings(data.specialist_settings);
      setShowSuccessModal(true);
    } catch (err: any) {
      setError(err?.message || 'Erro ao ativar');
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmSelectCapability = async () => {
    if (!companyId) return;
    const slug = selectedCapabilitySlug;
    setShowSuggestSelectModal(false);
    setPendingSuggestCapabilities([]);
    setSelectedCapabilitySlug(null);
    if (!slug) {
      setShowSuccessModal(true);
      return;
    }
    try {
      setSaving(true);
      const headers = getAuthHeaders();
      const response = await fetch(API_ENDPOINTS.aiConfig.update(companyId), {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          prompt_base: systemPrompt,
          llm_model: selectedModel,
          temperature: temperature,
          max_tokens: maxTokens,
          few_shot_examples: fewShotExamples,
          specialist_settings: { is_specialist: true, capability: slug, activation_method: 'prompt_detection_confirmed' },
        }),
      });
      if (!response.ok) throw new Error('Falha ao ativar especialista');
      const data = await response.json();
      if (data.specialist_settings) setSpecialistSettings(data.specialist_settings);
      setShowSuccessModal(true);
    } catch (err: any) {
      setError(err?.message || 'Erro ao ativar');
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmRemoveSpecialist = async () => {
    if (!companyId) return;
    setShowSuggestRemoveModal(false);
    try {
      setSaving(true);
      const headers = getAuthHeaders();
      const response = await fetch(API_ENDPOINTS.aiConfig.update(companyId), {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          prompt_base: systemPrompt,
          llm_model: selectedModel,
          temperature: temperature,
          max_tokens: maxTokens,
          few_shot_examples: fewShotExamples,
          specialist_settings: { is_specialist: false, capability: null },
        }),
      });
      if (!response.ok) throw new Error('Falha ao desativar');
      const data = await response.json();
      if (data.specialist_settings) setSpecialistSettings(data.specialist_settings);
    } catch (err: any) {
      setError(err?.message || 'Erro ao desativar');
    } finally {
      setSaving(false);
    }
  };

  // Resetar para valores padrão
  const handleReset = () => {
    setSystemPrompt(t('aiConfig.defaultPrompt'));
    setTemperature(0.7);
    setMaxTokens(4000);
    setSelectedModel('gpt-4o');
    setFewShotExamples([]);
  };

  // Adicionar exemplo few-shot
  const addFewShotExample = () => {
    setFewShotExamples([...fewShotExamples, { user: '', assistant: '' }]);
  };

  // Remover exemplo few-shot
  const removeFewShotExample = (index: number) => {
    setFewShotExamples(fewShotExamples.filter((_, i) => i !== index));
  };

  // Atualizar exemplo few-shot
  const updateFewShotExample = (index: number, field: 'user' | 'assistant' | 'context', value: string) => {
    const updated = [...fewShotExamples];
    updated[index] = { ...updated[index], [field]: value };
    setFewShotExamples(updated);
  };

  if (loading) {
    return (
      <Layout>
        <div className="space-y-8">
          <header className="rounded-3xl border border-white/10 bg-white/[0.05] px-8 py-6 backdrop-blur">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-gray-500">AI Configuration</p>
              <h1 className="text-3xl font-semibold text-white sm:text-4xl">{t('aiConfig.title')}</h1>
            </div>
          </header>
          <div className="rounded-3xl border border-white/10 bg-white/[0.04] px-6 py-20 flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-[#EC4899]" />
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-8">
        {/* Header - Card maior */}
        <header className="rounded-3xl border border-white/10 bg-white/[0.05] px-8 py-6 backdrop-blur">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-gray-500">AI Configuration</p>
            <h1 className="text-3xl font-semibold text-white sm:text-4xl">{t('aiConfig.title')}</h1>
            <p className="mt-2 max-w-2xl text-sm text-gray-400">
              {t('aiConfig.subtitle')}
            </p>
          </div>
        </header>

        {/* Erro */}
        {error && (
          <div className="rounded-3xl border border-red-500/30 bg-red-500/10 px-6 py-4 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-400" />
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        {/* System Prompt - Card menor */}
        <section className="rounded-3xl border border-white/10 bg-white/[0.04] px-6 py-6">
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-white mb-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4" />
                  {t('aiConfig.systemPrompt')}
                </div>
              </label>
              <textarea
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                rows={10}
                className="w-full px-4 py-3 rounded-2xl bg-white/[0.03] border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#EC4899]/50 font-mono text-sm"
                placeholder={t('aiConfig.systemPromptPlaceholder')}
              />
              <p className="text-xs text-gray-500 mt-2">
                {t('aiConfig.systemPromptHint')}
              </p>
              {specialistSettings?.is_specialist && specialistSettings?.capability ? (
                <p className="text-xs text-emerald-400/90 mt-2 font-medium">
                  {t('aiConfig.specialistActive', { label: capabilityLabel(specialistSettings.capability) })}
                </p>
              ) : (() => {
                const possible = detectPossibleCapability(systemPrompt);
                return possible ? (
                  <p className="text-xs text-amber-400/90 mt-2 flex items-center gap-1.5">
                    <span aria-hidden>⚡</span>
                    {t('aiConfig.specialistHint', { label: capabilityLabel(possible.slug) })}
                  </p>
                ) : null;
              })()}
            </div>

            {/* Botões de ação do System Prompt */}
            <div className="flex flex-wrap gap-4">
              <button 
                onClick={() => handleSave()}
                disabled={saving}
                className="px-6 py-3 rounded-2xl bg-[#EC4899] border border-[#EC4899] text-white font-medium hover:bg-[#EC4899]/90 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                {saving ? t('aiConfig.saving') : t('aiConfig.save')}
              </button>
              <button 
                onClick={handleReset}
                className="px-6 py-3 rounded-2xl bg-white/[0.04] border border-white/10 text-white hover:bg-white/[0.08] transition-all flex items-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                {t('aiConfig.reset')}
              </button>
            </div>
          </div>
        </section>

        {/* Configurações Avançadas - Card menor */}
        <section className="rounded-3xl border border-white/10 bg-white/[0.04] px-6 py-6">
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="w-full flex items-center justify-between group"
          >
            <h2 className="text-lg font-semibold text-white">{t('aiConfig.advancedSettings')}</h2>
            {showAdvanced ? (
              <ChevronUp className="w-5 h-5 text-gray-400 group-hover:text-white transition-colors" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-400 group-hover:text-white transition-colors" />
            )}
          </button>

          {/* Configurações avançadas (expandidas) */}
          {showAdvanced && (
            <div className="space-y-8 pt-6 mt-6 border-t border-white/10 animate-in fade-in duration-200">
                {/* Seleção de Modelo */}
                <section className="space-y-3">
                  <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                    <Bot className="w-5 h-5" />
                    {t('aiConfig.model')}
                  </h2>
                  <div className="grid gap-3">
                    {models.map((model) => (
                      <div
                        key={model.id}
                        onClick={() => setSelectedModel(model.id)}
                        className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                          selectedModel === model.id
                            ? 'bg-[#EC4899]/12 border-[#EC4899]/50'
                            : 'bg-white/[0.02] border-white/5 hover:bg-white/[0.04]'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-semibold text-white">{t(`aiConfig.models.${model.id}.name`)}</p>
                            <p className="text-sm text-gray-400">{t(`aiConfig.models.${model.id}.description`)}</p>
                          </div>
                          <span className="text-xs text-gray-500">{t(`aiConfig.models.${model.id}.provider`)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                {/* Parâmetros do Modelo */}
                <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 space-y-6">
                  <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                    <Sliders className="w-5 h-5" />
                    {t('aiConfig.parameters')}
                  </h2>

                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <label className="text-sm font-medium text-white">{t('aiConfig.temperature')}</label>
                      <span className="text-sm text-[#EC4899] font-mono">{temperature}</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      value={temperature}
                      onChange={(e) => setTemperature(parseFloat(e.target.value))}
                      className="w-full accent-[#EC4899]"
                    />
                    <p className="text-xs text-gray-500 mt-2">
                      {t('aiConfig.temperatureHint')}
                    </p>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <label className="text-sm font-medium text-white">{t('aiConfig.maxTokens')}</label>
                      <span className="text-sm text-[#EC4899] font-mono">{maxTokens}</span>
                    </div>
                    <input
                      type="range"
                      min="100"
                      max="2000"
                      step="50"
                      value={maxTokens}
                      onChange={(e) => setMaxTokens(parseInt(e.target.value))}
                      className="w-full accent-[#EC4899]"
                    />
                    <p className="text-xs text-gray-500 mt-2">
                      {t('aiConfig.maxTokensHint')}
                    </p>
                  </div>
                </section>

                {/* Respostas Rápidas */}
                <section className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                      <BookOpen className="w-5 h-5" />
                      {t('aiConfig.quickResponses')}
                    </h2>
                    <button 
                      onClick={addFewShotExample}
                      className="px-4 py-2 rounded-2xl bg-[#EC4899] border border-[#EC4899] text-white text-sm font-medium hover:bg-[#EC4899]/90 transition-all flex items-center gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      {t('aiConfig.addExample')}
                    </button>
                  </div>

                  <div className="space-y-4">
                    {fewShotExamples.length === 0 ? (
                      <p className="text-sm text-gray-400 text-center py-8">
                        {t('aiConfig.noQuickResponses')}
                      </p>
                    ) : (
                      fewShotExamples.map((example, index) => (
                        <div key={index} className="p-6 rounded-2xl bg-white/[0.02] border border-white/5 relative">
                          <button
                            onClick={() => removeFewShotExample(index)}
                            className="absolute top-4 right-4 p-2 rounded-lg hover:bg-white/10 transition-colors text-gray-400 hover:text-red-400"
                            title={t('aiConfig.removeExample')}
                          >
                            <X className="w-4 h-4" />
                          </button>
                          <div className="space-y-3">
                            <div className="p-3 rounded-xl bg-black/40 border border-white/5">
                              <p className="text-xs text-gray-500 mb-2">{t('aiConfig.userInput')}</p>
                              <textarea
                                value={example.user || ''}
                                onChange={(e) => updateFewShotExample(index, 'user', e.target.value)}
                                rows={2}
                                className="w-full bg-transparent text-sm text-white focus:outline-none resize-none"
                                placeholder={t('aiConfig.userInputPlaceholder')}
                              />
                            </div>
                            <div className="p-3 rounded-xl bg-[#EC4899]/5 border border-[#EC4899]/20">
                              <p className="text-xs text-gray-500 mb-2">{t('aiConfig.expectedResponse')}</p>
                              <textarea
                                value={example.assistant || ''}
                                onChange={(e) => updateFewShotExample(index, 'assistant', e.target.value)}
                                rows={2}
                                className="w-full bg-transparent text-sm text-white focus:outline-none resize-none"
                                placeholder={t('aiConfig.expectedResponsePlaceholder')}
                              />
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </section>
            </div>
          )}
        </section>
      </div>

      {/* Modal de Sucesso */}
      <Dialog open={showSuccessModal} onOpenChange={setShowSuccessModal}>
        <DialogContent className="max-w-md border-white/10 bg-black/90 text-white">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold text-white">
              {t('aiConfig.configSaved')}
            </DialogTitle>
            <p className="text-sm text-gray-400">
              {t('aiConfig.configSavedDescription')}
            </p>
          </DialogHeader>
          <DialogFooter>
            <button
              onClick={() => setShowSuccessModal(false)}
              className="px-4 py-2 rounded-lg bg-[#EC4899] hover:bg-[#EC4899]/90 text-white font-medium transition-all"
            >
              {t('aiConfig.ok')}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: sugerir ativar especialista (qualquer perfil) */}
      <Dialog open={showSuggestActivateModal} onOpenChange={(open) => { setShowSuggestActivateModal(open); if (!open) setPendingSuggestCapability(null); }}>
        <DialogContent className="max-w-md border-white/10 bg-black/90 text-white">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold text-white">
              {t('aiConfig.suggestActivateTitle', { label: pendingSuggestCapability ? capabilityLabel(pendingSuggestCapability) : '' })}
            </DialogTitle>
            <p className="text-sm text-gray-400">
              {t('aiConfig.suggestActivateDescription')}
            </p>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <button
              onClick={() => { setShowSuggestActivateModal(false); setPendingSuggestCapability(null); setShowSuccessModal(true); }}
              className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white font-medium transition-all"
            >
              {t('aiConfig.suggestActivateNo')}
            </button>
            <button
              onClick={handleConfirmActivateSpecialist}
              disabled={saving}
              className="px-4 py-2 rounded-lg bg-[#EC4899] hover:bg-[#EC4899]/90 text-white font-medium transition-all disabled:opacity-50"
            >
              {saving ? t('aiConfig.suggestActivateSaving') : t('aiConfig.suggestActivateYes')}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: múltiplos candidatos — "Qual perfil?" com dropdown + Nenhum */}
      <Dialog open={showSuggestSelectModal} onOpenChange={(open) => { setShowSuggestSelectModal(open); if (!open) { setPendingSuggestCapabilities([]); setSelectedCapabilitySlug(null); } }}>
        <DialogContent className="max-w-md border-white/10 bg-black/90 text-white">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold text-white">
              {t('aiConfig.suggestSelectTitle')}
            </DialogTitle>
            <p className="text-sm text-gray-400">
              {t('aiConfig.suggestSelectDescription')}
            </p>
          </DialogHeader>
          <div className="py-2">
            <select
              value={selectedCapabilitySlug ?? ''}
              onChange={(e) => setSelectedCapabilitySlug(e.target.value || null)}
              className="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-[#EC4899]"
            >
              <option value="">{t('aiConfig.suggestSelectNone')}</option>
              {pendingSuggestCapabilities.map((c) => (
                <option key={c.slug} value={c.slug}>
                  {capabilityLabel(c.slug)} {c.score != null ? `(${Math.round(c.score * 100)}%)` : ''}
                </option>
              ))}
            </select>
          </div>
          <DialogFooter className="gap-2">
            <button
              onClick={() => { setShowSuggestSelectModal(false); setPendingSuggestCapabilities([]); setSelectedCapabilitySlug(null); setShowSuccessModal(true); }}
              className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white font-medium transition-all"
            >
              {t('aiConfig.suggestSelectCancel')}
            </button>
            <button
              onClick={handleConfirmSelectCapability}
              disabled={saving}
              className="px-4 py-2 rounded-lg bg-[#EC4899] hover:bg-[#EC4899]/90 text-white font-medium transition-all disabled:opacity-50"
            >
              {saving ? t('aiConfig.suggestActivateSaving') : t('aiConfig.suggestSelectConfirm')}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: sugerir desativar especialista (qualquer perfil) */}
      <Dialog open={showSuggestRemoveModal} onOpenChange={setShowSuggestRemoveModal}>
        <DialogContent className="max-w-md border-white/10 bg-black/90 text-white">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold text-white">
              {t('aiConfig.suggestRemoveTitle', { label: capabilityLabel(specialistSettings?.capability) })}
            </DialogTitle>
            <p className="text-sm text-gray-400">
              {t('aiConfig.suggestRemoveDescription')}
            </p>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <button
              onClick={() => setShowSuggestRemoveModal(false)}
              className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white font-medium transition-all"
            >
              {t('aiConfig.suggestRemoveNo')}
            </button>
            <button
              onClick={handleConfirmRemoveSpecialist}
              disabled={saving}
              className="px-4 py-2 rounded-lg bg-[#EC4899] hover:bg-[#EC4899]/90 text-white font-medium transition-all disabled:opacity-50"
            >
              {saving ? t('aiConfig.suggestActivateSaving') : t('aiConfig.suggestRemoveYes')}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}


