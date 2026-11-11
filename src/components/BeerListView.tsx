import React, { useState, useMemo, useEffect } from 'react';
import { Beer, Category, ViewMode, Tasting } from '../types';
import { BeerCard } from './BeerCard';
import { RatingBadge } from './RatingBadge';
import {
  Search,
  Filter,
  ArrowUpDown,
  LayoutGrid,
  List,
  Heart,
  Plus,
  Beer as BeerIcon,
  Tag,
  Calendar,
  Sparkles,
} from 'lucide-react';

interface BeerListViewProps {
  beers: Beer[];
  tastings: Tasting[];
  categories: Category[];
  onSelectBeer: (beer: Beer) => void;
  onEditBeer: (beer: Beer) => void;
  onDeleteBeer: (beerId: string) => void;
  onToggleFavorite: (beer: Beer) => void;
  onAddNewBeer: () => void;
  onOpenCategories: () => void;
  onOpenAddTasting?: (beer: Beer) => void;
  initialSearchQuery?: string;
  readOnly?: boolean;
}

type SortKey = 'rating_desc' | 'rating_asc' | 'name_asc' | 'name_desc' | 'brewery_asc' | 'brewery_desc' | 'date_desc' | 'date_asc' | 'abv_desc';

const SORT_STORAGE_KEY = 'bierlog_beer_list_sort_by';
const VALID_SORT_KEYS: SortKey[] = [
  'rating_desc',
  'rating_asc',
  'name_asc',
  'name_desc',
  'brewery_asc',
  'brewery_desc',
  'date_desc',
  'date_asc',
  'abv_desc',
];

