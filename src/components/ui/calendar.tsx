"use client";

import * as React from "react";
import { DayPicker } from "react-day-picker";
import { es } from "react-day-picker/locale";
import "react-day-picker/style.css";

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

export function Calendar({
  className = "",
  classNames,
  showOutsideDays = true,
  locale = es,
  ...props
}: CalendarProps) {
  return (
    <div className={`p-3 bg-white rounded-xl border border-slate-200 shadow-xl inline-block ${className}`}>
      <DayPicker
        locale={locale}
        showOutsideDays={showOutsideDays}
        classNames={classNames}
        {...props}
      />
    </div>
  );
}
