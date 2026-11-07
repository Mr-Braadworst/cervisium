import React, { useState, useEffect, useRef } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';

interface DatePickerInputProps {
  value: string; // YYYY-MM-DD
  onChange: (value: string) => void;
  className?: string;
}

const MONTHS_NL = [
  'Januari', 'Februari', 'Maart', 'April', 'Mei', 'Juni',
  'Juli', 'Augustus', 'September', 'Oktober', 'November', 'December'
];

const DAYS_NL = ['Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za', 'Zo'];

function formatToDisplay(isoDate: string): string {
  if (!isoDate) return '';
  const cleanIso = isoDate.split('T')[0];
  const parts = cleanIso.split('-');
  if (parts.length === 3 && parts[0].length === 4) {
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  }
  return cleanIso;
}

function parseUserTypedDate(input: string): string | null {
  const cleaned = input.trim().replace(/\//g, '-').replace(/\./g, '-');

  // Match DD-MM-YYYY or D-M-YYYY
  const dmyMatch = cleaned.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (dmyMatch) {
    const day = dmyMatch[1].padStart(2, '0');
    const month = dmyMatch[2].padStart(2, '0');
    const year = dmyMatch[3];
    const numDay = parseInt(day, 10);
    const numMonth = parseInt(month, 10);
    if (numMonth >= 1 && numMonth <= 12 && numDay >= 1 && numDay <= 31) {
      return `${year}-${month}-${day}`;
    }
  }

  // Match DD-MM-YY (2-digit year)
  const dmyShortMatch = cleaned.match(/^(\d{1,2})-(\d{1,2})-(\d{2})$/);
  if (dmyShortMatch) {
    const day = dmyShortMatch[1].padStart(2, '0');
    const month = dmyShortMatch[2].padStart(2, '0');
    const shortYear = parseInt(dmyShortMatch[3], 10);
    const year = shortYear >= 70 ? `19${dmyShortMatch[3]}` : `20${dmyShortMatch[3]}`;
    const numDay = parseInt(day, 10);
    const numMonth = parseInt(month, 10);
    if (numMonth >= 1 && numMonth <= 12 && numDay >= 1 && numDay <= 31) {
      return `${year}-${month}-${day}`;
    }
  }

  // Match 8 digits directly (DDMMYYYY)
  const digitsOnly = cleaned.match(/^(\d{2})(\d{2})(\d{4})$/);
  if (digitsOnly) {
    const day = digitsOnly[1];
    const month = digitsOnly[2];
    const year = digitsOnly[3];
    const numDay = parseInt(day, 10);
    const numMonth = parseInt(month, 10);
    if (numMonth >= 1 && numMonth <= 12 && numDay >= 1 && numDay <= 31) {
      return `${year}-${month}-${day}`;
    }
  }

  // Match YYYY-MM-DD
  const ymdMatch = cleaned.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (ymdMatch) {
    const year = ymdMatch[1];
    const month = ymdMatch[2].padStart(2, '0');
    const day = ymdMatch[3].padStart(2, '0');
    const numDay = parseInt(day, 10);
    const numMonth = parseInt(month, 10);
    if (numMonth >= 1 && numMonth <= 12 && numDay >= 1 && numDay <= 31) {
      return `${year}-${month}-${day}`;
    }
  }
  return null;
}

export const DatePickerInput: React.FC<DatePickerInputProps> = ({
  value,
  onChange,
  className = '',
}) => {
  const [textValue, setTextValue] = useState(() => formatToDisplay(value));
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const cleanValue = value ? value.split('T')[0] : '';
  const initialDate = cleanValue ? new Date(cleanValue + 'T12:00:00') : new Date();
  const validInitial = !isNaN(initialDate.getTime()) ? initialDate : new Date();
  const [viewYear, setViewYear] = useState(validInitial.getFullYear());
  const [viewMonth, setViewMonth] = useState(validInitial.getMonth());

  useEffect(() => {
    setTextValue(formatToDisplay(value));
    if (value) {
      const d = new Date(value.split('T')[0] + 'T12:00:00');
      if (!isNaN(d.getTime())) {
        setViewYear(d.getFullYear());
        setViewMonth(d.getMonth());
      }
    }
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    setTextValue(raw);
    const parsed = parseUserTypedDate(raw);
    if (parsed) {
      onChange(parsed);
    }
  };

  const handleTextBlur = () => {
    const parsed = parseUserTypedDate(textValue);
    if (parsed) {
      onChange(parsed);
      setTextValue(formatToDisplay(parsed));
    } else {
      setTextValue(formatToDisplay(value));
    }
  };

  const handleSelectDay = (day: number) => {
    const m = String(viewMonth + 1).padStart(2, '0');
    const d = String(day).padStart(2, '0');
    const iso = `${viewYear}-${m}-${d}`;
    onChange(iso);
    setTextValue(formatToDisplay(iso));
    setIsOpen(false);
  };

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const handleSelectToday = () => {
    const now = new Date();
    const iso = now.toISOString().split('T')[0];
    onChange(iso);
    setTextValue(formatToDisplay(iso));
    setIsOpen(false);
  };

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayRaw = new Date(viewYear, viewMonth, 1).getDay();
  const startOffset = (firstDayRaw + 6) % 7;

  const selectedParts = cleanValue ? cleanValue.split('-').map(Number) : [];
  const isSelected = (day: number) =>
    selectedParts.length === 3 &&
    selectedParts[0] === viewYear &&
    selectedParts[1] === viewMonth + 1 &&
    selectedParts[2] === day;

  const today = new Date();
  const isToday = (day: number) =>
    today.getFullYear() === viewYear &&
    today.getMonth() === viewMonth &&
    today.getDate() === day;

  return (
    <div ref={containerRef} className={`relative inline-flex items-center ${className}`}>
      <div className="relative flex items-center">
        <input
          type="text"
          inputMode="numeric"
          value={textValue}
          onChange={handleTextChange}
          onBlur={handleTextBlur}
          placeholder="DD-MM-JJJJ"
          className="w-36 pl-3 pr-9 py-2 rounded-xl bg-zinc-950 border border-zinc-700 text-xs font-medium text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
        />
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="absolute right-1.5 p-1.5 rounded-lg text-amber-400 hover:bg-zinc-800 transition-colors"
          title="Open kalender"
        >
          <CalendarIcon className="w-4 h-4" />
        </button>
      </div>

      {isOpen && (
        <div className="absolute bottom-full left-0 mb-2 z-50 w-64 p-3.5 rounded-2xl bg-zinc-900 border border-zinc-700 shadow-2xl text-zinc-100">
          {/* Month / Year Navigation */}
          <div className="flex items-center justify-between mb-3">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-bold text-zinc-100">
              {MONTHS_NL[viewMonth]} {viewYear}
            </span>
            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Day Headers */}
          <div className="grid grid-cols-7 gap-1 text-center mb-1">
            {DAYS_NL.map((d) => (
              <span key={d} className="text-[10px] font-bold text-zinc-500 py-0.5">
                {d}
              </span>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1 text-center">
            {Array.from({ length: startOffset }).map((_, i) => (
              <div key={`empty-${i}`} />
            ))}
            {Array.from({ length: daysInMonth }).map((_, idx) => {
              const day = idx + 1;
              const selected = isSelected(day);
              const todayHighlight = isToday(day);
              return (
                <button
                  type="button"
                  key={day}
                  onClick={() => handleSelectDay(day)}
                  className={`h-7 w-7 rounded-lg text-xs font-semibold flex items-center justify-center transition-all ${
                    selected
                      ? 'bg-amber-500 text-zinc-950 font-bold shadow-md shadow-amber-500/20'
                      : todayHighlight
                      ? 'border border-amber-500/60 text-amber-400 hover:bg-zinc-800'
                      : 'text-zinc-200 hover:bg-zinc-800'
                  }`}
                >
                  {day}
                </button>
              );
            })}
          </div>

          {/* Footer Quick Actions */}
          <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-zinc-800">
            <button
              type="button"
              onClick={handleSelectToday}
              className="text-[11px] font-bold text-amber-400 hover:text-amber-300"
            >
              Vandaag kiezen
            </button>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-[11px] font-semibold text-zinc-400 hover:text-zinc-200"
            >
              Sluiten
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
