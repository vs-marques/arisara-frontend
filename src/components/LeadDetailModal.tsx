/**
 * Modal ao clicar em um lead: detalhes do cliente à esquerda e chat à direita.
 * Padrão visual alinhado ao modal "Nova fonte de discovery" (Discovery).
 * Chat sem puxar contexto externo — apenas a conversa da sessão.
 * Alinhado aos recursos do front Nyoka (Agendar / Visualizar agendamento).
 */
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  UserCircle,
  Phone,
  MessageSquare,
  Calendar,
  Copy,
  CalendarPlus,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { API_ENDPOINTS, getAuthHeaders } from '@/config/api';
import { Button } from '@/components/ui/button';
import { CreateEventModal } from './CreateEventModal';
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
  /** Opcional: chamado quando um agendamento é criado a partir deste lead. */
  onEventScheduled?: () => void;
}

const colorNameMap: Record<string, { label: string; bgClass: string }> = {
  blue: { label: 'Blue', bgClass: 'bg-blue-500' },
  green: { label: 'Green', bgClass: 'bg-green-500' },
  purple: { label: 'Purple', bgClass: 'bg-purple-500' },
  orange: { label: 'Orange', bgClass: 'bg-orange-500' },
  pink: { label: 'Pink', bgClass: 'bg-pink-500' },
  red: { label: 'Red', bgClass: 'bg-red-500' },
};

