import React, { useState, useMemo } from 'react';
import { BeerGlass } from '../types';
import {
  Plus,
  Minus,
  Search,
  Trash2,
  Edit3,
  Heart,
  Sparkles,
  Camera,
  X,
  Package,
  Award,
  Layers,
  Calendar,
  Maximize2,
  Sliders,
} from 'lucide-react';
import { DatePickerInput } from './DatePickerInput';
import { PhotoLightboxModal } from './PhotoLightboxModal';
import { ConfirmModal } from './ConfirmModal';
import { validateAndCompressImageFile, safeIsoDate, clampNumber } from '../utils/security';

interface BeerGlassesViewProps {
  glasses: BeerGlass[];
  onAddGlass: (glassData: Omit<BeerGlass, 'id' | 'userId' | 'dateAdded'> & { dateAdded?: string }) => void;
  onUpdateGlass: (glassId: string, updates: Partial<BeerGlass>) => void;
  onDeleteGlass: (glassId: string) => void;
}

const GLASS_TYPES = [
  'Kelk / Bokaal',
  'Tulpglas',
  'Weizenglas',
  'Vaasje / Fluitje',
  'Pul / Mug',
  'Proefglas',
  'Anders',
];

export const BeerGlassesView: React.FC<BeerGlassesViewProps> = ({
  glasses,
  onAddGlass,
  onUpdateGlass,
  onDeleteGlass,
}) => {
  const [selectedLightboxGlass, setSelectedLightboxGlass] = useState<BeerGlass | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [onlyFavorites, setOnlyFavorites] = useState(false);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingGlass, setEditingGlass] = useState<BeerGlass | null>(null);
  const [glassToDelete, setGlassToDelete] = useState<BeerGlass | null>(null);
  const [confirmRemovePhoto, setConfirmRemovePhoto] = useState(false);

  // Form fields
  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [glassType, setGlassType] = useState('');
  const [quantity, setQuantity] = useState<number>(1);
  const [volumeCl, setVolumeCl] = useState<string>('');
  const [photoUrl, setPhotoUrl] = useState<string | undefined>(undefined);
  const [notes, setNotes] = useState('');
  const [favorite, setFavorite] = useState(false);
  const [dateAdded, setDateAdded] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [error, setError] = useState<string | null>(null);

  const compressImage = (file: File, maxDimension = 600, quality = 0.7): Promise<string> =>
    validateAndCompressImageFile(file, maxDimension, quality);

  const openNewModal = () => {
    setEditingGlass(null);
    setName('');
    setBrand('');
    setGlassType('');
    setQuantity(1);
    setVolumeCl('');
    setPhotoUrl(undefined);
    setNotes('');
    setFavorite(false);
    setDateAdded(new Date().toISOString().split('T')[0]);
    setError(null);
    setModalOpen(true);
  };

  const openEditModal = (glass: BeerGlass) => {
    setEditingGlass(glass);
    setName(glass.name);
    setBrand(glass.brand || '');
    setGlassType(glass.glassType || '');
    setQuantity(glass.quantity || 1);
    setVolumeCl(glass.volumeCl ? String(glass.volumeCl) : '');
    setPhotoUrl(glass.photoUrl);
    setNotes(glass.notes || '');
    setFavorite(!!glass.favorite);
    setDateAdded(glass.dateAdded ? glass.dateAdded.split('T')[0] : new Date().toISOString().split('T')[0]);
    setError(null);
    setModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Vul de naam van het bierglas in.');
      return;
    }

    const isoDate =
      editingGlass?.dateAdded && editingGlass.dateAdded.split('T')[0] === dateAdded
        ? safeIsoDate(editingGlass.dateAdded)
        : dateAdded === new Date().toISOString().split('T')[0]
        ? new Date().toISOString()
        : safeIsoDate(dateAdded);

    const payload = {
      name: name.trim(),
      brand: brand.trim(),
      glassType: glassType.trim(),
      quantity: Math.round(clampNumber(quantity, 0, 9999, 1)),
      volumeCl: volumeCl ? clampNumber(volumeCl, 0, 500, 33) : undefined,
      photoUrl,
      notes: notes.trim(),
      favorite,
      dateAdded: isoDate,
    };

    if (editingGlass) {
      onUpdateGlass(editingGlass.id, payload);
    } else {
      onAddGlass(payload);
    }

    setModalOpen(false);
    setEditingGlass(null);
  };

  const stats = useMemo(() => {
    const uniqueCount = glasses.length;
    const totalPieces = glasses.reduce((sum, g) => sum + (Number(g.quantity) || 0), 0);
    const favCount = glasses.filter((g) => g.favorite).length;
    return { uniqueCount, totalPieces, favCount };
  }, [glasses]);

  const filteredGlasses = useMemo(() => {
    return glasses
      .filter((g) => {
        if (onlyFavorites && !g.favorite) return false;
        if (selectedType !== 'all' && g.glassType !== selectedType) return false;
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchName = g.name.toLowerCase().includes(q);
          const matchBrand = g.brand?.toLowerCase().includes(q);
          const matchType = g.glassType?.toLowerCase().includes(q);
          const matchNotes = g.notes?.toLowerCase().includes(q);
          return matchName || matchBrand || matchType || matchNotes;
        }
        return true;
      })
      .sort((a, b) => new Date(b.dateAdded).getTime() - new Date(a.dateAdded).getTime());
  }, [glasses, onlyFavorites, selectedType, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-amber-950/60 via-zinc-900 to-zinc-900 border border-amber-500/30 rounded-2xl p-6 sm:p-7 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-semibold mb-2">
              <Sparkles className="w-3.5 h-3.5" />
              Mijn Glazenkast
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-100 tracking-tight">
              Bierglazen Collectie
            </h1>
            <p className="text-xs sm:text-sm text-zinc-400 mt-1 max-w-xl">
              Houd bij welke speciaalbierglazen je in huis hebt, voeg een foto toe en geef direct aan hoeveel stuks je van elk glas hebt.
            </p>
          </div>

          <button
            onClick={openNewModal}
            className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm font-bold bg-amber-500 hover:bg-amber-400 text-zinc-950 shadow-lg shadow-amber-500/20 transition-all hover:scale-105 shrink-0"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            Bierglas Toevoegen
          </button>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-3 gap-3.5 sm:gap-4">
        <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-4 sm:p-5 flex flex-col justify-between shadow-md">
          <div className="flex items-center justify-between text-zinc-400 mb-2">
            <span className="text-[11px] sm:text-xs font-medium uppercase tracking-wider">Unieke Glazen</span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 hidden sm:block">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-extrabold text-zinc-100">{stats.uniqueCount}</div>
            <span className="text-[11px] text-zinc-500">verschillende modellen</span>
          </div>
        </div>

        <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-4 sm:p-5 flex flex-col justify-between shadow-md">
          <div className="flex items-center justify-between text-zinc-400 mb-2">
            <span className="text-[11px] sm:text-xs font-medium uppercase tracking-wider">Totaal Stuks</span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 hidden sm:block">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-extrabold text-amber-400">{stats.totalPieces}</div>
            <span className="text-[11px] text-zinc-500">glazen in de kast</span>
          </div>
        </div>

        <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-4 sm:p-5 flex flex-col justify-between shadow-md">
          <div className="flex items-center justify-between text-zinc-400 mb-2">
            <span className="text-[11px] sm:text-xs font-medium uppercase tracking-wider">Favorieten</span>
            <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400 hidden sm:block">
              <Heart className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-extrabold text-zinc-100">{stats.favCount}</div>
            <span className="text-[11px] text-zinc-500">mooiste glazen</span>
          </div>
        </div>
      </div>

      {/* Search & Filter Controls */}
      <div className="bg-zinc-900/70 border border-zinc-800 rounded-2xl p-4 sm:p-5 space-y-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Zoek op glasnaam, brouwerij of type..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-zinc-950 border border-zinc-700/80 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-400 hover:text-zinc-200"
              >
                Wissen
              </button>
            )}
          </div>

          <button
            onClick={() => setOnlyFavorites(!onlyFavorites)}
            className={`px-3.5 py-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${
              onlyFavorites
                ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                : 'bg-zinc-950 text-zinc-400 border-zinc-700/80 hover:text-zinc-200'
            }`}
          >
            <Heart className={`w-4 h-4 ${onlyFavorites ? 'text-rose-500 fill-rose-500' : ''}`} />
            Alleen Favorieten
          </button>
        </div>

        {/* Type Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar text-xs">
          <button
            onClick={() => setSelectedType('all')}
            className={`px-3 py-1.5 rounded-xl font-medium whitespace-nowrap transition-all border ${
              selectedType === 'all'
                ? 'bg-amber-500 text-zinc-950 border-amber-500 font-bold'
                : 'bg-zinc-950/70 text-zinc-400 border-zinc-800 hover:border-zinc-700 hover:text-zinc-200'
            }`}
          >
            Alle Types ({glasses.length})
          </button>
          {GLASS_TYPES.map((type) => {
            const count = glasses.filter((g) => g.glassType === type).length;
            const active = selectedType === type;
            return (
              <button
                key={type}
                onClick={() => setSelectedType(type)}
                className={`px-3 py-1.5 rounded-xl font-medium whitespace-nowrap transition-all border ${
                  active
                    ? 'bg-amber-500 text-zinc-950 border-amber-500 font-bold'
                    : 'bg-zinc-950/70 text-zinc-400 border-zinc-800 hover:border-zinc-700 hover:text-zinc-200'
                }`}
              >
                {type} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Glasses Grid */}
      {filteredGlasses.length === 0 ? (
        <div className="bg-zinc-900/50 border border-zinc-800/80 rounded-2xl p-12 text-center space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto">
            <Package className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-zinc-200">
            {glasses.length === 0 ? 'Nog geen bierglazen in je collectie' : 'Geen bierglazen gevonden'}
          </h3>
          <p className="text-xs text-zinc-400 max-w-md mx-auto">
            {glasses.length === 0
              ? 'Voeg je eerste bierglas toe met een foto en geef aan hoeveel je er in de kast hebt staan!'
              : 'Pas je zoekopdracht of filter aan om je glazen te zien.'}
          </p>
          {glasses.length === 0 && (
            <button
              onClick={openNewModal}
              className="mt-2 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-zinc-950 shadow-lg shadow-amber-500/20 transition-all"
            >
              <Plus className="w-4 h-4" />
              Eerste Bierglas Toevoegen
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {filteredGlasses.map((glass) => (
            <div
              key={glass.id}
              className="bg-zinc-900/90 border border-zinc-800 hover:border-amber-500/40 rounded-2xl overflow-hidden shadow-lg flex flex-col justify-between transition-all group"
            >
              <div>
                {/* Photo or Placeholder Banner */}
                <div className="relative h-48 bg-zinc-950 border-b border-zinc-800/80 flex items-center justify-center overflow-hidden">
                  {glass.photoUrl ? (
                    <div
                      onClick={() => setSelectedLightboxGlass(glass)}
                      className="w-full h-full relative cursor-pointer group/photo"
                      title="Klik om in volledige grootte te zien of te positioneren"
                    >
                      <img
                        src={glass.photoUrl}
                        alt={glass.name}
                        className="w-full h-full object-cover group-hover/photo:scale-105 transition-transform duration-300"
                        style={{
                          objectPosition: glass.photoPosition || '50% 50%',
                          transform: (glass.photoZoom || 1) > 1 ? `scale(${glass.photoZoom})` : undefined,
                          transformOrigin: glass.photoPosition || '50% 50%',
                        }}
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/photo:opacity-100 flex items-center justify-center transition-opacity text-amber-300 gap-1.5">
                        <Maximize2 className="w-5 h-5 drop-shadow" />
                        <span className="text-xs font-bold drop-shadow">Vergroten</span>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center text-zinc-600 gap-1.5">
                      <span className="text-4xl">🍺</span>
                      <span className="text-[11px] font-medium">Geen foto toegevoegd</span>
                    </div>
                  )}

                  {/* Top Badges */}
                  <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2">
                    {glass.glassType ? (
                      <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-zinc-950/85 text-amber-400 border border-amber-500/30 backdrop-blur-sm">
                        {glass.glassType}
                      </span>
                    ) : (
                      <span />
                    )}

                    <button
                      onClick={() => onUpdateGlass(glass.id, { favorite: !glass.favorite })}
                      className={`p-2 rounded-xl border backdrop-blur-sm transition-colors ${
                        glass.favorite
                          ? 'bg-rose-500/20 text-rose-400 border-rose-500/40'
                          : 'bg-zinc-950/75 text-zinc-400 border-zinc-800 hover:text-zinc-200'
                      }`}
                      title="Favoriet"
                    >
                      <Heart className={`w-4 h-4 ${glass.favorite ? 'fill-rose-500 text-rose-500' : ''}`} />
                    </button>
                  </div>

                  {glass.volumeCl && (
                    <div className="absolute bottom-2.5 right-3 px-2 py-0.5 rounded-md bg-zinc-950/85 border border-zinc-800 text-[11px] font-bold text-zinc-300">
                      {glass.volumeCl} cl
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="p-4 sm:p-5">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-extrabold text-base text-zinc-100 group-hover:text-amber-400 transition-colors">
                        {glass.name}
                      </h3>
                      <p className="text-xs text-zinc-400 mt-0.5">
                        {glass.brand || 'Geen brouwerij/merk opgegeven'}
                      </p>
                    </div>
                    {glass.dateAdded && (
                      <span className="inline-flex items-center gap-1 text-[11px] text-zinc-500 shrink-0 mt-0.5">
                        <Calendar className="w-3 h-3 text-amber-500/70" />
                        {new Date(glass.dateAdded).toLocaleDateString('nl-NL', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </span>
                    )}
                  </div>

                  {glass.notes && (
                    <p className="mt-3 text-xs text-zinc-400 italic bg-zinc-950/70 p-2.5 rounded-xl border border-zinc-800/80 line-clamp-2">
                      &ldquo;{glass.notes}&rdquo;
                    </p>
                  )}
                </div>
              </div>

              {/* Footer: Quantity Stepper & Actions */}
              <div className="px-4 sm:px-5 py-3.5 bg-zinc-950/60 border-t border-zinc-800/80 flex items-center justify-between gap-2">
                {/* Direct Quantity Adjuster */}
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-zinc-400">Aantal:</span>
                  <div className="inline-flex items-center gap-1.5 bg-zinc-900 border border-zinc-700/80 rounded-xl p-1">
                    <button
                      type="button"
                      onClick={() =>
                        onUpdateGlass(glass.id, { quantity: Math.max(0, (glass.quantity || 0) - 1) })
                      }
                      className="w-6 h-6 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 flex items-center justify-center transition-colors"
                      title="Eentje minder"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="px-2 text-xs font-extrabold text-amber-400 min-w-[2.5rem] text-center">
                      {glass.quantity} {glass.quantity === 1 ? 'stuk' : 'stuks'}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        onUpdateGlass(glass.id, { quantity: (glass.quantity || 0) + 1 })
                      }
                      className="w-6 h-6 rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 flex items-center justify-center transition-colors"
                      title="Eentje meer"
                    >
                      <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                    </button>
                  </div>
                </div>

                {/* Edit / Delete */}
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => openEditModal(glass)}
                    className="p-2 rounded-xl text-zinc-400 hover:text-amber-400 hover:bg-zinc-900 transition-colors"
                    title="Glas bewerken"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setGlassToDelete(glass)}
                    className="p-2 rounded-xl text-zinc-400 hover:text-rose-400 hover:bg-zinc-900 transition-colors"
                    title="Glas verwijderen"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Glass Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-lg bg-zinc-900 border border-zinc-700/80 rounded-2xl shadow-2xl p-4 sm:p-6 text-zinc-100 my-6 sm:my-8 pb-20 sm:pb-6">
            <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
              <div>
                <h2 className="text-lg font-bold text-zinc-100">
                  {editingGlass ? 'Bierglas Bewerken' : 'Nieuw Bierglas Toevoegen'}
                </h2>
                <p className="text-xs text-zinc-400">
                  Voeg een foto toe en geef aan hoeveel je er hebt
                </p>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="mt-4 space-y-4">
              {error && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-medium">
                  {error}
                </div>
              )}

              {/* Name */}
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  Naam van het bierglas <span className="text-amber-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="bijv. Duvel Kelkglas, La Chouffe Kabouterglas, Tripel Karmeliet..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-700 text-zinc-100 placeholder-zinc-500 text-sm focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Brand / Brewery */}
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  Brouwerij / Merk <span className="text-zinc-500 font-normal">(optioneel)</span>
                </label>
                <input
                  type="text"
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                  placeholder="bijv. Duvel Moortgat, Hertog Jan, Brouwerij 't IJ..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-700 text-zinc-100 placeholder-zinc-500 text-sm focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Quantity & Volume Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* Quantity */}
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                    Hoeveel heb je er? (Aantal) <span className="text-amber-400">*</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setQuantity(Math.max(0, quantity - 1))}
                      className="w-10 h-10 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 flex items-center justify-center transition-colors shrink-0"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <input
                      type="number"
                      min="0"
                      max="999"
                      value={quantity}
                      onChange={(e) => setQuantity(Math.max(0, parseInt(e.target.value, 10) || 0))}
                      className="w-full text-center px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-700 text-amber-400 font-extrabold text-base focus:outline-none focus:border-amber-500"
                    />
                    <button
                      type="button"
                      onClick={() => setQuantity(quantity + 1)}
                      className="w-10 h-10 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 flex items-center justify-center transition-colors shrink-0"
                    >
                      <Plus className="w-4 h-4 stroke-[2.5]" />
                    </button>
                  </div>
                </div>

                {/* Volume cl */}
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                    Inhoud in cl <span className="text-zinc-500 font-normal">(optioneel)</span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="5"
                      max="200"
                      value={volumeCl}
                      onChange={(e) => setVolumeCl(e.target.value)}
                      placeholder="bijv. 33"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-700 text-zinc-100 placeholder-zinc-500 text-sm focus:outline-none focus:border-amber-500"
                    />
                    <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-zinc-500 font-semibold">
                      cl
                    </span>
                  </div>
                </div>
              </div>

              {/* Glass Type Pills */}
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  Type glas <span className="text-zinc-500 font-normal">(kies of laat leeg)</span>
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {GLASS_TYPES.map((type) => (
                    <button
                      type="button"
                      key={type}
                      onClick={() => setGlassType(glassType === type ? '' : type)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                        glassType === type
                          ? 'bg-amber-500 text-zinc-950 border-amber-400 shadow-sm'
                          : 'bg-zinc-950 text-zinc-300 border-zinc-800 hover:border-zinc-700'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              {/* Photo Upload */}
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  Foto van het bierglas <span className="text-zinc-500 font-normal">(optioneel)</span>
                </label>
                <div className="flex items-center gap-4">
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif,image/avif,image/heic,image/heif"
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
                    id="glass-photo-upload"
                  />
                  <label
                    htmlFor="glass-photo-upload"
                    className="cursor-pointer flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-950 border border-zinc-700 text-zinc-300 hover:text-white hover:border-amber-500 transition-colors text-xs font-semibold"
                  >
                    <Camera className="w-4 h-4 text-amber-400" />
                    Foto maken / kiezen
                  </label>

                  {photoUrl && (
                    <div className="relative">
                      <img
                        src={photoUrl}
                        alt="Glas preview"
                        className="w-16 h-16 rounded-xl object-cover border border-zinc-700"
                      />
                      <button
                        type="button"
                        onClick={() => setConfirmRemovePhoto(true)}
                        className="absolute -top-2 -right-2 bg-rose-500 hover:bg-rose-600 text-white rounded-full p-0.5 shadow"
                        title="Foto verwijderen"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  Notities / Bijzonderheden <span className="text-zinc-500 font-normal">(optioneel)</span>
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="bijv. Gekregen bij brouwerijbezoek, met houten standaard..."
                  className="w-full px-3.5 py-2 rounded-xl bg-zinc-950 border border-zinc-700 text-zinc-100 placeholder-zinc-500 text-sm focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Date & Favorite row */}
              <div className="flex items-center justify-between pt-2 border-t border-zinc-800">
                <div className="flex items-center gap-2">
                  <label className="text-xs text-zinc-400 font-medium">Datum:</label>
                  <DatePickerInput
                    value={dateAdded}
                    onChange={(val) => setDateAdded(val)}
                  />
                </div>

                <button
                  type="button"
                  onClick={() => setFavorite(!favorite)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-colors ${
                    favorite
                      ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                      : 'bg-zinc-800/60 text-zinc-400 border-zinc-700 hover:text-zinc-200'
                  }`}
                >
                  <Heart className={`w-3.5 h-3.5 ${favorite ? 'text-rose-500 fill-rose-500' : ''}`} />
                  Favoriet
                </button>
              </div>

              {/* Submit buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-zinc-800">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="px-4 py-2.5 rounded-xl text-xs font-semibold text-zinc-400 hover:text-zinc-200"
                  >
                    Annuleren
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-zinc-950 shadow-lg shadow-amber-500/20 transition-all"
                  >
                    {editingGlass ? 'Wijzigingen Opslaan' : 'Glas Opslaan'}
                  </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Glass Photo Lightbox & Positioning Modal */}
      {selectedLightboxGlass && selectedLightboxGlass.photoUrl && (
        <PhotoLightboxModal
          isOpen={!!selectedLightboxGlass}
          onClose={() => setSelectedLightboxGlass(null)}
          photoUrl={selectedLightboxGlass.photoUrl}
          title={selectedLightboxGlass.name}
          subtitle={selectedLightboxGlass.brand || selectedLightboxGlass.glassType}
          initialPosition={selectedLightboxGlass.photoPosition || '50% 50%'}
          initialZoom={selectedLightboxGlass.photoZoom || 1.0}
          onSavePosition={(newPosition, newZoom, newPhotoUrl) => {
            const updates = {
              photoPosition: newPosition,
              photoZoom: newZoom,
              ...(newPhotoUrl ? { photoUrl: newPhotoUrl } : {}),
            };
            onUpdateGlass(selectedLightboxGlass.id, updates);
            setSelectedLightboxGlass((prev) =>
              prev ? { ...prev, ...updates } : null
            );
          }}
        />
      )}

      <ConfirmModal
        isOpen={!!glassToDelete}
        title="Bierglas verwijderen?"
        message={
          glassToDelete
            ? `Weet je zeker dat je "${glassToDelete.name}" uit je collectie wilt verwijderen? Dit kan niet ongedaan worden gemaakt.`
            : ''
        }
        onConfirm={() => {
          if (glassToDelete) {
            onDeleteGlass(glassToDelete.id);
          }
        }}
        onCancel={() => setGlassToDelete(null)}
      />

      <ConfirmModal
        isOpen={confirmRemovePhoto}
        title="Foto verwijderen?"
        message="Weet je zeker dat je deze foto van het bierglas wilt verwijderen?"
        onConfirm={() => {
          setPhotoUrl(undefined);
          const input = document.getElementById('glass-photo-upload') as HTMLInputElement;
          if (input) input.value = '';
        }}
        onCancel={() => setConfirmRemovePhoto(false)}
      />
    </div>
  );
};
