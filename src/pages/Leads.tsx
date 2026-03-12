/**
 * Tela de Leads — mini-CRM: lista de leads com resumo, status, FUP.
 * Ref.: FEATURES_E_MELHORIAS.md §3.6 CRM-lite, §4.1 Pipeline.
 * Dados do backend GET /api/v1/crm/leads; PATCH /api/v1/crm/leads/:id no drag.
 */
import { useState, useCallback, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { API_ENDPOINTS, getAuthHeaders } from '../config/api';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
} from '@dnd-kit/core';
import Layout from '../components/Layout';
import { LeadDetailModal } from '../components/LeadDetailModal';
import { useRequireAuth } from '../hooks/useRequireAuth';
import {
  UserCircle,
  MessageSquare,
  Clock,
  ChevronRight,
  Search,
  Filter,
  Calendar,
  Phone,
  LayoutGrid,
  List,
} from 'lucide-react';
import { Skeleton } from '../components/ui/skeleton';

type LeadStatus = 'novo' | 'em_contato' | 'agendado' | 'proposta' | 'convertido';

interface Lead {
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

const STAGES_ORDER: LeadStatus[] = [
  'novo',
  'em_contato',
  'agendado',
  'proposta',
  'convertido',
];

type ViewMode = 'kanban' | 'lista';

function isLeadStatus(s: string): s is LeadStatus {
  return STAGES_ORDER.includes(s as LeadStatus);
}

function KanbanCardContent({
  lead,
  formatDate,
  showOpenAction = true,
  onOpen,
  openChatLabel,
}: {
  lead: Lead;
  formatDate: (iso: string) => string;
  showOpenAction?: boolean;
  onOpen?: () => void;
  openChatLabel: string;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/30 p-4 text-left">
      <div className="flex items-center gap-2">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#EC4899]/20">
          <UserCircle className="h-4 w-4 text-[#EC4899]" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium text-white">{lead.name}</p>
          <p className="flex items-center gap-1 truncate text-xs text-gray-500">
            {lead.channel === 'whatsapp' ? (
              <Phone className="h-3 w-3" />
            ) : (
              <MessageSquare className="h-3 w-3" />
            )}
            <span className="truncate">{lead.contact}</span>
          </p>
        </div>
        {showOpenAction && onOpen && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onOpen();
            }}
            className="shrink-0 rounded p-1 text-gray-500 hover:bg-white/10 hover:text-[#EC4899]"
            title={openChatLabel}
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        )}
      </div>
      <p className="mt-2 line-clamp-2 text-sm text-gray-400">{lead.summarySnippet}</p>
      <p className="mt-2 flex items-center gap-1 text-xs text-gray-500">
        <Clock className="h-3 w-3" />
        {formatDate(lead.lastContactAt)}
      </p>
      <p className="mt-1 flex items-center gap-1 text-xs text-[#EC4899]/90">
        <Calendar className="h-3 w-3" />
        {lead.nextAction}
      </p>
    </div>
  );
}

function KanbanCard({
  lead,
  formatDate,
  onOpen,
  openChatLabel,
}: {
  lead: Lead;
  formatDate: (iso: string) => string;
  onOpen: () => void;
  openChatLabel: string;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: lead.id,
  });
  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`transition-opacity ${isDragging ? 'opacity-50' : ''}`}
    >
      <KanbanCardContent
        lead={lead}
        formatDate={formatDate}
        showOpenAction
        onOpen={onOpen}
        openChatLabel={openChatLabel}
      />
    </div>
  );
}

function KanbanColumn({
  stage,
  cardCount,
  children,
  statusColors,
  statusLabels,
}: {
  stage: LeadStatus;
  cardCount: number;
  children: React.ReactNode;
  statusColors: Record<LeadStatus, string>;
  statusLabels: Record<LeadStatus, string>;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stage });
  return (
    <div className="flex w-72 shrink-0 flex-col rounded-2xl border border-white/10 bg-white/5">
      <div
        className={`flex items-center justify-between rounded-t-2xl border-b border-white/10 px-4 py-3 ${statusColors[stage]}`}
      >
        <span className="font-semibold">{statusLabels[stage]}</span>
        <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs font-medium">
          {cardCount}
        </span>
      </div>
      <div
        ref={setNodeRef}
        className={`flex min-h-[200px] flex-1 flex-col gap-3 overflow-y-auto p-3 transition-colors ${isOver ? 'bg-[#EC4899]/10 ring-1 ring-[#EC4899]/40' : ''}`}
      >
        {children}
      </div>
    </div>
  );
}