export const BeerListView: React.FC<BeerListViewProps> = ({
  beers,
  tastings,
  categories,
  onSelectBeer,
  onEditBeer,
  onDeleteBeer,
  onToggleFavorite,
  onAddNewBeer,
  onOpenCategories,
  onOpenAddTasting,
  initialSearchQuery = '',
  readOnly = false,
}) => {
  const [searchQuery, setSearchQuery] = useState(initialSearchQuery);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('all');
  const [sortBy, setSortBy] = useState<SortKey>(() => {
    try {
      const saved = localStorage.getItem(SORT_STORAGE_KEY) as SortKey | null;
      if (saved && VALID_SORT_KEYS.includes(saved)) {
        return saved;
      }
    } catch {
      // ignore storage errors
    }
    return 'rating_desc';
  });
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');

  useEffect(() => {
    try {
      localStorage.setItem(SORT_STORAGE_KEY, sortBy);
    } catch {
      // ignore storage errors
    }
  }, [sortBy]);

  const categoryMap = useMemo(() => {
    return new Map(categories.map((c) => [c.id, c]));
  }, [categories]);

  // Helper to get avg rating
  const getAvgRating = (beerId: string) => {
    const bTastings = tastings.filter((t) => t.beerId === beerId);
    return bTastings.length > 0
      ? bTastings.reduce((acc, t) => acc + t.rating, 0) / bTastings.length
      : 0;
  };

  // Helper to get the filled-in tasting date for a beer
  const getBeerTastingDate = (beer: Beer): string => {
    const bTastings = tastings
      .filter((t) => t.beerId === beer.id && t.date)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    if (bTastings.length > 0) {
      return bTastings[0].date;
    }
    return beer.dateAdded;
  };

  // Normalize filled-in date (YYYY-MM-DD) to timestamp so sorting strictly follows the calendar dates entered by the user
  const getBeerTastingDateTimestamp = (beer: Beer): number => {
    const rawDate = getBeerTastingDate(beer);
    if (!rawDate) return 0;
    const datePart = rawDate.split('T')[0];
    const parsedDay = new Date(datePart + 'T12:00:00').getTime();
    if (!Number.isNaN(parsedDay)) {
      return parsedDay;
    }
    const fallback = new Date(rawDate).getTime();
    return Number.isNaN(fallback) ? 0 : fallback;
  };

  // Filter and sort beers
  const filteredAndSortedBeers = useMemo(() => {
    let result = [...beers];

    // Filter by category
    if (selectedCategoryId !== 'all') {
      result = result.filter((b) => b.categoryId === selectedCategoryId);
    }

    // Filter by favorites
    if (onlyFavorites) {
      result = result.filter((b) => b.favorite);
    }

    // Filter by search query (name or brewery or notes)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (b) =>
          b.name.toLowerCase().includes(q) ||
          (b.brewery && b.brewery.toLowerCase().includes(q))
      );
    }

    // Sort
    result.sort((a, b) => {
      const ratingA = getAvgRating(a.id);
      const ratingB = getAvgRating(b.id);
      switch (sortBy) {
        case 'rating_desc':
          return ratingB - ratingA;
        case 'rating_asc':
          return ratingA - ratingB;
        case 'name_asc':
          return a.name.localeCompare(b.name, 'nl', { sensitivity: 'base' });
        case 'name_desc':
          return b.name.localeCompare(a.name, 'nl', { sensitivity: 'base' });
        case 'brewery_asc':
          return (a.brewery || '').localeCompare(b.brewery || '', 'nl', { sensitivity: 'base' });
        case 'brewery_desc':
          return (b.brewery || '').localeCompare(a.brewery || '', 'nl', { sensitivity: 'base' });
        case 'date_desc': {
          const diff = getBeerTastingDateTimestamp(b) - getBeerTastingDateTimestamp(a);
          if (diff !== 0) return diff;
          return a.name.localeCompare(b.name, 'nl', { sensitivity: 'base' });
        }
        case 'date_asc': {
          const diff = getBeerTastingDateTimestamp(a) - getBeerTastingDateTimestamp(b);
          if (diff !== 0) return diff;
          return a.name.localeCompare(b.name, 'nl', { sensitivity: 'base' });
        }
        case 'abv_desc':
          return b.abv - a.abv;
        default:
          return ratingB - ratingA;
      }
    });

    return result;
  }, [beers, tastings, selectedCategoryId, onlyFavorites, searchQuery, sortBy]);

  const activeCategory = categories.find((c) => c.id === selectedCategoryId);

  return (
    <div className="space-y-6">
      {/* Controls Bar */}
      <div className="bg-zinc-900/70 border border-zinc-800 rounded-2xl p-4 sm:p-5 space-y-4">
        {/* Search & Sort & View Mode row */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Zoek op biernaam, brouwerij of smaak..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-zinc-950 border border-zinc-700/80 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
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

          <div className="flex items-center gap-2">
            {/* Sort Dropdown */}
            <div className="relative flex-1 sm:flex-none">
              <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-700/80 text-xs text-zinc-200">
                <ArrowUpDown className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortKey)}
                  className="bg-transparent text-xs text-zinc-200 focus:outline-none cursor-pointer pr-1"
                >
                  <option value="rating_desc" className="bg-zinc-900">Score: Hoog &rarr; Laag</option>
                  <option value="rating_asc" className="bg-zinc-900">Score: Laag &rarr; Hoog</option>
                  <option value="name_asc" className="bg-zinc-900">Naam: A &rarr; Z</option>
                  <option value="name_desc" className="bg-zinc-900">Naam: Z &rarr; A</option>
                  <option value="brewery_asc" className="bg-zinc-900">Brouwerij: A &rarr; Z</option>
                  <option value="brewery_desc" className="bg-zinc-900">Brouwerij: Z &rarr; A</option>
                  <option value="date_desc" className="bg-zinc-900">Recent geproefd</option>
                  <option value="date_asc" className="bg-zinc-900">Oudste eerst</option>
                  <option value="abv_desc" className="bg-zinc-900">Alcohol % (Hoog &rarr; Laag)</option>
                </select>
              </div>
            </div>

            {/* Favorite toggle button */}
            <button
              onClick={() => setOnlyFavorites(!onlyFavorites)}
              className={`p-2.5 rounded-xl border text-xs font-medium flex items-center gap-1.5 transition-colors ${
                onlyFavorites
                  ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                  : 'bg-zinc-950 text-zinc-400 border-zinc-700/80 hover:text-zinc-200'
              }`}
              title="Alleen favorieten"
            >
              <Heart className={`w-4 h-4 ${onlyFavorites ? 'text-rose-500 fill-rose-500' : ''}`} />
              <span className="hidden md:inline">Favorieten</span>
            </button>

            {/* View Mode Toggle */}
            <div className="hidden sm:flex items-center bg-zinc-950 border border-zinc-700/80 rounded-xl p-1">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-lg transition-colors ${
                  viewMode === 'grid' ? 'bg-amber-500 text-zinc-950' : 'text-zinc-400 hover:text-zinc-200'
                }`}
                title="Rasterweergave"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-lg transition-colors ${
                  viewMode === 'list' ? 'bg-amber-500 text-zinc-950' : 'text-zinc-400 hover:text-zinc-200'
                }`}
                title="Lijstweergave"
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Category Pills Filter */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-1 no-scrollbar text-xs">
          <button
            onClick={() => setSelectedCategoryId('all')}
            className={`px-3 py-1.5 rounded-xl font-medium whitespace-nowrap transition-all border ${
              selectedCategoryId === 'all'
                ? 'bg-amber-500 text-zinc-950 border-amber-500 font-bold shadow-sm'
                : 'bg-zinc-950/70 text-zinc-400 border-zinc-800 hover:border-zinc-700 hover:text-zinc-200'
            }`}
          >
            Alle Bieren ({beers.length})
          </button>

          {categories.map((cat) => {
            const count = beers.filter((b) => b.categoryId === cat.id).length;
            const isSelected = selectedCategoryId === cat.id;

            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategoryId(cat.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-medium whitespace-nowrap transition-all border ${
                  isSelected
                    ? 'border-transparent text-white font-bold shadow-md'
                    : 'bg-zinc-950/70 text-zinc-300 border-zinc-800 hover:border-zinc-700'
                }`}
                style={{
                  backgroundColor: isSelected ? cat.color : undefined,
                }}
              >
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: isSelected ? '#ffffff' : cat.color }}
                />
                <span>{cat.name}</span>
                <span
                  className={`text-[11px] px-1.5 py-0.2 rounded-full ${
                    isSelected ? 'bg-black/30 text-white' : 'bg-zinc-800 text-zinc-400'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}

          {!readOnly && (
            <button
              onClick={onOpenCategories}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-zinc-400 hover:text-amber-400 bg-zinc-950/40 border border-dashed border-zinc-700 text-xs whitespace-nowrap transition-colors"
            >
              <Tag className="w-3 h-3 text-amber-500" />
              + Beheer Categorieën
            </button>
          )}
        </div>
      </div>

      {/* Category header when filtering on a specific category */}
      {activeCategory && (
        <div
          className="p-4 rounded-2xl border flex items-center justify-between"
          style={{
            backgroundColor: `${activeCategory.color}10`,
            borderColor: `${activeCategory.color}30`,
          }}
        >
          <div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: activeCategory.color }} />
              <h3 className="font-bold text-zinc-100 text-base">{activeCategory.name}</h3>
            </div>
            {activeCategory.description && (
              <p className="text-xs text-zinc-400 mt-1">{activeCategory.description}</p>
            )}
          </div>
          <span className="text-xs text-zinc-400 font-semibold bg-zinc-900/80 px-2.5 py-1 rounded-lg border border-zinc-800">
            {filteredAndSortedBeers.length} {filteredAndSortedBeers.length === 1 ? 'bier' : 'bieren'} in deze stijl
          </span>
        </div>
      )}

      {/* Main Content: Beers List / Grid */}
      {filteredAndSortedBeers.length === 0 ? (
        <div className="p-12 text-center bg-zinc-900/40 border border-dashed border-zinc-800 rounded-2xl">
          <BeerIcon className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
          <h3 className="text-base font-bold text-zinc-200 mb-1">
            {searchQuery || onlyFavorites || selectedCategoryId !== 'all'
              ? 'Geen bieren gevonden met deze filters'
              : 'Nog geen bieren toegevoegd'}
          </h3>
          <p className="text-xs text-zinc-400 max-w-sm mx-auto mb-5 leading-relaxed">
            {searchQuery || onlyFavorites || selectedCategoryId !== 'all'
              ? 'Probeer een andere zoekterm of selecteer een andere categorie.'
              : readOnly
              ? 'Deze vriend heeft nog geen geproefde bieren aan zijn collectie toegevoegd.'
              : 'Begin met het vastleggen van jouw geproefde bieren en geef ze een cijfer van 1 tot 10.'}
          </p>

          <div className="flex items-center justify-center gap-3">
            {searchQuery || onlyFavorites || selectedCategoryId !== 'all' ? (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setOnlyFavorites(false);
                  setSelectedCategoryId('all');
                }}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition-colors"
              >
                Filters wissen
              </button>
            ) : !readOnly ? (
              <button
                onClick={onAddNewBeer}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-zinc-950 shadow-md shadow-amber-500/20 transition-all"
              >
                <Plus className="w-4 h-4" />
                Voeg Je Eerste Bier Toe
              </button>
            ) : null}
          </div>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAndSortedBeers.map((beer) => (
            <BeerCard
              key={beer.id}
              beer={beer}
              tastings={tastings.filter(t => t.beerId === beer.id)}
              category={categoryMap.get(beer.categoryId)}
              onSelect={onSelectBeer}
              onEdit={onEditBeer}
              onDelete={onDeleteBeer}
              onToggleFavorite={onToggleFavorite}
              onOpenAddTasting={onOpenAddTasting}
              readOnly={readOnly}
            />
          ))}
        </div>
      ) : (
        /* Table / List View */
        <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl overflow-hidden shadow-lg">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-zinc-800 bg-zinc-950/60 text-zinc-400 uppercase tracking-wider text-[11px]">
                  <th className="py-3.5 px-4 font-semibold">Bier &amp; Brouwerij</th>
                  <th className="py-3.5 px-4 font-semibold">Categorie</th>
                  <th className="py-3.5 px-4 font-semibold">ABV %</th>
                  <th className="py-3.5 px-4 font-semibold">Score</th>
                  <th className="py-3.5 px-4 font-semibold hidden md:table-cell">Geproefd</th>
                  {!readOnly && (
                    <th className="py-3.5 px-4 font-semibold text-right">Acties</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 text-zinc-200">
                {filteredAndSortedBeers.map((beer) => {
                  const cat = categoryMap.get(beer.categoryId);
                  return (
                    <tr
                      key={beer.id}
                      onClick={() => onSelectBeer(beer)}
                      className="hover:bg-zinc-800/40 cursor-pointer transition-colors"
                    >
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          {readOnly ? (
                            beer.favorite ? (
                              <span className="p-1 text-rose-500" title="Favoriet">
                                <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" />
                              </span>
                            ) : null
                          ) : (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onToggleFavorite(beer);
                              }}
                              className="p-1 rounded text-zinc-500 hover:text-rose-400"
                            >
                              <Heart
                                className={`w-3.5 h-3.5 ${
                                  beer.favorite ? 'text-rose-500 fill-rose-500' : ''
                                }`}
                              />
                            </button>
                          )}
                          <div>
                            <div className="font-bold text-zinc-100 hover:text-amber-400">
                              {beer.name}
                            </div>
                            <div className="text-[11px] text-zinc-400">
                              {beer.brewery || 'Onbekende brouwerij'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium border"
                          style={{
                            backgroundColor: `${cat?.color || '#f59e0b'}18`,
                            borderColor: `${cat?.color || '#f59e0b'}40`,
                            color: cat?.color || '#f59e0b',
                          }}
                        >
                          <span
                            className="w-1.5 h-1.5 rounded-full"
                            style={{ backgroundColor: cat?.color || '#f59e0b' }}
                          />
                          {cat?.name || 'Onbekend'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-medium whitespace-nowrap">
                        {beer.abv.toFixed(1)}%
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <RatingBadge rating={getAvgRating(beer.id)} size="sm" />
                      </td>
                      <td className="py-3.5 px-4 text-zinc-400 hidden md:table-cell whitespace-nowrap">
                        {new Date(getBeerTastingDate(beer)).toLocaleDateString('nl-NL')}
                      </td>
                      {!readOnly && (
                        <td className="py-3.5 px-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                          {onOpenAddTasting && (
                            <button
                              onClick={() => onOpenAddTasting(beer)}
                              className="px-2.5 py-1 text-xs font-bold bg-amber-500/15 hover:bg-amber-500 text-amber-300 hover:text-zinc-950 rounded-lg mr-2 transition-colors border border-amber-500/30"
                            >
                              + Inchecken
                            </button>
                          )}
                          <button
                            onClick={() => onEditBeer(beer)}
                            className="px-2 py-1 text-xs text-amber-400 hover:underline mr-2"
                          >
                            Bewerken
                          </button>
                          <button
                            onClick={() => onDeleteBeer(beer.id)}
                            className="px-2 py-1 text-xs text-rose-400 hover:underline"
                          >
                            Verwijderen
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
