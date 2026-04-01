"use client"

import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { addMonths, format } from "date-fns"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

interface CalendarPlannerProps {
  value?: Date
  onChange?: (date: Date) => void
  className?: string
  yearRange?: [number, number]
}

export function CalendarPlanner({
  value,
  onChange,
  className,
  yearRange = [2000, 2040],
}: CalendarPlannerProps) {
  const [mode, setMode] = React.useState<"month" | "year">("month")
  const [cursor, setCursor] = React.useState<Date>(value ?? new Date())

  const selectMonth = (year: number, month: number) => {
    const d = new Date(year, month, 1)
    onChange?.(d)
    setCursor(d)
  }

  const prev = () => {
    if (mode === "month") setCursor(addMonths(cursor, -1))
    else {
      const c = new Date(cursor)
      c.setFullYear(c.getFullYear() - 12)
      setCursor(c)
    }
  }

  const next = () => {
    if (mode === "month") setCursor(addMonths(cursor, 1))
    else {
      const c = new Date(cursor)
      c.setFullYear(c.getFullYear() + 12)
      setCursor(c)
    }
  }

  const renderMonthGrid = (year: number) => {
    const months = Array.from({ length: 12 }, (_, i) => i)
    const selectedYear = value?.getFullYear()
    const selectedMonth = value?.getMonth()

    return (
      <div className="grid grid-cols-3 gap-2">
        {months.map((m) => {
          const isSelected = selectedYear === year && selectedMonth === m
          const baseDate = new Date(year, m, 1)
          return (
            <button
              key={m}
              type="button"
              onClick={() => selectMonth(year, m)}
              className={cn(
                "h-9 rounded-xl border text-xs font-medium transition-colors",
                "bg-background/80 text-muted-foreground hover:bg-pink-500/10 hover:text-pink-200 hover:border-pink-500/40",
                isSelected &&
                  "border-pink-500 bg-pink-500 text-white hover:bg-pink-500/90 hover:text-white"
              )}
            >
              {format(baseDate, "MMM")}
            </button>
          )
        })}
      </div>
    )
  }

  const renderYearGrid = () => {
    const cy = cursor.getFullYear()
    const startBlock = Math.floor((cy - yearRange[0]) / 12) * 12 + yearRange[0]
    const years = Array.from({ length: 12 }, (_, i) => startBlock + i).filter(
      (y) => y >= yearRange[0] && y <= yearRange[1]
    )

    return (
      <div className="grid grid-cols-3 gap-2">
        {years.map((y) => (
          <button
            key={y}
            type="button"
            onClick={() => {
              const n = new Date(cursor)
              n.setFullYear(y)
              setCursor(n)
              setMode("month")
              onChange?.(n)
            }}
            className={cn(
              "h-9 rounded-xl border text-xs font-medium transition-colors",
              y === cy
                ? "bg-pink-500 text-white border-pink-500"
                : "bg-background/80 text-muted-foreground hover:bg-pink-500/10 hover:text-pink-200 hover:border-pink-500/40"
            )}
          >
            {y}
          </button>
        ))}
      </div>
    )
  }

  return (
    <div
      className={cn(
        "w-72 rounded-2xl border border-white/10 bg-black/90 p-4 shadow-xl",
        className
      )}
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={prev}
          className="h-7 w-7 text-pink-300 hover:bg-pink-500/20 hover:text-pink-100"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <button
          type="button"
          className="text-sm font-semibold text-pink-200 hover:underline"
          onClick={() => setMode(mode === "month" ? "year" : "month")}
        >
          {mode === "month"
            ? format(cursor, "MMMM yyyy")
            : cursor.getFullYear()}
        </button>
        <Button
          variant="ghost"
          size="icon"
          onClick={next}
          className="h-7 w-7 text-pink-300 hover:bg-pink-500/20 hover:text-pink-100"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {mode === "month" ? renderMonthGrid(cursor.getFullYear()) : renderYearGrid()}
    </div>
  )
}
