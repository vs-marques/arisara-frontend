import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Layout from '../components/Layout';
import { useRequireAuth } from '../hooks/useRequireAuth';
import { Key, Plus, Copy, Trash2, Eye, EyeOff, Shield, Activity } from 'lucide-react';

interface APIKey {
  id: string;
  name: string;
  key_preview: string;
  secret_preview: string;
  rate_limit: number;
  total_requests: number;
  last_used_at: string | null;
  created_at: string;
  is_active: boolean;
}

export default function APIKeys() {
  useRequireAuth();
  const { t } = useTranslation();
  const [showSecrets, setShowSecrets] = useState<{ [key: string]: boolean }>({});

  // Mock data
  const mockKeys: APIKey[] = [
    {
      id: '1',
      name: 'Production Key',
      key_preview: 'nyk_prod_abc123...',
      secret_preview: '••••••••••••••••',
      rate_limit: 1000,
      total_requests: 45823,
      last_used_at: new Date().toISOString(),
      created_at: new Date(Date.now() - 86400000 * 60).toISOString(),
      is_active: true,
    },
    {
      id: '2',
      name: 'Development Key',
      key_preview: 'nyk_dev_xyz789...',
      secret_preview: '••••••••••••••••',
      rate_limit: 100,
      total_requests: 1234,
      last_used_at: new Date(Date.now() - 3600000).toISOString(),
      created_at: new Date(Date.now() - 86400000 * 15).toISOString(),
      is_active: true,
    },
  ];

  const toggleSecretVisibility = (keyId: string) => {
    setShowSecrets(prev => ({ ...prev, [keyId]: !prev[keyId] }));
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    // TODO: Add toast notification
  };

  return (
    <Layout>
      <div className="space-y-8">
        {/* Header */}
        <header className="rounded-3xl border border-white/10 bg-white/[0.03] px-8 py-6 shadow-[0_30px_80px_-60px_rgba(236,72,153,0.45)] backdrop-blur">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-semibold text-white">{t('apiKeys.title')}</h1>
              <p className="mt-2 text-sm text-gray-400">
                {t('apiKeys.subtitle')}
              </p>
            </div>
            <button className="px-6 py-3 rounded-2xl bg-[#EC4899] border border-[#EC4899] text-white font-medium hover:bg-[#EC4899]/90 transition-all flex items-center gap-2">
              <Plus className="w-4 h-4" />
              {t('apiKeys.createKey')}
            </button>
          </div>
        </header>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="glass-card rounded-3xl p-6">
            <div className="flex items-center gap-3 mb-2">
              <Key className="w-5 h-5 text-[#EC4899]" />
              <h3 className="text-sm font-medium text-gray-400">{t('apiKeys.totalKeys')}</h3>
            </div>
            <p className="text-3xl font-bold text-white">{mockKeys.length}</p>
          </div>

          <div className="glass-card rounded-3xl p-6">
            <div className="flex items-center gap-3 mb-2">
              <Shield className="w-5 h-5 text-emerald-400" />
              <h3 className="text-sm font-medium text-gray-400">{t('apiKeys.activeKeys')}</h3>
            </div>
            <p className="text-3xl font-bold text-white">
              {mockKeys.filter(k => k.is_active).length}
            </p>
          </div>

          <div className="glass-card rounded-3xl p-6">
            <div className="flex items-center gap-3 mb-2">
              <Activity className="w-5 h-5 text-[#EC4899]" />
              <h3 className="text-sm font-medium text-gray-400">{t('apiKeys.totalRequests')}</h3>
            </div>
            <p className="text-3xl font-bold text-white">
              {mockKeys.reduce((sum, k) => sum + k.total_requests, 0).toLocaleString()}
            </p>
          </div>
        </div>

        {/* Lista de Keys */}
        <div className="glass-card rounded-3xl p-8">
          <h2 className="text-xl font-semibold text-white mb-6">{t('apiKeys.yourApiKeys')}</h2>
          <div className="space-y-4">
            {mockKeys.map((apiKey) => (
              <div
                key={apiKey.id}
                className="p-6 rounded-2xl bg-white/[0.02] border border-white/5"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-white text-lg">{apiKey.name}</h3>
                      {apiKey.is_active ? (
                        <span className="px-2 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium">
                          {t('apiKeys.active')}
                        </span>
                      ) : (
                        <span className="px-2 py-1 rounded-full bg-gray-500/10 border border-gray-500/20 text-gray-400 text-xs font-medium">
                          {t('apiKeys.inactive')}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500 space-y-1">
                      <p>{t('apiKeys.createdAt')} {new Date(apiKey.created_at).toLocaleDateString('pt-BR')}</p>
                      {apiKey.last_used_at && (
                        <p>{t('apiKeys.lastUsed')}: {new Date(apiKey.last_used_at).toLocaleString('pt-BR')}</p>
                      )}
                    </div>
                  </div>
                  <button className="p-2 rounded-xl bg-white/[0.04] border border-white/10 text-gray-400 hover:text-rose-400 transition-all">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-3">
                  {/* API Key */}
                  <div className="p-3 rounded-xl bg-black/40 border border-white/5">
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs text-gray-500 font-medium">{t('apiKeys.apiKey')}</label>
                      <button
                        onClick={() => copyToClipboard(apiKey.key_preview)}
                        className="text-xs text-[#EC4899] hover:text-[#EC4899]/80 flex items-center gap-1"
                      >
                        <Copy className="w-3 h-3" />
                        {t('apiKeys.copy')}
                      </button>
                    </div>
                    <p className="text-sm text-white font-mono">{apiKey.key_preview}</p>
                  </div>

                  {/* API Secret */}
                  <div className="p-3 rounded-xl bg-black/40 border border-white/5">
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs text-gray-500 font-medium">{t('apiKeys.apiSecret')}</label>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => toggleSecretVisibility(apiKey.id)}
                          className="text-xs text-gray-400 hover:text-white flex items-center gap-1"
                        >
                          {showSecrets[apiKey.id] ? (
                            <>
                              <EyeOff className="w-3 h-3" />
                              {t('apiKeys.hide')}
                            </>
                          ) : (
                            <>
                              <Eye className="w-3 h-3" />
                              {t('apiKeys.show')}
                            </>
                          )}
                        </button>
                        <button
                          onClick={() => copyToClipboard(apiKey.secret_preview)}
                          className="text-xs text-[#EC4899] hover:text-[#EC4899]/80 flex items-center gap-1"
                        >
                          <Copy className="w-3 h-3" />
                          {t('apiKeys.copy')}
                        </button>
                      </div>
                    </div>
                    <p className="text-sm text-white font-mono">
                      {showSecrets[apiKey.id] ? 'secret_key_aqui_xxxx' : apiKey.secret_preview}
                    </p>
                  </div>

                  {/* Stats */}
                  <div className="flex items-center gap-6 pt-3 text-sm">
                    <div>
                      <span className="text-gray-500">{t('apiKeys.rateLimit')} </span>
                      <span className="text-white font-medium">{apiKey.rate_limit}/min</span>
                    </div>
                    <div>
                      <span className="text-gray-500">{t('apiKeys.requests')} </span>
                      <span className="text-white font-medium">{apiKey.total_requests.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Documentação */}
        <div className="glass-card rounded-3xl p-8">
          <h2 className="text-xl font-semibold text-white mb-4">{t('apiKeys.howToUse')}</h2>
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-black/40 border border-white/5">
              <p className="text-sm text-gray-400 mb-3">{t('apiKeys.authViaHeaders')}</p>
              <pre className="text-xs text-white font-mono bg-black/60 p-4 rounded-xl overflow-x-auto">
{`curl -X POST https://api.nyoka.ai/v1/chat \\
  -H "X-API-Key: your_api_key" \\
  -H "X-API-Secret: your_api_secret" \\
  -H "Content-Type: application/json" \\
  -d '{"message": "Hello, Arisara!"}'`}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}

