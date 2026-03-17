/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Calendar,
  Clock,
  Grid3x3,
  List,
  Search,
  Filter,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export interface Event {
  id: string;
  title: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  color: string;
  category?: string;
  attendees?: string[];
  tags?: string[];
}

export interface LeadOption {
  id: string;
  name: string;
  channel: string;
}

export interface EventManagerProps {
  events?: Event[];
  onEventCreate?: (
    event: Omit<Event, "id"> & { leadId?: string; contactName?: string; contactChannel?: string }
  ) => void;
  onEventUpdate?: (id: string, event: Partial<Event>) => void;
  /** Chamado ao solicitar exclusão (antes da confirmação). Permite ao parent exibir modal de confirmação; após confirmar, o parent deve chamar a API e refazer fetch dos eventos. */
  onEventDelete?: (id: string, event?: Partial<Event>) => void;
  categories?: string[];
  colors?: { name: string; value: string; bg: string; text: string }[];
  defaultView?: "month" | "week" | "day" | "list";
  className?: string;
  availableTags?: string[];
  /** Opcional: lista de leads para o campo "Vincular a um lead" no formulário de criar evento. */
  leadOptions?: LeadOption[];
}

function sanitizeHtmlForDisplay(html: string): string {
  if (!html?.trim()) return "";
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, "")
    .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, "")
    .replace(/<embed\b[^>]*>/gi, "");
}

const defaultColors = [
  { name: "Blue", value: "blue", bg: "bg-blue-500", text: "text-blue-700" },
  { name: "Green", value: "green", bg: "bg-green-500", text: "text-green-700" },
  {
    name: "Purple",
    value: "purple",
    bg: "bg-purple-500",
    text: "text-purple-700",
  },
  {
    name: "Orange",
    value: "orange",
    bg: "bg-orange-500",
    text: "text-orange-700",
  },
  { name: "Pink", value: "pink", bg: "bg-pink-500", text: "text-pink-700" },
  { name: "Red", value: "red", bg: "bg-red-500", text: "text-red-700" },
];

