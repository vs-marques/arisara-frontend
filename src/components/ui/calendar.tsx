import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker, useDayPicker, CaptionProps } from "react-day-picker";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

function CalendarCaption(props: CaptionProps) {
  const { goToMonth, locale } = useDayPicker();
  const { displayMonth } = props;

  const currentYear = displayMonth.getFullYear();
  const currentMonth = displayMonth.getMonth();

  // Generate years (1900 to current year + 10)
  const years = Array.from(
    { length: new Date().getFullYear() + 10 - 1900 + 1 },
    (_, i) => 1900 + i
  ).reverse();

  // Generate months
  const months = Array.from({ length: 12 }, (_, i) => i);

  const handleMonthChange = (monthIndex: string) => {
    const newDate = new Date(currentYear, parseInt(monthIndex), 1);
    goToMonth(newDate);
  };

  const handleYearChange = (year: string) => {
    const newDate = new Date(parseInt(year), currentMonth, 1);
    goToMonth(newDate);
  };

  return (
    <div className="flex items-center justify-center gap-3 mb-4">
      <Select value={currentMonth.toString()} onValueChange={handleMonthChange}>
        <SelectTrigger className="w-[140px] h-8 bg-white/5 border-white/10 text-white hover:bg-white/10">
          <SelectValue>
            {format(new Date(currentYear, currentMonth, 1), "MMMM", {
              locale: locale || ptBR,
            })}
          </SelectValue>
        </SelectTrigger>
        <SelectContent className="bg-[#0f0f10] border-white/10">
          {months.map((monthIndex) => (
            <SelectItem
              key={monthIndex}
              value={monthIndex.toString()}
              className="text-white focus:bg-white/10"
            >
              {format(new Date(currentYear, monthIndex, 1), "MMMM", {
                locale: locale || ptBR,
              })}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={currentYear.toString()} onValueChange={handleYearChange}>
        <SelectTrigger className="w-[100px] h-8 bg-white/5 border-white/10 text-white hover:bg-white/10">
          <SelectValue>{currentYear}</SelectValue>
        </SelectTrigger>
        <SelectContent className="bg-[#0f0f10] border-white/10 max-h-[200px]">
          {years.map((year) => (
            <SelectItem
              key={year}
              value={year.toString()}
              className="text-white focus:bg-white/10"
            >
              {year}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-4", className)}
      classNames={{
        months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
        month: "space-y-4",
        caption: "flex justify-center pt-1 relative items-center mb-4",
        caption_label: "hidden",
        nav: "hidden",
        nav_button: cn(
          buttonVariants({ variant: "ghost" }),
          "h-8 w-8 p-0 bg-white/5 border border-white/10 text-white hover:bg-white/10 hover:text-white rounded-lg transition-colors"
        ),
        nav_button_previous: "absolute left-0",
        nav_button_next: "absolute right-0",
        table: "w-full border-collapse",
        head_row: "hidden",
        head_cell: "hidden",
        row: "flex w-full mt-1",
        cell: "h-9 w-9 text-center text-sm p-0 relative focus-within:relative focus-within:z-20",
        day: cn(
          buttonVariants({ variant: "ghost" }),
          "h-9 w-9 p-0 font-normal text-white hover:bg-white/10 hover:text-white rounded-lg transition-colors aria-selected:opacity-100"
        ),
        day_range_end: "day-range-end",
        day_selected:
          "bg-[#EC4899] text-white hover:bg-[#EC4899]/90 hover:text-white focus:bg-[#EC4899] focus:text-white font-semibold",
        day_today:
          "bg-white/10 text-white font-semibold border border-white/20",
        day_outside:
          "text-gray-500 opacity-40 aria-selected:bg-white/5 aria-selected:text-gray-400 aria-selected:opacity-30",
        day_disabled:
          "text-gray-600 opacity-30 cursor-not-allowed hover:bg-transparent hover:text-gray-600",
        day_range_middle: "aria-selected:bg-white/10 aria-selected:text-white",
        day_hidden: "invisible",
        ...classNames,
      }}
      components={{
        IconLeft: ({ ..._props }) => <ChevronLeft className="h-4 w-4" />,
        IconRight: ({ ..._props }) => <ChevronRight className="h-4 w-4" />,
        Caption: CalendarCaption,
      }}
      {...props}
    />
  );
}
Calendar.displayName = "Calendar";

export { Calendar };
