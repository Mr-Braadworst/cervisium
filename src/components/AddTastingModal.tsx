import React, { useState, useEffect } from 'react';
import { Beer, Tasting } from '../types';
import { X, Star, MapPin, Calendar, PlusCircle, CheckCircle, Edit3, Camera, Image as ImageIcon } from 'lucide-react';
import confetti from 'canvas-confetti';
import { getScoreLabel, getScoreColorClass } from './RatingBadge';
import { DatePickerInput } from './DatePickerInput';
import { ConfirmModal } from './ConfirmModal';
import { CameraCaptureModal } from './CameraCaptureModal';
import { validateAndCompressImageFile, safeIsoDate } from '../utils/security';

interface AddTastingModalProps {
  isOpen: boolean;
  beer: Beer | null;
  currentTastings: Tasting[];
  onClose: () => void;
  onSaveTasting: (beerId: string, tasting: Omit<Tasting, 'id' | 'beerId'>) => void;
  onUpdateTasting?: (tastingId: string, tasting: Partial<Tasting>) => void;
  initialTasting?: Tasting;
  prefillDraft?: Partial<Tasting>;
  allLocations?: string[];
}

const LOCATION_SUGGESTIONS = [
  'Thuis',
  'Café / Kroeg',
  'Terras',
  'Proeflokaal',
  'Bij de brouwerij',
  'Restaurant',
  'Bierfestival',
  'Vrienden / Familie',
];

