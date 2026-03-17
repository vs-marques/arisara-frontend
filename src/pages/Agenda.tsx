/**
 * Tela de Agenda — agendamentos vindos do chat/WhatsApp + integração Calendly/Google.
 * Ref.: FEATURES_E_MELHORIAS.md §3.2 Scheduler (Catálogo #5).
 * Dados do backend GET /api/v1/scheduler/events; POST /api/v1/scheduler/events.
 */
import { useState, useMemo, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import Layout from '../components/Layout';
import { useRequireAuth } from '../hooks/useRequireAuth';
import { useToast } from '@/hooks/use-toast';
import { API_ENDPOINTS, getAuthHeaders } from '../config/api';
import { Calendar, Clock, UserCircle, CalendarDays, Video, Trash2, Loader2 } from 'lucide-react';
import { Skeleton } from '../components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { EventManager, type Event as UiEvent } from '@/components/ui/event-manager';

const BROWSER_LOCALE: Record<string, string> = {
  pt: 'pt-BR',
  en: 'en-US',
  es: 'es-ES',
  th: 'th-TH',
};

interface AgendaEvent {
  id: string;
  title: string;
  startAt: string;
  endAt: string;
  contactName: string;
  contactChannel: string;
  source: 'google' | 'arisara_chat' | 'outlook';
  meetingUrl?: string;
  description?: string | null;
  location?: string | null;
  organizerEmail?: string | null;
  organizerName?: string | null;
  attendees?: {
    email: string;
    name?: string | null;
    optional?: boolean | null;
    responseStatus?: string | null;
  }[] | null;
  timezone?: string | null;
  meetingDialIn?: string | null;
  rrule?: string | null;
  category?: string | null;
  color?: string | null;
  tags?: string[] | null;
}

export default function Agenda() {
  useRequireAuth();
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const lang = (i18n.language || 'pt').split('-')[0];
  const culture = ['pt', 'en', 'es', 'th'].includes(lang) ? lang : 'pt';
  const browserLocale = BROWSER_LOCALE[culture] || 'pt-BR';

  const [events, setEvents] = useState<AgendaEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [googleConnected, setGoogleConnected] = useState(false);
  const [outlookConnected, setOutlookConnected] = useState(false);
  const [integrationsLoading, setIntegrationsLoading] = useState(true);
  const [syncLoading, setSyncLoading] = useState<'idle' | 'google' | 'outlook'>(
    'idle'
  );
  const [pushLoading, setPushLoading] = useState<'idle' | 'google' | 'outlook'>('idle');
  const [eventDetailOpen, setEventDetailOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<AgendaEvent | null>(null);
  const [showFullDescription, setShowFullDescription] = useState(false);
  const [deleteEventModalOpen, setDeleteEventModalOpen] = useState(false);
  const [eventToDelete, setEventToDelete] = useState<{ id: string; title?: string } | null>(null);
  const [deleteEventConfirmKeyword, setDeleteEventConfirmKeyword] = useState('');
  const [isDeletingEvent, setIsDeletingEvent] = useState(false);

  const fetchIntegrationsStatus = useCallback(async () => {
    try {
      const res = await fetch(API_ENDPOINTS.scheduler.integrations.status(), {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        setGoogleConnected(data.googleCalendar === true);
        setOutlookConnected(data.outlook === true);
      }
    } catch {
      // ignore
    } finally {
      setIntegrationsLoading(false);
    }
  }, []);

  const fetchEvents = useCallback(async () => {
    setEventsLoading(true);
    try {
      const url = API_ENDPOINTS.scheduler.events();
      const res = await fetch(url, { headers: getAuthHeaders() });
      if (!res.ok) throw new Error('load events');
      const data = (await res.json()) as AgendaEvent[];
      setEvents(data);
    } catch {
      setEvents([]);
    } finally {
      setEventsLoading(false);
    }
  }, []);

  const DELETE_EVENT_CONFIRM_KEYWORD = t('agenda.deleteEventConfirmKeyword', { defaultValue: 'EXCLUIR' });

  const handleCancelDeleteEvent = useCallback(() => {
    setDeleteEventModalOpen(false);
    setEventToDelete(null);
    setDeleteEventConfirmKeyword('');
  }, []);

  const handleConfirmDeleteEvent = useCallback(async () => {
    if (!eventToDelete || deleteEventConfirmKeyword !== DELETE_EVENT_CONFIRM_KEYWORD) return;
    setIsDeletingEvent(true);
    try {
      const res = await fetch(API_ENDPOINTS.scheduler.deleteEvent(eventToDelete.id), {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        toast({ title: t('agenda.deleteEventSuccess'), description: undefined });
        handleCancelDeleteEvent();
        fetchEvents();
      } else {
        const err = await res.json().catch(() => ({}));
        toast({
          title: t('agenda.deleteEventError'),
          description: (err.detail as string) || undefined,
          variant: 'destructive',
        });
      }
    } catch (e: unknown) {
      toast({
        title: t('agenda.deleteEventError'),
        description: e instanceof Error ? e.message : String(e),
        variant: 'destructive',
      });
    } finally {
      setIsDeletingEvent(false);
    }
  }, [DELETE_EVENT_CONFIRM_KEYWORD, deleteEventConfirmKeyword, eventToDelete, fetchEvents, handleCancelDeleteEvent, t, toast]);

  useEffect(() => {
    fetchIntegrationsStatus();
    fetchEvents();
  }, [fetchIntegrationsStatus, fetchEvents]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const google = params.get('google');
    const outlook = params.get('outlook');
    if (google === 'success') {
      setGoogleConnected(true);
      fetchEvents();
      window.history.replaceState({}, '', window.location.pathname);
    } else if (google === 'error') {
      toast({
        title: t('agenda.toast.googleConnectError'),
        description:
          params.get('message') || t('agenda.toast.googleConnectDetail'),
        variant: 'destructive',
      });
      window.history.replaceState({}, '', window.location.pathname);
    }
    if (outlook === 'success') {
      setOutlookConnected(true);
      fetchEvents();
      window.history.replaceState({}, '', window.location.pathname);
    } else if (outlook === 'error') {
      toast({
        title: t('agenda.toast.outlookConnectError'),
        description:
          params.get('message') || t('agenda.toast.outlookConnectDetail'),
        variant: 'destructive',
      });
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [fetchEvents, toast, t]);

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString(browserLocale, {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    });
  };
  const formatTime = (iso: string) =>
    new Date(iso).toLocaleTimeString(browserLocale, {
      hour: '2-digit',
      minute: '2-digit',
    });

  const uiEvents: UiEvent[] = useMemo(
    () =>
      events.map((ev) => ({
        id: ev.id,
        title: ev.title,
        description: ev.description ?? undefined,
        startTime: new Date(ev.startAt),
        endTime: new Date(ev.endAt),
        color:
          ev.color ??
          (ev.source === 'google' ? 'blue' : ev.source === 'outlook' ? 'purple' : 'pink'),
        category:
          ev.category ??
          (ev.source === 'arisara_chat'
            ? 'Chat'
            : ev.source === 'google'
              ? 'Google Calendar'
              : 'Outlook'),
        attendees: ev.attendees?.map((a) => a.email) ?? [],
        tags: ev.tags ?? [],
      })),
    [events]
  );

  return (
    <Layout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-semibold text-white">
            {t('agenda.title')}
          </h1>
          <p className="mt-1 text-gray-400">{t('agenda.subtitle')}</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="flex flex-col gap-2">
            <button
              type="button"
              disabled={integrationsLoading}
              onClick={async () => {
                try {
                  const res = await fetch(
                    API_ENDPOINTS.scheduler.integrations.googleAuthorize(),
                    { method: 'GET', headers: getAuthHeaders() }
                  );
                  if (res.ok) {
                    const data = await res.json();
                    if (data.authorizeUrl) window.location.href = data.authorizeUrl;
                    return;
                  }
                  const err = await res.json().catch(() => ({}));
                  toast({
                    title: t('agenda.toast.googleConnectError'),
                    description:
                      (err.detail as string) || t('agenda.toast.googleStartError'),
                    variant: 'destructive',
                  });
                } catch {
                  toast({
                    title: t('agenda.toast.error'),
                    description: t('agenda.toast.googleGeneric'),
                    variant: 'destructive',
                  });
                }
              }}
              className={`flex flex-1 items-center gap-4 rounded-2xl border p-6 text-left transition-colors ${
                googleConnected
                  ? 'border-emerald-500/50 bg-emerald-500/10'
                  : 'border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/[0.07]'
              }`}
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/10">
                <Calendar className="h-6 w-6 text-white" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-white">{t('agenda.googleTitle')}</p>
                <p className="text-sm text-gray-400">
                  {googleConnected
                    ? t('agenda.connected')
                    : t('agenda.connectToSync')}
                </p>
              </div>
              <span
                className={`rounded-full px-3 py-1 text-xs font-medium ${
                  googleConnected
                    ? 'bg-emerald-500/20 text-emerald-300'
                    : 'bg-white/10 text-gray-400'
                }`}
              >
                {googleConnected ? t('agenda.connected') : t('agenda.connect')}
              </span>
            </button>
            {googleConnected && (
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={syncLoading !== 'idle'}
                  onClick={async () => {
                    setSyncLoading('google');
                    try {
                      const res = await fetch(
                        API_ENDPOINTS.scheduler.integrations.googleSync(),
                        { method: 'POST', headers: getAuthHeaders() }
                      );
                      if (res.ok) fetchEvents();
                    } finally {
                      setSyncLoading('idle');
                    }
                  }}
                  className="rounded-xl border border-white/20 bg-white/5 px-4 py-2 text-sm text-white hover:bg-white/10 disabled:opacity-50"
                >
                  {syncLoading === 'google'
                    ? t('agenda.syncing')
                    : t('agenda.syncNow')}
                </button>
                <button
                  type="button"
                  disabled={pushLoading !== 'idle'}
                  onClick={async () => {
                    setPushLoading('google');
                    try {
                      const res = await fetch(
                        API_ENDPOINTS.scheduler.integrations.googlePush(),
                        { method: 'POST', headers: getAuthHeaders() }
                      );
                      const data = res.ok ? await res.json().catch(() => ({})) : null;
                      if (res.ok) {
                        fetchEvents();
                        toast({
                          title: t('agenda.sendToGoogle'),
                          description: (data?.message as string) || `${data?.pushed ?? 0} evento(s) enviado(s).`,
                        });
                      } else {
                        const err = await res.json().catch(() => ({}));
                        toast({
                          title: t('agenda.toast.error'),
                          description: (err.detail as string) || t('agenda.toast.googleGeneric'),
                          variant: 'destructive',
                        });
                      }
                    } catch {
                      toast({
                        title: t('agenda.toast.error'),
                        description: t('agenda.toast.googleGeneric'),
                        variant: 'destructive',
                      });
                    } finally {
                      setPushLoading('idle');
                    }
                  }}
                  className="rounded-xl border border-white/20 bg-white/5 px-4 py-2 text-sm text-white hover:bg-white/10 disabled:opacity-50"
                >
                  {pushLoading === 'google' ? t('agenda.sending') : t('agenda.sendToGoogle')}
                </button>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <button
              type="button"
              disabled={integrationsLoading}
              onClick={async () => {
                try {
                  const res = await fetch(
                    API_ENDPOINTS.scheduler.integrations.outlookAuthorize(),
                    { method: 'GET', headers: getAuthHeaders() }
                  );
                  if (res.ok) {
                    const data = await res.json();
                    if (data.authorizeUrl) window.location.href = data.authorizeUrl;
                    return;
                  }
                  const err = await res.json().catch(() => ({}));
                  toast({
                    title: t('agenda.toast.outlookConnectError'),
                    description:
                      (err.detail as string) ||
                      t('agenda.toast.outlookStartError'),
                    variant: 'destructive',
                  });
                } catch {
                  toast({
                    title: t('agenda.toast.error'),
                    description: t('agenda.toast.outlookGeneric'),
                    variant: 'destructive',
                  });
                }
              }}
              className={`flex flex-1 items-center gap-4 rounded-2xl border p-6 text-left transition-colors ${
                outlookConnected
                  ? 'border-emerald-500/50 bg-emerald-500/10'
                  : 'border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/[0.07]'
              }`}
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/10">
                <CalendarDays className="h-6 w-6 text-white" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-white">{t('agenda.outlookTitle')}</p>
                <p className="text-sm text-gray-400">
                  {outlookConnected
                    ? t('agenda.connected')
                    : t('agenda.outlookHintConnect')}
                </p>
              </div>
              <span
                className={`rounded-full px-3 py-1 text-xs font-medium ${
                  outlookConnected
                    ? 'bg-emerald-500/20 text-emerald-300'
                    : 'bg-white/10 text-gray-400'
                }`}
              >
                {outlookConnected ? t('agenda.connected') : t('agenda.connect')}
              </span>
            </button>
            {outlookConnected && (
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={syncLoading !== 'idle'}
                  onClick={async () => {
                    setSyncLoading('outlook');
                    try {
                      const res = await fetch(
                        API_ENDPOINTS.scheduler.integrations.outlookSync(),
                        { method: 'POST', headers: getAuthHeaders() }
                      );
                      if (res.ok) fetchEvents();
                    } finally {
                      setSyncLoading('idle');
                    }
                  }}
                  className="rounded-xl border border-white/20 bg-white/5 px-4 py-2 text-sm text-white hover:bg-white/10 disabled:opacity-50"
                >
                  {syncLoading === 'outlook'
                    ? t('agenda.syncing')
                    : t('agenda.syncNow')}
                </button>
                <button
                  type="button"
                  disabled={pushLoading !== 'idle'}
                  onClick={async () => {
                    setPushLoading('outlook');
                    try {
                      const res = await fetch(
                        API_ENDPOINTS.scheduler.integrations.outlookPush(),
                        { method: 'POST', headers: getAuthHeaders() }
                      );
                      const data = res.ok ? await res.json().catch(() => ({})) : null;
                      if (res.ok) {
                        fetchEvents();
                        toast({
                          title: t('agenda.sendToOutlook'),
                          description: (data?.message as string) || `${data?.pushed ?? 0} evento(s) enviado(s).`,
                        });
                      } else {
                        const err = await res.json().catch(() => ({}));
                        toast({
                          title: t('agenda.toast.error'),
                          description: (err.detail as string) || t('agenda.toast.outlookGeneric'),
                          variant: 'destructive',
                        });
                      }
                    } catch {
                      toast({
                        title: t('agenda.toast.error'),
                        description: t('agenda.toast.outlookGeneric'),
                        variant: 'destructive',
                      });
                    } finally {
                      setPushLoading('idle');
                    }
                  }}
                  className="rounded-xl border border-white/20 bg-white/5 px-4 py-2 text-sm text-white hover:bg-white/10 disabled:opacity-50"
                >
                  {pushLoading === 'outlook' ? t('agenda.sending') : t('agenda.sendToOutlook')}
                </button>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={async () => {
              try {
                const url = API_ENDPOINTS.scheduler.integrations.exportIcs();
                const res = await fetch(url, { headers: getAuthHeaders() });
                if (!res.ok) throw new Error('export');
                const blob = await res.blob();
                const a = document.createElement('a');
                a.href = URL.createObjectURL(blob);
                a.download = 'agenda-arisara.ics';
                a.click();
                URL.revokeObjectURL(a.href);
              } catch {
                toast({
                  title: t('agenda.toast.exportError'),
                  description: t('agenda.toast.exportDetail'),
                  variant: 'destructive',
                });
              }
            }}
            className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/5 p-6 text-left transition-colors hover:border-white/20 hover:bg-white/[0.07]"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/10">
              <Calendar className="h-6 w-6 text-white" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-white">{t('agenda.exportIcsTitle')}</p>
              <p className="text-sm text-gray-400">{t('agenda.exportIcsHint')}</p>
            </div>
            <span className="rounded-full px-3 py-1 text-xs font-medium bg-white/10 text-gray-400">
              {t('agenda.download')}
            </span>
          </button>
        </div>

        <div className="min-w-0 rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-5">
          {eventsLoading ? (
            <div className="flex flex-col gap-4">
              <Skeleton className="h-10 w-40 rounded-xl bg-white/10" />
              <Skeleton className="h-[480px] rounded-2xl bg-white/5" />
            </div>
          ) : (
            <EventManager
              events={uiEvents}
              defaultView="month"
              categories={['Meeting', 'Task', 'Reminder', 'Personal', 'Chat', 'Google Calendar', 'Outlook']}
              availableTags={['Importante', 'Urgente', 'Cliente', 'Interno']}
              onEventCreate={async (payload) => {
                try {
                  const res = await fetch(API_ENDPOINTS.scheduler.createEvent(), {
                    method: 'POST',
                    headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      title: payload.title,
                      startAt: payload.startTime.toISOString(),
                      endAt: payload.endTime.toISOString(),
                      contactName: payload.contactName ?? '',
                      contactChannel: payload.contactChannel ?? 'Webchat',
                      source: 'arisara_chat',
                      category: payload.category ?? undefined,
                      color: payload.color ?? undefined,
                      tags: payload.tags?.length ? payload.tags : undefined,
                    }),
                  });
                  if (!res.ok) {
                    const err = await res.json().catch(() => ({}));
                    throw new Error((err.detail as string) || t('agenda.createEventError'));
                  }
                  toast({ title: t('agenda.createEventSuccess'), description: t('agenda.createEventSuccessDetail') });
                  fetchEvents();
                } catch (e: unknown) {
                  toast({
                    title: t('agenda.toast.error'),
                    description: e instanceof Error ? e.message : String(e),
                    variant: 'destructive',
                  });
                }
              }}
              onEventDelete={(id, event) => {
                setEventToDelete({ id, title: event?.title });
                setDeleteEventModalOpen(true);
              }}
            />
          )}
        </div>

        {/* Modal Detalhes do evento */}
        <Dialog open={eventDetailOpen} onOpenChange={(open) => { setEventDetailOpen(open); if (!open) setSelectedEvent(null); }}>
          <DialogContent className="border-white/10 bg-[#0f0f10] text-white">
            <DialogHeader>
              <DialogTitle>{t('agenda.eventDetailsTitle')}</DialogTitle>
            </DialogHeader>
            {selectedEvent && (
              <div className="space-y-4">
                <div>
                  <p className="text-lg font-semibold text-white">{selectedEvent.title}</p>
                </div>
                <p className="flex items-center gap-2 text-sm text-gray-400">
                  <Clock className="h-4 w-4 shrink-0" />
                  {formatDate(selectedEvent.startAt)} — {formatTime(selectedEvent.startAt)}–{formatTime(selectedEvent.endAt)}
                </p>
                {(selectedEvent.contactName || selectedEvent.contactChannel) && (
                  <p className="flex items-center gap-2 text-sm text-gray-400">
                    <UserCircle className="h-4 w-4 shrink-0" />
                    {[selectedEvent.contactName, selectedEvent.contactChannel].filter(Boolean).join(' · ') || '—'}
                  </p>
                )}
                <div className="flex flex-wrap gap-2">
                  {selectedEvent.source === 'arisara_chat' && (
                    <span className="rounded-full bg-violet-500/20 px-2 py-0.5 text-xs text-violet-300">{t('agenda.viaChat')}</span>
                  )}
                  {selectedEvent.source === 'google' && (
                    <span className="rounded-full bg-blue-500/20 px-2 py-0.5 text-xs text-blue-300">Google</span>
                  )}
                  {selectedEvent.source === 'outlook' && (
                    <span className="rounded-full bg-sky-600/20 px-2 py-0.5 text-xs text-sky-300">Outlook</span>
                  )}
                </div>
                {selectedEvent.meetingUrl && (
                  <a
                    href={selectedEvent.meetingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-lg bg-[#EC4899]/20 px-3 py-2 text-sm text-[#EC4899] hover:bg-[#EC4899]/30 transition-colors"
                  >
                    <Video className="h-4 w-4" />
                    {t('agenda.openMeeting')}
                  </a>
                )}
              </div>
            )}
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setEventDetailOpen(false)} className="text-gray-400 hover:text-white">
                {t('agenda.eventDetailsClose')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Modal de confirmação de exclusão de evento */}
        <Dialog
          open={deleteEventModalOpen}
          onOpenChange={(open) => {
            if (!open) handleCancelDeleteEvent();
          }}
        >
          <DialogContent className="max-w-lg border-white/10 bg-black/90 text-white">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-rose-400">
                <Trash2 className="h-5 w-5" />
                {t('agenda.deleteEvent')}
              </DialogTitle>
              <p className="text-sm text-gray-400">
                {t('agenda.deleteEventConfirmMessage')}
              </p>
            </DialogHeader>
            {eventToDelete && (
              <div className="space-y-4">
                <div className="rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3">
                  <p className="font-medium text-white">{eventToDelete.title || t('agenda.eventDetailsTitle')}</p>
                  <p className="mt-1 text-xs text-gray-500">ID: {eventToDelete.id}</p>
                </div>
                <div className="rounded-2xl border border-rose-400/20 bg-rose-400/5 px-4 py-3">
                  <p className="text-xs text-rose-300">
                    <strong>⚠️</strong> {t('agenda.deleteEventWarning')}
                  </p>
                </div>
                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-[0.2em] text-gray-500">
                    {t('agenda.deleteEventTypeToConfirm')}{' '}
                    <span className="font-bold text-rose-400">{DELETE_EVENT_CONFIRM_KEYWORD}</span>{' '}
                    {t('agenda.deleteEventToConfirm')}
                  </label>
                  <Input
                    value={deleteEventConfirmKeyword}
                    onChange={(e) => setDeleteEventConfirmKeyword(e.target.value.toUpperCase())}
                    placeholder={DELETE_EVENT_CONFIRM_KEYWORD}
                    className="border-white/10 bg-black/40 text-center font-mono tracking-widest text-sm text-white placeholder:text-gray-500"
                    autoFocus
                  />
                </div>
              </div>
            )}
            <DialogFooter className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                className="rounded-xl border-white/10 bg-white/[0.05] text-sm text-gray-200 hover:bg-white/[0.12]"
                onClick={handleCancelDeleteEvent}
                disabled={isDeletingEvent}
              >
                {t('common.cancel')}
              </Button>
              <Button
                type="button"
                className="gap-2 rounded-xl bg-rose-500 text-sm font-semibold text-white hover:bg-rose-400 disabled:cursor-not-allowed disabled:opacity-50"
                onClick={handleConfirmDeleteEvent}
                disabled={isDeletingEvent || deleteEventConfirmKeyword !== DELETE_EVENT_CONFIRM_KEYWORD}
              >
                {isDeletingEvent ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
                {t('agenda.deleteEventConfirm')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <p className="text-xs text-gray-500">{t('agenda.footer')}</p>
      </div>
    </Layout>
  );
}