export default function Leads() {
  useRequireAuth();
  const { t, i18n } = useTranslation();
  const locale =
    i18n.language?.startsWith('en')
      ? 'en-US'
      : i18n.language?.startsWith('th')
        ? 'th-TH'
        : i18n.language?.startsWith('es')
          ? 'es-ES'
          : 'pt-BR';

  const statusLabels = useMemo(
    () =>
      ({
        novo: t('leads.status.novo'),
        em_contato: t('leads.status.em_contato'),
        agendado: t('leads.status.agendado'),
        proposta: t('leads.status.proposta'),
        convertido: t('leads.status.convertido'),
      }) as Record<LeadStatus, string>,
    [t]
  );

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<LeadStatus | ''>('');
  const [viewMode, setViewMode] = useState<ViewMode>('kanban');
  const [leads, setLeads] = useState<Lead[]>([]);
  const [leadsLoading, setLeadsLoading] = useState(true);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  const fetchLeads = useCallback(async () => {
    setLeadsLoading(true);
    try {
      const url = API_ENDPOINTS.crm.leads(search || undefined, statusFilter || undefined);
      const res = await fetch(url, { headers: getAuthHeaders() });
      if (!res.ok) throw new Error('leads');
      const data = (await res.json()) as Lead[];
      setLeads(data);
    } catch {
      setLeads([]);
    } finally {
      setLeadsLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveDragId(null);
      if (!over?.id || typeof over.id !== 'string' || !isLeadStatus(over.id)) return;
      const newStatus = over.id as LeadStatus;
      const leadId = String(active.id);
      const prevLead = leads.find((l) => l.id === leadId);
      if (!prevLead || prevLead.status === newStatus) return;
      setLeads((prev) =>
        prev.map((l) => (l.id === leadId ? { ...l, status: newStatus } : l))
      );
      fetch(API_ENDPOINTS.crm.leadUpdate(leadId), {
        method: 'PATCH',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      }).then((res) => {
        if (!res.ok) fetchLeads();
      });
    },
    [leads, fetchLeads]
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveDragId(String(event.active.id));
  }, []);

  const filtered = leads.filter((l) => {
    const matchSearch =
      !search ||
      l.name.toLowerCase().includes(search.toLowerCase()) ||
      l.contact.toLowerCase().includes(search.toLowerCase());
    const matchStatus = !statusFilter || l.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const formatDate = useCallback(
    (iso: string) => {
      const d = new Date(iso);
      const now = new Date();
      const diffDays = Math.floor(
        (now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24)
      );
      if (diffDays === 0)
        return d.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
      if (diffDays === 1) return t('leads.yesterday');
      if (diffDays < 7) return t('leads.daysAgoShort', { count: diffDays });
      return d.toLocaleDateString(locale);
    },
    [locale, t]
  );

  const openChatLabel = t('leads.openChat');

  return (
    <Layout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-semibold text-white">{t('leads.title')}</h1>
          <p className="mt-1 text-gray-400">{t('leads.subtitle')}</p>
        </div>

        <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              placeholder={t('leads.searchPlaceholder')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-black/40 py-2 pl-10 pr-4 text-white placeholder-gray-500 focus:border-[#EC4899]/50 focus:outline-none focus:ring-1 focus:ring-[#EC4899]/50"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-500" />
            <select
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter((e.target.value || '') as LeadStatus | '')
              }
              className="rounded-xl border border-white/10 bg-black/40 px-4 py-2 text-white focus:border-[#EC4899]/50 focus:outline-none"
            >
              <option value="">{t('leads.allStatuses')}</option>
              {(Object.keys(statusLabels) as LeadStatus[]).map((s) => (
                <option key={s} value={s}>
                  {statusLabels[s]}
                </option>
              ))}
            </select>
          </div>
          <div className="flex rounded-xl border border-white/10 bg-black/40 p-1">
            <button
              type="button"
              onClick={() => setViewMode('kanban')}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                viewMode === 'kanban'
                  ? 'bg-[#EC4899] text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
              title={t('leads.kanbanViewTitle')}
            >
              <LayoutGrid className="h-4 w-4" />
              {t('leads.kanban')}
            </button>
            <button
              type="button"
              onClick={() => setViewMode('lista')}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                viewMode === 'lista'
                  ? 'bg-[#EC4899] text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
              title={t('leads.listViewTitle')}
            >
              <List className="h-4 w-4" />
              {t('leads.list')}
            </button>
          </div>
        </div>

        {leadsLoading && (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 space-y-4">
            <Skeleton className="h-5 w-32 bg-white/10" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, index) => (
                <Skeleton key={index} className="h-32 rounded-2xl bg-white/5" />
              ))}
            </div>
          </div>
        )}

        {!leadsLoading && viewMode === 'kanban' && (
          <DndContext
            sensors={sensors}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDragCancel={() => setActiveDragId(null)}
          >
            <div className="flex gap-4 overflow-x-auto pb-2">
              {STAGES_ORDER.map((stage) => {
                const stageLeads = filtered.filter((l) => l.status === stage);
                return (
                  <KanbanColumn
                    key={stage}
                    stage={stage}
                    cardCount={stageLeads.length}
                    statusColors={statusColors}
                    statusLabels={statusLabels}
                  >
                    {stageLeads.map((lead) => (
                      <KanbanCard
                        key={lead.id}
                        lead={lead}
                        formatDate={formatDate}
                        onOpen={() => setSelectedLead(lead)}
                        openChatLabel={openChatLabel}
                      />
                    ))}
                  </KanbanColumn>
                );
              })}
            </div>
            <DragOverlay dropAnimation={null}>
              {activeDragId &&
                (() => {
                  const lead = leads.find((l) => l.id === activeDragId);
                  if (!lead) return null;
                  return (
                    <div className="w-72 cursor-grabbing opacity-95 shadow-xl">
                      <KanbanCardContent
                        lead={lead}
                        formatDate={formatDate}
                        showOpenAction={false}
                        openChatLabel={openChatLabel}
                      />
                    </div>
                  );
                })()}
            </DragOverlay>
          </DndContext>
        )}

        {!leadsLoading && viewMode === 'lista' && (
          <div className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/10 text-left text-sm text-gray-400">
                    <th className="p-4 font-medium">{t('leads.table.contact')}</th>
                    <th className="p-4 font-medium">{t('leads.table.lastContact')}</th>
                    <th className="p-4 font-medium">{t('leads.table.status')}</th>
                    <th className="p-4 font-medium">{t('leads.table.summary')}</th>
                    <th className="p-4 font-medium">{t('leads.table.nextAction')}</th>
                    <th className="p-4 w-12" />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((lead) => (
                    <tr
                      key={lead.id}
                      className="border-b border-white/5 transition-colors hover:bg-white/5 cursor-pointer"
                      onClick={() => setSelectedLead(lead)}
                    >
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#EC4899]/20">
                            <UserCircle className="h-5 w-5 text-[#EC4899]" />
                          </div>
                          <div>
                            <p className="font-medium text-white">{lead.name}</p>
                            <p className="flex items-center gap-1 text-xs text-gray-500">
                              {lead.channel === 'whatsapp' ? (
                                <Phone className="h-3 w-3" />
                              ) : (
                                <MessageSquare className="h-3 w-3" />
                              )}
                              {lead.contact}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className="flex items-center gap-1 text-sm text-gray-400">
                          <Clock className="h-4 w-4" />
                          {formatDate(lead.lastContactAt)}
                        </span>
                      </td>
                      <td className="p-4">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[lead.status]}`}
                        >
                          {statusLabels[lead.status]}
                        </span>
                      </td>
                      <td className="p-4 max-w-xs">
                        <p className="line-clamp-2 text-sm text-gray-300">
                          {lead.summarySnippet}
                        </p>
                      </td>
                      <td className="p-4">
                        <p className="flex items-center gap-1 text-sm text-gray-300">
                          <Calendar className="h-4 w-4 text-gray-500" />
                          {lead.nextAction}
                        </p>
                      </td>
                      <td className="p-4" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => setSelectedLead(lead)}
                          className="rounded-lg p-2 text-gray-400 hover:bg-white/10 hover:text-white transition-colors"
                          title={openChatLabel}
                        >
                          <ChevronRight className="h-5 w-5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {filtered.length === 0 && (
              <div className="py-16 text-center text-gray-500">{t('leads.empty')}</div>
            )}
          </div>
        )}

        <p className="text-xs text-gray-500">{t('leads.footer')}</p>

        <LeadDetailModal
          lead={selectedLead}
          open={!!selectedLead}
          onOpenChange={(open) => !open && setSelectedLead(null)}
        />
      </div>
    </Layout>
  );
}
