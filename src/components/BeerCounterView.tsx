import React, { useState } from 'react';
import { UserAccount, BeerSession } from '../types';
import { getBeerSessions, addBeerSession, deleteBeerSession } from '../services/storage';
import {
  Plus,
  Minus,
  RotateCcw,
  Save,
  Trash2,
  Calendar,
  Beer as BeerIcon,
  Sparkles,
  Euro,
  Flame,
  Droplets,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { DatePickerInput } from './DatePickerInput';
import { ConfirmModal } from './ConfirmModal';
import { safeIsoDate, clampNumber } from '../utils/security';

interface BeerCounterViewProps {
  activeUser: UserAccount;
  defaultPricePerBeer?: number;
  defaultGlassSizeCl?: number;
}

export const BeerCounterView: React.FC<BeerCounterViewProps> = ({
  activeUser,
  defaultPricePerBeer = 3.8,
  defaultGlassSizeCl = 30,
}) => {
  const [count, setCount] = useState<number>(0);
  const [pricePerBeer, setPricePerBeer] = useState<number>(defaultPricePerBeer);
  const [glassSizeCl, setGlassSizeCl] = useState<number>(defaultGlassSizeCl);
  const [title, setTitle] = useState<string>('Avondje uit / Thuis');
  const [notes, setNotes] = useState<string>('');
  const [sessionDate, setSessionDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [sessions, setSessions] = useState<BeerSession[]>(() => getBeerSessions(activeUser.id));
  const [sessionToDelete, setSessionToDelete] = useState<BeerSession | null>(null);
  const [confirmResetCounter, setConfirmResetCounter] = useState(false);

  const handleIncrement = (val: number) => {
    const newCount = Math.min(500, Math.max(0, count + val));
    setCount(newCount);
    if (newCount > 0 && newCount % 5 === 0) {
      confetti({
        particleCount: 60,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#f59e0b', '#d97706', '#fbbf24', '#ffffff'],
      });
    }
  };

  const handleReset = () => {
    setCount(0);
  };

  const handleSaveSession = (e: React.FormEvent) => {
    e.preventDefault();
    if (count === 0) return;

    const isoDate =
      sessionDate === new Date().toISOString().split('T')[0]
        ? new Date().toISOString()
        : safeIsoDate(sessionDate);

    addBeerSession(activeUser.id, {
      title: title.trim() || 'Bieravond',
      count,
      date: isoDate,
      notes: notes.trim() || undefined,
    });

    setSessions(getBeerSessions(activeUser.id));
    setCount(0);
    setNotes('');
    setSessionDate(new Date().toISOString().split('T')[0]);
    confetti({
      particleCount: 80,
      spread: 80,
      origin: { y: 0.5 },
      colors: ['#f59e0b', '#10b981', '#fbbf24'],
    });
  };

  const handleDeleteSession = (id: string) => {
    deleteBeerSession(activeUser.id, id);
    setSessions(getBeerSessions(activeUser.id));
  };

  const estimatedCost = count * pricePerBeer;
  const totalLiters = (count * glassSizeCl) / 100;
  // Gemiddeld ~45 kcal per 10cl speciaal-/pilsbier
  const estimatedKcal = Math.round(count * (glassSizeCl / 10) * 45);

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="bg-gradient-to-r from-amber-950/60 via-zinc-900 to-zinc-900 border border-amber-500/30 rounded-2xl p-6 sm:p-7 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex items-center gap-3 relative z-10">
          <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/30">
            <BeerIcon className="w-8 h-8" />
          </div>
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-semibold mb-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              Live Bier Counter
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-100 tracking-tight">
              Hoeveel biertjes vanavond?
            </h1>
            <p className="text-xs sm:text-sm text-zinc-400 mt-0.5">
              Tel live je biertjes, bekijk direct de geschatte avondkosten &amp; calorieën en sla je avond op.
            </p>
          </div>
        </div>
      </div>

      {/* Main Counter Widget */}
      <div className="bg-zinc-900/90 border border-zinc-800 rounded-3xl p-6 sm:p-10 shadow-2xl text-center relative">
        <div className="flex flex-col items-center justify-center">
          <span className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-2">
            Huidige Avond Totaal
          </span>
          <div className="text-7xl sm:text-9xl font-black text-amber-400 tracking-tighter drop-shadow-[0_10px_20px_rgba(245,158,11,0.2)] my-2">
            {count}
          </div>
          <span className="text-sm font-medium text-zinc-400 mb-6">
            {count === 1 ? 'biertje gedronken' : 'biertjes gedronken'}
          </span>

          {/* Big Controls */}
          <div className="flex items-center justify-center gap-4 sm:gap-6 mb-6">
            <button
              type="button"
              onClick={() => handleIncrement(-1)}
              disabled={count === 0}
              className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 disabled:hover:bg-zinc-800 text-zinc-200 flex items-center justify-center transition-all shadow-lg active:scale-95"
              title="Min 1"
            >
              <Minus className="w-8 h-8 stroke-[3]" />
            </button>

            <button
              type="button"
              onClick={() => handleIncrement(1)}
              className="w-24 h-24 sm:w-32 sm:h-32 rounded-3xl bg-amber-500 hover:bg-amber-400 text-zinc-950 flex items-center justify-center transition-all shadow-xl shadow-amber-500/30 active:scale-95 hover:scale-105"
              title="Plus 1"
            >
              <Plus className="w-12 h-12 sm:w-16 sm:h-16 stroke-[3]" />
            </button>

            <button
              type="button"
              onClick={() => setConfirmResetCounter(true)}
              disabled={count === 0}
              className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 disabled:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 flex items-center justify-center transition-all shadow-lg active:scale-95"
              title="Reset op 0"
            >
              <RotateCcw className="w-7 h-7" />
            </button>
          </div>

          {/* Quick Add Pills */}
          <div className="flex items-center justify-center gap-2 sm:gap-3 mb-8 flex-wrap">
            <button
              type="button"
              onClick={() => handleIncrement(2)}
              className="px-4 py-2 rounded-xl bg-zinc-950 border border-zinc-700 text-xs font-bold text-zinc-300 hover:border-amber-500 hover:text-amber-400 transition-colors"
            >
              +2 Rondje
            </button>
            <button
              type="button"
              onClick={() => handleIncrement(3)}
              className="px-4 py-2 rounded-xl bg-zinc-950 border border-zinc-700 text-xs font-bold text-zinc-300 hover:border-amber-500 hover:text-amber-400 transition-colors"
            >
              +3
            </button>
            <button
              type="button"
              onClick={() => handleIncrement(5)}
              className="px-4 py-2 rounded-xl bg-zinc-950 border border-zinc-700 text-xs font-bold text-zinc-300 hover:border-amber-500 hover:text-amber-400 transition-colors"
            >
              +5 Flesjes
            </button>
          </div>

          {/* Live Stats Row: Kosten, Calorieën & Volume */}
          <div className="w-full max-w-2xl grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6 text-left">
            {/* Geschatte Kosten */}
            <div className="p-4 rounded-2xl bg-zinc-950/90 border border-zinc-800 flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs text-zinc-400 mb-1">
                <span>Geschatte Kosten</span>
                <Euro className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-2xl font-black text-emerald-400">
                &euro;{estimatedCost.toFixed(2).replace('.', ',')}
              </div>
              <div className="mt-2 pt-2 border-t border-zinc-800/80 flex items-center justify-between text-[11px] text-zinc-400">
                <span>Prijs per glas:</span>
                <div className="flex items-center gap-1">
                  <span>&euro;</span>
                  <input
                    type="number"
                    step="0.25"
                    min="0.5"
                    max="25"
                    value={pricePerBeer}
                    onChange={(e) => setPricePerBeer(clampNumber(e.target.value, 0, 100, 0))}
                    className="w-14 px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-700 text-zinc-200 text-right font-bold text-[11px]"
                  />
                </div>
              </div>
            </div>

            {/* Calorieën */}
            <div className="p-4 rounded-2xl bg-zinc-950/90 border border-zinc-800 flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs text-zinc-400 mb-1">
                <span>Calorieën</span>
                <Flame className="w-4 h-4 text-amber-400" />
              </div>
              <div className="text-2xl font-black text-amber-400">
                {estimatedKcal} <span className="text-xs font-semibold text-zinc-400">kcal</span>
              </div>
              <div className="mt-2 pt-2 border-t border-zinc-800/80 text-[11px] text-zinc-500">
                Op basis van ~{Math.round((glassSizeCl / 10) * 45)} kcal per glas ({glassSizeCl}cl)
              </div>
            </div>

            {/* Volume & Glasformaat */}
            <div className="p-4 rounded-2xl bg-zinc-950/90 border border-zinc-800 flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs text-zinc-400 mb-1">
                <span>Totaal Volume</span>
                <Droplets className="w-4 h-4 text-sky-400" />
              </div>
              <div className="text-2xl font-black text-sky-400">
                {totalLiters.toFixed(2).replace('.', ',')} <span className="text-xs font-semibold text-zinc-400">liter</span>
              </div>
              <div className="mt-2 pt-2 border-t border-zinc-800/80 flex items-center justify-between text-[11px] text-zinc-400">
                <span>Formaat:</span>
                <div className="flex items-center gap-1">
                  {[25, 30, 33, 50].map((cl) => (
                    <button
                      key={cl}
                      type="button"
                      onClick={() => setGlassSizeCl(cl)}
                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        glassSizeCl === cl
                          ? 'bg-amber-500 text-zinc-950'
                          : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      {cl}cl
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Save Session Form */}
          {count > 0 && (
            <form
              onSubmit={handleSaveSession}
              className="w-full max-w-md bg-zinc-950/80 border border-zinc-800 rounded-2xl p-5 space-y-4 text-left shadow-lg"
            >
              <h3 className="text-sm font-bold text-zinc-200 flex items-center gap-2">
                <Save className="w-4 h-4 text-amber-400" />
                Sla deze avond op in je historie
              </h3>
              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1">Gelegenheid / Titel</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="bijv. Vrijdagmiddagborrel, Verjaardag..."
                  className="w-full px-3.5 py-2 rounded-xl bg-zinc-900 border border-zinc-700 text-zinc-100 text-xs focus:outline-none focus:border-amber-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1">Notities (optioneel)</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="bijv. Speciaalbieren in de kroeg..."
                  className="w-full px-3.5 py-2 rounded-xl bg-zinc-900 border border-zinc-700 text-zinc-100 text-xs focus:outline-none focus:border-amber-500"
                />
              </div>
              <div className="flex items-center justify-between pt-1">
                <label className="text-xs font-semibold text-zinc-400">Datum:</label>
                <DatePickerInput
                  value={sessionDate}
                  onChange={(val) => setSessionDate(val)}
                />
              </div>
              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-bold shadow-md shadow-amber-500/20 transition-all"
              >
                Sla {count} {count === 1 ? 'Biertje' : 'Biertjes'} Op
              </button>
            </form>
          )}
        </div>
      </div>

      {/* Sessions History */}
      <div className="bg-zinc-900/90 border border-zinc-800 rounded-3xl p-6 sm:p-7 shadow-xl">
        <h3 className="text-base font-bold text-zinc-100 mb-4 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-amber-400" />
          Eerdere Avonden &amp; Historie ({sessions.length})
        </h3>

        {sessions.length === 0 ? (
          <div className="py-12 text-center text-zinc-500 text-xs">
            Nog geen opgeslagen avonden. Tel je biertjes en sla je sessie op!
          </div>
        ) : (
          <div className="space-y-3">
            {[...sessions].reverse().map((sess) => (
              <div
                key={sess.id}
                className="p-4 rounded-2xl bg-zinc-950/70 border border-zinc-800 flex items-center justify-between gap-4"
              >
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-bold text-zinc-100">{sess.title}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 font-extrabold border border-amber-500/20">
                      {sess.count} {sess.count === 1 ? 'bier' : 'bieren'}
                    </span>
                  </div>
                  <div className="text-[11px] text-zinc-500 flex items-center gap-2">
                    <span>
                      {new Date(sess.date).toLocaleDateString('nl-NL', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}
                    </span>
                    {sess.notes && <span>&bull; {sess.notes}</span>}
                  </div>
                </div>

                <button
                  onClick={() => setSessionToDelete(sess)}
                  className="p-2 rounded-xl text-zinc-500 hover:text-rose-400 hover:bg-zinc-900 transition-colors"
                  title="Verwijderen"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <ConfirmModal
        isOpen={!!sessionToDelete}
        title="Bieravond verwijderen?"
        message={
          sessionToDelete
            ? `Weet je zeker dat je de opgeslagen avond "${sessionToDelete.title}" (${sessionToDelete.count} bieren) definitief wilt verwijderen?`
            : ''
        }
        onConfirm={() => {
          if (sessionToDelete) {
            handleDeleteSession(sessionToDelete.id);
          }
        }}
        onCancel={() => setSessionToDelete(null)}
      />

      <ConfirmModal
        isOpen={confirmResetCounter}
        title="Teller op 0 zetten?"
        message={`Weet je zeker dat je de huidige teller (${count} ${count === 1 ? 'biertje' : 'biertjes'}) wilt resetten naar 0?`}
        confirmLabel="Ja, teller resetten"
        onConfirm={handleReset}
        onCancel={() => setConfirmResetCounter(false)}
      />
    </div>
  );
};
