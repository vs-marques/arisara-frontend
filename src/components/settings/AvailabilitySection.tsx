/**
 * Seção de Disponibilidade (horários de atendimento e agendamento).
 * Alinhado ao front Nyoka — FEATURES_E_MELHORIAS.md §3.2.2 Sistema de Disponibilidade (Catálogo #41).
 * Três vetores: operador humano, agente Arisara, horários para agendamento + slot e capacidade.
 */

import React, { useState, useEffect } from "react";
import { Clock, Users, Bot, Calendar, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArisaraSwitch } from "@/components/ui/nyoka-switch";
import { useCompany } from "@/contexts/CompanyContext";
import { useToast } from "@/hooks/use-toast";
import { getAuthHeaders, API_BASE_URL } from "@/config/api";

const DAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
type DayKey = (typeof DAY_KEYS)[number];

export interface DayRule {
  start: string;
  end: string;
}

export interface AvailabilityRules {
  [key: string]: DayRule[];
}

const defaultDayRule = (): DayRule[] => [{ start: "09:00", end: "18:00" }];
const defaultRules = (): AvailabilityRules =>
  Object.fromEntries(
    DAY_KEYS.map((d) => [d, d === "sat" || d === "sun" ? [] : defaultDayRule()])
  );

const SLOT_DURATION_OPTIONS = [15, 20, 30, 45, 60] as const;
const MAX_BOOKINGS_MIN = 1;
const MAX_BOOKINGS_MAX = 10;

const COMMON_TIMEZONES = [
  "America/Sao_Paulo",
  "America/New_York",
  "America/Argentina/Buenos_Aires",
  "Europe/Lisbon",
  "Europe/Madrid",
  "Asia/Bangkok",
];

const RULES_24X7: AvailabilityRules = Object.fromEntries(
  DAY_KEYS.map((d) => [d, [{ start: "00:00", end: "23:59" }]])
);

/** Regras da agente = complemento do horário do operador (agente só fora do expediente). */
function computeInverseRules(operatorRules: AvailabilityRules): AvailabilityRules {
  const result: AvailabilityRules = {};
  for (const day of DAY_KEYS) {
    const slots = [...(operatorRules[day] ?? [])].sort(
      (a, b) => String(a.start).localeCompare(String(b.start))
    );
    if (slots.length === 0) {
      result[day] = [{ start: "00:00", end: "23:59" }];
    } else {
      const ranges: DayRule[] = [];
      let lastEnd = "00:00";
      for (const s of slots) {
        const start = s.start;
        const end = s.end;
        if (start > lastEnd) ranges.push({ start: lastEnd, end: start });
        lastEnd = end > lastEnd ? end : lastEnd;
      }
      if (lastEnd < "23:59") ranges.push({ start: lastEnd, end: "23:59" });
      result[day] = ranges.length ? ranges : [];
    }
  }
  return result;
}

