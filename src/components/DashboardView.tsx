import React, { useMemo, useState } from 'react';
import { Beer, Category, Tasting, UserAccount } from '../types';
import { RatingBadge } from './RatingBadge';
import {
  Beer as BeerIcon,
  Trophy,
  Award,
  Sparkles,
  TrendingUp,
  Tag,
  Plus,
  Percent,
  Heart,
  ChevronRight,
  Flame,
  Search,
  X,
  User,
} from 'lucide-react';

interface DashboardViewProps {
  activeUser?: UserAccount;
  viewingFriendUser?: { id: string; name: string; email: string; avatarUrl?: string };
  readOnly?: boolean;
  beers: Beer[];
  tastings: Tasting[];
  categories: Category[];
  onSelectBeer: (beer: Beer) => void;
  onAddNewBeer: () => void;
  onNavigateToTab: (tab: 'list' | 'top' | 'categories' | 'settings') => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  activeUser,
  viewingFriendUser,
  readOnly = false,
  beers,
  tastings,
  categories,
  onSelectBeer,
  onAddNewBeer,
  onNavigateToTab,
}) => {
  const categoryMap = useMemo(() => {
    return new Map(categories.map((c) => [c.id, c]));
  }, [categories]);

  // Key metrics calculation
  const stats = useMemo(() => {
    const ownBeers = readOnly
      ? beers
      : activeUser
      ? beers.filter((b) => !b.userId || b.userId === activeUser.id)
      : beers;

    if (ownBeers.length === 0) {
      return {
        total: 0,
        avgRating: 0,
        avgAbv: 0,
        topBeer: null,
        topCategory: null,
        topBeers: [],
        favoritesCount: 0,
        categoryCounts: [],
      };
    }

    const distinctBeerKeys = new Set(
      ownBeers.map(
        (b) => `${b.name.trim().toLowerCase()}::${(b.brewery || '').trim().toLowerCase()}`
      )
    );
    const total = distinctBeerKeys.size || ownBeers.length;
    const avgRating =
      tastings.length > 0
        ? tastings.reduce((acc, t) => acc + t.rating, 0) / tastings.length
        : 0;
    const avgAbv = ownBeers.reduce((acc, b) => acc + b.abv, 0) / ownBeers.length;
    const favoritesCount = ownBeers.filter((b) => b.favorite).length;

    // Top rated beers (based on avg rating)
    const beerAvgRatings = beers.map((b) => {
      const bTastings = tastings.filter((t) => t.beerId === b.id);
      const avg =
        bTastings.length > 0
          ? bTastings.reduce((acc, t) => acc + t.rating, 0) / bTastings.length
          : 0;
      const latestTasting = [...bTastings].sort(
        (x, y) => new Date(y.date).getTime() - new Date(x.date).getTime()
      )[0];
      return { beer: b, avg, latestTasting };
    }).sort((a, b) => b.avg - a.avg);

    const topBeers = beerAvgRatings.filter(b => b.avg > 0).slice(0, 3);

    // Most logged category
    const catCountMap: Record<string, number> = {};
    beers.forEach((b) => {
      catCountMap[b.categoryId] = (catCountMap[b.categoryId] || 0) + 1;
    });

    let maxCatId = '';
    let maxCatCount = 0;
    Object.entries(catCountMap).forEach(([id, count]) => {
      if (count > maxCatCount) {
        maxCatCount = count;
        maxCatId = id;
      }
    });

    const topCategory = categoryMap.get(maxCatId) || null;

    // Distribution
    const categoryCounts = categories
      .map((cat) => {
        const count = catCountMap[cat.id] || 0;
        const percentage = total > 0 ? (count / total) * 100 : 0;
        return {
          category: cat,
          count,
          percentage,
        };
      })
      .sort((a, b) => b.count - a.count);

    return {
      total,
      avgRating,
      avgAbv,
      topBeers,
      topCategory,
      favoritesCount,
      categoryCounts,
    };
  }, [activeUser, beers, tastings, categories, categoryMap]);

  const [searchQuery, setSearchQuery] = useState('');
  const matchingBeers = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    return beers.filter(
      (b) =>
        b.name.toLowerCase().includes(q) ||
        (b.brewery && b.brewery.toLowerCase().includes(q))
    );
  }, [beers, searchQuery]);

  // Recent beers (max 4)
  const recentBeers = useMemo(() => {
    return [...beers]
      .sort((a, b) => new Date(b.dateAdded).getTime() - new Date(a.dateAdded).getTime())
      .slice(0, 4);
  }, [beers]);

  return (
    <div className="space-y-6">
      {/* Persoonlijke Begroeting in Brouwersdagboek stijl */}
      {(viewingFriendUser || activeUser) && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-zinc-900 border border-zinc-800 rounded-2xl px-5 py-4 stamp-border">
          <div className="flex items-center gap-3.5 min-w-0">
            {(viewingFriendUser?.avatarUrl || (!readOnly && activeUser?.avatarUrl)) ? (
              <img
                src={(viewingFriendUser?.avatarUrl || activeUser?.avatarUrl)!}
                alt={viewingFriendUser?.name || activeUser?.name || ''}
                className="w-11 h-11 rounded-2xl object-cover border border-amber-500/50 shrink-0"
              />
            ) : (
              <div className="w-11 h-11 rounded-2xl bg-amber-600/20 border border-amber-500/40 text-amber-400 font-display font-bold text-lg flex items-center justify-center shrink-0">
                {(viewingFriendUser?.name || activeUser?.name || '?').charAt(0).toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <div className="font-mono text-[10px] uppercase tracking-widest text-amber-500">
                {readOnly ? 'VRIENDENLOGBOEK · ALLEEN-LEZEN' : 'STAMTAFEL OVERZICHT'}
              </div>
              <h1 className="font-display text-xl sm:text-2xl font-bold text-zinc-100 tracking-tight truncate">
                {readOnly && viewingFriendUser ? (
                  <>
                    Bierlogboek van <span className="text-amber-400">{viewingFriendUser.name}</span>
                  </>
                ) : (
                  <>
                    Goed je te zien, <span className="text-amber-400">{activeUser?.name}</span>
                  </>
                )}
              </h1>
            </div>
          </div>

          {!readOnly && (
            <button
              type="button"
              onClick={() => onNavigateToTab('settings')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-amber-400 text-xs font-mono uppercase tracking-wider transition-colors w-fit shrink-0 cursor-pointer"
            >
              <User className="w-3.5 h-3.5 text-amber-500" />
              Profiel aanpassen
            </button>
          )}
        </div>
      )}

      {/* Search Bar on Dashboard */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <Search className="h-4 w-4 text-zinc-400" />
        </div>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Zoek in het register op biernaam of brouwerij..."
          className="w-full pl-11 pr-10 py-3 rounded-2xl bg-zinc-900 border border-zinc-800 text-zinc-100 placeholder-zinc-500 text-sm focus:outline-none focus:border-amber-500 transition-all stamp-border"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-zinc-400 hover:text-zinc-200"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Search Results if active */}
      {searchQuery.trim() && (
        <div className="p-4 rounded-2xl bg-zinc-900 border border-amber-500/40 space-y-3 stamp-border">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-mono font-bold text-amber-400 uppercase tracking-wider">
              Zoekresultaten ({matchingBeers.length})
            </h3>
            <span className="text-[11px] font-mono text-zinc-500">voor &ldquo;{searchQuery}&rdquo;</span>
          </div>
          {matchingBeers.length === 0 ? (
            <div className="py-6 text-center text-xs text-zinc-500">
              Geen bieren gevonden die voldoen aan je zoekopdracht.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {matchingBeers.map((beer) => {
                const cat = categoryMap.get(beer.categoryId);
                const bTastings = tastings.filter((t) => t.beerId === beer.id);
                const avg =
                  bTastings.length > 0
                    ? bTastings.reduce((sum, t) => sum + t.rating, 0) / bTastings.length
                    : 0;
                return (
                  <div
                    key={beer.id}
                    onClick={() => onSelectBeer(beer)}
                    className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800 hover:border-amber-500/50 cursor-pointer transition-all flex flex-col justify-between group"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span
                          className="text-[11px] font-mono font-semibold"
                          style={{ color: cat?.color || '#f59e0b' }}
                        >
                          {cat?.name || 'Onbekend'}
                        </span>
                        <RatingBadge rating={avg} size="sm" />
                      </div>
                      <h4 className="font-display font-bold text-sm text-zinc-100 group-hover:text-amber-400 transition-colors line-clamp-1">
                        {beer.name}
                      </h4>
                      <p className="text-[11px] font-mono text-zinc-400 line-clamp-1">
                        {beer.brewery || 'Onbekende brouwerij'}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        {/* Totaal aantal verschillende bieren */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 sm:p-5 flex flex-col justify-between stamp-border">
          <div className="flex items-center justify-between text-zinc-400 mb-2">
            <span className="text-[11px] font-mono uppercase tracking-wider">Geproefde Bieren</span>
            <BeerIcon className="w-4 h-4 text-amber-500" />
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-mono font-bold text-zinc-100 tabular-nums">
              {stats.total}
            </div>
            <span className="text-[11px] font-mono text-zinc-500">
              verdeeld over {categories.length} {categories.length === 1 ? 'categorie' : 'categorieën'}
            </span>
          </div>
        </div>

        {/* Gemiddeld Cijfer */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 sm:p-5 flex flex-col justify-between stamp-border">
          <div className="flex items-center justify-between text-zinc-400 mb-2">
            <span className="text-[11px] font-mono uppercase tracking-wider">Gemiddeld Cijfer</span>
            <TrendingUp className="w-4 h-4 text-amber-500" />
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-mono font-bold text-amber-400 tabular-nums">
              {stats.avgRating > 0 ? stats.avgRating.toFixed(1) : '-'}
              <span className="text-xs font-normal text-zinc-500 ml-1">/10</span>
            </div>
            <span className="text-[11px] font-mono text-zinc-500">
              {stats.total > 0 ? 'over alle proefnotities' : 'nog geen data'}
            </span>
          </div>
        </div>

        {/* Meest Gedronken Stijl */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 sm:p-5 flex flex-col justify-between stamp-border">
          <div className="flex items-center justify-between text-zinc-400 mb-2">
            <span className="text-[11px] font-mono uppercase tracking-wider">Favoriete Categorie</span>
            <Flame className="w-4 h-4 text-amber-500" />
          </div>
          <div>
            <div className="font-display text-lg sm:text-xl font-bold text-zinc-100 truncate">
              {stats.topCategory ? stats.topCategory.name : 'Geen data'}
            </div>
            <span className="text-[11px] font-mono text-zinc-500 tabular-nums">
              {stats.topCategory
                ? `${beers.filter((b) => b.categoryId === stats.topCategory?.id).length}× in logboek`
                : 'Voeg categorieën toe'}
            </span>
          </div>
        </div>

        {/* Gemiddeld Alcohol % */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 sm:p-5 flex flex-col justify-between stamp-border">
          <div className="flex items-center justify-between text-zinc-400 mb-2">
            <span className="text-[11px] font-mono uppercase tracking-wider">Gemiddeld ABV</span>
            <Percent className="w-4 h-4 text-amber-500" />
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-mono font-bold text-zinc-100 tabular-nums">
              {stats.avgAbv > 0 ? `${stats.avgAbv.toFixed(1)}%` : '-'}
            </div>
            <span className="text-[11px] font-mono text-zinc-500">alcoholpercentage</span>
          </div>
        </div>
      </div>

      {/* Main Section: Top Beer Highlight & Category Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Highlight: Hoogst Gewaardeerde Bieren */}
        <div className="lg:col-span-1 bg-zinc-900/80 border border-zinc-800 rounded-2xl p-5 flex flex-col justify-between shadow-md">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800 mb-4">
              <div className="flex items-center gap-2">
                <Trophy className="w-4 h-4 text-amber-400" />
                <h3 className="font-bold text-sm text-zinc-200">Top 3 Bieren</h3>
              </div>
              <button
                onClick={() => onNavigateToTab('top')}
                className="text-xs text-amber-400 hover:text-amber-300 font-medium flex items-center"
              >
                Toplijst &rarr;
              </button>
            </div>

            {stats.topBeers.length > 0 ? (
              <div className="space-y-4">
                {stats.topBeers.map((item, index) => {
                  const cat = categoryMap.get(item.beer.categoryId);
                  return (
                    <div
                      key={item.beer.id}
                      onClick={() => onSelectBeer(item.beer)}
                      className="p-4 rounded-xl bg-zinc-950/70 border border-amber-500/30 hover:border-amber-400/60 cursor-pointer transition-all group relative overflow-hidden"
                    >
                      {/* Rank ribbon/badge */}
                      <div className="absolute top-0 right-0 bg-amber-500/20 text-amber-400 text-[10px] font-bold px-2.5 py-1 rounded-bl-xl border-l border-b border-amber-500/30">
                        #{index + 1}
                      </div>

                      <div className="flex items-center justify-between mb-2 pr-6">
                        <span
                          className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border"
                          style={{
                            backgroundColor: `${cat?.color || '#f59e0b'}18`,
                            borderColor: `${cat?.color || '#f59e0b'}40`,
                            color: cat?.color || '#f59e0b',
                          }}
                        >
                          {cat?.name || 'Onbekend'}
                        </span>
                        <RatingBadge rating={item.avg} size="sm" />
                      </div>

                      <h4 className="font-extrabold text-base text-zinc-100 group-hover:text-amber-400 transition-colors">
                        {item.beer.name}
                      </h4>
                      <p className="text-xs text-zinc-400 mt-0.5 mb-3">
                        {item.beer.brewery || 'Brouwerij onbekend'} &bull; {item.beer.abv.toFixed(1)}% ABV
                      </p>

                      {(item.latestTasting?.notes || item.latestTasting?.location) && (
                        <p className="text-xs text-zinc-400 line-clamp-2 italic bg-zinc-900/60 p-2.5 rounded-lg border border-zinc-800 leading-relaxed">
                          {item.latestTasting?.notes && (
                            <>&ldquo;{item.latestTasting.notes}&rdquo;</>
                          )}
                          {item.latestTasting?.location && (
                            <span className={`block not-italic text-[11px] text-amber-400/90 font-medium ${item.latestTasting?.notes ? 'mt-1' : ''}`}>
                              📍 {item.latestTasting.location}
                            </span>
                          )}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-8 text-center text-zinc-500 text-xs">
                Nog geen bieren beoordeeld. Voeg er een toe om jouw top 3 te zien!
              </div>
            )}
          </div>

          <div className="pt-4 mt-4 border-t border-zinc-800 flex items-center justify-between text-xs text-zinc-400">
            <span>Favorieten:</span>
            <span className="font-bold text-rose-400 flex items-center gap-1">
              <Heart className="w-3.5 h-3.5 fill-rose-500 text-rose-500" />
              {stats.favoritesCount} bieren
            </span>
          </div>
        </div>

        {/* Categorie-verdeling */}
        <div className="lg:col-span-2 bg-zinc-900/80 border border-zinc-800 rounded-2xl p-5 shadow-md flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800 mb-4">
              <div className="flex items-center gap-2">
                <Tag className="w-4 h-4 text-amber-400" />
                <h3 className="font-bold text-sm text-zinc-200">Bierstijlen & Categorieën</h3>
              </div>
              <button
                onClick={() => onNavigateToTab('categories')}
                className="text-xs text-amber-400 hover:text-amber-300 font-medium"
              >
                {readOnly ? 'Bekijk Categorieën \u2192' : 'Beheer Categorieën \u2192'}
              </button>
            </div>

            {stats.categoryCounts.length === 0 ? (
              <div className="py-8 text-center text-zinc-500 text-xs">
                Nog geen categorieën aangemaakt. Maak zelf categorieën aan om je bierverdeling te zien!
              </div>
            ) : (
              <div className="space-y-3.5">
                {stats.categoryCounts.map(({ category, count, percentage }) => (
                  <div key={category.id} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: category.color }}
                        />
                        <span className="font-semibold text-zinc-200">{category.name}</span>
                      </div>
                      <span className="text-zinc-400">
                        {count} {count === 1 ? 'bier' : 'bieren'} ({percentage.toFixed(0)}%)
                      </span>
                    </div>

                    <div className="w-full bg-zinc-950 h-2 rounded-full overflow-hidden border border-zinc-800">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${percentage}%`,
                          backgroundColor: category.color,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="pt-4 mt-4 border-t border-zinc-800 text-[11px] text-zinc-500">
            Jouw bieren zijn 100% gekoppeld aan jouw persoonlijke account en categorieën.
          </div>
        </div>
      </div>

      {/* Recente Proefnotities */}
      <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-5 shadow-md">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800 mb-4">
          <div className="flex items-center gap-2">
            <Award className="w-4 h-4 text-amber-400" />
            <h3 className="font-bold text-sm text-zinc-200">Recent Geproefd</h3>
          </div>
          <button
            onClick={() => onNavigateToTab('list')}
            className="text-xs text-amber-400 hover:text-amber-300 font-medium flex items-center gap-1"
          >
            Alle Bieren Bekijken <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {recentBeers.length === 0 ? (
          <div className="py-6 text-center text-zinc-500 text-xs">
            Nog geen proefnotities geregistreerd.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {recentBeers.map((beer) => {
              const cat = categoryMap.get(beer.categoryId);
              const bTastings = tastings.filter((t) => t.beerId === beer.id);
              const avg =
                bTastings.length > 0
                  ? bTastings.reduce((sum, t) => sum + t.rating, 0) / bTastings.length
                  : 0;
              return (
                <div
                  key={beer.id}
                  onClick={() => onSelectBeer(beer)}
                  className="p-3.5 rounded-xl bg-zinc-950/60 border border-zinc-800 hover:border-amber-500/40 cursor-pointer transition-all flex flex-col justify-between group"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span
                        className="text-[10px] font-semibold px-2 py-0.5 rounded-full border"
                        style={{
                          backgroundColor: `${cat?.color || '#f59e0b'}18`,
                          borderColor: `${cat?.color || '#f59e0b'}40`,
                          color: cat?.color || '#f59e0b',
                        }}
                      >
                        {cat?.name || 'Onbekend'}
                      </span>
                      <RatingBadge rating={avg} size="sm" />
                    </div>

                    <h4 className="font-bold text-xs text-zinc-100 group-hover:text-amber-300 transition-colors line-clamp-1">
                      {beer.name}
                    </h4>
                    <p className="text-[11px] text-zinc-400 line-clamp-1">
                      {beer.brewery || 'Onbekende brouwerij'}
                    </p>
                  </div>

                  <div className="mt-3 pt-2 border-t border-zinc-800/80 flex items-center justify-between text-[10px] text-zinc-500">
                    <span>{beer.abv.toFixed(1)}% ABV</span>
                    <span>{new Date(beer.dateAdded).toLocaleDateString('nl-NL')}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