export function LeadDetailModal({
  lead,
  open,
  onOpenChange,
  onEventScheduled,
}: LeadDetailModalProps) {
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

  const [createEventOpen, setCreateEventOpen] = useState(false);
  const [viewEventOpen, setViewEventOpen] = useState(false);
  const [viewEvent, setViewEvent] = useState<{
    id: string;
    title: string;
    description?: string | null;
    startAt: string;
    endAt: string;
    category?: string | null;
    color?: string | null;
    tags?: string[] | null;
  } | null>(null);

  useEffect(() => {
    if (!open) {
      setCreateEventOpen(false);
      setViewEventOpen(false);
      setViewEvent(null);
    }
  }, [open]);

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

  const formatDateTime = (iso: string) =>
    new Date(iso).toLocaleString(locale, {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

  const handleViewSchedule = async () => {
    try {
      const res = await fetch(API_ENDPOINTS.scheduler.events(), {
        headers: getAuthHeaders(),
      });
      if (!res.ok) {
        toast.error(
          t('agenda.loadError', {
            defaultValue: 'Erro ao carregar agendamentos.',
          }),
        );
        return;
      }
      const data = (await res.json()) as any[];
      const eventsForLead = data.filter((ev) => ev.leadId === lead.id);
      if (!eventsForLead.length) {
        toast.error(
          t('agenda.noEventsForLead', {
            defaultValue: 'Nenhum agendamento vinculado a este lead.',
          }),
        );
        return;
      }
      const now = new Date();
      const future = eventsForLead
        .map((e) => ({ ev: e, start: new Date(e.startAt) }))
        .filter((x) => x.start >= now)
        .sort((a, b) => a.start.getTime() - b.start.getTime());
      const past = eventsForLead
        .map((e) => ({ ev: e, start: new Date(e.startAt) }))
        .sort((a, b) => b.start.getTime() - a.start.getTime());
      const chosen = (future[0] || past[0]).ev;
      setViewEvent({
        id: chosen.id,
        title: chosen.title,
        description: chosen.description ?? null,
        startAt: chosen.startAt,
        endAt: chosen.endAt,
        category: chosen.category ?? null,
        color: chosen.color ?? null,
        tags: chosen.tags ?? null,
      });
      setViewEventOpen(true);
    } catch (e: unknown) {
      toast.error(
        e instanceof Error
          ? e.message
          : t('agenda.loadError', {
              defaultValue: 'Erro ao carregar agendamentos.',
            }),
      );
    }
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

              {lead.status === 'agendado' ? (
                <button
                  type="button"
                  onClick={handleViewSchedule}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-[#EC4899]/40 bg-[#EC4899]/10 text-sm text-[#EC4899] hover:bg-[#EC4899]/20 transition-colors"
                >
                  <Calendar className="h-4 w-4" />
                  {t('leads.modal.viewSchedule', {
                    defaultValue: 'Visualizar agendamento',
                  })}
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => setCreateEventOpen(true)}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-[#EC4899]/40 bg-[#EC4899]/10 text-sm text-[#EC4899] hover:bg-[#EC4899]/20 transition-colors"
                  >
                    <CalendarPlus className="h-4 w-4" />
                    {t('leads.modal.schedule', { defaultValue: 'Agendar' })}
                  </button>
                  <CreateEventModal
                    open={createEventOpen}
                    onOpenChange={setCreateEventOpen}
                    defaultLead={
                      lead
                        ? {
                            id: lead.id,
                            name: lead.name,
                            contact: lead.contact,
                            channel: lead.channel,
                          }
                        : null
                    }
                    onSuccess={() => {
                      onEventScheduled?.();
                    }}
                  />
                </>
              )}

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
        {/* Modal de visualização de agendamento */}
        <Dialog open={viewEventOpen} onOpenChange={setViewEventOpen}>
          <DialogContent className="max-w-xl border-white/10 bg-black text-white">
            <DialogHeader>
              <DialogTitle className="text-lg font-semibold">
                {t('agenda.eventDetailsTitle', {
                  defaultValue: 'Detalhes do evento',
                })}
              </DialogTitle>
              <p className="text-sm text-gray-400">
                {t('agenda.eventDetailsSubtitle', {
                  defaultValue: 'Veja os detalhes do evento.',
                })}
              </p>
            </DialogHeader>
            {viewEvent && (
              <div className="space-y-4">
                <div className="space-y-1">
                  <Label className="text-xs text-gray-400">
                    {t('agenda.fields.title', { defaultValue: 'Título' })}
                  </Label>
                  <Input
                    value={viewEvent.title}
                    readOnly
                    className="border-white/10 bg-white/5 text-white"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-gray-400">
                    {t('agenda.fields.description', {
                      defaultValue: 'Descrição',
                    })}
                  </Label>
                  <Input
                    value={viewEvent.description ?? ''}
                    readOnly
                    className="border-white/10 bg-white/5 text-white"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="text-xs text-gray-400">
                      {t('agenda.fields.start', { defaultValue: 'Início' })}
                    </Label>
                    <Input
                      value={formatDateTime(viewEvent.startAt)}
                      readOnly
                      className="border-white/10 bg-white/5 text-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-gray-400">
                      {t('agenda.fields.end', { defaultValue: 'Fim' })}
                    </Label>
                    <Input
                      value={formatDateTime(viewEvent.endAt)}
                      readOnly
                      className="border-white/10 bg-white/5 text-white"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="text-xs text-gray-400">
                      {t('agenda.fields.category', {
                        defaultValue: 'Categoria',
                      })}
                    </Label>
                    <Input
                      value={viewEvent.category ?? ''}
                      readOnly
                      className="border-white/10 bg-white/5 text-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-gray-400">
                      {t('agenda.fields.color', { defaultValue: 'Cor' })}
                    </Label>
                    <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2">
                      {viewEvent.color ? (
                        <>
                          <span
                            className={`inline-block h-4 w-4 rounded ${
                              colorNameMap[viewEvent.color]?.bgClass ??
                              'bg-gray-400'
                            }`}
                          />
                          <span className="text-sm text-white">
                            {colorNameMap[viewEvent.color]?.label ??
                              viewEvent.color}
                          </span>
                        </>
                      ) : (
                        <span className="text-sm text-gray-400">—</span>
                      )}
                    </div>
                  </div>
                </div>
                {viewEvent.tags && viewEvent.tags.length > 0 && (
                  <div className="space-y-1">
                    <Label className="text-xs text-gray-400">Tags</Label>
                    <div className="flex flex-wrap gap-2">
                      {viewEvent.tags.map((tag) => (
                        <Badge key={tag} variant="secondary">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                <div className="flex justify-end pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setViewEventOpen(false)}
                    className="border-white/20 text-gray-200"
                  >
                    {t('common.close', { defaultValue: 'Fechar' })}
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
}
