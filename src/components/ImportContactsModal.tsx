import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/dialog';
import { Button } from './ui/button';
import { Download, FileText, Loader2, CheckCircle, AlertCircle, X, ExternalLink } from 'lucide-react';
import { API_ENDPOINTS, getAuthHeaders } from '../config/api';

interface ImportContactsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: string | null;
  onImportComplete?: () => void;
}

type ImportSource = 'google' | 'csv' | null;

export default function ImportContactsModal({
  open,
  onOpenChange,
  companyId,
  onImportComplete,
}: ImportContactsModalProps) {
  const [selectedSource, setSelectedSource] = useState<ImportSource>(null);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  const handleGoogleImport = async () => {
    if (!companyId) return;

    setImporting(true);
    setError(null);

    try {
      const headers = getAuthHeaders();
      const res = await fetch(API_ENDPOINTS.contactImports.googleAuthorize(companyId), {
        method: 'POST',
        headers,
      });

      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          throw new Error('Você não tem permissão para importar contatos. Entre em contato com um administrador.');
        }
        if (res.status === 404) {
          throw new Error('Funcionalidade de importação ainda não está disponível.');
        }
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Erro ao iniciar importação do Google');
      }

      const data = await res.json();
      
      // Redirecionar para OAuth do Google
      if (data.authorization_url) {
        window.location.href = data.authorization_url;
      } else {
        throw new Error('URL de autorização não recebida');
      }
    } catch (err: any) {
      console.error("contacts.import_google_error", { error: err instanceof Error ? err.message : String(err) });
      setError(err.message || 'Erro ao iniciar importação do Google');
      setImporting(false);
    }
  };

  const handleCSVImport = async () => {
    if (!companyId || !file) return;

    setImporting(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const headers = getAuthHeaders();
      // Remover Content-Type para FormData
      delete (headers as any)['Content-Type'];

      const res = await fetch(API_ENDPOINTS.contactImports.csv(companyId), {
        method: 'POST',
        headers: {
          ...headers,
        },
        body: formData,
      });

      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          throw new Error('Você não tem permissão para importar contatos. Entre em contato com um administrador.');
        }
        if (res.status === 404) {
          throw new Error('Funcionalidade de importação ainda não está disponível.');
        }
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Erro ao importar arquivo CSV');
      }

      const data = await res.json();
      setSuccess(true);
      
      if (onImportComplete) {
        setTimeout(() => {
          onImportComplete();
          onOpenChange(false);
          setSuccess(false);
          setFile(null);
        }, 2000);
      }
    } catch (err: any) {
      console.error("contacts.import_csv_error", { error: err instanceof Error ? err.message : String(err) });
      setError(err.message || 'Erro ao importar arquivo CSV');
    } finally {
      setImporting(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      // Validar tipo de arquivo
      const validTypes = ['text/csv', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];
      if (!validTypes.includes(selectedFile.type) && !selectedFile.name.endsWith('.csv')) {
        setError('Por favor, selecione um arquivo CSV válido');
        return;
      }
      setFile(selectedFile);
      setError(null);
    }
  };

  const resetState = () => {
    setSelectedSource(null);
    setImporting(false);
    setError(null);
    setSuccess(false);
    setFile(null);
  };

  const handleClose = () => {
    if (!importing) {
      resetState();
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-xl border-white/10 bg-black/90 text-white">
        <DialogHeader>
          <DialogTitle>Importar Contatos</DialogTitle>
          <p className="text-sm text-gray-400">
            Escolha a fonte para importar seus contatos. Você pode conectar com Google Contacts ou fazer upload de um arquivo CSV.
          </p>
        </DialogHeader>

        {success ? (
          <div className="py-8 flex flex-col items-center justify-center text-center">
            <CheckCircle className="w-16 h-16 text-emerald-400 mb-4" />
            <p className="text-white font-medium mb-2">Importação iniciada!</p>
            <p className="text-gray-400 text-sm">
              Os contatos estão sendo importados em segundo plano. Você receberá uma notificação quando concluir.
            </p>
          </div>
        ) : !selectedSource ? (
          <div className="space-y-3 mt-4">
            {/* Google Contacts */}
            <button
              onClick={() => setSelectedSource('google')}
              disabled={importing}
              className="w-full p-4 rounded-xl border border-white/10 bg-black/30 hover:bg-black/50 hover:border-white/20 transition-all text-left group disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-blue-600/20 border border-blue-500/30 flex items-center justify-center flex-shrink-0">
                  <ExternalLink className="w-6 h-6 text-blue-400" />
                </div>
                <div className="flex-1">
                  <p className="text-white font-medium">Google Contacts</p>
                  <p className="text-white/60 text-sm mt-1">
                    Importe seus contatos do Google automaticamente
                  </p>
                </div>
              </div>
            </button>

            {/* CSV */}
            <button
              onClick={() => setSelectedSource('csv')}
              disabled={importing}
              className="w-full p-4 rounded-xl border border-white/10 bg-black/30 hover:bg-black/50 hover:border-white/20 transition-all text-left group disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#EC4899]/20 to-[#A855F7]/20 border border-[#EC4899]/30 flex items-center justify-center flex-shrink-0">
                  <FileText className="w-6 h-6 text-[#EC4899]" />
                </div>
                <div className="flex-1">
                  <p className="text-white font-medium">Arquivo CSV</p>
                  <p className="text-white/60 text-sm mt-1">
                    Faça upload de um arquivo CSV com seus contatos
                  </p>
                </div>
              </div>
            </button>
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            <div className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-xs text-gray-300">
              <p className="text-gray-500 mb-1">
                {selectedSource === 'google' ? 'Google Contacts' : 'Arquivo CSV'}
              </p>
              <p className="text-sm text-white">
                {selectedSource === 'google'
                  ? 'Conecte sua conta do Google para importar contatos automaticamente'
                  : 'Selecione um arquivo CSV com seus contatos para importar'}
              </p>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400" />
                <p className="text-sm text-rose-400">{error}</p>
              </div>
            )}

            {selectedSource === 'google' && (
              <div className="space-y-4">
                <div className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-xs text-gray-300">
                  <p className="text-gray-500 mb-1">Como funciona</p>
                  <p className="text-sm text-white">
                    Você será redirecionado para autorizar o acesso aos seus contatos do Google.
                    Após autorizar, os contatos serão importados automaticamente.
                  </p>
                </div>
              </div>
            )}

            {selectedSource === 'csv' && (
              <div className="space-y-4">
                <div className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-xs text-gray-300">
                  <p className="text-gray-500 mb-1">Formato esperado do CSV</p>
                  <ul className="text-sm text-white space-y-1 list-disc list-inside mt-2">
                    <li>Colunas: nome, telefone (ou email)</li>
                    <li>Primeira linha deve conter os cabeçalhos</li>
                    <li>Encoding: UTF-8</li>
                  </ul>
                </div>

                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-[0.2em] text-gray-500">Arquivo CSV</label>
                  <input
                    type="file"
                    accept=".csv,text/csv,application/vnd.ms-excel"
                    onChange={handleFileSelect}
                    disabled={importing}
                    className="w-full px-4 py-2.5 rounded-xl border border-white/10 bg-black/40 text-white text-sm file:mr-4 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-[#EC4899]/20 file:text-[#EC4899] file:cursor-pointer hover:file:bg-[#EC4899]/30 disabled:opacity-50"
                  />
                  {file && (
                    <p className="text-gray-400 text-xs mt-2 flex items-center gap-2">
                      <FileText className="w-3 h-3" />
                      {file.name} ({(file.size / 1024).toFixed(2)} KB)
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        {!success && (
          <DialogFooter className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end">
            {selectedSource && (
              <Button
                type="button"
                variant="outline"
                className="rounded-xl border-white/10 bg-white/[0.05] text-sm text-gray-200 hover:bg-white/[0.12]"
                onClick={() => {
                  if (!importing) {
                    setSelectedSource(null);
                    setError(null);
                    setFile(null);
                  }
                }}
                disabled={importing}
              >
                Voltar
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              className="rounded-xl border-white/10 bg-white/[0.05] text-sm text-gray-200 hover:bg-white/[0.12]"
              onClick={handleClose}
              disabled={importing}
            >
              Cancelar
            </Button>
            {selectedSource === 'google' && (
              <Button
                type="button"
                className="gap-2 rounded-xl bg-[#EC4899] text-sm text-white hover:bg-[#EC4899]/90"
                onClick={handleGoogleImport}
                disabled={importing || !companyId}
              >
                {importing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Conectando...
                  </>
                ) : (
                  <>
                    <ExternalLink className="h-4 w-4" />
                    Conectar com Google
                  </>
                )}
              </Button>
            )}
            {selectedSource === 'csv' && (
              <Button
                type="button"
                className="gap-2 rounded-xl bg-[#EC4899] text-sm text-white hover:bg-[#EC4899]/90"
                onClick={handleCSVImport}
                disabled={importing || !file || !companyId}
              >
                {importing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Importando...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4" />
                    Importar CSV
                  </>
                )}
              </Button>
            )}
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}