export function EventManager({
  events: initialEvents = [],
  onEventCreate,
  onEventUpdate,
  onEventDelete,
  categories = ["Meeting", "Task", "Reminder", "Personal"],
  colors = defaultColors,
  defaultView = "month",
  className,
  availableTags = ["Important", "Urgent", "Work", "Personal", "Team", "Client"],
  leadOptions = [],
}: EventManagerProps) {
  const { t, i18n } = useTranslation();
  const currentLocale =
    i18n.language?.startsWith("pt") ? "pt-BR" : i18n.language?.startsWith("es") ? "es-ES" : "en-US";

  const capitalize = (value: string) =>
    value.length === 0 ? value : value.charAt(0).toUpperCase() + value.slice(1);

  const [events, setEvents] = useState<Event[]>(initialEvents);
  useEffect(() => {
    setEvents(initialEvents);
  }, [initialEvents]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<"month" | "week" | "day" | "list">(defaultView);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isEditingEvent, setIsEditingEvent] = useState(false);
  const [draggedEvent, setDraggedEvent] = useState<Event | null>(null);
  const [newEvent, setNewEvent] = useState<Partial<Event>>({
    title: "",
    description: "",
    color: colors[0]?.value ?? "blue",
    category: categories[0],
    tags: [],
  });
  const [newEventLeadId, setNewEventLeadId] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [listShowPastEvents, setListShowPastEvents] = useState(true);
  const [listPeriod, setListPeriod] = useState<
    "all" | "today" | "week" | "month" | "next7"
  >("all");

  const filteredEvents = useMemo(
    () =>
      events.filter((event) => {
        if (searchQuery) {
          const query = searchQuery.toLowerCase();
          const matchesSearch =
            event.title.toLowerCase().includes(query) ||
            event.description?.toLowerCase().includes(query) ||
            event.category?.toLowerCase().includes(query) ||
            event.tags?.some((tag) => tag.toLowerCase().includes(query));
          if (!matchesSearch) return false;
        }

        if (selectedColors.length > 0 && !selectedColors.includes(event.color)) {
          return false;
        }

        if (selectedTags.length > 0) {
          const hasMatchingTag = event.tags?.some((tag) =>
            selectedTags.includes(tag),
          );
          if (!hasMatchingTag) return false;
        }

        if (
          selectedCategories.length > 0 &&
          event.category &&
          !selectedCategories.includes(event.category)
        ) {
          return false;
        }

        return true;
      }),
    [events, searchQuery, selectedColors, selectedTags, selectedCategories],
  );

  const listFilteredEvents = useMemo(() => {
    if (view !== "list") return filteredEvents;
    const now = new Date();
    return filteredEvents.filter((event) => {
      if (!listShowPastEvents && event.endTime < now) return false;
      if (listPeriod === "all") return true;
      const start = event.startTime.getTime();
      const d = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate());
      let periodStart: number;
      let periodEnd: number;
      if (listPeriod === "today") {
        periodStart = d.getTime();
        periodEnd = d.getTime() + 24 * 60 * 60 * 1000 - 1;
      } else if (listPeriod === "week") {
        const day = d.getDay();
        const sun = new Date(d);
        sun.setDate(d.getDate() - day);
        sun.setHours(0, 0, 0, 0);
        const sat = new Date(sun);
        sat.setDate(sun.getDate() + 6);
        sat.setHours(23, 59, 59, 999);
        periodStart = sun.getTime();
        periodEnd = sat.getTime();
      } else if (listPeriod === "month") {
        const first = new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0);
        const last = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
        periodStart = first.getTime();
        periodEnd = last.getTime();
      } else {
        // next7
        periodStart = now.getTime();
        periodEnd = now.getTime() + 7 * 24 * 60 * 60 * 1000;
      }
      return start >= periodStart && start <= periodEnd;
    });
  }, [
    view,
    filteredEvents,
    listShowPastEvents,
    listPeriod,
    currentDate,
  ]);

  const hasActiveFilters =
    selectedColors.length > 0 ||
    selectedTags.length > 0 ||
    selectedCategories.length > 0;

  const clearFilters = () => {
    setSelectedColors([]);
    setSelectedTags([]);
    setSelectedCategories([]);
    setSearchQuery("");
  };

  const handleCreateEvent = useCallback(() => {
    if (!newEvent.title || !newEvent.startTime || !newEvent.endTime) return;

    const event: Event = {
      id: Math.random().toString(36).slice(2, 11),
      title: newEvent.title,
      description: newEvent.description,
      startTime: newEvent.startTime,
      endTime: newEvent.endTime,
      color: newEvent.color || colors[0]?.value || "blue",
      category: newEvent.category,
      attendees: newEvent.attendees,
      tags: newEvent.tags || [],
    };

    const selectedLead = newEventLeadId
      ? leadOptions.find((l) => l.id === newEventLeadId)
      : null;
    setEvents((prev) => [...prev, event]);
    onEventCreate?.({
      title: event.title,
      description: event.description,
      startTime: event.startTime,
      endTime: event.endTime,
      color: event.color,
      category: event.category,
      attendees: event.attendees,
      tags: event.tags,
      leadId: newEventLeadId || undefined,
      contactName: selectedLead?.name,
      contactChannel: selectedLead?.channel === "whatsapp" ? "WhatsApp" : "Webchat",
    });
    setIsDialogOpen(false);
    setIsCreating(false);
    setNewEventLeadId(null);
    setNewEvent({
      title: "",
      description: "",
      color: colors[0]?.value ?? "blue",
      category: categories[0],
      tags: [],
    });
  }, [newEvent, colors, categories, onEventCreate, newEventLeadId, leadOptions]);

  const handleUpdateEvent = useCallback(() => {
    if (!selectedEvent) return;

    setEvents((prev) =>
      prev.map((e) => (e.id === selectedEvent.id ? selectedEvent : e)),
    );
    onEventUpdate?.(selectedEvent.id, selectedEvent);
    setIsDialogOpen(false);
    setSelectedEvent(null);
  }, [selectedEvent, onEventUpdate]);

  const handleDeleteEvent = useCallback(
    (id: string) => {
      onEventDelete?.(id, selectedEvent ?? undefined);
      setIsDialogOpen(false);
      setSelectedEvent(null);
    },
    [onEventDelete, selectedEvent],
  );

  const handleDragStart = useCallback((event: Event) => {
    setDraggedEvent(event);
  }, []);

  const handleDragEnd = useCallback(() => {
    setDraggedEvent(null);
  }, []);

  const handleDrop = useCallback(
    (date: Date, hour?: number) => {
      if (!draggedEvent) return;

      const duration =
        draggedEvent.endTime.getTime() - draggedEvent.startTime.getTime();
      const newStartTime = new Date(date);
      if (hour !== undefined) {
        newStartTime.setHours(hour, 0, 0, 0);
      }
      const newEndTime = new Date(newStartTime.getTime() + duration);

      const updatedEvent: Event = {
        ...draggedEvent,
        startTime: newStartTime,
        endTime: newEndTime,
      };

      setEvents((prev) =>
        prev.map((e) => (e.id === draggedEvent.id ? updatedEvent : e)),
      );
      onEventUpdate?.(draggedEvent.id, updatedEvent);
      setDraggedEvent(null);
    },
    [draggedEvent, onEventUpdate],
  );

  const navigateDate = useCallback(
    (direction: "prev" | "next") => {
      setCurrentDate((prev) => {
        const newDate = new Date(prev);
        if (view === "month") {
          newDate.setMonth(prev.getMonth() + (direction === "next" ? 1 : -1));
        } else if (view === "week") {
          newDate.setDate(prev.getDate() + (direction === "next" ? 7 : -7));
        } else if (view === "day") {
          newDate.setDate(prev.getDate() + (direction === "next" ? 1 : -1));
        }
        return newDate;
      });
    },
    [view],
  );

  const getColorClasses = useCallback(
    (colorValue: string) => {
      const color = colors.find((c) => c.value === colorValue);
      return color || colors[0] || {
        name: "Blue",
        value: "blue",
        bg: "bg-blue-500",
        text: "text-blue-700",
      };
    },
    [colors],
  );

  const toggleTag = (tag: string, creating: boolean) => {
    if (creating) {
      setNewEvent((prev) => ({
        ...prev,
        tags: prev.tags?.includes(tag)
          ? prev.tags.filter((t) => t !== tag)
          : [...(prev.tags || []), tag],
      }));
    } else {
      setSelectedEvent((prev) =>
        prev
          ? {
              ...prev,
              tags: prev.tags?.includes(tag)
                ? prev.tags.filter((t) => t !== tag)
                : [...(prev.tags || []), tag],
            }
          : null,
      );
    }
  };

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
          <h2 className="text-xl font-semibold sm:text-2xl">
            {view === "month" &&
              capitalize(
                currentDate.toLocaleDateString(currentLocale, {
                  month: "long",
                  year: "numeric",
                }),
              )}
            {view === "week" &&
              t("agenda.weekOf", {
                defaultValue: "Semana de {{date}}",
                date: capitalize(
                  currentDate.toLocaleDateString(currentLocale, {
                    month: "short",
                    day: "numeric",
                  }),
                ),
              })}
            {view === "day" &&
              capitalize(
                currentDate.toLocaleDateString(currentLocale, {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                }),
              )}
            {view === "list" &&
              t("agenda.allEvents", { defaultValue: "Todos os eventos" })}
          </h2>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => navigateDate("prev")}
              className="h-8 w-8"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentDate(new Date())}
            >
              {t("agenda.today", { defaultValue: "Hoje" })}
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => navigateDate("next")}
              className="h-8 w-8"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          {/* Mobile: Select dropdown */}
          <div className="sm:hidden">
            <Select
              value={view}
              onValueChange={(value: "month" | "week" | "day" | "list") =>
                setView(value)
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="month">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    {t("agenda.view.month", { defaultValue: "Mês" })}
                  </div>
                </SelectItem>
                <SelectItem value="week">
                  <div className="flex items-center gap-2">
                    <Grid3x3 className="h-4 w-4" />
                    {t("agenda.view.week", { defaultValue: "Semana" })}
                  </div>
                </SelectItem>
                <SelectItem value="day">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    {t("agenda.view.day", { defaultValue: "Dia" })}
                  </div>
                </SelectItem>
                <SelectItem value="list">
                  <div className="flex items-center gap-2">
                    <List className="h-4 w-4" />
                    {t("agenda.view.list", { defaultValue: "Lista" })}
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Desktop: Button group */}
          <div className="hidden items-center gap-1 rounded-lg border bg-background p-1 sm:flex">
            <Button
              variant={view === "month" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setView("month")}
              className="h-8"
            >
              <Calendar className="h-4 w-4" />
              <span className="ml-1">
                {t("agenda.view.month", { defaultValue: "Mês" })}
              </span>
            </Button>
            <Button
              variant={view === "week" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setView("week")}
              className="h-8"
            >
              <Grid3x3 className="h-4 w-4" />
              <span className="ml-1">
                {t("agenda.view.week", { defaultValue: "Semana" })}
              </span>
            </Button>
            <Button
              variant={view === "day" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setView("day")}
              className="h-8"
            >
              <Clock className="h-4 w-4" />
              <span className="ml-1">
                {t("agenda.view.day", { defaultValue: "Dia" })}
              </span>
            </Button>
            <Button
              variant={view === "list" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setView("list")}
              className="h-8"
            >
              <List className="h-4 w-4" />
              <span className="ml-1">
                {t("agenda.view.list", { defaultValue: "Lista" })}
              </span>
            </Button>
          </div>

          <Button
            onClick={() => {
              setIsCreating(true);
              setIsDialogOpen(true);
            }}
            className="w-full sm:w-auto"
          >
            <Plus className="mr-2 h-4 w-4" />
            Novo evento
          </Button>
        </div>
      </div>

      {/* Busca + filtros */}
      <div className="flex flex-col gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar eventos..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2"
              onClick={() => setSearchQuery("")}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Filtros desktop */}
        <div className="hidden items-center gap-2 sm:flex">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2 bg-transparent">
                <Filter className="h-4 w-4" />
                Cores
                {selectedColors.length > 0 && (
                  <Badge variant="secondary" className="ml-1 h-5 px-1 text-xs">
                    {selectedColors.length}
                  </Badge>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>Filtrar por cor</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {colors.map((color) => (
                <DropdownMenuCheckboxItem
                  key={color.value}
                  checked={selectedColors.includes(color.value)}
                  onCheckedChange={(checked) => {
                    setSelectedColors((prev) =>
                      checked ? [...prev, color.value] : prev.filter((c) => c !== color.value),
                    );
                  }}
                >
                  <div className="flex items-center gap-2">
                    <div className={cn("h-3 w-3 rounded", color.bg)} />
                    {color.name}
                  </div>
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2 bg-transparent">
                <Filter className="h-4 w-4" />
                Tags
                {selectedTags.length > 0 && (
                  <Badge variant="secondary" className="ml-1 h-5 px-1 text-xs">
                    {selectedTags.length}
                  </Badge>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>Filtrar por tag</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {availableTags.map((tag) => (
                <DropdownMenuCheckboxItem
                  key={tag}
                  checked={selectedTags.includes(tag)}
                  onCheckedChange={(checked) => {
                    setSelectedTags((prev) =>
                      checked ? [...prev, tag] : prev.filter((t) => t !== tag),
                    );
                  }}
                >
                  {tag}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2 bg-transparent">
                <Filter className="h-4 w-4" />
                Categorias
                {selectedCategories.length > 0 && (
                  <Badge variant="secondary" className="ml-1 h-5 px-1 text-xs">
                    {selectedCategories.length}
                  </Badge>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>Filtrar por categoria</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {categories.map((category) => (
                <DropdownMenuCheckboxItem
                  key={category}
                  checked={selectedCategories.includes(category)}
                  onCheckedChange={(checked) => {
                    setSelectedCategories((prev) =>
                      checked ? [...prev, category] : prev.filter((c) => c !== category),
                    );
                  }}
                >
                  {category}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-2">
              <X className="h-4 w-4" />
              Limpar
            </Button>
          )}
        </div>
      </div>

      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span>
            {t("agenda.filters.active", { defaultValue: "Filtros ativos:" })}
          </span>
          {selectedColors.map((colorValue) => {
            const color = getColorClasses(colorValue);
            return (
              <Badge key={colorValue} variant="secondary" className="gap-1">
                <div className={cn("h-2 w-2 rounded-full", color.bg)} />
                {color.name}
                <button
                  type="button"
                  onClick={() =>
                    setSelectedColors((prev) => prev.filter((c) => c !== colorValue))
                  }
                  className="ml-1 hover:text-foreground"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            );
          })}
          {selectedTags.map((tag) => (
            <Badge key={tag} variant="secondary" className="gap-1">
              {tag}
              <button
                type="button"
                onClick={() =>
                  setSelectedTags((prev) => prev.filter((t) => t !== tag))
                }
                className="ml-1 hover:text-foreground"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
          {selectedCategories.map((category) => (
            <Badge key={category} variant="secondary" className="gap-1">
              {category}
              <button
                type="button"
                onClick={() =>
                  setSelectedCategories((prev) => prev.filter((c) => c !== category))
                }
                className="ml-1 hover:text-foreground"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      {/* Views */}
      {view === "month" && (
        <MonthView
          currentDate={currentDate}
          events={filteredEvents}
          onEventClick={(event) => {
            setSelectedEvent(event);
            setIsCreating(false);
            setIsDialogOpen(true);
          }}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDrop={handleDrop}
          getColorClasses={getColorClasses}
        />
      )}

      {view === "week" && (
        <div className="h-[30rem] overflow-y-auto sm:h-[36rem]">
          <WeekView
            currentDate={currentDate}
            events={filteredEvents}
            onEventClick={(event) => {
              setSelectedEvent(event);
              setIsCreating(false);
              setIsDialogOpen(true);
            }}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDrop={handleDrop}
            getColorClasses={getColorClasses}
          />
        </div>
      )}

      {view === "day" && (
        <div className="h-[30rem] overflow-y-auto sm:h-[36rem]">
          <DayView
            currentDate={currentDate}
            events={filteredEvents}
            onEventClick={(event) => {
              setSelectedEvent(event);
              setIsCreating(false);
              setIsDialogOpen(true);
            }}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDrop={handleDrop}
            getColorClasses={getColorClasses}
          />
        </div>
      )}

      {view === "list" && (
        <>
          <div className="flex flex-wrap items-center gap-4 rounded-lg border bg-card/50 p-3 sm:p-4">
            <label className="flex cursor-pointer items-center gap-2">
              <Switch
                checked={listShowPastEvents}
                onCheckedChange={setListShowPastEvents}
              />
              <span className="text-sm">
                {t("agenda.list.showPast", {
                  defaultValue: "Mostrar eventos passados",
                })}
              </span>
            </label>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                {t("agenda.list.period", { defaultValue: "Período" })}
              </span>
              <Select
                value={listPeriod}
                onValueChange={(v: "all" | "today" | "week" | "month" | "next7") =>
                  setListPeriod(v)
                }
              >
                <SelectTrigger className="h-8 w-[10rem]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    {t("agenda.list.periodAll", { defaultValue: "Todos" })}
                  </SelectItem>
                  <SelectItem value="today">
                    {t("agenda.list.periodToday", { defaultValue: "Hoje" })}
                  </SelectItem>
                  <SelectItem value="week">
                    {t("agenda.list.periodWeek", {
                      defaultValue: "Esta semana",
                    })}
                  </SelectItem>
                  <SelectItem value="month">
                    {t("agenda.list.periodMonth", {
                      defaultValue: "Este mês",
                    })}
                  </SelectItem>
                  <SelectItem value="next7">
                    {t("agenda.list.periodNext7", {
                      defaultValue: "Próximos 7 dias",
                    })}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="h-[30rem] overflow-y-auto rounded-lg bg-card sm:h-[36rem]">
            <ListView
              events={listFilteredEvents}
            onEventClick={(event) => {
              setSelectedEvent(event);
              setIsCreating(false);
              setIsDialogOpen(true);
            }}
              getColorClasses={getColorClasses}
            />
          </div>
        </>
      )}

      {/* Dialog de criação/edição */}
      <Dialog
        open={isDialogOpen}
        onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) {
            setIsCreating(false);
            setIsEditingEvent(false);
            setSelectedEvent(null);
          }
        }}
      >
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto rounded-2xl border border-white/10 bg-[#050509] text-white shadow-2xl sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              {isCreating
                ? t("agenda.dialog.createTitle", { defaultValue: "Criar evento" })
                : isEditingEvent
                  ? t("agenda.dialog.editTitle", {
                      defaultValue: "Editar evento",
                    })
                  : t("agenda.dialog.detailsTitle", {
                      defaultValue: "Detalhes do evento",
                    })}
            </DialogTitle>
            <DialogDescription>
              {isCreating
                ? t("agenda.dialog.createDesc", {
                    defaultValue: "Adicione um novo evento à agenda.",
                  })
                : isEditingEvent
                  ? t("agenda.dialog.editDesc", {
                      defaultValue: "Altere os detalhes do evento.",
                    })
                  : t("agenda.dialog.detailsDesc", {
                      defaultValue: "Veja os detalhes do evento.",
                    })}
            </DialogDescription>
          </DialogHeader>

          {!isCreating && selectedEvent && !isEditingEvent ? (
            /* Modo visualização */
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-muted-foreground">
                  {t("agenda.fields.title", { defaultValue: "Título" })}
                </Label>
                <p className="rounded-md border bg-muted/30 px-3 py-2 text-sm">
                  {selectedEvent.title}
                </p>
              </div>

              <div className="space-y-2">
                <Label className="text-muted-foreground">
                  {t("agenda.fields.description", {
                    defaultValue: "Descrição",
                  })}
                </Label>
                {selectedEvent.description ? (
                  <div
                    className="max-h-[min(40vh,24rem)] overflow-y-auto rounded-md border bg-muted/30 p-3 text-sm [&_a]:text-primary [&_table]:w-full [&_table]:text-sm [&_td]:p-1 [&_th]:p-1 [&_ul]:my-2 [&_ol]:my-2 [&_li]:my-0.5 [&_p]:my-1.5"
                    dangerouslySetInnerHTML={{
                      __html: sanitizeHtmlForDisplay(selectedEvent.description),
                    }}
                  />
                ) : (
                  <p className="rounded-md border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
                    —
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-muted-foreground">
                    {t("agenda.fields.start", { defaultValue: "Início" })}
                  </Label>
                  <p className="rounded-md border bg-muted/30 px-3 py-2 text-sm">
                    {selectedEvent.startTime.toLocaleDateString("pt-BR", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label className="text-muted-foreground">
                    {t("agenda.fields.end", { defaultValue: "Fim" })}
                  </Label>
                  <p className="rounded-md border bg-muted/30 px-3 py-2 text-sm">
                    {selectedEvent.endTime.toLocaleDateString("pt-BR", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-muted-foreground">
                    {t("agenda.fields.category", {
                      defaultValue: "Categoria",
                    })}
                  </Label>
                  <p className="rounded-md border bg-muted/30 px-3 py-2 text-sm">
                    {selectedEvent.category ?? "—"}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label className="text-muted-foreground">
                    {t("agenda.fields.color", { defaultValue: "Cor" })}
                  </Label>
                  <p className="flex items-center gap-2 rounded-md border bg-muted/30 px-3 py-2 text-sm">
                    <span
                      className={cn(
                        "h-4 w-4 rounded",
                        getColorClasses(selectedEvent.color).bg,
                      )}
                    />
                    {colors.find((c) => c.value === selectedEvent.color)
                      ?.name ?? selectedEvent.color}
                  </p>
                </div>
              </div>

              {selectedEvent.tags && selectedEvent.tags.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-muted-foreground">
                    {t("agenda.fields.tags", { defaultValue: "Tags" })}
                  </Label>
                  <div className="flex flex-wrap gap-2">
                    {selectedEvent.tags.map((tag) => (
                      <Badge key={tag} variant="secondary">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Modo criação / edição */
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">
                  {t("agenda.fields.title", { defaultValue: "Título" })}
                </Label>
                <Input
                  id="title"
                  value={isCreating ? newEvent.title ?? "" : selectedEvent?.title ?? ""}
                  onChange={(e) =>
                    isCreating
                      ? setNewEvent((prev) => ({ ...prev, title: e.target.value }))
                      : setSelectedEvent((prev) =>
                          prev ? { ...prev, title: e.target.value } : null,
                        )
                  }
                  placeholder={t("agenda.placeholders.title", {
                    defaultValue: "Título do evento",
                  })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">
                  {t("agenda.fields.description", {
                    defaultValue: "Descrição",
                  })}
                </Label>
                <Textarea
                  id="description"
                  value={
                    isCreating
                      ? newEvent.description ?? ""
                      : selectedEvent?.description ?? ""
                  }
                  onChange={(e) =>
                    isCreating
                      ? setNewEvent((prev) => ({
                          ...prev,
                          description: e.target.value,
                        }))
                      : setSelectedEvent((prev) =>
                          prev
                            ? { ...prev, description: e.target.value }
                            : null,
                        )
                  }
                  placeholder={t("agenda.placeholders.description", {
                    defaultValue: "Descrição do evento",
                  })}
                  rows={5}
                  className="min-h-[8rem]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startTime">
                    {t("agenda.fields.start", { defaultValue: "Início" })}
                  </Label>
                  <Input
                    id="startTime"
                    type="datetime-local"
                    className="input-datetime-dark"
                    value={
                      isCreating
                        ? newEvent.startTime
                          ? new Date(
                              newEvent.startTime.getTime() -
                                newEvent.startTime.getTimezoneOffset() * 60000,
                            )
                              .toISOString()
                              .slice(0, 16)
                          : ""
                        : selectedEvent
                          ? new Date(
                              selectedEvent.startTime.getTime() -
                                selectedEvent.startTime.getTimezoneOffset() * 60000,
                            )
                              .toISOString()
                              .slice(0, 16)
                          : ""
                    }
                    onChange={(e) => {
                      const date = new Date(e.target.value);
                      if (Number.isNaN(date.getTime())) return;
                      if (isCreating) {
                        setNewEvent((prev) => ({ ...prev, startTime: date }));
                      } else {
                        setSelectedEvent((prev) =>
                          prev ? { ...prev, startTime: date } : null,
                        );
                      }
                    }}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="endTime">
                    {t("agenda.fields.end", { defaultValue: "Fim" })}
                  </Label>
                  <Input
                    id="endTime"
                    type="datetime-local"
                    className="input-datetime-dark"
                    value={
                      isCreating
                        ? newEvent.endTime
                          ? new Date(
                              newEvent.endTime.getTime() -
                                newEvent.endTime.getTimezoneOffset() * 60000,
                            )
                              .toISOString()
                              .slice(0, 16)
                          : ""
                        : selectedEvent
                          ? new Date(
                              selectedEvent.endTime.getTime() -
                                selectedEvent.endTime.getTimezoneOffset() * 60000,
                            )
                              .toISOString()
                              .slice(0, 16)
                          : ""
                    }
                    onChange={(e) => {
                      const date = new Date(e.target.value);
                      if (Number.isNaN(date.getTime())) return;
                      if (isCreating) {
                        setNewEvent((prev) => ({ ...prev, endTime: date }));
                      } else {
                        setSelectedEvent((prev) =>
                          prev ? { ...prev, endTime: date } : null,
                        );
                      }
                    }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="category">
                    {t("agenda.fields.category", {
                      defaultValue: "Categoria",
                    })}
                  </Label>
                  <Select
                    value={
                      (isCreating ? newEvent.category : selectedEvent?.category) ??
                      categories[0]
                    }
                    onValueChange={(value) =>
                      isCreating
                        ? setNewEvent((prev) => ({ ...prev, category: value }))
                        : setSelectedEvent((prev) =>
                            prev ? { ...prev, category: value } : null,
                          )
                    }
                  >
                    <SelectTrigger id="category">
                      <SelectValue
                        placeholder={t("agenda.placeholders.category", {
                          defaultValue: "Selecione a categoria",
                        })}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="color">
                    {t("agenda.fields.color", { defaultValue: "Cor" })}
                  </Label>
                  <Select
                    value={
                      (isCreating ? newEvent.color : selectedEvent?.color) ??
                      colors[0]?.value ??
                      "blue"
                    }
                    onValueChange={(value) =>
                      isCreating
                        ? setNewEvent((prev) => ({ ...prev, color: value }))
                        : setSelectedEvent((prev) =>
                            prev ? { ...prev, color: value } : null,
                          )
                    }
                  >
                    <SelectTrigger id="color">
                      <SelectValue
                        placeholder={t("agenda.placeholders.color", {
                          defaultValue: "Selecione a cor",
                        })}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {colors.map((color) => (
                        <SelectItem key={color.value} value={color.value}>
                          <div className="flex items-center gap-2">
                            <div className={cn("h-4 w-4 rounded", color.bg)} />
                            {color.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>{t("agenda.fields.tags", { defaultValue: "Tags" })}</Label>
                <div className="flex flex-wrap gap-2">
                  {availableTags.map((tag) => {
                    const isSelected = isCreating
                      ? newEvent.tags?.includes(tag)
                      : selectedEvent?.tags?.includes(tag);
                    return (
                      <Badge
                        key={tag}
                        variant={isSelected ? "default" : "outline"}
                        className="cursor-pointer transition-all hover:scale-105"
                        onClick={() => toggleTag(tag, isCreating)}
                      >
                        {tag}
                      </Badge>
                    );
                  })}
                </div>
              </div>

              {isCreating && leadOptions.length > 0 && (
                <div className="space-y-2">
                  <Label htmlFor="lead">
                    {t("agenda.createEventLinkLead", { defaultValue: "Vincular a um lead" })}
                  </Label>
                  <Select
                    value={newEventLeadId ?? "__none__"}
                    onValueChange={(v) => setNewEventLeadId(v === "__none__" ? null : v)}
                  >
                    <SelectTrigger id="lead">
                      <SelectValue
                        placeholder={t("agenda.createEventNoLead", { defaultValue: "Nenhum" })}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">
                        {t("agenda.createEventNoLead", { defaultValue: "Nenhum" })}
                      </SelectItem>
                      {leadOptions.map((l) => (
                        <SelectItem key={l.id} value={l.id}>
                          {l.name} · {l.channel === "whatsapp" ? "WhatsApp" : "Webchat"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            {!isCreating && selectedEvent && (
              <Button
                variant="destructive"
                type="button"
                onClick={() => handleDeleteEvent(selectedEvent.id)}
              >
                {t("agenda.actions.delete", { defaultValue: "Excluir" })}
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsDialogOpen(false);
                setIsCreating(false);
                setIsEditingEvent(false);
                setSelectedEvent(null);
                setNewEventLeadId(null);
              }}
            >
              {t("common.cancel", { defaultValue: "Cancelar" })}
            </Button>
            {!isCreating && selectedEvent && !isEditingEvent ? (
              <Button
                type="button"
                onClick={() => setIsEditingEvent(true)}
              >
                {t("agenda.actions.edit", { defaultValue: "Editar" })}
              </Button>
            ) : (
              <Button
                type="button"
                onClick={isCreating ? handleCreateEvent : handleUpdateEvent}
              >
                {isCreating
                  ? t("agenda.actions.create", { defaultValue: "Criar" })
                  : t("agenda.actions.save", { defaultValue: "Salvar" })}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface EventCardProps {
  event: Event;
  onEventClick: (event: Event) => void;
  onDragStart: (event: Event) => void;
  onDragEnd: () => void;
  getColorClasses: (color: string) => { bg: string; text: string };
  variant?: "default" | "compact" | "detailed";
}

function EventCard({
  event,
  onEventClick,
  onDragStart,
  onDragEnd,
  getColorClasses,
  variant = "default",
}: EventCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const colorClasses = getColorClasses(event.color);

  const formatTime = (date: Date) =>
    date.toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    });

  const getDuration = () => {
    const diff = event.endTime.getTime() - event.startTime.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor(
      (diff % (1000 * 60 * 60)) / (1000 * 60),
    );
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  if (variant === "compact") {
    return (
      <div
        draggable
        onDragStart={() => onDragStart(event)}
        onDragEnd={onDragEnd}
        onClick={() => onEventClick(event)}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className="relative cursor-pointer"
      >
        <div
          className={cn(
            "rounded px-1.5 py-0.5 text-xs font-medium text-white transition-all duration-300",
            colorClasses.bg,
            "truncate",
            isHovered && "z-10 scale-105 shadow-lg",
          )}
        >
          {event.title}
        </div>
        {isHovered && (
          <div className="absolute left-0 top-full z-50 mt-1 w-64">
            <Card className="border-2 p-3 shadow-xl">
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <h4 className="text-sm font-semibold leading-tight">
                    {event.title}
                  </h4>
                  <div
                    className={cn(
                      "h-3 w-3 flex-shrink-0 rounded-full",
                      colorClasses.bg,
                    )}
                  />
                </div>
                {event.description && (
                  <p className="line-clamp-2 text-xs text-muted-foreground">
                    {event.description}
                  </p>
                )}
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  <span>
                    {formatTime(event.startTime)} - {formatTime(event.endTime)}
                  </span>
                  <span className="text-[10px]">({getDuration()})</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {event.category && (
                    <Badge variant="secondary" className="h-5 text-[10px]">
                      {event.category}
                    </Badge>
                  )}
                  {event.tags?.map((tag) => (
                    <Badge
                      key={tag}
                      variant="outline"
                      className="h-5 text-[10px]"
                    >
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            </Card>
          </div>
        )}
      </div>
    );
  }

  if (variant === "detailed") {
    return (
      <div
        draggable
        onDragStart={() => onDragStart(event)}
        onDragEnd={onDragEnd}
        onClick={() => onEventClick(event)}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={cn(
          "cursor-pointer rounded-lg p-3 text-white transition-all duration-300",
          colorClasses.bg,
          isHovered && "scale-[1.03] shadow-2xl ring-2 ring-white/50",
        )}
      >
        <div className="font-semibold">{event.title}</div>
        {event.description && (
          <div className="mt-1 line-clamp-2 text-sm opacity-90">
            {event.description}
          </div>
        )}
        <div className="mt-2 flex items-center gap-2 text-xs opacity-80">
          <Clock className="h-3 w-3" />
          {formatTime(event.startTime)} - {formatTime(event.endTime)}
        </div>
        {isHovered && (
          <div className="mt-2 flex flex-wrap gap-1">
            {event.category && (
              <Badge variant="secondary" className="text-xs">
                {event.category}
              </Badge>
            )}
            {event.tags?.map((tag) => (
              <Badge key={tag} variant="outline" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      draggable
      onDragStart={() => onDragStart(event)}
      onDragEnd={onDragEnd}
      onClick={() => onEventClick(event)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="relative"
    >
      <div
        className={cn(
          "cursor-pointer rounded px-2 py-1 text-xs font-medium text-white transition-all duration-300",
          colorClasses.bg,
          isHovered && "z-10 scale-105 shadow-lg",
        )}
      >
        <div className="truncate">{event.title}</div>
      </div>
      {isHovered && (
        <div className="absolute left-0 top-full z-50 mt-1 w-72">
          <Card className="border-2 p-4 shadow-xl">
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-2">
                <h4 className="font-semibold leading-tight">{event.title}</h4>
                <div
                  className={cn(
                    "h-4 w-4 flex-shrink-0 rounded-full",
                    colorClasses.bg,
                  )}
                />
              </div>
              {event.description && (
                <p className="text-sm text-muted-foreground">
                  {event.description}
                </p>
              )}
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock className="h-3.5 w-3.5" />
                  <span>
                    {formatTime(event.startTime)} - {formatTime(event.endTime)}
                  </span>
                  <span className="text-[10px]">({getDuration()})</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {event.category && (
                    <Badge variant="secondary" className="text-xs">
                      {event.category}
                    </Badge>
                  )}
                  {event.tags?.map((tag) => (
                    <Badge key={tag} variant="outline" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

interface MonthViewProps {
  currentDate: Date;
  events: Event[];
  onEventClick: (event: Event) => void;
  onDragStart: (event: Event) => void;
  onDragEnd: () => void;
  onDrop: (date: Date) => void;
  getColorClasses: (color: string) => { bg: string; text: string };
}

function MonthView({
  currentDate,
  events,
  onEventClick,
  onDragStart,
  onDragEnd,
  onDrop,
  getColorClasses,
}: MonthViewProps) {
  const firstDayOfMonth = new Date(
    currentDate.getFullYear(),
    currentDate.getMonth(),
    1,
  );
  const startDate = new Date(firstDayOfMonth);
  startDate.setDate(startDate.getDate() - startDate.getDay());

  const days: Date[] = [];
  const currentDay = new Date(startDate);

  for (let i = 0; i < 42; i += 1) {
    days.push(new Date(currentDay));
    currentDay.setDate(currentDay.getDate() + 1);
  }

  const getEventsForDay = (date: Date) =>
    events.filter((event) => {
      const eventDate = event.startTime;
      return (
        eventDate.getDate() === date.getDate() &&
        eventDate.getMonth() === date.getMonth() &&
        eventDate.getFullYear() === date.getFullYear()
      );
    });

  return (
    <Card className="overflow-hidden">
      <div className="grid grid-cols-7 border-b">
        {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((day) => (
          <div
            key={day}
            className="border-r p-2 text-center text-xs font-medium last:border-r-0 sm:text-sm"
          >
            {day}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {days.map((day) => {
          const dayEvents = getEventsForDay(day);
          const isCurrentMonth = day.getMonth() === currentDate.getMonth();
          const isToday = day.toDateString() === new Date().toDateString();

          return (
            <div
              key={day.toISOString()}
              className={cn(
                "min-h-20 border-b border-r p-1 transition-colors last:border-r-0 sm:min-h-24 sm:p-2",
                !isCurrentMonth && "bg-muted/30",
                "hover:bg-accent/40",
              )}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => onDrop(day)}
            >
              <div
                className={cn(
                  "mb-1 flex h-5 w-5 items-center justify-center rounded-full text-xs sm:h-6 sm:w-6 sm:text-sm",
                  isToday && "bg-primary text-primary-foreground font-semibold",
                )}
              >
                {day.getDate()}
              </div>
              <div className="space-y-1">
                {dayEvents.slice(0, 3).map((event) => (
                  <EventCard
                    key={event.id}
                    event={event}
                    onEventClick={onEventClick}
                    onDragStart={onDragStart}
                    onDragEnd={onDragEnd}
                    getColorClasses={getColorClasses}
                    variant="compact"
                  />
                ))}
                {dayEvents.length > 3 && (
                  <div className="text-[10px] text-muted-foreground sm:text-xs">
                    +{dayEvents.length - 3} eventos
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

interface WeekViewProps {
  currentDate: Date;
  events: Event[];
  onEventClick: (event: Event) => void;
  onDragStart: (event: Event) => void;
  onDragEnd: () => void;
  onDrop: (date: Date, hour: number) => void;
  getColorClasses: (color: string) => { bg: string; text: string };
}

function WeekView({
  currentDate,
  events,
  onEventClick,
  onDragStart,
  onDragEnd,
  onDrop,
  getColorClasses,
}: WeekViewProps) {
  const startOfWeek = new Date(currentDate);
  startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const day = new Date(startOfWeek);
    day.setDate(startOfWeek.getDate() + i);
    return day;
  });

  const hours = Array.from({ length: 24 }, (_, i) => i);

  const getEventsForDayAndHour = (date: Date, hour: number) =>
    events.filter((event) => {
      const eventDate = event.startTime;
      const eventHour = eventDate.getHours();
      return (
        eventDate.getDate() === date.getDate() &&
        eventDate.getMonth() === date.getMonth() &&
        eventDate.getFullYear() === date.getFullYear() &&
        eventHour === hour
      );
    });

  return (
    <Card className="overflow-auto">
      <div className="grid grid-cols-8 border-b">
        <div className="border-r p-2 text-center text-xs font-medium sm:text-sm">
          Hora
        </div>
        {weekDays.map((day) => (
          <div
            key={day.toISOString()}
            className="border-r p-2 text-center text-xs font-medium last:border-r-0 sm:text-sm"
          >
            <div className="hidden sm:block">
              {day.toLocaleDateString("pt-BR", { weekday: "short" })}
            </div>
            <div className="sm:hidden">
              {day.toLocaleDateString("pt-BR", { weekday: "narrow" })}
            </div>
            <div className="text-[10px] text-muted-foreground sm:text-xs">
              {day.toLocaleDateString("pt-BR", {
                month: "short",
                day: "numeric",
              })}
            </div>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-8">
        {hours.map((hour) => (
          <div key={hour} className="contents">
            <div className="border-b border-r p-1 text-[10px] text-muted-foreground sm:p-2 sm:text-xs">
              {hour.toString().padStart(2, "0")}:00
            </div>
            {weekDays.map((day) => {
              const dayEvents = getEventsForDayAndHour(day, hour);
              return (
                <div
                  key={`${day.toISOString()}-${hour}`}
                  className="min-h-12 border-b border-r p-0.5 transition-colors hover:bg-accent/40 last:border-r-0 sm:min-h-16 sm:p-1"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => onDrop(day, hour)}
                >
                  <div className="space-y-1">
                    {dayEvents.map((event) => (
                      <EventCard
                        key={event.id}
                        event={event}
                        onEventClick={onEventClick}
                        onDragStart={onDragStart}
                        onDragEnd={onDragEnd}
                        getColorClasses={getColorClasses}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </Card>
  );
}

interface DayViewProps {
  currentDate: Date;
  events: Event[];
  onEventClick: (event: Event) => void;
  onDragStart: (event: Event) => void;
  onDragEnd: () => void;
  onDrop: (date: Date, hour: number) => void;
  getColorClasses: (color: string) => { bg: string; text: string };
}

function DayView({
  currentDate,
  events,
  onEventClick,
  onDragStart,
  onDragEnd,
  onDrop,
  getColorClasses,
}: DayViewProps) {
  const hours = Array.from({ length: 24 }, (_, i) => i);

  const getEventsForHour = (hour: number) =>
    events.filter((event) => {
      const eventDate = event.startTime;
      const eventHour = eventDate.getHours();
      return (
        eventDate.getDate() === currentDate.getDate() &&
        eventDate.getMonth() === currentDate.getMonth() &&
        eventDate.getFullYear() === currentDate.getFullYear() &&
        eventHour === hour
      );
    });

  return (
    <Card className="overflow-auto">
      <div className="space-y-0">
        {hours.map((hour) => {
          const hourEvents = getEventsForHour(hour);
          return (
            <div
              key={hour}
              className="flex border-b last:border-b-0"
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => onDrop(currentDate, hour)}
            >
              <div className="w-14 flex-shrink-0 border-r p-2 text-xs text-muted-foreground sm:w-20 sm:p-3 sm:text-sm">
                {hour.toString().padStart(2, "0")}:00
              </div>
              <div className="min-h-16 flex-1 p-1 transition-colors hover:bg-accent/40 sm:min-h-20 sm:p-2">
                <div className="space-y-2">
                  {hourEvents.map((event) => (
                    <EventCard
                      key={event.id}
                      event={event}
                      onEventClick={onEventClick}
                      onDragStart={onDragStart}
                      onDragEnd={onDragEnd}
                      getColorClasses={getColorClasses}
                      variant="detailed"
                    />
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

interface ListViewProps {
  events: Event[];
  onEventClick: (event: Event) => void;
  getColorClasses: (color: string) => { bg: string; text: string };
}

function ListView({ events, onEventClick, getColorClasses }: ListViewProps) {
  const sortedEvents = [...events].sort(
    (a, b) => a.startTime.getTime() - b.startTime.getTime(),
  );

  const groupedEvents = sortedEvents.reduce<Record<string, Event[]>>(
    (acc, event) => {
      const dateKey = event.startTime.toLocaleDateString("pt-BR", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });
      if (!acc[dateKey]) acc[dateKey] = [];
      acc[dateKey].push(event);
      return acc;
    },
    {},
  );

  return (
    <div className="h-full min-h-0 p-3 pb-8 sm:p-4 sm:pb-10">
      <div className="space-y-6">
        {Object.entries(groupedEvents).map(([date, dateEvents]) => (
          <div key={date} className="space-y-3">
            <h3 className="text-xs font-semibold text-muted-foreground sm:text-sm">
              {date}
            </h3>
            <div className="space-y-2">
              {dateEvents.map((event) => {
                const colorClasses = getColorClasses(event.color);
                return (
                  <button
                    key={event.id}
                    type="button"
                    onClick={() => onEventClick(event)}
                    className="group w-full cursor-pointer rounded-lg border bg-card p-3 text-left shadow-sm transition-all hover:scale-[1.01] hover:shadow-md sm:p-4"
                  >
                    <div className="flex items-start gap-2 sm:gap-3">
                      <div
                        className={cn(
                          "mt-1 h-2.5 w-2.5 rounded-full sm:h-3 sm:w-3",
                          colorClasses.bg,
                        )}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                          <div className="min-w-0">
                            <h4 className="truncate text-sm font-semibold transition-colors group-hover:text-primary sm:text-base">
                              {event.title}
                            </h4>
                            {event.description && (
                              <p className="mt-1 line-clamp-2 text-xs text-muted-foreground sm:text-sm">
                                {event.description}
                              </p>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {event.category && (
                              <Badge variant="secondary" className="text-xs">
                                {event.category}
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground sm:gap-4 sm:text-xs">
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {event.startTime.toLocaleTimeString("pt-BR", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}{" "}
                            -{" "}
                            {event.endTime.toLocaleTimeString("pt-BR", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </div>
                          {event.tags && event.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {event.tags.map((tag) => (
                                <Badge
                                  key={tag}
                                  variant="outline"
                                  className="h-4 text-[10px] sm:h-5 sm:text-xs"
                                >
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
        {sortedEvents.length === 0 && (
          <div className="py-12 text-center text-sm text-muted-foreground sm:text-base">
            Nenhum evento encontrado
          </div>
        )}
      </div>
    </div>
  );
}