export interface UserAccount {
  id: string;
  name: string;
  googleName?: string;
  email: string;
  role?: 'admin' | 'user';
  avatarUrl?: string;
  createdAt: string;
}

export interface FriendUser {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  beerCount: number;
  tastingCount: number;
  connectedAt: string;
}

export interface Category {
  id: string;
  name: string;
  color: string;
  description?: string;
  createdAt: string;
}

export interface Tasting {
  id: string;
  beerId: string;
  rating: number;
  notes?: string;
  location?: string;
  servingType?: 'tap' | 'fles' | 'blik';
  date: string; // ISO date string
  photoUrl?: string;
  photoPosition?: string; // e.g. "50% 30%"
  photoZoom?: number; // e.g. 1.0 - 2.5
}

export interface Beer {
  id: string;
  userId: string;
  name: string;
  brewery?: string;
  categoryId: string;
  abv: number;
  dateAdded: string; // ISO date string
  updatedAt?: string;
  favorite?: boolean;
  photoUrl?: string;
  photoPosition?: string; // e.g. "50% 30%" (x y)
  photoZoom?: number; // e.g. 1.0 - 2.5
}

export interface BeerSession {
  id: string;
  userId: string;
  title: string;
  count: number;
  date: string; // ISO date
  notes?: string;
}

export interface BeerGlass {
  id: string;
  userId: string;
  name: string;
  brand?: string;
  glassType?: string;
  quantity: number;
  volumeCl?: number;
  photoUrl?: string;
  photoPosition?: string; // e.g. "50% 30%"
  photoZoom?: number; // e.g. 1.0 - 2.5
  notes?: string;
  favorite?: boolean;
  dateAdded: string;
  updatedAt?: string;
}

export type DutchProvince =
  | 'Groningen'
  | 'Friesland'
  | 'Drenthe'
  | 'Overijssel'
  | 'Flevoland'
  | 'Gelderland'
  | 'Utrecht'
  | 'Noord-Holland'
  | 'Zuid-Holland'
  | 'Zeeland'
  | 'Noord-Brabant'
  | 'Limburg';

export type DealCategory =
  | 'glas'
  | 'proeverij'
  | 'korting'
  | 'borrelplank'
  | 'tap_takeover';

export interface PubGlassDeal {
  id: string;
  pubName: string;
  city: string;
  province: DutchProvince;
  address: string;
  lat: number;
  lng: number;
  hasActiveDeal: boolean;
  dealCategory?: DealCategory;
  dealTitle: string; // bijv. "🎁 Gratis proefglas bij 2 speciaalbieren"
  beerBrand?: string; // bijv. "La Chouffe", "Texels", "Karmeliet"
  sourceName: string; // bijv. "Untappd Verified Venue", "Brouwerij 't IJ Actiepagina", "Café Website"
  sourceUrl: string; // Verplichte klikbare bron-URL
  checkedAt: string; // ISO date string (Gecheckt op: DD-MM-YYYY)
  actieEindDatum: string; // YYYY-MM-DD
  submittedBy?: string;
  verificationSnippet?: string; // Tekstbewijs gevonden op de live webpagina
  verifiedPageTitle?: string; // Geverifieerde <title> van de doelpagina
  verifiedHttpStatus?: number; // Laatst gemeten HTTP statuscode (bijv. 200)
  verifiedLive?: boolean; // Of de URL live door de server is bevestigd
  matchedKeywords?: string[]; // Gevonden actie-trefwoorden op de pagina
}

export type PubDeal = PubGlassDeal;

export type AppLanguagePreference = 'auto' | 'nl' | 'en' | 'de' | 'fr' | 'es';

export interface UserSettings {
  lightMode: boolean; // Activeert de lichte modus (wit thema)
  language?: AppLanguagePreference; // Taalvoorkeur ('auto' = browser/telefoon taal, of handmatig gekozen taal)
  showExtrasDealBadge: boolean; // Standaard false: verbergt het groene teller-icoontje op de Extra's knop
  showNavCollectionCounts: boolean; // Toont aantal bieren/glazen in de navigatiebalk
  showExtrasTab: boolean; // Toont de Extra's knop in de navigatiebalk
  showDealScanner: boolean; // Toont de Deal Scanner bij Bier & Kroeg Acties
  defaultStartTab: 'dashboard' | 'list' | 'top' | 'categories' | 'glasses' | 'extras';
  defaultBeerPrice: number;
  defaultGlassSizeCl: number;
}

export interface PubCrawlStop {
  id: string;
  pubName: string;
  address: string;
  city?: string;
  specialty?: string;
  recommendedBeer?: string;
  notes?: string;
  lat?: number;
  lng?: number;
  visited?: boolean;
}

export interface PubCrawl {
  id: string;
  userId?: string;
  title: string;
  city: string;
  description?: string;
  stops: PubCrawlStop[];
  createdBy?: string;
  sharedBy?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface ActivePubCrawlState {
  pubCrawl: PubCrawl;
  currentStopIndex: number;
  visitedStopIds: string[];
  startedAt: string;
}

export type SortField = 'rating' | 'name' | 'abv' | 'date';
export type SortDirection = 'asc' | 'desc';
export type ViewMode = 'grid' | 'list';

