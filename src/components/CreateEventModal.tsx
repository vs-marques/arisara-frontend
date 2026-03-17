/**
 * Modal reutilizável para criar evento na Agenda (Arisara).
 * Alinhado ao modal equivalente do front Nyoka.
 */
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { API_ENDPOINTS, getAuthHeaders } from '@/config/api';

const defaultColors = [
  { name: 'Blue', value: 'blue', bg: 'bg-blue-500' },
  { name: 'Green', value: 'green', bg: 'bg-green-500' },
  { name: 'Purple', value: 'purple', bg: 'bg-purple-500' },
  { name: 'Orange', value: 'orange', bg: 'bg-orange-500' },
  { name: 'Pink', value: 'pink', bg: 'bg-pink-500' },
  { name: 'Red', value: 'red', bg: 'bg-red-500' },
];

const defaultCategories = ['Meeting', 'Task', 'Reminder', 'Personal'];
const defaultTags = ['Importante', 'Urgente', 'Cliente', 'Interno'];

export interface LeadOption {
  id: string;
  name: string;
  contact: string;
  channel: 'whatsapp' | 'webchat';
}

export interface CreateEventModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Lead pré-selecionado; quando definido, o campo de seleção de lead é ocultado. */
  defaultLead?: LeadOption | null;
  /** Chamado após criar o evento com sucesso. */
  onSuccess?: () => void;
}

