import React, { useState } from 'react';
import { Category, Beer, Tasting } from '../types';
import { COLOR_PALETTE } from '../services/storage';
import { RatingBadge } from './RatingBadge';
import { ColorWheelPicker } from './ColorWheelPicker';
import {
  Tag,
  Plus,
  Edit2,
  Trash2,
  Check,
  AlertTriangle,
  Sparkles,
  FolderPlus,
  ChevronRight,
  Beer as BeerIcon,
  X,
  Heart,
} from 'lucide-react';

interface CategoriesViewProps {
  categories: Category[];
  beers: Beer[];
  tastings?: Tasting[];
  onAddCategory: (name: string, color?: string, description?: string) => void;
  onUpdateCategory: (id: string, name: string, color: string, description?: string) => void;
  onDeleteCategory: (id: string) => void;
  onLoadPresetSuggestions: () => void;
  onSelectBeer?: (beer: Beer) => void;
  readOnly?: boolean;
}

export const CategoriesView: React.FC<CategoriesViewProps> = ({
  categories,
  beers,
  tastings = [],
  onAddCategory,
  onUpdateCategory,
  onDeleteCategory,
  onLoadPresetSuggestions,
  onSelectBeer,
  readOnly = false,
}) => {
  const [isCreating, setIsCreating] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatColor, setNewCatColor] = useState(COLOR_PALETTE[0]);
  const [newCatDesc, setNewCatDesc] = useState('');

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('');
  const [editDesc, setEditDesc] = useState('');

  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [activeOverlayCatId, setActiveOverlayCatId] = useState<string | null>(null);

  const handleStartCreate = () => {
    setIsCreating(true);
    setNewCatName('');
    setNewCatColor(COLOR_PALETTE[categories.length % COLOR_PALETTE.length]);
    setNewCatDesc('');
  };

  const handleSaveNew = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    onAddCategory(newCatName.trim(), newCatColor, newCatDesc.trim());
    setIsCreating(false);
    setNewCatName('');
    setNewCatDesc('');
  };

  const handleStartEdit = (cat: Category) => {
    setEditingId(cat.id);
    setEditName(cat.name);
    setEditColor(cat.color);
    setEditDesc(cat.description || '');
  };

  const handleSaveEdit = (id: string) => {
    if (!editName.trim()) return;
    onUpdateCategory(id, editName.trim(), editColor, editDesc.trim());
    setEditingId(null);
  };

  const getCategoryStats = (catId: string) => {
    const catBeers = beers.filter((b) => b.categoryId === catId);
    const count = catBeers.length;
    const catBeerIds = new Set(catBeers.map((b) => b.id));
    const catTastings = tastings.filter((t) => catBeerIds.has(t.beerId));
    const avgScore =
      catTastings.length > 0
        ? catTastings.reduce((acc, t) => acc + t.rating, 0) / catTastings.length
        : null;
    return { count, avgScore, catBeers };
  };

  const getBeerAverageRating = (beerId: string) => {
    const bTastings = tastings.filter((t) => t.beerId === beerId);
    if (bTastings.length === 0) return 0;
    return bTastings.reduce((sum, t) => sum + t.rating, 0) / bTastings.length;
  };

  const activeOverlayCat = activeOverlayCatId
    ? categories.find((c) => c.id === activeOverlayCatId) || null
    : null;
  const activeOverlayStats = activeOverlayCat ? getCategoryStats(activeOverlayCat.id) : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-zinc-900/60 border border-zinc-800 p-6 rounded-2xl">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Tag className="w-5 h-5 text-amber-400" />
            <h2 className="text-xl font-bold text-zinc-100">
              {readOnly ? 'Bierstijlen & Categorieën' : 'Categoriebeheer'}
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-zinc-400 max-w-xl">
            {readOnly
              ? 'Klik op een categorie om deze naar voren te halen en de gekoppelde bieren te bekijken.'
              : 'Jij bepaalt welke bierstijlen je bijhoudt (bijv. IPA, Tripel, Blond, Stout, Geuze). Klik op een categorie om deze naar voren te halen en de gekoppelde bieren te bekijken.'}
          </p>
        </div>

        {!readOnly && (
          <div className="flex items-center gap-2.5">
            {categories.length === 0 && (
              <button
                onClick={onLoadPresetSuggestions}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-amber-300 border border-zinc-700 transition-colors"
              >
                <Sparkles className="w-4 h-4 text-amber-400" />
                Laad bierstijl suggesties
              </button>
            )}

            <button
              onClick={handleStartCreate}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold bg-amber-500 hover:bg-amber-400 text-zinc-950 shadow-lg shadow-amber-500/20 transition-all"
            >
              <Plus className="w-4 h-4" />
              Nieuwe Categorie
            </button>
          </div>
        )}
      </div>

      {/* New Category Form Modal / Banner */}
      {!readOnly && isCreating && (
        <form
          onSubmit={handleSaveNew}
          className="bg-zinc-900 border border-amber-500/40 rounded-2xl p-5 shadow-xl space-y-4"
        >
          <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
            <h3 className="font-bold text-sm text-zinc-100 flex items-center gap-2">
              <FolderPlus className="w-4 h-4 text-amber-400" />
              Nieuwe Categorie Aanmaken
            </h3>
            <span className="text-xs text-zinc-400">Volledig zelf instelbaar</span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            <div className="lg:col-span-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Categorienaam <span className="text-amber-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  placeholder="bijv. Double IPA, Quadrupel, Geuze..."
                  className="w-full px-3.5 py-2 rounded-xl bg-zinc-950 border border-zinc-700 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Beschrijving <span className="text-zinc-500 font-normal">(optioneel)</span>
                </label>
                <input
                  type="text"
                  value={newCatDesc}
                  onChange={(e) => setNewCatDesc(e.target.value)}
                  placeholder="bijv. Uitgesproken hoppig met tropische aroma's en stevige bitterheid"
                  className="w-full px-3.5 py-2 rounded-xl bg-zinc-950 border border-zinc-700 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <div className="lg:col-span-7">
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                Kies een kleur op het kleurenwiel
              </label>
              <ColorWheelPicker value={newCatColor} onChange={setNewCatColor} />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={() => setIsCreating(false)}
              className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-zinc-400 hover:text-zinc-200"
            >
              Annuleren
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-zinc-950 shadow-md shadow-amber-500/20"
            >
              Opslaan
            </button>
          </div>
        </form>
      )}

      {/* Empty State */}
      {categories.length === 0 && !isCreating ? (
        <div className="p-12 text-center bg-zinc-900/40 border border-dashed border-zinc-800 rounded-2xl">
          <Tag className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
          <h3 className="text-base font-bold text-zinc-200 mb-1">Nog geen categorieën aangemaakt</h3>
          <p className="text-xs text-zinc-400 max-w-md mx-auto mb-5 leading-relaxed">
            {readOnly
              ? 'Deze vriend heeft nog geen bierstijlen of categorieën aangemaakt.'
              : 'Jij hebt de regie. Er zijn standaard geen vaste categorieën ingesteld. Maak jouw eigen bierstijlen aan of laad met één klik een paar klassieke voorbeelden.'}
          </p>
          {!readOnly && (
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={handleStartCreate}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-zinc-950 transition-colors"
              >
                + Eerste Categorie Aanmaken
              </button>
              <button
                onClick={onLoadPresetSuggestions}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 transition-colors"
              >
                Laad Klassieke Stijlen (IPA, Tripel, Stout, Blond)
              </button>
            </div>
          )}
        </div>
      ) : (
        /* Categories Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map((cat) => {
            const { count, avgScore } = getCategoryStats(cat.id);
            const isEditing = !readOnly && editingId === cat.id;

            if (isEditing) {
              return (
                <div
                  key={cat.id}
                  className="bg-zinc-900 border border-amber-500/50 rounded-2xl p-4 shadow-xl space-y-3"
                >
                  <div className="text-xs font-bold text-amber-400">Categorie bewerken</div>
                  <div>
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg bg-zinc-950 border border-zinc-700 text-sm text-zinc-100"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-mono text-zinc-400 mb-1">
                      Kleur kiezen op kleurenwiel
                    </label>
                    <ColorWheelPicker value={editColor} onChange={setEditColor} compact />
                  </div>
                  <div>
                    <input
                      type="text"
                      value={editDesc}
                      onChange={(e) => setEditDesc(e.target.value)}
                      placeholder="Korte omschrijving"
                      className="w-full px-3 py-1 rounded-lg bg-zinc-950 border border-zinc-700 text-xs text-zinc-300 placeholder-zinc-500"
                    />
                  </div>
                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      onClick={() => setEditingId(null)}
                      className="px-2.5 py-1 text-xs text-zinc-400 hover:text-zinc-200"
                    >
                      Annuleren
                    </button>
                    <button
                      onClick={() => handleSaveEdit(cat.id)}
                      className="flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-bold bg-amber-500 text-zinc-950"
                    >
                      <Check className="w-3.5 h-3.5" /> Opslaan
                    </button>
                  </div>
                </div>
              );
            }

            return (
              <div
                key={cat.id}
                onClick={() => setActiveOverlayCatId(cat.id)}
                className="bg-zinc-900/80 border border-zinc-800 hover:border-amber-500/40 rounded-2xl p-5 flex flex-col justify-between transition-all hover:-translate-y-0.5 hover:shadow-lg group cursor-pointer"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-3.5 h-3.5 rounded-full shadow-sm shrink-0"
                        style={{ backgroundColor: cat.color }}
                      />
                      <h3 className="font-bold text-zinc-100 text-base group-hover:text-amber-300 transition-colors">
                        {cat.name}
                      </h3>
                    </div>

                    {!readOnly && (
                      <div
                        className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          onClick={() => handleStartEdit(cat)}
                          className="p-1 rounded-md text-zinc-400 hover:text-amber-400 hover:bg-zinc-800 transition-colors"
                          title="Bewerken"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeleteConfirmId(cat.id)}
                          className="p-1 rounded-md text-zinc-400 hover:text-rose-400 hover:bg-zinc-800 transition-colors"
                          title="Verwijderen"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>

                  {cat.description ? (
                    <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed mb-4">
                      {cat.description}
                    </p>
                  ) : (
                    <p className="text-xs text-zinc-600 italic mb-4">Geen beschrijving</p>
                  )}
                </div>

                <div className="pt-3 border-t border-zinc-800/80 flex items-center justify-between text-xs">
                  <span className="text-zinc-300 font-medium inline-flex items-center gap-1 group-hover:text-amber-300 transition-colors">
                    {count === 1 ? '1 bier' : `${count} bieren`}
                    <ChevronRight className="w-3.5 h-3.5 text-zinc-500 group-hover:text-amber-400 group-hover:translate-x-0.5 transition-all" />
                  </span>

                  {avgScore !== null ? (
                    <span className="text-amber-400 font-semibold flex items-center gap-1">
                      Gemiddeld: <strong className="text-zinc-100">{avgScore.toFixed(1)}</strong>/10
                    </span>
                  ) : (
                    <span className="text-zinc-600 italic text-[11px]">Nog geen bieren</span>
                  )}
                </div>

                {/* Delete confirmation modal overlay */}
                {deleteConfirmId === cat.id && (
                  <div
                    className="mt-3 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-200 text-xs"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center gap-1.5 font-bold mb-1">
                      <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                      Categorie verwijderen?
                    </div>
                    {count > 0 && (
                      <p className="text-[11px] text-rose-300 mb-2">
                        Let op: er zijn momenteel {count} {count === 1 ? 'bier' : 'bieren'} gekoppeld aan deze categorie.
                      </p>
                    )}
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => setDeleteConfirmId(null)}
                        className="px-2 py-1 rounded text-zinc-400 hover:text-zinc-200"
                      >
                        Annuleren
                      </button>
                      <button
                        onClick={() => {
                          onDeleteCategory(cat.id);
                          setDeleteConfirmId(null);
                        }}
                        className="px-2.5 py-1 rounded bg-rose-600 hover:bg-rose-500 text-white font-bold"
                      >
                        Definitief Verwijderen
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Categorie Focus Overlay Modal (komt naar voren met vervaagde achtergrond) */}
      {activeOverlayCat && activeOverlayStats && (
        <div
          onClick={() => setActiveOverlayCatId(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-lg bg-zinc-900 border border-zinc-700/80 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
          >
            {/* Top Color Accent Strip */}
            <div
              className="h-2 w-full shrink-0"
              style={{ backgroundColor: activeOverlayCat.color }}
            />

            {/* Modal Header: Categorie Kaart die naar voren komt */}
            <div className="p-6 border-b border-zinc-800 flex items-start justify-between gap-4 bg-zinc-900/95">
              <div className="min-w-0">
                <div className="flex items-center gap-2.5 mb-1.5">
                  <span
                    className="w-4 h-4 rounded-full shadow-sm shrink-0"
                    style={{ backgroundColor: activeOverlayCat.color }}
                  />
                  <h3 className="text-xl font-extrabold text-zinc-100 truncate">
                    {activeOverlayCat.name}
                  </h3>
                  <span
                    className="text-xs font-bold px-2.5 py-0.5 rounded-full border shrink-0"
                    style={{
                      backgroundColor: `${activeOverlayCat.color}18`,
                      borderColor: `${activeOverlayCat.color}40`,
                      color: activeOverlayCat.color,
                    }}
                  >
                    {activeOverlayStats.count === 1
                      ? '1 bier'
                      : `${activeOverlayStats.count} bieren`}
                  </span>
                </div>

                {activeOverlayCat.description ? (
                  <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
                    {activeOverlayCat.description}
                  </p>
                ) : (
                  <p className="text-xs text-zinc-500 italic">
                    Geen beschrijving ingesteld voor deze categorie
                  </p>
                )}

                {activeOverlayStats.avgScore !== null && (
                  <div className="mt-2.5 inline-flex items-center gap-1.5 text-xs text-amber-400 font-semibold bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-lg">
                    Gemiddelde score in deze stijl:{' '}
                    <strong className="text-zinc-100">
                      {activeOverlayStats.avgScore.toFixed(1)}
                    </strong>
                    /10
                  </div>
                )}
              </div>

              <button
                onClick={() => setActiveOverlayCatId(null)}
                className="p-2 rounded-xl bg-zinc-800/80 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-100 transition-colors shrink-0"
                title="Sluiten"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body: Biertjes die onder deze categorie hangen */}
            <div className="p-5 overflow-y-auto space-y-2.5 flex-1">
              {activeOverlayStats.catBeers.length === 0 ? (
                <div className="py-12 px-4 text-center bg-zinc-950/50 border border-dashed border-zinc-800 rounded-2xl">
                  <BeerIcon className="w-10 h-10 text-zinc-600 mx-auto mb-2.5" />
                  <p className="text-sm font-bold text-zinc-300 mb-1">
                    Nog geen bieren in {activeOverlayCat.name}
                  </p>
                  <p className="text-xs text-zinc-500 max-w-xs mx-auto">
                    Er hangen momenteel nog geen biertjes onder deze categorie.
                  </p>
                </div>
              ) : (
                activeOverlayStats.catBeers.map((beer) => {
                  const avgRating = getBeerAverageRating(beer.id);
                  const tastingCount = tastings.filter((t) => t.beerId === beer.id).length;
                  return (
                    <div
                      key={beer.id}
                      onClick={() => {
                        setActiveOverlayCatId(null);
                        onSelectBeer?.(beer);
                      }}
                      className="flex items-center justify-between gap-3 p-3.5 rounded-2xl bg-zinc-950/80 border border-zinc-800/90 hover:border-amber-500/50 hover:bg-zinc-950 transition-all cursor-pointer group"
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        {beer.photoUrl ? (
                          <img
                            src={beer.photoUrl}
                            alt={beer.name}
                            className="w-12 h-12 rounded-xl object-cover border border-zinc-800 shrink-0"
                          />
                        ) : (
                          <div
                            className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border"
                            style={{
                              backgroundColor: `${activeOverlayCat.color}18`,
                              borderColor: `${activeOverlayCat.color}40`,
                              color: activeOverlayCat.color,
                            }}
                          >
                            <BeerIcon className="w-5 h-5" />
                          </div>
                        )}

                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <h4 className="text-sm font-bold text-zinc-100 group-hover:text-amber-300 transition-colors truncate">
                              {beer.name}
                            </h4>
                            {beer.favorite && (
                              <Heart className="w-3.5 h-3.5 fill-rose-500 text-rose-500 shrink-0" />
                            )}
                          </div>
                          <p className="text-xs text-zinc-400 truncate mt-0.5">
                            {beer.brewery || 'Onbekende brouwerij'} &bull;{' '}
                            <span className="font-semibold text-zinc-300">
                              {beer.abv.toFixed(1)}% ABV
                            </span>
                            {tastingCount > 0 && (
                              <span className="text-zinc-500">
                                {' '}
                                &bull; {tastingCount}x geproefd
                              </span>
                            )}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {avgRating > 0 ? (
                          <RatingBadge rating={avgRating} size="sm" />
                        ) : (
                          <span className="text-xs text-zinc-500 italic">Geen score</span>
                        )}
                        <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-amber-400 group-hover:translate-x-0.5 transition-all" />
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3.5 border-t border-zinc-800 bg-zinc-950/60 flex items-center justify-between text-xs text-zinc-400">
              <span>Klik op een bier voor alle proefnotities &amp; details</span>
              <button
                onClick={() => setActiveOverlayCatId(null)}
                className="px-3.5 py-1.5 rounded-xl font-bold bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition-colors"
              >
                Sluiten
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
