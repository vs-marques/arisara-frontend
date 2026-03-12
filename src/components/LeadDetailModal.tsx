/**
 * Modal ao clicar em um lead: detalhes do cliente à esquerda e chat à direita.
 * Padrão visual alinhado ao modal "Nova fonte de discovery" (Discovery).
 * Chat sem puxar contexto externo — apenas a conversa da sessão.
 */
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { UserCircle, Phone, MessageSquare, Calendar, Copy } from 'lucide-react';
import { SingleSessionChat } from './SingleSessionChat';

export type LeadStatus = 'novo' | 'em_contato' | 'agendado' | 'proposta' | 'convertido';

export interface Lead {
  id: string;
  name: string;
  contact: string;
  channel: 'whatsapp' | 'webchat';
  lastContactAt: string;
  status: LeadStatus;
  summarySnippet: string;
  nextAction: string;
  sessionId?: string;
}

const statusColors: Record<LeadStatus, string> = {
  novo: 'bg-sky-500/20 text-sky-300',
  em_contato: 'bg-amber-500/20 text-amber-300',
  agendado: 'bg-violet-500/20 text-violet-300',
  proposta: 'bg-emerald-500/20 text-emerald-300',
  convertido: 'bg-green-500/20 text-green-300',
};

interface LeadDetailModalProps {
  lead: Lead | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LeadDetailModal({ lead, open, onOpenChange }: LeadDetailModalProps) {
  const { t, i18n } = useTranslation();
  const locale =
    i18n.language?.startsWith('en')
      ? 'en-US'
      : i18n.language?.startsWith('th')
        ? 'th-TH'
        : i18n.language?.startsWith('es')
          ? 'es-ES'
          : 'pt-BR';

  const statusLabels: Record<LeadStatus, string> = {
    novo: t('leads.status.novo'),
    em_contato: t('leads.status.em_contato'),
    agendado: t('leads.status.agendado'),
    proposta: t('leads.status.proposta'),
    convertido: t('leads.status.convertido'),
  };

  const formatLastContact = (iso: string) => {
    const d = new Date(iso);
    const now = new Date();
    const diffDays = Math.floor(
      (now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24)
    );
    if (diffDays === 0)
      return `${t('leads.todayPrefix')} ${d.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })}`;
    if (diffDays === 1) return t('leads.yesterday');
    if (diffDays < 7) return t('leads.daysAgo', { count: diffDays });
    return d.toLocaleDateString(locale);
  };

  if (!lead) return null;

  const handleCopyLink = () => {
    const url = `${window.location.origin}/conversations${lead.sessionId ? `?session=${lead.sessionId}` : ''}`;
    navigator.clipboard.writeText(url);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-5xl w-[95vw] h-[85vh] p-0 gap-0 overflow-hidden flex flex-col border-white/10 bg-black text-white"
        overlayClassName="bg-black/90 backdrop-blur-md"
      >
        <DialogHeader className="shrink-0 px-6 pt-6 pb-4 border-b border-white/10 text-left space-y-1.5">
          <DialogTitle className="text-lg font-semibold text-white truncate pr-8">
            {t('leads.modal.title', { name: lead.name })}
          </DialogTitle>
          <p className="text-sm text-gray-400">{t('leads.modal.subtitle')}</p>
          <div className="flex flex-wrap gap-2 pt-1">
            <span
              className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[lead.status]}`}
            >
              {statusLabels[lead.status]}
            </span>
          </div>
        </DialogHeader>

        <div className="flex flex-1 min-h-0">
          <div className="w-80 shrink-0 flex flex-col border-r border-white/10 overflow-hidden">
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-[0.2em] text-gray-500">
                  {t('leads.modal.labelContact')}
                </label>
                <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white">
                  {lead.channel === 'whatsapp' ? (
                    <Phone className="h-4 w-4 text-gray-500 shrink-0" />
                  ) : (
                    <MessageSquare className="h-4 w-4 text-gray-500 shrink-0" />
                  )}
                  <span className="truncate">{lead.contact}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleCopyLink}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-white/10 bg-white/[0.05] text-sm text-gray-200 hover:bg-white/[0.12] transition-colors"
              >
                <Copy className="h-4 w-4" />
                {t('leads.modal.copyLink')}
              </button>

              <div className="space-y-2 rounded-2xl border border-white/10 bg-black/40 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.2em] text-gray-500">
                  {t('leads.modal.labelSummary')}
                </p>
                <p className="text-sm text-gray-300 leading-relaxed">{lead.summarySnippet}</p>
              </div>

              <div className="space-y-2">
                <p className="text-xs uppercase tracking-[0.2em] text-gray-500">
                  {t('leads.modal.labelLastContact')}
                </p>
                <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-gray-300">
                  <Calendar className="h-4 w-4 text-gray-500 shrink-0" />
                  {formatLastContact(lead.lastContactAt)}
                </div>
              </div>

              <div className="space-y-2 rounded-2xl border border-[#EC4899]/20 bg-[#EC4899]/5 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.2em] text-[#EC4899]/80">
                  {t('leads.modal.labelNextAction')}
                </p>
                <p className="text-sm text-white mt-0.5">{lead.nextAction}</p>
              </div>
            </div>
          </div>

          <div className="flex-1 flex flex-col min-w-0 border-l border-white/10">
            {lead.sessionId ? (
              <SingleSessionChat
                sessionId={lead.sessionId}
                leadName={lead.name}
                className="flex-1 min-h-0"
              />
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-black/40">
                <UserCircle className="h-16 w-16 text-gray-600 mb-4" />
                <p className="text-gray-400 font-medium">{t('leads.modal.noSessionTitle')}</p>
                <p className="text-sm text-gray-500 mt-1">{t('leads.modal.noSessionBody')}</p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
