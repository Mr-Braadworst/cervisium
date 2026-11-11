import React, { useState, useMemo } from 'react';
import { Beer, Category, Tasting } from '../types';
import { RatingBadge } from './RatingBadge';
import { Trophy, Award, Medal, Crown, Filter, Heart, Clock, PlusCircle } from 'lucide-react';

interface TopRankingsViewProps {
  beers: Beer[];
  tastings: Tasting[];
  categories: Category[];
  onSelectBeer: (beer: Beer) => void;
  onToggleFavorite: (beer: Beer) => void;
  onAddNewBeer: () => void;
  onOpenAddTasting?: (beer: Beer) => void;
  readOnly?: boolean;
}

export const TopRankingsView: React.FC<TopRankingsViewProps> = ({
  beers,
  tastings,
  categories,
  onSelectBeer,
  onAddNewBeer,
  onOpenAddTasting,
  readOnly = false,
}) => {
  const [minRating, setMinRating] = useState<number>(0);
  const [selectedCatId, setSelectedCatId] = useState<string>('all');

  const categoryMap = useMemo(() => {
    return new Map(categories.map((c) => [c.id, c]));
  }, [categories]);

  // Ranked beers sorted strictly descending by average rating
  const rankedData = useMemo(() => {
    const list = beers.map((beer) => {
      const bTastings = tastings.filter((t) => t.beerId === beer.id);
      const avgRating =
        bTastings.length > 0
          ? bTastings.reduce((sum, t) => sum + t.rating, 0) / bTastings.length
          : 0;
      const latestTasting = [...bTastings].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      )[0];

      return {
        beer,
        avgRating,
        tastingCount: bTastings.length,
        latestTasting,
      };
    });

    // Sort descending by avgRating, then by tasting count, then by name
    list.sort((a, b) => {
      if (b.avgRating !== a.avgRating) {
        return b.avgRating - a.avgRating;
      }
      if (b.tastingCount !== a.tastingCount) {
        return b.tastingCount - a.tastingCount;
      }
      return a.beer.name.localeCompare(b.beer.name);
    });

    let filtered = list;
    if (minRating > 0) {
      filtered = filtered.filter((item) => item.avgRating >= minRating);
    }
    if (selectedCatId !== 'all') {
      filtered = filtered.filter((item) => item.beer.categoryId === selectedCatId);
    }

    return filtered;
  }, [beers, tastings, minRating, selectedCatId]);

  const top3 = rankedData.slice(0, 3);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-amber-950/40 via-zinc-900 to-zinc-900 border border-amber-500/30 rounded-2xl p-6 relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
                <Trophy className="w-5 h-5" />
              </div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-zinc-100 tracking-tight">
                Top Bieren Klassement
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-zinc-400 max-w-xl">
              De ultieme ranglijst over álle categorieën heen. Gerangschikt op basis van jouw gemiddelde cijfer per bier.
            </p>
          </div>

          {/* Quick Filters */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-950/90 border border-zinc-700/80 text-xs">
              <Filter className="w-3.5 h-3.5 text-amber-400" />
              <select
                value={minRating}
                onChange={(e) => setMinRating(parseFloat(e.target.value))}
                className="bg-transparent text-zinc-200 text-xs focus:outline-none cursor-pointer"
              >
                <option value="0" className="bg-zinc-900">Alle scores (1-10)</option>
                <option value="9.0" className="bg-zinc-900">&ge; 9.0 (Meesterwerken)</option>
                <option value="8.0" className="bg-zinc-900">&ge; 8.0 (Uitmuntend &amp; Goed)</option>
                <option value="7.0" className="bg-zinc-900">&ge; 7.0 (Lekker &amp; Beter)</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-950/90 border border-zinc-700/80 text-xs">
              <select
                value={selectedCatId}
                onChange={(e) => setSelectedCatId(e.target.value)}
                className="bg-transparent text-zinc-200 text-xs focus:outline-none cursor-pointer"
              >
                <option value="all" className="bg-zinc-900">Alle stijlen</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id} className="bg-zinc-900">
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Podium for Top 3 */}
      {top3.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          {/* #2 Silver (left on desktop) */}
          {top3.length > 1 && (
            <div
              onClick={() => onSelectBeer(top3[1].beer)}
              className="order-2 md:order-1 bg-zinc-900/90 border border-zinc-700/70 hover:border-zinc-500 rounded-2xl p-5 shadow-lg flex flex-col justify-between cursor-pointer transition-all hover:scale-[1.01]"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-zinc-700/60 text-zinc-200 border border-zinc-500/50">
                    <Medal className="w-3.5 h-3.5 text-zinc-300" />
                    Zilver &bull; #2
                  </div>
                  <RatingBadge rating={top3[1].avgRating} size="sm" />
                </div>

                <h3 className="font-bold text-lg text-zinc-100 hover:text-amber-300 transition-colors line-clamp-1">
                  {top3[1].beer.name}
                </h3>
                <p className="text-xs text-zinc-400 font-medium mb-3">
                  {top3[1].beer.brewery || 'Brouwerij onbekend'}
                </p>

                {top3[1].latestTasting?.notes && (
                  <p className="text-xs text-zinc-400 line-clamp-2 italic bg-zinc-950/40 p-2.5 rounded-lg border border-zinc-800">
                    &ldquo;{top3[1].latestTasting.notes}&rdquo;
                  </p>
                )}
              </div>

              <div className="pt-3 border-t border-zinc-800 flex items-center justify-between text-xs text-zinc-400 mt-4">
                <span>{categoryMap.get(top3[1].beer.categoryId)?.name}</span>
                <span className="font-semibold text-zinc-300">
                  {top3[1].tastingCount}x gedronken &bull; {top3[1].beer.abv.toFixed(1)}% ABV
                </span>
              </div>
            </div>
          )}

          {/* #1 Gold Champion (center on desktop) */}
          {top3.length > 0 && (
            <div
              onClick={() => onSelectBeer(top3[0].beer)}
              className="order-1 md:order-2 bg-gradient-to-b from-amber-950/40 via-zinc-900 to-zinc-900 border-2 border-amber-500/70 hover:border-amber-400 rounded-2xl p-6 shadow-xl shadow-amber-500/10 flex flex-col justify-between cursor-pointer transition-all hover:scale-[1.02] relative"
            >
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="flex items-center gap-1 px-3 py-0.5 rounded-full text-xs font-black bg-amber-400 text-zinc-950 shadow-md ring-2 ring-amber-300 uppercase tracking-wider">
                  <Crown className="w-3.5 h-3.5" />
                  Goud &bull; #1 Kampioen
                </span>
              </div>

              <div className="pt-2">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider">
                    Hoogst Gewaardeerd ({top3[0].tastingCount}x)
                  </span>
                  <RatingBadge rating={top3[0].avgRating} size="md" showLabel />
                </div>

                <h3 className="font-extrabold text-xl text-zinc-100 hover:text-amber-300 transition-colors line-clamp-1">
                  {top3[0].beer.name}
                </h3>
                <p className="text-xs text-amber-200/80 font-medium mb-3">
                  {top3[0].beer.brewery || 'Brouwerij onbekend'}
                </p>

                {top3[0].latestTasting?.notes && (
                  <p className="text-xs text-zinc-300 line-clamp-3 italic bg-zinc-950/60 p-3 rounded-xl border border-amber-500/20 leading-relaxed">
                    &ldquo;{top3[0].latestTasting.notes}&rdquo;
                  </p>
                )}
              </div>

              <div className="pt-3 border-t border-amber-500/20 flex items-center justify-between text-xs text-zinc-400 mt-4">
                <span className="text-amber-300 font-medium">
                  {categoryMap.get(top3[0].beer.categoryId)?.name}
                </span>
                <span className="font-bold text-zinc-200">
                  {top3[0].tastingCount}x gedronken &bull; {top3[0].beer.abv.toFixed(1)}% ABV
                </span>
              </div>
            </div>
          )}

          {/* #3 Bronze (right on desktop) */}
          {top3.length > 2 && (
            <div
              onClick={() => onSelectBeer(top3[2].beer)}
              className="order-3 md:order-3 bg-zinc-900/90 border border-amber-700/50 hover:border-amber-600 rounded-2xl p-5 shadow-lg flex flex-col justify-between cursor-pointer transition-all hover:scale-[1.01]"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-900/40 text-amber-300 border border-amber-700/50">
                    <Award className="w-3.5 h-3.5 text-amber-400" />
                    Brons &bull; #3
                  </div>
                  <RatingBadge rating={top3[2].avgRating} size="sm" />
                </div>

                <h3 className="font-bold text-lg text-zinc-100 hover:text-amber-300 transition-colors line-clamp-1">
                  {top3[2].beer.name}
                </h3>
                <p className="text-xs text-zinc-400 font-medium mb-3">
                  {top3[2].beer.brewery || 'Brouwerij onbekend'}
                </p>

                {top3[2].latestTasting?.notes && (
                  <p className="text-xs text-zinc-400 line-clamp-2 italic bg-zinc-950/40 p-2.5 rounded-lg border border-zinc-800">
                    &ldquo;{top3[2].latestTasting.notes}&rdquo;
                  </p>
                )}
              </div>

              <div className="pt-3 border-t border-zinc-800 flex items-center justify-between text-xs text-zinc-400 mt-4">
                <span>{categoryMap.get(top3[2].beer.categoryId)?.name}</span>
                <span className="font-semibold text-zinc-300">
                  {top3[2].tastingCount}x gedronken &bull; {top3[2].beer.abv.toFixed(1)}% ABV
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Full Leaderboard Table */}
      {rankedData.length === 0 ? (
        <div className="p-12 text-center bg-zinc-900/40 border border-dashed border-zinc-800 rounded-2xl">
          <Trophy className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
          <h3 className="text-base font-bold text-zinc-200 mb-1">Geen bieren in het klassement</h3>
          <p className="text-xs text-zinc-400 max-w-sm mx-auto mb-5">
            {readOnly
              ? 'Deze vriend heeft nog geen beoordeelde bieren in het klassement.'
              : 'Voeg bieren toe en geef ze een cijfer om je persoonlijke toplijst samen te stellen.'}
          </p>
          {!readOnly && (
            <button
              onClick={onAddNewBeer}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-zinc-950"
            >
              + Bier Toevoegen
            </button>
          )}
        </div>
      ) : (
        <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="p-4 border-b border-zinc-800 bg-zinc-950/40 flex items-center justify-between">
            <h3 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-400" />
              Volledig Klassement ({rankedData.length} {rankedData.length === 1 ? 'bier' : 'bieren'})
            </h3>
            <span className="text-xs text-zinc-400">Gerangschikt op gemiddeld cijfer</span>
          </div>

          <div className="divide-y divide-zinc-800/60">
            {rankedData.map((item, idx) => {
              const rank = idx + 1;
              const cat = categoryMap.get(item.beer.categoryId);

              return (
                <div
                  key={item.beer.id}
                  onClick={() => onSelectBeer(item.beer)}
                  className="p-4 hover:bg-zinc-800/40 transition-colors cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3.5">
                    {/* Rank Badge */}
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                        rank === 1
                          ? 'bg-amber-400 text-zinc-950 ring-2 ring-amber-300'
                          : rank === 2
                          ? 'bg-zinc-300 text-zinc-950 ring-2 ring-zinc-200'
                          : rank === 3
                          ? 'bg-amber-700 text-white ring-2 ring-amber-600'
                          : 'bg-zinc-800 text-zinc-400'
                      }`}
                    >
                      #{rank}
                    </div>

                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-bold text-sm text-zinc-100 hover:text-amber-300 transition-colors">
                          {item.beer.name}
                        </h4>
                        {item.beer.favorite && (
                          <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" />
                        )}
                        <span
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border"
                          style={{
                            backgroundColor: `${cat?.color || '#f59e0b'}18`,
                            borderColor: `${cat?.color || '#f59e0b'}40`,
                            color: cat?.color || '#f59e0b',
                          }}
                        >
                          {cat?.name || 'Onbekend'}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-xs text-zinc-400 mt-0.5">
                        <span>{item.beer.brewery || 'Onbekende brouwerij'}</span>
                        <span>&bull;</span>
                        <span>{item.beer.abv.toFixed(1)}% ABV</span>
                        <span>&bull;</span>
                        <span className="text-amber-400/90 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {item.tastingCount}x geproefd
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-0 border-zinc-800/60">
                    {item.latestTasting?.notes && (
                      <span className="text-xs text-zinc-400 max-w-xs truncate hidden lg:inline italic">
                        &ldquo;{item.latestTasting.notes}&rdquo;
                      </span>
                    )}
                    {!readOnly && onOpenAddTasting && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenAddTasting(item.beer);
                        }}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-500/15 hover:bg-amber-500 text-amber-300 hover:text-zinc-950 border border-amber-500/30 transition-all shadow-sm"
                        title="Nog een keer gedronken"
                      >
                        <PlusCircle className="w-3.5 h-3.5" />
                        Inchecken
                      </button>
                    )}
                    <RatingBadge rating={item.avgRating} size="md" showLabel />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
