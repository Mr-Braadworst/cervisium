import React, { useState } from 'react';
import { Beer, Category, Tasting } from '../types';
import { RatingBadge } from './RatingBadge';
import { PhotoLightboxModal } from './PhotoLightboxModal';
import { ConfirmModal } from './ConfirmModal';
import {
  X,
  Beer as BeerIcon,
  Calendar,
  Heart,
  Edit3,
  Trash2,
  Building2,
  MapPin,
  PlusCircle,
  Clock,
  Maximize2,
  Sliders,
} from 'lucide-react';

interface BeerDetailModalProps {
  beer: Beer | null;
  tastings: Tasting[];
  category?: Category;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (beer: Beer) => void;
  onDelete: (beerId: string) => void;
  onToggleFavorite: (beer: Beer) => void;
  onOpenAddTasting: (beer: Beer) => void;
  onDeleteTasting?: (tastingId: string) => void;
  onEditTasting?: (tasting: Tasting) => void;
  onUpdatePhotoPosition?: (beerId: string, position: string, zoom?: number, newPhotoUrl?: string) => void;
  readOnly?: boolean;
}

export const BeerDetailModal: React.FC<BeerDetailModalProps> = ({
  beer,
  tastings,
  category,
  isOpen,
  onClose,
  onEdit,
  onDelete,
  onToggleFavorite,
  onOpenAddTasting,
  onDeleteTasting,
  onEditTasting,
  onUpdatePhotoPosition,
  readOnly = false,
}) => {
  const [showLightbox, setShowLightbox] = useState(false);
  const [confirmDeleteBeer, setConfirmDeleteBeer] = useState(false);
  const [tastingToDelete, setTastingToDelete] = useState<Tasting | null>(null);

  if (!isOpen || !beer) return null;

  const catColor = category?.color || '#f59e0b';

  // Calculate average rating across all tastings for this beer
  const avgRating =
    tastings.length > 0
      ? tastings.reduce((acc, t) => acc + t.rating, 0) / tastings.length
      : 0;

  // Sorted tastings (newest first)
  const sortedTastings = [...tastings].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  const heroPhoto = beer.photoUrl || sortedTastings.find((t) => t.photoUrl)?.photoUrl;
  const photoPos = beer.photoPosition || '50% 50%';
  const photoZoom = beer.photoZoom || 1.0;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
        <div className="relative w-full max-w-xl bg-zinc-900 border border-zinc-700/80 rounded-2xl shadow-2xl p-6 sm:p-7 text-zinc-100 my-8">
          {/* Top actions */}
          <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
            <div className="flex items-center gap-2">
              <span
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border"
                style={{
                  backgroundColor: `${catColor}18`,
                  borderColor: `${catColor}40`,
                  color: catColor,
                }}
              >
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: catColor }} />
                {category?.name || 'Onbekende categorie'}
              </span>

              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-zinc-800 text-zinc-300 border border-zinc-700">
                <BeerIcon className="w-3.5 h-3.5 text-amber-400" />
                {beer.abv.toFixed(1)}% ABV
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => onToggleFavorite(beer)}
                className={`p-2 rounded-xl border transition-colors ${
                  beer.favorite
                    ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                    : 'bg-zinc-800/80 text-zinc-400 border-zinc-700 hover:text-zinc-200'
                }`}
                title={beer.favorite ? 'Verwijder favoriet' : 'Favoriet maken'}
              >
                <Heart className={`w-4 h-4 ${beer.favorite ? 'text-rose-500 fill-rose-500' : ''}`} />
              </button>
              <button
                onClick={onClose}
                className="p-2 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Hero title & Average Rating */}
          <div className="mt-5 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            {heroPhoto && (
              <div className="flex flex-col items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowLightbox(true)}
                  className="relative w-24 h-24 rounded-2xl overflow-hidden border-2 border-zinc-700 hover:border-amber-400 group shadow-md transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-amber-500"
                  title="Klik om de foto in volledige grootte te zien of te positioneren"
                >
                  <img
                    src={heroPhoto}
                    alt={beer.name}
                    className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
                    style={{
                      objectPosition: photoPos,
                      transform: photoZoom > 1 ? `scale(${photoZoom})` : undefined,
                      transformOrigin: photoPos,
                    }}
                  />
                  {/* Hover visual overlay */}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white transition-opacity gap-1">
                    <Maximize2 className="w-5 h-5 drop-shadow text-amber-300" />
                    <span className="text-[10px] font-extrabold text-amber-200 drop-shadow">
                      Vergroten
                    </span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setShowLightbox(true)}
                  className="inline-flex items-center gap-1 text-[10px] text-amber-400 hover:text-amber-300 font-semibold transition-colors"
                >
                  <Sliders className="w-3 h-3" />
                  <span>Positioneer foto</span>
                </button>
              </div>
            )}
            <div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-zinc-100 tracking-tight">
                {beer.name}
              </h2>
              <div className="flex items-center gap-2 text-zinc-400 mt-1.5 text-sm font-medium">
                <Building2 className="w-4 h-4 text-amber-500" />
                <span>{beer.brewery ? beer.brewery : 'Geen brouwerij opgegeven'}</span>
              </div>
            <div className="flex items-center gap-1.5 text-xs text-zinc-500 mt-1">
              <Clock className="w-3.5 h-3.5 text-zinc-600" />
              <span>
                {tastings.length === 1
                  ? '1x gedronken'
                  : `${tastings.length}x gedronken`}
              </span>
            </div>
          </div>

          <div className="shrink-0 flex flex-col items-center">
            <RatingBadge rating={avgRating} size="lg" showLabel />
            <span className="text-[10px] text-zinc-400 mt-1 font-medium">
              Gemiddelde score
            </span>
          </div>
        </div>

        {/* Primary CTA: "Drink Again" / Add Tasting button */}
        <div className="mt-5">
          <button
            onClick={() => onOpenAddTasting(beer)}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-zinc-950 font-bold text-sm shadow-lg shadow-amber-500/20 transition-all hover:scale-[1.01] active:scale-[0.99]"
          >
            <PlusCircle className="w-4 h-4 stroke-[2.5]" />
            Nog een keer gedronken? Opnieuw ranken &amp; locatie toevoegen
          </button>
        </div>

        {/* Tastings History List with locations */}
        <div className="mt-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-amber-400" />
              Proefgeschiedenis &amp; Locaties ({tastings.length})
            </h3>
            <span className="text-[11px] text-zinc-500">Nieuwste eerst</span>
          </div>

          {sortedTastings.length === 0 ? (
            <div className="p-4 text-center text-xs text-zinc-500 bg-zinc-950/40 rounded-xl border border-zinc-800">
              Nog geen proefsessies geregistreerd.
            </div>
          ) : (
            <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
              {sortedTastings.map((tasting, idx) => (
                <div
                  key={tasting.id}
                  className="p-3.5 rounded-xl bg-zinc-950/70 border border-zinc-800/80 hover:border-zinc-700 transition-colors space-y-1.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <RatingBadge rating={tasting.rating} size="sm" />
                      {tasting.servingType && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-zinc-800 text-zinc-300 border border-zinc-700 text-xs font-medium">
                          {tasting.servingType === 'tap' ? '🚰 Tap' : tasting.servingType === 'fles' ? '🍾 Fles' : '🥫 Blik'}
                        </span>
                      )}
                      {tasting.location ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-300 border border-amber-500/20 text-xs font-medium">
                          <MapPin className="w-3 h-3 text-amber-400" />
                          {tasting.location}
                        </span>
                      ) : (
                        <span className="text-[11px] text-zinc-500 italic">Geen locatie</span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-zinc-500">
                        {new Date(tasting.date).toLocaleDateString('nl-NL', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </span>
                      {onEditTasting && (
                        <button
                          onClick={() => onEditTasting(tasting)}
                          className="p-1 text-zinc-500 hover:text-amber-400 transition-colors"
                          title="Tasting bewerken"
                        >
                          <Edit3 className="w-3 h-3" />
                        </button>
                      )}
                      {onDeleteTasting && sortedTastings.length > 1 && (
                        <button
                          onClick={() => setTastingToDelete(tasting)}
                          className="p-1 text-zinc-500 hover:text-rose-400 transition-colors"
                          title="Tasting verwijderen"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>

                  {tasting.notes && (
                    <p className="text-xs text-zinc-300 italic pt-1 border-t border-zinc-800/60 leading-relaxed">
                      &ldquo;{tasting.notes}&rdquo;
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="mt-6 pt-4 border-t border-zinc-800 flex items-center justify-between">
          <button
            onClick={() => setConfirmDeleteBeer(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            Bier Verwijderen
          </button>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => {
                onClose();
                onEdit(beer);
              }}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-zinc-800 hover:bg-zinc-700 text-amber-300 border border-zinc-700 transition-colors"
            >
              <Edit3 className="w-4 h-4" />
              Bewerken
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-zinc-800 text-zinc-300 hover:text-white"
            >
              Sluiten
            </button>
          </div>
        </div>
      </div>
    </div>

    {/* Full-Size Photo Lightbox & Interactive Positioner */}
    {heroPhoto && (
      <PhotoLightboxModal
        isOpen={showLightbox}
        onClose={() => setShowLightbox(false)}
        photoUrl={heroPhoto}
        title={beer.name}
        subtitle={beer.brewery || category?.name}
        initialPosition={beer.photoPosition || '50% 50%'}
        initialZoom={beer.photoZoom || 1.0}
        onSavePosition={(newPosition, newZoom, newPhotoUrl) => {
          if (onUpdatePhotoPosition) {
            onUpdatePhotoPosition(beer.id, newPosition, newZoom, newPhotoUrl);
          }
        }}
      />
    )}

    <ConfirmModal
      isOpen={confirmDeleteBeer}
      title="Biertje verwijderen?"
      message={`Weet je zeker dat je "${beer.name}" en alle bijbehorende proefsessies definitief wilt verwijderen? Dit kan niet ongedaan worden gemaakt.`}
      onConfirm={() => {
        onDelete(beer.id);
        onClose();
      }}
      onCancel={() => setConfirmDeleteBeer(false)}
    />

    <ConfirmModal
      isOpen={!!tastingToDelete}
      title="Proefsessie verwijderen?"
      message="Weet je zeker dat je deze specifieke proefsessie definitief wilt verwijderen?"
      onConfirm={() => {
        if (tastingToDelete && onDeleteTasting) {
          onDeleteTasting(tastingToDelete.id);
        }
      }}
      onCancel={() => setTastingToDelete(null)}
    />
  </>
  );
};
