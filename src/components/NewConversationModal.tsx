import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Search, UserPlus, Loader2, User, Phone, Mail, AlertCircle, Download } from 'lucide-react';
import { API_ENDPOINTS, getAuthHeaders } from '../config/api';

interface Contact {
  id: string;
  name: string | null;
  channel: string;
  external_id: string;
  profile_picture_url: string | null;
  whatsapp_phone_number_id: string | null;
  is_active: boolean;
  last_seen_at: string;
}

interface NewConversationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: string | null;
  onSelectContact: (contact: Contact) => void;
  onImportContacts: () => void;
}

export default function NewConversationModal({
  open,
  onOpenChange,
  companyId,
  onSelectContact,
  onImportContacts,
}: NewConversationModalProps) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Buscar contatos
  const fetchContacts = async () => {
    if (!companyId) return;

    setLoading(true);
    setError(null);

    try {
      const headers = getAuthHeaders();
      const url = API_ENDPOINTS.contacts.list(companyId, searchTerm || undefined);
      const res = await fetch(url, { headers });

      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          throw new Error('Você não tem permissão para acessar contatos. Entre em contato com um administrador.');
        }
        if (res.status === 404) {
          // Endpoint ainda não implementado - retornar lista vazia
          setContacts([]);
          return;
        }
        throw new Error('Erro ao buscar contatos');
      }

      const data = await res.json();
      setContacts(data.contacts || data || []);
    } catch (err: any) {
      console.error("chat.contacts_load_error", { error: err instanceof Error ? err.message : String(err) });
      setError(err.message || 'Erro ao buscar contatos');
      setContacts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open && companyId) {
      fetchContacts();
    }
  }, [open, companyId, searchTerm]);

  // Filtrar contatos localmente (fallback se API não suportar busca)
  const filteredContacts = useMemo(() => {
    if (!searchTerm.trim()) return contacts;

    const term = searchTerm.toLowerCase();
    return contacts.filter(
      (contact) =>
        contact.name?.toLowerCase().includes(term) ||
        contact.external_id.toLowerCase().includes(term)
    );
  }, [contacts, searchTerm]);

  const handleSelectContact = (contact: Contact) => {
    onSelectContact(contact);
    onOpenChange(false);
  };

  const formatPhoneNumber = (phone: string) => {
    // Formatação básica de telefone
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 11) {
      return cleaned.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
    } else if (cleaned.length === 10) {
      return cleaned.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
    }
    return phone;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl border-white/10 bg-black/90 text-white max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Nova Conversa</DialogTitle>
          <p className="text-sm text-gray-400">
            Selecione um contato para iniciar uma conversa ou importe seus contatos do Google ou CSV.
          </p>
        </DialogHeader>

        {/* Busca */}
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs uppercase tracking-[0.2em] text-gray-500">Buscar contato</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <Input
                type="text"
                placeholder="Digite o nome ou telefone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 border-white/10 bg-black/40 text-sm text-white placeholder:text-gray-500"
              />
            </div>
          </div>
        </div>

        {/* Lista de Contatos */}
        <div className="flex-1 overflow-y-auto space-y-2 min-h-0 mt-4">
          {loading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 text-[#EC4899] animate-spin" />
            </div>
          )}

          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400" />
              <p className="text-sm text-rose-400">{error}</p>
            </div>
          )}

          {!loading && filteredContacts.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <User className="w-12 h-12 text-gray-500 mb-4" />
              <p className="text-gray-400 text-sm mb-2">
                {searchTerm ? 'Nenhum contato encontrado' : 'Nenhum contato cadastrado'}
              </p>
              {!searchTerm && (
                <Button
                  type="button"
                  variant="outline"
                  className="mt-4 gap-2 rounded-xl border-white/10 bg-white/[0.05] text-sm text-gray-200 hover:bg-white/[0.12]"
                  onClick={onImportContacts}
                >
                  <Download className="h-4 w-4" />
                  Importar Contatos
                </Button>
              )}
            </div>
          )}

          {!loading &&
            filteredContacts.map((contact) => (
              <button
                key={contact.id}
                onClick={() => handleSelectContact(contact)}
                className="w-full p-3 rounded-xl border border-white/10 bg-black/30 hover:bg-black/50 hover:border-white/20 transition-all text-left group"
              >
                <div className="flex items-center gap-3">
                  {/* Avatar */}
                  <div className="w-10 h-10 rounded-full border border-white/10 bg-black/40 flex items-center justify-center flex-shrink-0">
                    {contact.profile_picture_url ? (
                      <img
                        src={contact.profile_picture_url}
                        alt={contact.name || 'Contato'}
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      <User className="w-5 h-5 text-gray-500" />
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-white font-medium text-sm truncate">
                        {contact.name || 'Sem nome'}
                      </p>
                      {!contact.is_active && (
                        <span className="px-2 py-0.5 rounded text-xs bg-gray-500/20 text-gray-500 border border-gray-500/30">
                          Inativo
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      {contact.channel === 'whatsapp' && (
                        <div className="flex items-center gap-1 text-gray-400 text-xs">
                          <Phone className="w-3 h-3" />
                          <span>{formatPhoneNumber(contact.external_id)}</span>
                        </div>
                      )}
                      {contact.channel === 'email' && (
                        <div className="flex items-center gap-1 text-gray-400 text-xs">
                          <Mail className="w-3 h-3" />
                          <span className="truncate">{contact.external_id}</span>
                        </div>
                      )}
                      {!['whatsapp', 'email'].includes(contact.channel) && (
                        <span className="text-gray-400 text-xs truncate">
                          {contact.external_id}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Arrow */}
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <UserPlus className="w-5 h-5 text-[#EC4899]" />
                  </div>
                </div>
              </button>
            ))}
        </div>

        {/* Footer */}
        <DialogFooter className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-between">
          <Button
            type="button"
            variant="outline"
            className="rounded-xl border-white/10 bg-white/[0.05] text-sm text-gray-200 hover:bg-white/[0.12]"
            onClick={onImportContacts}
          >
            <Download className="h-4 w-4 mr-2" />
            Importar Contatos
          </Button>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              className="rounded-xl border-white/10 bg-white/[0.05] text-sm text-gray-200 hover:bg-white/[0.12]"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            {!loading && filteredContacts.length > 0 && (
              <Button
                type="button"
                className="gap-2 rounded-xl bg-[#EC4899] text-sm text-white hover:bg-[#EC4899]/90"
                onClick={() => {
                  // TODO: Implementar criação de novo contato
                  onOpenChange(false);
                }}
              >
                <UserPlus className="h-4 w-4" />
                Novo Contato
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

