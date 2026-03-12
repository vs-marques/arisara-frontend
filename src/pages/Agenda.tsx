/**
 * Tela de Agenda — agendamentos vindos do chat/WhatsApp + integração Calendly/Google.
 * Ref.: FEATURES_E_MELHORIAS.md §3.2 Scheduler (Catálogo #5).
 * Dados do backend GET /api/v1/scheduler/events; POST /api/v1/scheduler/events.
 */
import { useState, useMemo, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Calendar as BigCalendar,
  dateFnsLocalizer,
  Views,
  View,
} from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { ptBR, enUS, es as esLocale, th as thLocale } from 'date-fns/locale';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import Layout from '../components/Layout';
import { useRequireAuth } from '../hooks/useRequireAuth';
import { useToast } from '@/hooks/use-toast';
import { API_ENDPOINTS, getAuthHeaders } from '../config/api';
import {
  Calendar,
  Clock,
  UserCircle,
  CalendarDays,
  Video,
} from 'lucide-react';
import { Skeleton } from '../components/ui/skeleton';

const DATEFNS_LOCALES: Record<string, Locale> = {
  pt: ptBR,
  en: enUS,
  es: esLocale,
  th: thLocale,
};

type Locale = (typeof ptBR);

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
}

export default function Agenda() {
  useRequireAuth();
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const lang = (i18n.language || 'pt').split('-')[0];
  const culture = ['pt', 'en', 'es', 'th'].includes(lang) ? lang : 'pt';
  const dfLocale = DATEFNS_LOCALES[culture] || ptBR;
  const browserLocale = BROWSER_LOCALE[culture] || 'pt-BR';

  const localizer = useMemo(
    () =>
      dateFnsLocalizer({
        format,
        parse,
        startOfWeek: (date: Date) => startOfWeek(date, { locale: dfLocale }),
        getDay,
        locales: DATEFNS_LOCALES,
      }),
    [dfLocale]
  );

  const [events, setEvents] = useState<AgendaEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [googleConnected, setGoogleConnected] = useState(false);
  const [outlookConnected, setOutlookConnected] = useState(false);
  const [integrationsLoading, setIntegrationsLoading] = useState(true);
  const [syncLoading, setSyncLoading] = useState<'idle' | 'google' | 'outlook'>(
    'idle'
  );
  const [calendarView, setCalendarView] = useState<View>(Views.MONTH);
  const [calendarDate, setCalendarDate] = useState(new Date());

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

  const calendarEvents = useMemo(
    () =>
      events.map((ev) => ({
        id: ev.id,
        title: ev.title,
        start: new Date(ev.startAt),
        end: new Date(ev.endAt),
        resource: ev,
      })),
    [events]
  );

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

  const calMessages = useMemo(
    () => ({
      today: t('agenda.calendar.today'),
      previous: t('agenda.calendar.previous'),
      next: t('agenda.calendar.next'),
      month: t('agenda.calendar.month'),
      week: t('agenda.calendar.week'),
      day: t('agenda.calendar.day'),
      agenda: t('agenda.calendar.agenda'),
      date: t('agenda.calendar.date'),
      time: t('agenda.calendar.time'),
      event: t('agenda.calendar.event'),
      noEventsInRange: t('agenda.calendar.noEventsInRange'),
    }),
    [t]
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

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_340px]">
          <div className="rbc-agenda-override flex min-h-[580px] flex-col rounded-2xl border border-white/10 p-4 sm:p-5">
            {eventsLoading ? (
              <div className="flex flex-1 flex-col gap-4">
                <Skeleton className="h-10 w-40 rounded-xl bg-white/10" />
                <Skeleton className="h-full rounded-2xl bg-white/5" />
              </div>
            ) : (
              <BigCalendar
                key={culture}
                localizer={localizer}
                events={calendarEvents}
                view={calendarView}
                onView={setCalendarView}
                date={calendarDate}
                onNavigate={setCalendarDate}
                startAccessor="start"
                endAccessor="end"
                titleAccessor="title"
                views={[Views.MONTH, Views.WEEK, Views.DAY]}
                culture={culture}
                messages={calMessages}
                className="agenda-calendar flex-1 min-h-0"
              />
            )}
          </div>

          <div>
            <h2 className="mb-4 text-xl font-semibold text-white">
              {t('agenda.nextEvents')}
            </h2>
            <div className="space-y-3">
              {eventsLoading
                ? Array.from({ length: 4 }).map((_, index) => (
                    <div
                      key={index}
                      className="flex flex-wrap items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-4"
                    >
                      <Skeleton className="h-10 w-10 rounded-xl bg-white/10" />
                      <div className="min-w-0 flex-1 space-y-2">
                        <Skeleton className="h-4 w-48 bg-white/10" />
                        <Skeleton className="h-3 w-40 bg-white/5" />
                        <Skeleton className="h-3 w-32 bg-white/5" />
                      </div>
                    </div>
                  ))
                : events.map((ev) => (
                    <div
                      key={ev.id}
                      className="flex flex-wrap items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 transition-colors hover:bg-white/[0.07]"
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#EC4899]/20">
                        <Clock className="h-5 w-5 text-[#EC4899]" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-white">{ev.title}</p>
                        <p className="flex items-center gap-2 text-sm text-gray-400">
                          <UserCircle className="h-4 w-4" />
                          {ev.contactName} · {ev.contactChannel}
                        </p>
                        <p className="mt-1 text-xs text-gray-500">
                          {formatDate(ev.startAt)} — {formatTime(ev.startAt)}–
                          {formatTime(ev.endAt)}
                        </p>
                      </div>
                      {ev.meetingUrl && (
                        <a
                          href={ev.meetingUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex shrink-0 items-center gap-1 rounded-lg px-2 py-1.5 text-xs text-[#EC4899] hover:bg-[#EC4899]/10 transition-colors"
                        >
                          <Video className="h-3.5 w-3.5" />
                          {t('agenda.meeting')}
                        </a>
                      )}
                      {ev.source === 'arisara_chat' && (
                        <span className="shrink-0 rounded-full bg-violet-500/20 px-2 py-0.5 text-xs text-violet-300">
                          {t('agenda.viaChat')}
                        </span>
                      )}
                      {ev.source === 'google' && (
                        <span className="shrink-0 rounded-full bg-blue-500/20 px-2 py-0.5 text-xs text-blue-300">
                          Google
                        </span>
                      )}
                      {ev.source === 'outlook' && (
                        <span className="shrink-0 rounded-full bg-sky-600/20 px-2 py-0.5 text-xs text-sky-300">
                          Outlook
                        </span>
                      )}
                    </div>
                  ))}
            </div>
            {events.length === 0 && !eventsLoading && (
              <div className="rounded-2xl border border-white/10 bg-white/5 py-12 text-center text-sm text-gray-500">
                {t('agenda.emptyEvents')}
              </div>
            )}
          </div>
        </div>

        <p className="text-xs text-gray-500">{t('agenda.footer')}</p>
      </div>
    </Layout>
  );
}