export function CreateEventModal({
  open,
  onOpenChange,
  defaultLead = null,
  onSuccess,
}: CreateEventModalProps) {
  const { t } = useTranslation();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [category, setCategory] = useState(defaultCategories[0]);
  const [color, setColor] = useState(defaultColors[0].value);
  const [tags, setTags] = useState<string[]>([]);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [leads, setLeads] = useState<LeadOption[]>([]);
  const [leadsLoading, setLeadsLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    const now = new Date();
    const endDefault = new Date(now.getTime() + 60 * 60 * 1000);
    setStart(now.toISOString().slice(0, 16));
    setEnd(endDefault.toISOString().slice(0, 16));
    setTitle('');
    setDescription('');
    setCategory(defaultCategories[0]);
    setColor(defaultColors[0].value);
    setTags([]);
    setSelectedLeadId(defaultLead?.id ?? null);
  }, [open, defaultLead?.id]);

  useEffect(() => {
    if (!open || defaultLead) return;
    setLeadsLoading(true);
    fetch(API_ENDPOINTS.crm.leads(), { headers: getAuthHeaders() })
      .then((res) => (res.ok ? res.json() : []))
      .then((data: LeadOption[]) => setLeads(Array.isArray(data) ? data : []))
      .catch(() => setLeads([]))
      .finally(() => setLeadsLoading(false));
  }, [open, defaultLead]);

  const leadOptions: LeadOption[] =
    defaultLead && !leads.some((l) => l.id === defaultLead.id)
      ? [defaultLead, ...leads]
      : leads;

  const selectedLead = selectedLeadId
    ? leadOptions.find((l) => l.id === selectedLeadId) ?? defaultLead
    : defaultLead ?? null;

  const toggleTag = (tag: string) => {
    setTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      toast.error(
        t('agenda.createEventError', { defaultValue: 'Informe o título.' }),
      );
      return;
    }
    const startAt = new Date(start).toISOString();
    const endAt = new Date(end).toISOString();
    if (new Date(end) <= new Date(start)) {
      toast.error(
        t('agenda.createEventEndAfterStart', {
          defaultValue: 'O fim deve ser após o início.',
        }),
      );
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(API_ENDPOINTS.scheduler.createEvent(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || undefined,
          startAt,
          endAt,
          contactName: selectedLead?.name ?? '',
          contactChannel:
            selectedLead?.channel === 'whatsapp' ? 'WhatsApp' : 'Webchat',
          source: 'arisara_chat',
          leadId: defaultLead?.id ?? selectedLeadId ?? undefined,
          category: category || undefined,
          color: color || undefined,
          tags: tags.length ? tags : undefined,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err.detail as string) || 'Erro ao criar evento');
      }
      if (!defaultLead) {
        toast.success(
          t('agenda.createEventSuccess', {
            defaultValue: 'Evento criado com sucesso.',
          }),
        );
      }
      onSuccess?.();
      onOpenChange(false);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-white/10 bg-black text-white max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-white">
            {t('agenda.createEventTitle', { defaultValue: 'Criar evento' })}
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            {t('agenda.createEventSubtitle', {
              defaultValue: 'Adicione um novo evento à agenda.',
            })}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 pt-2 max-h-[70vh] overflow-y-auto">
          <div className="space-y-2">
            <Label htmlFor="create-event-title">
              {t('agenda.fields.title', { defaultValue: 'Título' })}
            </Label>
            <Input
              id="create-event-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t('agenda.placeholders.title', {
                defaultValue: 'Título do evento',
              })}
              className="border-white/10 bg-white/5 text-white placeholder:text-gray-500"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="create-event-description">
              {t('agenda.fields.description', { defaultValue: 'Descrição' })}
            </Label>
            <Textarea
              id="create-event-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('agenda.placeholders.description', {
                defaultValue: 'Descrição do evento',
              })}
              rows={3}
              className="min-h-[4rem] border-white/10 bg-white/5 text-white placeholder:text-gray-500"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-gray-400">
                {t('agenda.fields.start', { defaultValue: 'Início' })}
              </Label>
              <Input
                type="datetime-local"
                value={start}
                onChange={(e) => setStart(e.target.value)}
                className="input-datetime-dark border-white/10 bg-white/5 text-white"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-gray-400">
                {t('agenda.fields.end', { defaultValue: 'Fim' })}
              </Label>
              <Input
                type="datetime-local"
                value={end}
                onChange={(e) => setEnd(e.target.value)}
                className="input-datetime-dark border-white/10 bg-white/5 text-white"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>
                {t('agenda.fields.category', { defaultValue: 'Categoria' })}
              </Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="border-white/10 bg-white/5 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {defaultCategories.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>
                {t('agenda.fields.color', { defaultValue: 'Cor' })}
              </Label>
              <Select value={color} onValueChange={setColor}>
                <SelectTrigger className="border-white/10 bg-white/5 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {defaultColors.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      <div className="flex items-center gap-2">
                        <div className={cn('h-4 w-4 rounded', c.bg)} />
                        {c.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>
              {t('agenda.fields.tags', { defaultValue: 'Tags' })}
            </Label>
            <div className="flex flex-wrap gap-2">
              {defaultTags.map((tag) => (
                <Badge
                  key={tag}
                  variant={tags.includes(tag) ? 'default' : 'outline'}
                  className="cursor-pointer transition-all hover:scale-105"
                  onClick={() => toggleTag(tag)}
                >
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
          {!defaultLead && leadOptions.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="create-event-lead">
                {t('agenda.createEventLinkLead', {
                  defaultValue: 'Vincular a um lead',
                })}
              </Label>
              <Select
                value={selectedLeadId ?? '__none__'}
                onValueChange={(v) =>
                  setSelectedLeadId(v === '__none__' ? null : v)
                }
                disabled={leadsLoading}
              >
                <SelectTrigger
                  id="create-event-lead"
                  className="border-white/10 bg-white/5 text-white"
                >
                  <SelectValue
                    placeholder={t('agenda.createEventNoLead', {
                      defaultValue: 'Nenhum',
                    })}
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">
                    {t('agenda.createEventNoLead', { defaultValue: 'Nenhum' })}
                  </SelectItem>
                  {leadOptions.map((l) => (
                    <SelectItem key={l.id} value={l.id}>
                      {l.name} ·{' '}
                      {l.channel === 'whatsapp' ? 'WhatsApp' : 'Webchat'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
        <DialogFooter className="gap-2 pt-4">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            {t('common.cancel', { defaultValue: 'Cancelar' })}
          </Button>
          <Button onClick={handleSubmit} disabled={submitting || !title.trim()}>
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                {t('agenda.createEventSubmitting', {
                  defaultValue: 'Criando...',
                })}
              </>
            ) : (
              t('agenda.actions.create', { defaultValue: 'Criar' })
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