export const AddTastingModal: React.FC<AddTastingModalProps> = ({
  isOpen,
  beer,
  currentTastings,
  onClose,
  onSaveTasting,
  onUpdateTasting,
  initialTasting,
  prefillDraft,
  allLocations = [],
}) => {
  const [rating, setRating] = useState<number>(initialTasting?.rating || prefillDraft?.rating || 8.0);
  const [location, setLocation] = useState(initialTasting?.location || prefillDraft?.location || '');
  const [servingType, setServingType] = useState<'tap' | 'fles' | 'blik' | undefined>(
    initialTasting?.servingType || prefillDraft?.servingType
  );
  const [notes, setNotes] = useState(initialTasting?.notes || prefillDraft?.notes || '');
  const [photoUrl, setPhotoUrl] = useState<string | undefined>(
    initialTasting?.photoUrl || prefillDraft?.photoUrl
  );
  const [date, setDate] = useState(
    initialTasting?.date
      ? initialTasting.date.split('T')[0]
      : prefillDraft?.date
      ? prefillDraft.date.split('T')[0]
      : new Date().toISOString().split('T')[0]
  );
  const [error, setError] = useState<string | null>(null);
  const [cameraModalOpen, setCameraModalOpen] = useState(false);
  const [confirmRemovePhoto, setConfirmRemovePhoto] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (initialTasting) {
        setRating(initialTasting.rating);
        setLocation(initialTasting.location || '');
        setServingType(initialTasting.servingType);
        setNotes(initialTasting.notes || '');
        setPhotoUrl(initialTasting.photoUrl);
        setDate(initialTasting.date ? initialTasting.date.split('T')[0] : new Date().toISOString().split('T')[0]);
      } else if (prefillDraft) {
        setRating(prefillDraft.rating !== undefined ? prefillDraft.rating : 8.0);
        setLocation(prefillDraft.location || '');
        setServingType(prefillDraft.servingType);
        setNotes(prefillDraft.notes || '');
        setPhotoUrl(prefillDraft.photoUrl);
        setDate(prefillDraft.date ? prefillDraft.date.split('T')[0] : new Date().toISOString().split('T')[0]);
      } else {
        setRating(8.0);
        setLocation('');
        setServingType(undefined);
        setNotes('');
        setPhotoUrl(undefined);
        setDate(new Date().toISOString().split('T')[0]);
      }
      setError(null);
    }
  }, [isOpen, initialTasting, prefillDraft]);

  const combinedLocationSuggestions = Array.from(
    new Set([
      ...allLocations.map((l) => l.trim()).filter(Boolean),
      ...LOCATION_SUGGESTIONS,
    ])
  );

  const compressImage = (file: File, maxDimension = 850, quality = 0.82): Promise<string> =>
    validateAndCompressImageFile(file, maxDimension, quality);

  if (!isOpen || !beer) return null;

  const otherTastings = initialTasting
    ? currentTastings.filter((t) => t.id !== initialTasting.id)
    : currentTastings;
  const currentCount = otherTastings.length;
  const currentAvg =
    currentCount > 0
      ? otherTastings.reduce((sum, t) => sum + t.rating, 0) / currentCount
      : 0;

  const projectedAvg =
    (otherTastings.reduce((sum, t) => sum + t.rating, 0) + rating) / (currentCount + 1);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (rating < 1 || rating > 10) {
      setError('Cijfer moet tussen 1 en 10 liggen.');
      return;
    }

    if (rating >= 9.0) {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.7 },
        colors: ['#f59e0b', '#d97706', '#fbbf24', '#ffffff'],
      });
    }

    const isoDate =
      initialTasting?.date && initialTasting.date.split('T')[0] === date
        ? safeIsoDate(initialTasting.date)
        : date === new Date().toISOString().split('T')[0]
        ? new Date().toISOString()
        : safeIsoDate(date);

    if (initialTasting && onUpdateTasting) {
      onUpdateTasting(initialTasting.id, {
        rating,
        location: location.trim(),
        servingType,
        notes: notes.trim(),
        photoUrl,
        date: isoDate,
      });
    } else {
      onSaveTasting(beer.id, {
        rating,
        location: location.trim(),
        servingType,
        notes: notes.trim(),
        photoUrl,
        date: isoDate,
      });
    }

    onClose();
  };

  const scoreColors = getScoreColorClass(rating);

  return (
    <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto overscroll-contain bg-zinc-900 border border-zinc-700/80 rounded-2xl shadow-2xl p-4 sm:p-6 text-zinc-100 my-2 sm:my-4 pb-8 sm:pb-6">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              {initialTasting ? <Edit3 className="w-5 h-5" /> : <PlusCircle className="w-5 h-5" />}
            </div>
            <div>
              <h2 className="text-lg font-bold text-zinc-100">
                {initialTasting ? 'Proefsessie & Score Bewerken' : 'Nog een keer gedronken!'}
              </h2>
              <p className="text-xs text-zinc-400">
                {initialTasting ? (
                  <span>
                    Pas je score, datum of notities aan voor <strong className="text-amber-400">{beer.name}</strong>
                  </span>
                ) : (
                  <span>
                    Voeg een nieuwe beoordeling toe aan <strong className="text-amber-400">{beer.name}</strong>
                  </span>
                )}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mt-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-medium">
            {error}
          </div>
        )}

        {prefillDraft && !initialTasting && (
          <div className="mt-4 p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2 font-medium">
            <CheckCircle className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>
              Overgezet naar Check-in! Je ingevulde gegevens voor <strong>{beer.name}</strong> staan klaar.
            </span>
          </div>
        )}

        {/* Average preview banner */}
        <div className="mt-4 p-3.5 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-between">
          <div>
            <div className="text-[11px] text-zinc-400 font-medium">Huidig gemiddelde ({currentCount}x):</div>
            <div className="text-sm font-bold text-zinc-200">
              {currentCount > 0 ? `${currentAvg.toFixed(1)} / 10` : 'Nog geen scores'}
            </div>
          </div>
          <div className="text-right">
            <div className="text-[11px] text-amber-400 font-medium">Nieuw gemiddelde na opslaan:</div>
            <div className="text-sm font-extrabold text-amber-300 flex items-center gap-1 justify-end">
              <CheckCircle className="w-3.5 h-3.5" />
              {projectedAvg.toFixed(1)} / 10
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Rating */}
          <div className="p-4 rounded-xl bg-zinc-950/80 border border-zinc-800">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-zinc-200 uppercase tracking-wider flex items-center gap-1.5">
                <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                Jouw Cijfer van deze sessie
              </label>
              <div className={`px-2.5 py-0.5 rounded-md text-xs font-bold border ${scoreColors.bg}`}>
                {rating.toFixed(1)} / 10 &bull; {getScoreLabel(rating)}
              </div>
            </div>

            <input
              type="range"
              min="1"
              max="10"
              step="0.1"
              value={rating}
              onChange={(e) => setRating(parseFloat(e.target.value))}
              className="w-full accent-amber-500 cursor-pointer h-2 bg-zinc-800 rounded-lg appearance-none"
            />

            <div className="flex items-center justify-between mt-2 pt-2 border-t border-zinc-800/80">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                <button
                  type="button"
                  key={num}
                  onClick={() => setRating(num)}
                  className={`w-7 h-7 rounded-lg text-xs font-bold transition-all ${
                    Math.round(rating) === num
                      ? 'bg-amber-500 text-zinc-950 shadow-md shadow-amber-500/20 scale-110'
                      : 'bg-zinc-800/60 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700'
                  }`}
                >
                  {num}
                </button>
              ))}
            </div>
          </div>

          {/* Serving Type (Tap / Fles / Blik) */}
          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1.5 flex items-center gap-1.5">
              <span>🍺</span> Hoe geserveerd? <span className="text-zinc-500 font-normal">(tap, fles of blik)</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'tap', label: 'Van de Tap', icon: '🚰' },
                { id: 'fles', label: 'Uit Fles', icon: '🍾' },
                { id: 'blik', label: 'Uit Blik', icon: '🥫' },
              ].map((item) => (
                <button
                  type="button"
                  key={item.id}
                  onClick={() => setServingType(servingType === item.id ? undefined : (item.id as any))}
                  className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border text-xs font-semibold transition-all ${
                    servingType === item.id
                      ? 'bg-amber-500 text-zinc-950 border-amber-400 shadow-md shadow-amber-500/20'
                      : 'bg-zinc-950 text-zinc-300 border-zinc-800 hover:border-zinc-700 hover:text-white'
                  }`}
                >
                  <span>{item.icon}</span>
                  <span>{item.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Photo Upload (Direct met Camera of uit Galerij) */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-zinc-300">
                Foto van deze sessie
              </label>
              {photoUrl && (
                <span className="text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                  ✓ Foto toegevoegd
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Directe Camera-knop (vraagt camera-permissie en opent de live camera) */}
              <button
                type="button"
                onClick={() => setCameraModalOpen(true)}
                className="cursor-pointer flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-300 hover:bg-amber-500/25 hover:border-amber-400 transition-colors text-xs sm:text-sm font-semibold"
              >
                <Camera className="w-4 h-4 text-amber-400" />
                <span>Maak foto</span>
              </button>

              {/* Galerij / Bestand kiezen */}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif,image/avif,image/heic,image/heif,image/*"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  e.target.value = '';
                  if (file) {
                    try {
                      const compressed = await compressImage(file);
                      setPhotoUrl(compressed);
                      setError(null);
                    } catch (err: any) {
                      setError(err?.message || 'Ongeldig afbeeldingsbestand.');
                    }
                  }
                }}
                className="hidden"
                id="tasting-photo-upload"
              />
              <label
                htmlFor="tasting-photo-upload"
                className="cursor-pointer flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-700 text-zinc-300 hover:text-white hover:border-amber-500 transition-colors text-xs sm:text-sm font-medium"
              >
                <ImageIcon className="w-4 h-4 text-zinc-400" />
                <span>Kies uit galerij</span>
              </label>

              {photoUrl && (
                <div className="relative ml-1">
                  <img src={photoUrl} alt="Preview" className="w-16 h-16 rounded-xl object-cover border border-zinc-700" />
                  <button
                    type="button"
                    onClick={() => setConfirmRemovePhoto(true)}
                    className="absolute -top-2 -right-2 bg-rose-500 hover:bg-rose-600 text-white rounded-full p-0.5 transition-colors shadow"
                    title="Foto verwijderen"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Location */}
          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-amber-400" />
              Waar heb je 'm gedronken? <span className="text-zinc-500 font-normal">(locatie)</span>
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="bijv. Bar Brouw Amsterdam, Terras aan het water, Thuis op de bank..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-700 text-zinc-100 placeholder-zinc-500 text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
            />
            {/* Quick Location Pills */}
            <div className="flex items-center gap-1.5 flex-wrap mt-2 max-h-24 overflow-y-auto pr-1">
              {combinedLocationSuggestions.map((loc) => (
                <button
                  type="button"
                  key={loc}
                  onClick={() => setLocation(loc)}
                  className={`text-[11px] px-2 py-0.5 rounded-md border transition-colors ${
                    location === loc
                      ? 'bg-amber-500 text-zinc-950 border-amber-400 font-bold'
                      : 'bg-zinc-950 text-zinc-400 border-zinc-800 hover:text-zinc-200 hover:border-zinc-700'
                  }`}
                >
                  {loc}
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1">
              Proefnotities van deze sessie <span className="text-zinc-500 font-normal">(optioneel)</span>
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Smaakte hij nog beter dan de vorige keer? Vers van de tap, koud geserveerd..."
              className="w-full px-3.5 py-2 rounded-xl bg-zinc-950 border border-zinc-700 text-zinc-100 placeholder-zinc-500 text-sm focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* Date */}
          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-zinc-400" />
              Datum
            </label>
            <DatePickerInput
              value={date}
              onChange={(val) => setDate(val)}
            />
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-400 hover:text-zinc-200"
            >
              Annuleren
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-zinc-950 shadow-md shadow-amber-500/20 transition-all hover:scale-105 active:scale-95"
            >
              {initialTasting ? 'Wijzigingen Opslaan' : 'Beoordeling Opslaan'}
            </button>
          </div>
        </form>
      </div>

      <ConfirmModal
        isOpen={confirmRemovePhoto}
        title="Foto verwijderen?"
        message="Weet je zeker dat je deze foto van de proefsessie wilt verwijderen?"
        onConfirm={() => {
          setPhotoUrl(undefined);
          const input = document.getElementById('tasting-photo-upload') as HTMLInputElement;
          if (input) input.value = '';
        }}
        onCancel={() => setConfirmRemovePhoto(false)}
      />

      <CameraCaptureModal
        isOpen={cameraModalOpen}
        onClose={() => setCameraModalOpen(false)}
        title="Maak foto van je proefsessie"
        onCaptureFile={async (file) => {
          try {
            const compressed = await compressImage(file);
            setPhotoUrl(compressed);
            setError(null);
          } catch (err: any) {
            setError(err?.message || 'Ongeldig afbeeldingsbestand.');
          }
        }}
      />
    </div>
  );
};