function WeekScheduleBlock({
  rules,
  onChange,
  timezone,
  onTimezoneChange,
  disabled,
  twentyFourSeven,
  outsideOperatorHours,
}: {
  rules: AvailabilityRules;
  onChange: (rules: AvailabilityRules) => void;
  timezone: string;
  onTimezoneChange: (tz: string) => void;
  disabled?: boolean;
  twentyFourSeven?: { enabled: boolean; onToggle: (enabled: boolean) => void };
  outsideOperatorHours?: { enabled: boolean; onToggle: (enabled: boolean) => void };
}) {
  const { t } = useTranslation();
  const is24x7 = twentyFourSeven?.enabled ?? false;
  const isOutsideOperator = outsideOperatorHours?.enabled ?? false;
  const hidePerDay = is24x7 || isOutsideOperator;

  const setDay = (day: DayKey, closed: boolean, start?: string, end?: string) => {
    const next = { ...rules };
    if (closed) {
      next[day] = [];
    } else {
      next[day] = [{ start: start ?? "09:00", end: end ?? "18:00" }];
    }
    onChange(next);
  };

  return (
    <div className="space-y-4">
      {(twentyFourSeven || outsideOperatorHours) && (
        <div className="space-y-3">
          {twentyFourSeven && (
            <div className="flex flex-wrap items-center gap-3 rounded-xl border border-white/10 bg-black/30 px-4 py-3">
              <Label className="text-sm font-medium text-white">
                {t("settings.availability.toggle24x7")}
              </Label>
              <ArisaraSwitch
                checked={twentyFourSeven.enabled}
                onCheckedChange={(checked) => {
                  twentyFourSeven.onToggle(checked);
                  if (checked && outsideOperatorHours) outsideOperatorHours.onToggle(false);
                }}
                disabled={disabled}
              />
              <span className="text-xs text-gray-500">
                {twentyFourSeven.enabled
                  ? t("settings.availability.toggle24x7On")
                  : t("settings.availability.toggle24x7Off")}
              </span>
            </div>
          )}
          {outsideOperatorHours && (
            <div className="flex flex-wrap items-center gap-3 rounded-xl border border-white/10 bg-black/30 px-4 py-3">
              <Label className="text-sm font-medium text-white">
                {t("settings.availability.toggleOutsideOperator")}
              </Label>
              <ArisaraSwitch
                checked={outsideOperatorHours.enabled}
                onCheckedChange={(checked) => {
                  outsideOperatorHours.onToggle(checked);
                  if (checked && twentyFourSeven) twentyFourSeven.onToggle(false);
                }}
                disabled={disabled}
              />
              <span className="text-xs text-gray-500">
                {outsideOperatorHours.enabled
                  ? t("settings.availability.toggleOutsideOperatorOn")
                  : t("settings.availability.toggleOutsideOperatorOff")}
              </span>
            </div>
          )}
        </div>
      )}
      <div className="space-y-1">
        <Label className="block text-xs uppercase tracking-wider text-gray-500">
          {t("settings.availability.timezone")}
        </Label>
        <select
          value={timezone}
          onChange={(e) => onTimezoneChange(e.target.value)}
          disabled={disabled}
          className="mt-3 w-full max-w-xs rounded-xl border border-white/10 bg-black/40 px-4 py-2.5 text-sm text-white focus:border-[#EC4899]/50 focus:outline-none"
        >
          {COMMON_TIMEZONES.map((tz) => (
            <option key={tz} value={tz} className="bg-zinc-900 text-white">
              {tz.replace(/_/g, " ")}
            </option>
          ))}
        </select>
      </div>
      {!hidePerDay && (
        <div className="space-y-2">
          <Label className="block text-xs uppercase tracking-wider text-gray-500">
            {t("settings.availability.byDay")}
          </Label>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {DAY_KEYS.map((day) => {
              const slots = rules[day] ?? [];
              const closed = slots.length === 0;
              const range = slots[0];
              return (
                <div
                  key={day}
                  className="flex flex-wrap items-center gap-2 rounded-xl border border-white/10 bg-black/30 px-3 py-2.5"
                >
                  <span className="w-9 text-xs font-medium text-gray-300">
                    {t(`settings.availability.days.${day}`)}
                  </span>
                  <ArisaraSwitch
                    checked={!closed}
                    onCheckedChange={(checked) =>
                      setDay(day, !checked, range?.start, range?.end)
                    }
                    disabled={disabled}
                  />
                  <span className="text-xs text-gray-500">
                    {closed ? t("settings.availability.closed") : t("settings.availability.open")}
                  </span>
                  {!closed && (
                    <>
                      <Input
                        type="time"
                        value={range?.start ?? "09:00"}
                        onChange={(e) =>
                          setDay(day, false, e.target.value, range?.end ?? "18:00")
                        }
                        disabled={disabled}
                        className="h-8 w-24 border-white/10 bg-black/40 text-xs"
                      />
                      <span className="text-gray-500">–</span>
                      <Input
                        type="time"
                        value={range?.end ?? "18:00"}
                        onChange={(e) =>
                          setDay(day, false, range?.start ?? "09:00", e.target.value)
                        }
                        disabled={disabled}
                        className="h-8 w-24 border-white/10 bg-black/40 text-xs"
                      />
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default function AvailabilitySection() {
  const { t } = useTranslation();
  const { currentCompany } = useCompany();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [operatorRules, setOperatorRules] = useState<AvailabilityRules>(defaultRules);
  const [operatorTimezone, setOperatorTimezone] = useState(COMMON_TIMEZONES[0]);
  const [agentRules, setAgentRules] = useState<AvailabilityRules>(defaultRules);
  const [agentTimezone, setAgentTimezone] = useState(COMMON_TIMEZONES[0]);
  const [agent24x7, setAgent24x7] = useState(false);
  const [agentOutsideOperatorHours, setAgentOutsideOperatorHours] = useState(false);
  const [schedulingRules, setSchedulingRules] = useState<AvailabilityRules>(defaultRules);
  const [schedulingTimezone, setSchedulingTimezone] = useState(COMMON_TIMEZONES[0]);
  const [slotDurationMinutes, setSlotDurationMinutes] = useState<number>(30);
  const [maxSimultaneousBookings, setMaxSimultaneousBookings] = useState(1);

  useEffect(() => {
    loadAvailability();
  }, [currentCompany?.id]);

  async function loadAvailability() {
    if (!currentCompany) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/v1/platform/availability?company_id=${currentCompany.id}`,
        { headers: getAuthHeaders() }
      );
      if (res.ok) {
        const data = await res.json();
        if (data.operator?.rules) setOperatorRules(data.operator.rules);
        if (data.operator?.timezone) setOperatorTimezone(data.operator.timezone);
        if (data.agent?.rules) {
          setAgentRules(data.agent.rules);
          setAgent24x7(
            DAY_KEYS.every(
              (d) =>
                data.agent.rules[d]?.length === 1 &&
                data.agent.rules[d][0]?.start === "00:00" &&
                data.agent.rules[d][0]?.end === "23:59"
            )
          );
        }
        if (data.agent?.timezone) setAgentTimezone(data.agent.timezone);
        if (data.scheduling?.rules) setSchedulingRules(data.scheduling.rules);
        if (data.scheduling?.timezone) setSchedulingTimezone(data.scheduling.timezone);
        if (typeof data.scheduling?.slot_duration_minutes === "number")
          setSlotDurationMinutes(data.scheduling.slot_duration_minutes);
        if (typeof data.scheduling?.max_simultaneous_bookings_per_slot === "number")
          setMaxSimultaneousBookings(data.scheduling.max_simultaneous_bookings_per_slot);
      }
    } catch (e) {
      console.debug("settings.availability_load_skip", e);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSave() {
    if (!currentCompany) {
      toast({
        title: t("settings.availability.toasts.selectCompany"),
        variant: "destructive",
      });
      return;
    }
    setIsSaving(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/platform/availability`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({
          company_id: currentCompany.id,
          operator: { rules: operatorRules, timezone: operatorTimezone },
          agent: {
            rules: agent24x7
              ? RULES_24X7
              : agentOutsideOperatorHours
                ? computeInverseRules(operatorRules)
                : agentRules,
            timezone: agentOutsideOperatorHours ? operatorTimezone : agentTimezone,
          },
          scheduling: {
            rules: schedulingRules,
            timezone: schedulingTimezone,
            slot_duration_minutes: slotDurationMinutes,
            max_simultaneous_bookings_per_slot: maxSimultaneousBookings,
          },
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || err.message || res.statusText);
      }
      toast({ title: t("settings.availability.toasts.saved") });
      // Recarrega do backend para garantir que o estado local reflita o que foi realmente persistido
      await loadAvailability();
    } catch (e: unknown) {
      console.error("settings.availability_save_error", e);
      toast({
        title: (e instanceof Error ? e.message : null) || t("settings.availability.toasts.saveError"),
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return (
      <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-8">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-white/60" />
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-8 shadow-lg">
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <Clock className="h-5 w-5 text-[#EC4899]" />
          <h2 className="text-xl font-semibold text-white">
            {t("settings.availability.title")}
          </h2>
        </div>
        <p className="text-sm text-gray-400">
          {t("settings.availability.subtitle")}
        </p>
      </div>

      <div className="space-y-8">
        {/* Atendimento humano */}
        <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Users className="h-4 w-4 text-emerald-400" />
            <h3 className="text-sm font-semibold text-white">
              {t("settings.availability.humanTitle")}
            </h3>
          </div>
          <p className="text-xs text-gray-400 mb-4">
            {t("settings.availability.humanDesc")}
          </p>
          <WeekScheduleBlock
            rules={operatorRules}
            onChange={setOperatorRules}
            timezone={operatorTimezone}
            onTimezoneChange={setOperatorTimezone}
            disabled={isSaving}
          />
        </div>

        {/* Atendimento Arisara (agente) */}
        <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Bot className="h-4 w-4 text-[#EC4899]" />
            <h3 className="text-sm font-semibold text-white">
              {t("settings.availability.agentTitle")}
            </h3>
          </div>
          <p className="text-xs text-gray-400 mb-4">
            {t("settings.availability.agentDesc")}
          </p>
          <WeekScheduleBlock
            rules={
              agent24x7
                ? RULES_24X7
                : agentOutsideOperatorHours
                  ? computeInverseRules(operatorRules)
                  : agentRules
            }
            onChange={setAgentRules}
            timezone={agentOutsideOperatorHours ? operatorTimezone : agentTimezone}
            onTimezoneChange={setAgentTimezone}
            disabled={isSaving}
            twentyFourSeven={{
              enabled: agent24x7,
              onToggle: (enabled) => {
                setAgent24x7(enabled);
                if (enabled) {
                  setAgentOutsideOperatorHours(false);
                  setAgentRules(RULES_24X7);
                } else setAgentRules(defaultRules());
              },
            }}
            outsideOperatorHours={{
              enabled: agentOutsideOperatorHours,
              onToggle: (enabled) => {
                setAgentOutsideOperatorHours(enabled);
                if (enabled) {
                  setAgent24x7(false);
                  setAgentRules(computeInverseRules(operatorRules));
                } else setAgentRules(defaultRules());
              },
            }}
          />
        </div>

        {/* Horários para agendamento */}
        <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="h-4 w-4 text-blue-400" />
            <h3 className="text-sm font-semibold text-white">
              {t("settings.availability.schedulingTitle")}
            </h3>
          </div>
          <p className="text-xs text-gray-400 mb-4">
            {t("settings.availability.schedulingDesc")}
          </p>
          <WeekScheduleBlock
            rules={schedulingRules}
            onChange={setSchedulingRules}
            timezone={schedulingTimezone}
            onTimezoneChange={setSchedulingTimezone}
            disabled={isSaving}
          />
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div>
              <Label className="text-xs uppercase tracking-wider text-gray-500">
                {t("settings.availability.slotDuration")}
              </Label>
              <select
                value={slotDurationMinutes}
                onChange={(e) => setSlotDurationMinutes(Number(e.target.value))}
                disabled={isSaving}
                className="mt-1.5 w-full rounded-xl border border-white/10 bg-black/40 px-4 py-2.5 text-sm text-white focus:border-[#EC4899]/50 focus:outline-none"
              >
                {SLOT_DURATION_OPTIONS.map((m) => (
                  <option key={m} value={m} className="bg-zinc-900 text-white">
                    {m} min
                  </option>
                ))}
              </select>
              <p className="mt-1 text-[11px] text-gray-500">
                {t("settings.availability.slotDurationHint")}
              </p>
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wider text-gray-500">
                {t("settings.availability.maxBookings")}
              </Label>
              <Input
                type="number"
                min={MAX_BOOKINGS_MIN}
                max={MAX_BOOKINGS_MAX}
                value={maxSimultaneousBookings}
                onChange={(e) =>
                  setMaxSimultaneousBookings(
                    Math.min(
                      MAX_BOOKINGS_MAX,
                      Math.max(MAX_BOOKINGS_MIN, Number(e.target.value) || 1)
                    )
                  )
                }
                disabled={isSaving}
                className="mt-1.5 w-24 border-white/10 bg-black/40 text-white"
              />
              <p className="mt-1 text-[11px] text-gray-500">
                {t("settings.availability.maxBookingsHint")}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8 flex justify-end">
        <Button
          onClick={handleSave}
          disabled={isSaving || !currentCompany}
          className="gap-2"
        >
          {isSaving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              {t("settings.availability.saving")}
            </>
          ) : (
            t("settings.availability.save")
          )}
        </Button>
      </div>
    </div>
  );
}
