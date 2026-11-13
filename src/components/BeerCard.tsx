import React from 'react';
import { Beer, Category, Tasting } from '../types';
import { RatingBadge } from './RatingBadge';
import { ConfirmModal } from './ConfirmModal';
import { Beer as BeerIcon, Heart, MoreVertical, Edit3, Trash2, Calendar, Eye, PlusCircle, MapPin } from 'lucide-react';
import { getBrowserDateLocale } from '../utils/i18n';

interface BeerCardProps {
  beer: Beer;
  tastings: Tasting[];
  category?: Category;
  onSelect: (beer: Beer) => void;
  onEdit: (beer: Beer) => void;
  onDelete: (beerId: string) => void;
  onToggleFavorite: (beer: Beer) => void;
  onOpenAddTasting?: (beer: Beer) => void;
  rank?: number;
  readOnly?: boolean;
}

export const BeerCard: React.FC<BeerCardProps> = ({
  beer,
  tastings,
  category,
  onSelect,
  onEdit,
  onDelete,
  onToggleFavorite,
  onOpenAddTasting,
  rank,
  readOnly = false,
}) => {
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = React.useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    if (menuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuOpen]);

  const avgRating = tastings.length > 0
    ? tastings.reduce((acc, t) => acc + t.rating, 0) / tastings.length
    : 0;

  const lastTasting = tastings.length > 0 
    ? [...tastings].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0]
    : null;

  const formattedDate = lastTasting 
    ? new Date(lastTasting.date).toLocaleDateString(getBrowserDateLocale(), {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : 'Geen proefnotities';

  const catColor = category?.color || '#f59e0b';
  const displayPhoto = beer.photoUrl || lastTasting?.photoUrl;

  return (
    <div
      onClick={() => onSelect(beer)}
      className="group relative bg-zinc-900 border border-zinc-800 hover:border-amber-600/60 rounded-2xl p-5 transition-all duration-200 cursor-pointer flex flex-col justify-between stamp-border"
    >
      <div>
        {/* Top Row: Unboxed Category · ABV & Actions */}
        <div className="flex items-center justify-between gap-2 pb-2.5 mb-3 border-b border-zinc-800">
          <div className="flex items-center gap-2 flex-wrap min-w-0 font-mono text-xs">
            {rank && (
              <span
                className={`inline-flex items-center justify-center px-2 py-0.5 rounded-lg text-[11px] font-bold ${
                  rank === 1
                    ? 'bg-amber-500 text-zinc-950'
                    : rank === 2
                    ? 'bg-zinc-200 text-zinc-950'
                    : rank === 3
                    ? 'bg-amber-700 text-white'
                    : 'bg-zinc-800 text-zinc-400'
                }`}
              >
                #{rank}
              </span>
            )}
            <span className="font-semibold" style={{ color: catColor }}>
              {category?.name || 'Onbekende stijl'}
            </span>
            <span className="text-zinc-600">·</span>
            <span className="text-zinc-300 tabular-nums">{beer.abv.toFixed(1)}% ABV</span>
          </div>
          <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
            {readOnly ? (
              beer.favorite ? (
                <span
                  className="p-1.5 rounded-lg text-rose-500"
                  title="Favoriet bier"
                >
                  <Heart className="w-4 h-4 text-rose-500 fill-rose-500" />
                </span>
              ) : null
            ) : (
              <>
                <button
                  onClick={() => onToggleFavorite(beer)}
                  aria-label={beer.favorite ? 'Verwijder uit favorieten' : 'Toevoegen aan favorieten'}
                  className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-400 hover:bg-zinc-800 transition-colors"
                >
                  <Heart
                    className={`w-4 h-4 transition-colors ${
                      beer.favorite ? 'text-rose-500 fill-rose-500' : 'text-zinc-500 hover:text-zinc-300'
                    }`}
                  />
                </button>
                <div className="relative" ref={menuRef}>
                  <button
                    onClick={() => setMenuOpen(!menuOpen)}
                    aria-label="Opties"
                    className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
                  >
                    <MoreVertical className="w-4 h-4" />
                  </button>
                  {menuOpen && (
                    <div className="absolute right-0 top-full mt-1 w-44 bg-zinc-900 border border-zinc-700 rounded-xl shadow-xl py-1 z-20">
                      {onOpenAddTasting && (
                        <button
                          onClick={() => {
                            setMenuOpen(false);
                            onOpenAddTasting(beer);
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-amber-400 hover:bg-zinc-800"
                        >
                          <PlusCircle className="w-3.5 h-3.5 text-amber-400" />
                          Nogmaals drinken
                        </button>
                      )}
                      <button
                        onClick={() => {
                          setMenuOpen(false);
                          onSelect(beer);
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs text-zinc-300 hover:bg-zinc-800 hover:text-white"
                      >
                        <Eye className="w-3.5 h-3.5 text-zinc-400" />
                        Details &amp; Geschiedenis
                      </button>
                      <button
                        onClick={() => {
                          setMenuOpen(false);
                          onEdit(beer);
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs text-zinc-300 hover:bg-zinc-800 hover:text-amber-400"
                      >
                        <Edit3 className="w-3.5 h-3.5 text-amber-400" />
                        Bewerken
                      </button>
                      <button
                        onClick={() => {
                          setMenuOpen(false);
                          setConfirmDeleteOpen(true);
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs text-rose-400 hover:bg-zinc-800"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Verwijderen
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Middle Row: Left-aligned Title, Brewery & Unboxed Metadata + Right-aligned Photo */}
        <div className="flex items-start justify-between gap-3.5 mb-3">
          <div className="flex-1 min-w-0">
            <h3
              translate="no"
              data-no-translate="true"
              className="notranslate font-display font-bold text-xl text-zinc-100 group-hover:text-amber-400 transition-colors line-clamp-1"
            >
              {beer.name}
            </h3>
            <p
              translate={beer.brewery ? 'no' : undefined}
              data-no-translate={beer.brewery ? 'true' : undefined}
              className={`${beer.brewery ? 'notranslate ' : ''}text-xs font-mono text-zinc-400 mb-2 line-clamp-1`}
            >
              {beer.brewery ? beer.brewery : 'Onbekende brouwerij'}
            </p>
            <div className="font-mono text-[11px] text-zinc-400 leading-relaxed tabular-nums">
              <span>{tastings.length === 1 ? '1× geproefd' : `${tastings.length}× geproefd`}</span>
              {lastTasting?.servingType && (
                <span className="text-amber-400">
                  {' · '}
                  {lastTasting.servingType === 'tap'
                    ? 'Van de tap'
                    : lastTasting.servingType === 'fles'
                    ? 'Fles'
                    : 'Blik'}
                </span>
              )}
              {lastTasting?.location && (
                <span className="text-zinc-300"> · {lastTasting.location}</span>
              )}
            </div>
          </div>

          {displayPhoto && (
            <div className="w-20 h-20 rounded-xl overflow-hidden border border-zinc-700 shrink-0 bg-zinc-950 shadow-md">
              <img
                src={displayPhoto}
                alt={beer.name}
                className="w-full h-full object-cover photo-analog"
                style={{
                  objectPosition: beer.photoPosition || '50% 50%',
                  transform: (beer.photoZoom || 1) > 1 ? `scale(${beer.photoZoom})` : undefined,
                  transformOrigin: beer.photoPosition || '50% 50%',
                }}
              />
            </div>
          )}
        </div>

        {/* Tasting Notes */}
        {lastTasting?.notes ? (
          <p className="text-xs text-zinc-300 line-clamp-2 leading-relaxed mb-4 italic border-l-2 border-amber-600/60 pl-3 py-0.5">
            &ldquo;{lastTasting.notes}&rdquo;
          </p>
        ) : (
          <p className="text-xs text-zinc-600 line-clamp-1 mb-4 italic">
            Geen proefnotitie opgeschreven
          </p>
        )}
      </div>
      <div className="pt-3 border-t border-zinc-800 flex items-center justify-between gap-2">
        <RatingBadge rating={avgRating} size="md" showLabel />
        <div className="flex items-center gap-2">
          {!readOnly && onOpenAddTasting && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onOpenAddTasting(beer);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-950 hover:bg-amber-600 text-amber-400 hover:text-zinc-950 border border-amber-600/40 text-xs font-mono uppercase tracking-wider font-bold transition-all cursor-pointer"
              title="Geef aan dat je dit bier nog een keer hebt gedronken"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Inchecken</span>
            </button>
          )}
          <div className="hidden sm:flex items-center gap-1 text-[11px] font-mono text-zinc-500 tabular-nums">
            <Calendar className="w-3 h-3 text-zinc-600" />
            <span>{formattedDate}</span>
          </div>
        </div>
      </div>

      {!readOnly && (
        <ConfirmModal
          isOpen={confirmDeleteOpen}
          title="Biertje verwijderen?"
          message={`Weet je zeker dat je "${beer.name}" en alle bijbehorende proefnotities definitief wilt verwijderen? Dit kan niet ongedaan worden gemaakt.`}
          onConfirm={() => onDelete(beer.id)}
          onCancel={() => setConfirmDeleteOpen(false)}
        />
      )}
    </div>
  );
};
