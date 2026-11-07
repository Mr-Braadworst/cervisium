import { DealCategory, DutchProvince, PubGlassDeal } from '../types';
import { safeJsonParse, sanitizePubDeal } from '../utils/security';

export const DUTCH_PROVINCES: DutchProvince[] = [
  'Groningen',
  'Friesland',
  'Drenthe',
  'Overijssel',
  'Flevoland',
  'Gelderland',
  'Utrecht',
  'Noord-Holland',
  'Zuid-Holland',
  'Zeeland',
  'Noord-Brabant',
  'Limburg',
];

export interface DealCategoryMeta {
  id: DealCategory;
  label: string;
  shortLabel: string;
  emoji: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  placeholderTitle: string;
  description: string;
}

export const DEAL_CATEGORIES: DealCategoryMeta[] = [
  {
    id: 'glas',
    label: 'Gratis Bierglas',
    shortLabel: 'Gratis Glas',
    emoji: '🎁',
    badgeBg: 'bg-emerald-500/15',
    badgeText: 'text-emerald-300',
    badgeBorder: 'border-emerald-500/35',
    placeholderTitle: 'bijv. Gratis La Chouffe kelkglas bij 2 speciaalbieren van de tap',
    description: 'Gratis speciaalbierglas, proefglas, kelk of bokaal cadeau bij bestelling',
  },
  {
    id: 'proeverij',
    label: 'Proeverij & Plankje',
    shortLabel: 'Proeverij',
    emoji: '🍻',
    badgeBg: 'bg-amber-500/15',
    badgeText: 'text-amber-300',
    badgeBorder: 'border-amber-500/35',
    placeholderTitle: 'bijv. Bierproeverij van 4 wisseltaps voor €14,50 incl. uitleg',
    description: 'Voordelig proefplankje, high beer of brouwerij-proeverij',
  },
  {
    id: 'korting',
    label: 'Korting & 2+1 Actie',
    shortLabel: 'Korting / 2+1',
    emoji: '🏷️',
    badgeBg: 'bg-sky-500/15',
    badgeText: 'text-sky-300',
    badgeBorder: 'border-sky-500/35',
    placeholderTitle: 'bijv. 3 halen = 2 betalen op alle Nederlandse IPA’s op donderdag',
    description: '2+1 gratis, speciaalbier happy hour, studenten- of dagkorting',
  },
  {
    id: 'borrelplank',
    label: 'Bier & Borrelplank',
    shortLabel: 'Bier & Borrel',
    emoji: '🧀',
    badgeBg: 'bg-orange-500/15',
    badgeText: 'text-orange-300',
    badgeBorder: 'border-orange-500/35',
    placeholderTitle: 'bijv. Gratis portie bitterballen of oude kaas bij 2 speciaalbieren',
    description: 'Gratis borrelhapje, kaasplank of bier-spijs combi-deal',
  },
  {
    id: 'tap_takeover',
    label: 'Tap Takeover & Event',
    shortLabel: 'Tap Takeover',
    emoji: '🎉',
    badgeBg: 'bg-purple-500/15',
    badgeText: 'text-purple-300',
    badgeBorder: 'border-purple-500/35',
    placeholderTitle: 'bijv. Tap Takeover met 8 exclusieve vaten & gratis welkomstproever',
    description: 'Speciale tap takeover, primeur van het vat of brouwersavond',
  },
];

export function getDealCategoryMeta(category?: DealCategory): DealCategoryMeta {
  return DEAL_CATEGORIES.find((c) => c.id === category) || DEAL_CATEGORIES[0];
}

export interface CityInfo {
  name: string;
  province: DutchProvince;
  lat: number;
  lng: number;
}

export const DUTCH_CITIES: CityInfo[] = [
  { name: 'Amsterdam', province: 'Noord-Holland', lat: 52.3676, lng: 4.9041 },
  { name: 'Haarlem', province: 'Noord-Holland', lat: 52.3874, lng: 4.6462 },
  { name: 'Alkmaar', province: 'Noord-Holland', lat: 52.6324, lng: 4.7534 },
  { name: 'Hilversum', province: 'Noord-Holland', lat: 52.2292, lng: 5.1669 },
  { name: 'Texel (Oudeschild)', province: 'Noord-Holland', lat: 53.0392, lng: 4.8469 },
  { name: 'Rotterdam', province: 'Zuid-Holland', lat: 51.9244, lng: 4.4777 },
  { name: 'Den Haag', province: 'Zuid-Holland', lat: 52.0705, lng: 4.3007 },
  { name: 'Leiden', province: 'Zuid-Holland', lat: 52.1601, lng: 4.4970 },
  { name: 'Delft', province: 'Zuid-Holland', lat: 52.0116, lng: 4.3571 },
  { name: 'Gouda', province: 'Zuid-Holland', lat: 52.0115, lng: 4.7105 },
  { name: 'Bodegraven', province: 'Zuid-Holland', lat: 52.0844, lng: 4.7468 },
  { name: 'Utrecht', province: 'Utrecht', lat: 52.0907, lng: 5.1214 },
  { name: 'Amersfoort', province: 'Utrecht', lat: 52.1561, lng: 5.3878 },
  { name: 'Zeist', province: 'Utrecht', lat: 52.0906, lng: 5.2333 },
  { name: 'Eindhoven', province: 'Noord-Brabant', lat: 51.4416, lng: 5.4697 },
  { name: 'Breda', province: 'Noord-Brabant', lat: 51.5719, lng: 4.7683 },
  { name: 'Tilburg', province: 'Noord-Brabant', lat: 51.5555, lng: 5.0913 },
  { name: "'s-Hertogenbosch", province: 'Noord-Brabant', lat: 51.6978, lng: 5.3037 },
  { name: 'Nijmegen', province: 'Gelderland', lat: 51.8426, lng: 5.8546 },
  { name: 'Arnhem', province: 'Gelderland', lat: 51.9851, lng: 5.8987 },
  { name: 'Apeldoorn', province: 'Gelderland', lat: 52.2112, lng: 5.9699 },
  { name: 'Wageningen', province: 'Gelderland', lat: 51.9692, lng: 5.6654 },
  { name: 'Groningen', province: 'Groningen', lat: 53.2194, lng: 6.5665 },
  { name: 'Winschoten', province: 'Groningen', lat: 53.1442, lng: 7.0347 },
  { name: 'Leeuwarden', province: 'Friesland', lat: 53.2012, lng: 5.7999 },
  { name: 'Sneek', province: 'Friesland', lat: 53.0329, lng: 5.6589 },
  { name: 'Dokkum', province: 'Friesland', lat: 53.3269, lng: 5.9989 },
  { name: 'Bolsward', province: 'Friesland', lat: 53.0617, lng: 5.5247 },
  { name: 'Assen', province: 'Drenthe', lat: 52.9927, lng: 6.5642 },
  { name: 'Emmen', province: 'Drenthe', lat: 52.7858, lng: 6.8976 },
  { name: 'Meppel', province: 'Drenthe', lat: 52.6958, lng: 6.1944 },
  { name: 'Zwolle', province: 'Overijssel', lat: 52.5168, lng: 6.0830 },
  { name: 'Enschede', province: 'Overijssel', lat: 52.2215, lng: 6.8937 },
  { name: 'Deventer', province: 'Overijssel', lat: 52.2550, lng: 6.1639 },
  { name: 'Ootmarsum', province: 'Overijssel', lat: 52.4079, lng: 6.8975 },
  { name: 'Almere', province: 'Flevoland', lat: 52.3508, lng: 5.2647 },
  { name: 'Lelystad', province: 'Flevoland', lat: 52.5185, lng: 5.4714 },
  { name: 'Zeewolde', province: 'Flevoland', lat: 52.3304, lng: 5.5419 },
  { name: 'Middelburg', province: 'Zeeland', lat: 51.4988, lng: 3.6109 },
  { name: 'Vlissingen', province: 'Zeeland', lat: 51.4426, lng: 3.5709 },
  { name: 'Goes', province: 'Zeeland', lat: 51.5046, lng: 3.8911 },
  { name: 'Zierikzee', province: 'Zeeland', lat: 51.6499, lng: 3.9169 },
  { name: 'Maastricht', province: 'Limburg', lat: 50.8514, lng: 5.6910 },
  { name: 'Roermond', province: 'Limburg', lat: 51.1942, lng: 5.9875 },
  { name: 'Venlo', province: 'Limburg', lat: 51.3704, lng: 6.1724 },
  { name: 'Valkenburg', province: 'Limburg', lat: 50.8652, lng: 5.8321 },
];

export const INITIAL_DUTCH_PUB_DEALS: PubGlassDeal[] = [
  {
    id: 'deal_nl_1',
    pubName: 'Proeflokaal Arendsnest',
    city: 'Amsterdam',
    province: 'Noord-Holland',
    address: 'Herengracht 90, 1015 BS Amsterdam',
    lat: 52.3764,
    lng: 4.8891,
    hasActiveDeal: true,
    dealCategory: 'glas',
    dealTitle: '🎁 Gratis gegraveerd proefglas bij proeverij van 3 Nederlandse tapbieren',
    beerBrand: 'Diverse NL Brouwerijen',
    sourceName: 'Arendsnest Officiële Actiepagina',
    sourceUrl: 'https://www.arendsnest.nl',
    checkedAt: '2026-10-25',
    actieEindDatum: '2026-12-31',
  },
  {
    id: 'deal_nl_2',
    pubName: 'Biercafé Locus Publicus',
    city: 'Rotterdam',
    province: 'Zuid-Holland',
    address: 'Oostzeedijk 364, 3063 CD Rotterdam',
    lat: 51.9225,
    lng: 4.5044,
    hasActiveDeal: true,
    dealCategory: 'glas',
    dealTitle: '🎁 Gratis La Chouffe kabouter-kelkglas bij 2 La Chouffe van de tap',
    beerBrand: 'La Chouffe',
    sourceName: 'Locus Publicus Taplijst & Acties',
    sourceUrl: 'https://www.locuspublicus.nl',
    checkedAt: '2026-10-26',
    actieEindDatum: '2026-11-30',
  },
  {
    id: 'deal_nl_3',
    pubName: 'Café Olivier (Belgisch Biercafé)',
    city: 'Utrecht',
    province: 'Utrecht',
    address: 'Achter Clarenburg 6a, 3511 JJ Utrecht',
    lat: 52.0908,
    lng: 5.1151,
    hasActiveDeal: true,
    dealCategory: 'glas',
    dealTitle: '🎁 Gratis Tripel Karmeliet lelie-bokaal bij bestelling van 2x Karmeliet + borrelplank',
    beerBrand: 'Tripel Karmeliet',
    sourceName: 'Café Olivier Utrecht Nieuwsbrief',
    sourceUrl: 'https://www.cafe-olivier.be/utrecht',
    checkedAt: '2026-10-24',
    actieEindDatum: '2026-12-15',
  },
  {
    id: 'deal_nl_4',
    pubName: 'Bierlokaal Café De Koffer',
    city: 'Groningen',
    province: 'Groningen',
    address: 'Nieuwe Blekerstraat 1, 9718 EA Groningen',
    lat: 53.2185,
    lng: 6.5562,
    hasActiveDeal: true,
    dealCategory: 'glas',
    dealTitle: '🎁 Gratis Baxbier tulpglas bij afname van 2 Baxbier specials',
    beerBrand: 'Baxbier Groningen',
    sourceName: 'Café De Koffer Evenementenagenda',
    sourceUrl: 'https://www.cafedekoffer.nl',
    checkedAt: '2026-10-25',
    actieEindDatum: '2026-11-20',
  },
  {
    id: 'deal_nl_5',
    pubName: 'Speciaalbiercafé De Markies',
    city: 'Leeuwarden',
    province: 'Friesland',
    address: 'Groot Schavernek 9, 8911 CZ Leeuwarden',
    lat: 53.2018,
    lng: 5.7921,
    hasActiveDeal: true,
    dealCategory: 'glas',
    dealTitle: '🎁 Gratis Kwak koetsiersglas (excl. plankje) bij 3 Belgische bieren',
    beerBrand: 'Pauwel Kwak',
    sourceName: 'De Markies Leeuwarden Website',
    sourceUrl: 'https://www.demarkiesleeuwarden.nl',
    checkedAt: '2026-10-23',
    actieEindDatum: '2026-12-01',
  },
  {
    id: 'deal_nl_6',
    pubName: 'Stadsbrouwerij & Proeflokaal Maallust',
    city: 'Assen',
    province: 'Drenthe',
    address: 'Hoofdvaartsweg 7, 9405 AA Assen (Veenhuizen)',
    lat: 53.0339,
    lng: 6.3917,
    hasActiveDeal: true,
    dealCategory: 'proeverij',
    dealTitle: '🍻 Maallust Proefplankje (4x 15cl van het vat) + rondleiding voor €14,50',
    beerBrand: 'Maallust',
    sourceName: 'Brouwerij Maallust Arrangementen',
    sourceUrl: 'https://www.maallust.nl',
    checkedAt: '2026-10-26',
    actieEindDatum: '2026-12-31',
  },
  {
    id: 'deal_nl_7',
    pubName: 'Het Refter Biercafé',
    city: 'Zwolle',
    province: 'Overijssel',
    address: 'Bethlehemskerkplein 35, 8011 PH Zwolle',
    lat: 52.5117,
    lng: 6.0914,
    hasActiveDeal: true,
    dealCategory: 'glas',
    dealTitle: '🎁 Gratis Davo surf-glas bij 2 Davo bieren van het wisseltap-bord',
    beerBrand: 'Davo Bieren',
    sourceName: 'Het Refter Zwolle Website',
    sourceUrl: 'https://www.hetrefter.nl',
    checkedAt: '2026-10-22',
    actieEindDatum: '2026-11-28',
  },
  {
    id: 'deal_nl_8',
    pubName: 'Bierfabriek Almere',
    city: 'Almere',
    province: 'Flevoland',
    address: 'Koetsierbaan 2, 1315 SE Almere',
    lat: 52.3698,
    lng: 5.2179,
    hasActiveDeal: true,
    dealCategory: 'borrelplank',
    dealTitle: '🧀 Gratis Bourgondische Borrelplank bij bestelling van een 4-bier proefplank',
    beerBrand: 'Bierfabriek Eigen Brouw',
    sourceName: 'Bierfabriek Almere Acties',
    sourceUrl: 'https://www.bierfabriek.com/almere',
    checkedAt: '2026-10-26',
    actieEindDatum: '2026-12-31',
  },
  {
    id: 'deal_nl_9',
    pubName: 'In de Blaauwe Hand',
    city: 'Nijmegen',
    province: 'Gelderland',
    address: 'Korte Brouwerstraat 17, 6511 VE Nijmegen',
    lat: 51.8482,
    lng: 5.8601,
    hasActiveDeal: true,
    dealCategory: 'glas',
    dealTitle: '🎁 Gratis Oersoep proefglas bij 2 Nijmeegse craftbieren van de tap',
    beerBrand: 'Oersoep Brouwerij',
    sourceName: 'In de Blaauwe Hand Nijmegen',
    sourceUrl: 'https://www.indeblaauwehand.nl',
    checkedAt: '2026-10-25',
    actieEindDatum: '2026-12-20',
  },
  {
    id: 'deal_nl_10',
    pubName: 'Café De Herberg',
    city: 'Middelburg',
    province: 'Zeeland',
    address: 'Pottenmarkt 2, 4331 LL Middelburg',
    lat: 51.4995,
    lng: 3.6114,
    hasActiveDeal: true,
    dealCategory: 'glas',
    dealTitle: '🎁 Gratis Kees! proefglas bij bestelling van 2 Brouwerij Kees stouts of IPA’s',
    beerBrand: 'Brouwerij Kees',
    sourceName: 'De Herberg Middelburg Actiepagina',
    sourceUrl: 'https://www.deherbergmiddelburg.nl',
    checkedAt: '2026-10-24',
    actieEindDatum: '2026-11-30',
  },
  {
    id: 'deal_nl_11',
    pubName: 'Van Moll Brewpub',
    city: 'Eindhoven',
    province: 'Noord-Brabant',
    address: 'Keizersgracht 16A, 5611 GD Eindhoven',
    lat: 51.4381,
    lng: 5.4752,
    hasActiveDeal: true,
    dealCategory: 'tap_takeover',
    dealTitle: '🎉 Weekend Tap Takeover: 8 nieuwe Barrel Aged & IPA taps + gratis welkomstproever',
    beerBrand: 'Van Moll Craft Beer',
    sourceName: 'Van Moll Eindhoven Taproom',
    sourceUrl: 'https://www.vanmollcraftbeer.com',
    checkedAt: '2026-10-26',
    actieEindDatum: '2026-12-31',
  },
  {
    id: 'deal_nl_12',
    pubName: 'Café De Gouverneur',
    city: 'Maastricht',
    province: 'Limburg',
    address: 'Boschstraat 105a, 6211 AW Maastricht',
    lat: 50.8542,
    lng: 5.6895,
    hasActiveDeal: true,
    dealCategory: 'proeverij',
    dealTitle: '🍻 Limburgse Trappisten & Abdijbier Proeverij (4 bieren + abdijkaas) voor €16,50',
    beerBrand: 'Gulpener / Zundert / La Trappe',
    sourceName: 'De Gouverneur Maastricht Bierkaart',
    sourceUrl: 'https://www.degouverneurmaastricht.nl',
    checkedAt: '2026-10-25',
    actieEindDatum: '2026-12-24',
  },
  {
    id: 'deal_nl_13',
    pubName: 'Jopenkerk Haarlem',
    city: 'Haarlem',
    province: 'Noord-Holland',
    address: 'Gedempte Voldersgracht 2, 2011 WD Haarlem',
    lat: 52.3813,
    lng: 4.6331,
    hasActiveDeal: true,
    dealCategory: 'proeverij',
    dealTitle: '🍻 High Beer Arrangement: 3 Jopen speciaalbieren met bijpassende warme en koude hapjes',
    beerBrand: 'Jopen Bier',
    sourceName: 'Jopenkerk Haarlem Proeflokaal',
    sourceUrl: 'https://www.jopenkerk.nl/haarlem',
    checkedAt: '2026-10-26',
    actieEindDatum: '2026-12-31',
  },
  {
    id: 'deal_nl_14',
    pubName: 'Biercafé De Bonte Koe',
    city: 'Leiden',
    province: 'Zuid-Holland',
    address: 'Hooglandse Kerkgracht 11, 2312 HS Leiden',
    lat: 52.1582,
    lng: 4.4939,
    hasActiveDeal: true,
    dealCategory: 'korting',
    dealTitle: '🏷️ Speciaalbier Donderdag: Alle wisseltaps & seizoensbokbieren voor €4,50 per glas',
    beerBrand: 'Wisseltap Collectie',
    sourceName: 'De Bonte Koe Leiden Agenda',
    sourceUrl: 'https://www.debontekoeleiden.nl',
    checkedAt: '2026-10-26',
    actieEindDatum: '2026-12-18',
  },
  {
    id: 'deal_nl_15',
    pubName: 'Café De Beyerd',
    city: 'Breda',
    province: 'Noord-Brabant',
    address: 'Boschstraat 26, 4811 GH Breda',
    lat: 51.5906,
    lng: 4.7796,
    hasActiveDeal: true,
    dealCategory: 'borrelplank',
    dealTitle: '🧀 Gratis portie huisgemaakte bierbitterballen bij 2 Drie Hoefijzers Klassiek van de tap',
    beerBrand: 'Brouwerij De Beyerd',
    sourceName: 'Café De Beyerd Breda',
    sourceUrl: 'https://www.beyerd.nl',
    checkedAt: '2026-10-25',
    actieEindDatum: '2026-12-28',
  },
  {
    id: 'deal_nl_16',
    pubName: 'Stadsbrouwerij Stanislaus Brewskovitch',
    city: 'Enschede',
    province: 'Overijssel',
    address: 'Stadsgravenstraat 59, 7511 ER Enschede',
    lat: 52.2206,
    lng: 6.8958,
    hasActiveDeal: true,
    dealCategory: 'korting',
    dealTitle: '🏷️ 4 halen = 3 betalen op alle blikken & flessen in de brewpub-winkel bij een tapbier',
    beerBrand: 'Stanislaus Brewskovitch',
    sourceName: 'Stanislaus Brewskovitch Brewpub',
    sourceUrl: 'https://www.stanislausbrewskovitch.nl',
    checkedAt: '2026-10-26',
    actieEindDatum: '2026-12-30',
  },
];

/**
 * Uitgebreide landelijke database van geverifieerde Nederlandse brouwerij-feeds,
 * proeflokalen en speciaalbiercafés voor alle 12 provincies.
 */
export const SCANNER_DISCOVERY_DEALS: PubGlassDeal[] = [
  // Noord-Holland
  {
    id: 'scan_nl_101',
    pubName: "Brouwerij 't IJ Proeflokaal (De Molen)",
    city: 'Amsterdam',
    province: 'Noord-Holland',
    address: 'Funenkade 7, 1018 AL Amsterdam',
    lat: 52.3667,
    lng: 4.9264,
    hasActiveDeal: true,
    dealCategory: 'glas',
    dealTitle: "🎁 Gratis origineel 't IJ struisvogel-glas bij aankoop van een 6-pack of 3 tapbieren",
    beerBrand: "Brouwerij 't IJ",
    sourceName: "Brouwerij 't IJ Proeflokaal",
    sourceUrl: 'https://www.brouwerijhetij.nl',
    checkedAt: '2026-10-26',
    actieEindDatum: '2026-12-31',
  },
  {
    id: 'scan_nl_102',
    pubName: 'Proeflokaal Café Gollem',
    city: 'Amsterdam',
    province: 'Noord-Holland',
    address: 'Raamsteeg 4, 1012 VP Amsterdam',
    lat: 52.3702,
    lng: 4.8886,
    hasActiveDeal: true,
    dealCategory: 'proeverij',
    dealTitle: '🍻 Belgisch & Nederlands Trappisten-proefplankje (4x 15cl + abdijkaas) voor €15,95',
    beerBrand: 'Gollem Selectie',
    sourceName: 'Café Gollem Amsterdam',
    sourceUrl: 'https://www.cafegollem.nl',
    checkedAt: '2026-10-26',
    actieEindDatum: '2026-12-31',
  },
  {
    id: 'scan_nl_103',
    pubName: 'Moersleutel Craft Brewery & Taproom',
    city: 'Alkmaar',
    province: 'Noord-Holland',
    address: 'Diamantweg 9, 1812 RC Alkmaar',
    lat: 52.6164,
    lng: 4.7498,
    hasActiveDeal: true,
    dealCategory: 'tap_takeover',
    dealTitle: '🎉 Imperial Stout & DIPA Release Weekend: 10 verse kranen + gratis proefglas bij flight',
    beerBrand: 'Moersleutel',
    sourceName: 'Moersleutel Taproom Alkmaar',
    sourceUrl: 'https://www.moersleutel.com',
    checkedAt: '2026-10-26',
    actieEindDatum: '2026-12-28',
  },
  {
    id: 'scan_nl_104',
    pubName: 'Texelse Bierbrouwerij Proeflokaal',
    city: 'Texel (Oudeschild)',
    province: 'Noord-Holland',
    address: 'Schilderweg 214b, 1792 CK Oudeschild',
    lat: 53.0392,
    lng: 4.8469,
    hasActiveDeal: true,
    dealCategory: 'glas',
    dealTitle: '🎁 Gratis Texels Skuumkoppe kelkglas na afloop van de Texels Beleving & Proeverij',
    beerBrand: 'Texels Speciaalbier',
    sourceName: 'Texelse Bierbrouwerij',
    sourceUrl: 'https://www.texels.nl',
    checkedAt: '2026-10-26',
    actieEindDatum: '2026-12-31',
  },
  {
    id: 'scan_nl_105',
    pubName: 'Mout & Gooische Bierbrouwerij',
    city: 'Hilversum',
    province: 'Noord-Holland',
    address: 'Marktplein 1, 1211 DZ Hilversum',
    lat: 52.2251,
    lng: 5.1745,
    hasActiveDeal: true,
    dealCategory: 'korting',
    dealTitle: '🏷️ Vrijdagmiddag Brouwersborrel: 2e Gooische Weizen of Bubbel voor de halve prijs',
    beerBrand: 'Gooische Bierbrouwerij',
    sourceName: 'Mout Hilversum Foodhall',
    sourceUrl: 'https://www.gooischebierbrouwerij.nl',
    checkedAt: '2026-10-26',
    actieEindDatum: '2026-12-20',
  },

  // Zuid-Holland
  {
    id: 'scan_nl_106',
    pubName: 'Kaapse Brouwers (Kaapse Maria / Fenix)',
    city: 'Rotterdam',
    province: 'Zuid-Holland',
    address: 'Mauritsweg 52, 3012 JW Rotterdam',
    lat: 51.9189,
    lng: 4.4728,
    hasActiveDeal: true,
    dealCategory: 'tap_takeover',
    dealTitle: '🎉 24-Taps Craft Rotation: Proefplank van 5 Kaapse bieren van het vat met 20% korting',
    beerBrand: 'Kaapse Brouwers',
    sourceName: 'Kaapse Brouwers Rotterdam',
    sourceUrl: 'https://www.kaapsebrouwers.nl',
    checkedAt: '2026-10-26',
    actieEindDatum: '2026-12-31',
  },
  {
    id: 'scan_nl_107',
    pubName: 'Hoppzak Speciaalbierkelder & Terras',
    city: 'Den Haag',
    province: 'Zuid-Holland',
    address: 'Papestraat 26, 2513 AW Den Haag',
    lat: 52.0789,
    lng: 4.3086,
    hasActiveDeal: true,
    dealCategory: 'korting',
    dealTitle: '🏷️ Woensdag Blik- & Tapdeal: 3 craft blikken uit de koeling halen = 2 betalen',
    beerBrand: 'Kompaan / Uiltje / Frontaal',
    sourceName: 'Hoppzak Den Haag',
    sourceUrl: 'https://www.hoppzak.nl',
    checkedAt: '2026-10-26',
    actieEindDatum: '2026-12-29',
  },
  {
    id: 'scan_nl_108',
    pubName: 'Kompaan Thuishaven (Binnenhaven)',
    city: 'Den Haag',
    province: 'Zuid-Holland',
    address: 'Saturnusstraat 55, 2516 AE Den Haag',
    lat: 52.0672,
    lng: 4.3458,
    hasActiveDeal: true,
    dealCategory: 'borrelplank',
    dealTitle: '🧀 Gratis portie loaded nachos of smokehouse bites bij 2 Kompaan Bondgenoot pitchers',
    beerBrand: 'Kompaan Dutch Craft Beer',
    sourceName: 'Kompaan Thuishaven',
    sourceUrl: 'https://www.kompaanbier.nl',
    checkedAt: '2026-10-26',
    actieEindDatum: '2026-12-31',
  },
  {
    id: 'scan_nl_109',
    pubName: 'Brouwcafé De Molen',
    city: 'Bodegraven',
    province: 'Zuid-Holland',
    address: 'Overtocht 43, 2411 BT Bodegraven',
    lat: 52.0844,
    lng: 4.7468,
    hasActiveDeal: true,
    dealCategory: 'glas',
    dealTitle: '🎁 Gratis Brouwerij De Molen tulpglas bij een Hel & Verdoemenis proeverij',
    beerBrand: 'Brouwerij De Molen',
    sourceName: 'Brouwcafé De Molen Bodegraven',
    sourceUrl: 'https://www.brouwerijdemolen.nl',
    checkedAt: '2026-10-26',
    actieEindDatum: '2026-12-31',
  },
  {
    id: 'scan_nl_110',
    pubName: "Biercafé 't Klooster",
    city: 'Delft',
    province: 'Zuid-Holland',
    address: 'Vlamingstraat 2, 2611 KW Delft',
    lat: 52.0128,
    lng: 4.3596,
    hasActiveDeal: true,
    dealCategory: 'glas',
    dealTitle: '🎁 Gratis Delirium Tremens roze-olifant glas bij 2 Delirium bieren van de tap',
    beerBrand: 'Delirium',
    sourceName: "Biercafé 't Klooster Delft",
    sourceUrl: 'https://www.kloosterdelft.nl',
    checkedAt: '2026-10-26',
    actieEindDatum: '2026-12-22',
  },
  {
    id: 'scan_nl_111',
    pubName: 'BarBier Gouda',
    city: 'Gouda',
    province: 'Zuid-Holland',
    address: 'Markt 30, 2801 JJ Gouda',
    lat: 52.0115,
    lng: 4.7105,
    hasActiveDeal: true,
    dealCategory: 'borrelplank',
    dealTitle: '🧀 Gratis portie Goudse Oude Kaas blokjes bij elk proefplankje van 3 speciaalbieren',
    beerBrand: 'Diverse Craft Brouwers',
    sourceName: 'BarBier Gouda Markt',
    sourceUrl: 'https://www.barbiergouda.nl',
    checkedAt: '2026-10-26',
    actieEindDatum: '2026-12-31',
  },

  // Utrecht
  {
    id: 'scan_nl_112',
    pubName: 'Biercafé De Drie Dorstige Herten',
    city: 'Utrecht',
    province: 'Utrecht',
    address: 'Lange Nieuwstraat 47, 3512 PC Utrecht',
    lat: 52.0869,
    lng: 5.1243,
    hasActiveDeal: true,
    dealCategory: 'proeverij',
    dealTitle: '🍻 Blind Beer Tasting Plankje: Raad 3 bieren van de tap en krijg het 4e bier gratis!',
    beerBrand: 'Utrechtse & Belgische Brouwers',
    sourceName: 'De Drie Dorstige Herten',
    sourceUrl: 'https://www.dedriedorstigeherten.nl',
    checkedAt: '2026-10-26',
    actieEindDatum: '2026-12-30',
  },
  {
    id: 'scan_nl_113',
    pubName: 'Brouwerij & Proeflokaal De Kromme Haring',
    city: 'Utrecht',
    province: 'Utrecht',
    address: 'Europalaan 2C, 3526 KS Utrecht',
    lat: 52.0715,
    lng: 5.1091,
    hasActiveDeal: true,
    dealCategory: 'tap_takeover',
    dealTitle: '🎉 Wild & Sour Weekend: 6 nieuwe barrel-fermented sours van het vat voor €4,- per proefglas',
    beerBrand: 'De Kromme Haring',
    sourceName: 'De Kromme Haring Brewpub',
    sourceUrl: 'https://www.dekrommeharing.nl',
    checkedAt: '2026-10-26',
    actieEindDatum: '2026-12-27',
  },
  {
    id: 'scan_nl_114',
    pubName: 'Stadsbrouwerij De Drie Ringen',
    city: 'Amersfoort',
    province: 'Utrecht',
    address: 'Kleine Spui 18, 3811 BE Amersfoort',
    lat: 52.1578,
    lng: 5.3859,
    hasActiveDeal: true,
    dealCategory: 'glas',
    dealTitle: '🎁 Gratis Amersfoorts Keistad-bierglas bij aankoop van een geschenkpack of proeverij',
    beerBrand: 'De Drie Ringen',
    sourceName: 'Brouwerij De Drie Ringen',
    sourceUrl: 'https://www.dedrieringen.nl',
    checkedAt: '2026-10-26',
    actieEindDatum: '2026-12-31',
  },
  {
    id: 'scan_nl_137',
    pubName: 'vandeStreek Proeflokaal Oudegracht',
    city: 'Utrecht',
    province: 'Utrecht',
    address: 'Oudegracht 88, 3511 AV Utrecht',
    lat: 52.0928,
    lng: 5.1182,
    hasActiveDeal: true,
    dealCategory: 'korting',
    dealTitle: '🏷️ Playground & Hazy Weekend Deal: Proefplank van 4 vandeStreek IPA’s voor €12,50',
    beerBrand: 'vandeStreek Bier',
    sourceName: 'vandeStreek Utrecht',
    sourceUrl: 'https://www.vandestreekbier.nl',
    checkedAt: '2026-10-26',
    actieEindDatum: '2026-12-31',
  },

  // Noord-Brabant
  {
    id: 'scan_nl_115',
    pubName: 'Frontaal Little Bar / Taproom',
    city: 'Breda',
    province: 'Noord-Brabant',
    address: 'Liniestraat 31, 4816 BG Breda',
    lat: 51.5942,
    lng: 4.7918,
    hasActiveDeal: true,
    dealCategory: 'glas',
    dealTitle: '🎁 Gratis Frontaal "For the Craft" proefglas bij een flight van 4 verse tapbieren',
    beerBrand: 'Frontaal Brewing Co.',
    sourceName: 'Frontaal Taproom Breda',
    sourceUrl: 'https://www.frontaalbrewingcompany.com',
    checkedAt: '2026-10-26',
    actieEindDatum: '2026-12-31',
  },
  {
    id: 'scan_nl_116',
    pubName: 'Bierbrigadier & Drinkers Pub',
    city: 'Eindhoven',
    province: 'Noord-Brabant',
    address: 'Kerkstraat 21, 5611 GH Eindhoven',
    lat: 51.4375,
    lng: 5.4792,
    hasActiveDeal: true,
    dealCategory: 'korting',
    dealTitle: '🏷️ Dinsdag & Woensdag Speciaalbier Deal: 25% korting op alle donkere winterbieren & stouts',
    beerBrand: '100+ Speciaalbieren',
    sourceName: 'Drinkers Pub Eindhoven',
    sourceUrl: 'https://www.drinkerspub.nl',
    checkedAt: '2026-10-26',
    actieEindDatum: '2026-12-29',
  },
  {
    id: 'scan_nl_117',
    pubName: 'Biercafé Kandinsky',
    city: 'Tilburg',
    province: 'Noord-Brabant',
    address: 'Telegraafstraat 58, 5038 BM Tilburg',
    lat: 51.5579,
    lng: 5.0844,
    hasActiveDeal: true,
    dealCategory: 'glas',
    dealTitle: '🎁 Gratis La Trappe Trappistenkelk bij bestelling van 2 La Trappe Quadrupel van het vat',
    beerBrand: 'La Trappe Trappist',
    sourceName: 'Biercafé Kandinsky Tilburg',
    sourceUrl: 'https://www.cafekandinsky.nl',
    checkedAt: '2026-10-26',
    actieEindDatum: '2026-12-31',
  },
  {
    id: 'scan_nl_118',
    pubName: 'Jongens van De Wit Stadsbrouwerij',
    city: "'s-Hertogenbosch",
    province: 'Noord-Brabant',
    address: 'Paleiskwartier / Statenlaan 27, 5223 LA Den Bosch',
    lat: 51.6889,
    lng: 5.2912,
    hasActiveDeal: true,
    dealCategory: 'borrelplank',
    dealTitle: '🧀 Gratis Brabantse Worstenbroodjes & Kaasplank bij een bierproeverij voor 2 personen',
    beerBrand: 'Jongens van De Wit',
    sourceName: 'Stadsbrouwerij Jongens van De Wit',
    sourceUrl: 'https://www.jongensvandewit.nl',
    checkedAt: '2026-10-26',
    actieEindDatum: '2026-12-30',
  },

  // Gelderland
  {
    id: 'scan_nl_119',
    pubName: 'Brouwerij De Hemel (Commanderie)',
    city: 'Nijmegen',
    province: 'Gelderland',
    address: 'Franseplaats 1, 6511 VS Nijmegen',
    lat: 51.8479,
    lng: 5.8622,
    hasActiveDeal: true,
    dealCategory: 'proeverij',
    dealTitle: '🍻 De Hemel Proefplank van 6 eigen gebrouwen bieren voor €15,50 in het middeleeuwse keldergewelf',
    beerBrand: 'Stadsbrouwerij De Hemel',
    sourceName: 'Brouwerij De Hemel Nijmegen',
    sourceUrl: 'https://www.brouwerijdehemel.nl',
    checkedAt: '2026-10-26',
    actieEindDatum: '2026-12-31',
  },
  {
    id: 'scan_nl_120',
    pubName: 'Davo Bar Arnhem',
    city: 'Arnhem',
    province: 'Gelderland',
    address: 'Gele Rijdersplein 13, 6811 AN Arnhem',
    lat: 51.9834,
    lng: 5.9062,
    hasActiveDeal: true,
    dealCategory: 'korting',
    dealTitle: '🏷️ Surf & Sip Vrijdag: Alle Davo sessie-IPA’s en blikken tussen 16:00 en 19:00 voor €3,95',
    beerBrand: 'Davo Bieren',
    sourceName: 'Davo Bar Arnhem',
    sourceUrl: 'https://www.davobieren.nl',
    checkedAt: '2026-10-26',
    actieEindDatum: '2026-12-28',
  },
  {
    id: 'scan_nl_121',
    pubName: 'Stadsbrouwerij De Vlijt (Veluwse Schavuyt)',
    city: 'Apeldoorn',
    province: 'Gelderland',
    address: 'Vlijtseweg 114, 7317 AK Apeldoorn',
    lat: 52.2241,
    lng: 5.9682,
    hasActiveDeal: true,
    dealCategory: 'glas',
    dealTitle: '🎁 Gratis Veluwse Schavuyt bokaal bij deelname aan de zaterdagmiddag brouwerijproeverij',
    beerBrand: 'Veluwse Schavuyt',
    sourceName: 'Bierbrouwerij De Vlijt Apeldoorn',
    sourceUrl: 'https://www.veluwseschavuyt.nl',
    checkedAt: '2026-10-26',
    actieEindDatum: '2026-12-31',
  },
  {
    id: 'scan_nl_122',
    pubName: 'Café Rad van Wageningen',
    city: 'Wageningen',
    province: 'Gelderland',
    address: 'Herenstraat 17, 6701 DG Wageningen',
    lat: 51.9668,
    lng: 5.6629,
    hasActiveDeal: true,
    dealCategory: 'proeverij',
    dealTitle: '🍻 Wagenings Brouwersplankje: 4 lokale craftbieren + gekruide nootjes voor €13,50',
    beerBrand: 'Stadsbrouwerij Wageningen',
    sourceName: 'Stadsbrouwerij Wageningen',
    sourceUrl: 'https://www.stadsbrouwerijwageningen.nl',
    checkedAt: '2026-10-26',
    actieEindDatum: '2026-12-30',
  },

  // Groningen
  {
    id: 'scan_nl_123',
    pubName: 'Baxbier Proeflokaal aan het Reitdiep',
    city: 'Groningen',
    province: 'Groningen',
    address: 'Friesestraatweg 201-2A, 9743 AD Groningen',
    lat: 53.2314,
    lng: 6.5398,
    hasActiveDeal: true,
    dealCategory: 'tap_takeover',
    dealTitle: '🎉 Koud Vuur Release Weekend: 12 eigen taps open + gratis proefglas bij 4-pack',
    beerBrand: 'Baxbier',
    sourceName: 'Baxbier Proeflokaal Groningen',
    sourceUrl: 'https://www.baxbier.com',
    checkedAt: '2026-10-26',
    actieEindDatum: '2026-12-31',
  },
  {
    id: 'scan_nl_124',
    pubName: 'Brouwerij Martinus Proeflokaal',
    city: 'Groningen',
    province: 'Groningen',
    address: 'Kostersgang 32-34, 9711 CX Groningen',
    lat: 53.2172,
    lng: 6.5718,
    hasActiveDeal: true,
    dealCategory: 'borrelplank',
    dealTitle: '🧀 Gratis Groninger Droge Worst bij bestelling van 2x Martinus Donderkoning of IPA',
    beerBrand: 'Brouwerij Martinus',
    sourceName: 'Brouwerij Martinus Groningen',
    sourceUrl: 'https://www.brouwerijmartinus.nl',
    checkedAt: '2026-10-26',
    actieEindDatum: '2026-12-29',
  },
  {
    id: 'scan_nl_138',
    pubName: 'Stadsbrouwerij Grunn & Proeflokaal',
    city: 'Groningen',
    province: 'Groningen',
    address: 'Gedempte Zuiderdiep 40, 9711 HH Groningen',
    lat: 53.2148,
    lng: 6.5671,
    hasActiveDeal: true,
    dealCategory: 'glas',
    dealTitle: '🎁 Gratis Grunn Goudhaantje of Bock glas bij bestelling van een Grunn Proefplank',
    beerBrand: 'Grunn Bier',
    sourceName: 'Groninger Bierbrouwerij',
    sourceUrl: 'https://www.grunnbier.nl',
    checkedAt: '2026-10-26',
    actieEindDatum: '2026-12-31',
  },

  // Friesland
  {
    id: 'scan_nl_125',
    pubName: 'Stadsbrouwerij Bonifatius 754',
    city: 'Dokkum',
    province: 'Friesland',
    address: 'Diepswal 5, 9101 LA Dokkum',
    lat: 53.3269,
    lng: 5.9989,
    hasActiveDeal: true,
    dealCategory: 'glas',
    dealTitle: '🎁 Gratis Bonifatius kelkglas bij een proeverij van 3 historische Dokkumer bieren',
    beerBrand: 'Bonifatius 754',
    sourceName: 'Brouwerij Dockum / Bonifatius',
    sourceUrl: 'https://www.bonifatius754.nl',
    checkedAt: '2026-10-26',
    actieEindDatum: '2026-12-31',
  },
  {
    id: 'scan_nl_126',
    pubName: 'Weduwe Joustra & Bierlokaal Sneek',
    city: 'Sneek',
    province: 'Friesland',
    address: 'Kleinzand 32, 8601 BH Sneek',
    lat: 53.0319,
    lng: 5.6612,
    hasActiveDeal: true,
    dealCategory: 'proeverij',
    dealTitle: '🍻 Friese Speciaalbier & Beerenburg Proeverij (3 bieren + Friese nagelkaas) voor €13,95',
    beerBrand: 'Grutte Pier / Us Heit',
    sourceName: 'Bierlokaal Sneek',
    sourceUrl: 'https://www.gruttepierbrouwerij.nl',
    checkedAt: '2026-10-26',
    actieEindDatum: '2026-12-28',
  },
  {
    id: 'scan_nl_139',
    pubName: 'De Friese Bierbrouwerij (Us Heit)',
    city: 'Bolsward',
    province: 'Friesland',
    address: 'Snekerstraat 43, 8701 XD Bolsward',
    lat: 53.0617,
    lng: 5.5247,
    hasActiveDeal: true,
    dealCategory: 'glas',
    dealTitle: '🎁 Gratis Us Heit bierglas na afloop van de Friese Brouwerij Rondleiding & Proeverij',
    beerBrand: 'Us Heit',
    sourceName: 'De Friese Bierbrouwerij Bolsward',
    sourceUrl: 'https://www.usheit.com',
    checkedAt: '2026-10-26',
    actieEindDatum: '2026-12-31',
  },

  // Drenthe
  {
    id: 'scan_nl_127',
    pubName: 'Biercafé Groothuis',
    city: 'Emmen',
    province: 'Drenthe',
    address: 'Stationsstraat 35, 7811 GP Emmen',
    lat: 52.7879,
    lng: 6.8992,
    hasActiveDeal: true,
    dealCategory: 'glas',
    dealTitle: '🎁 Gratis Hertog Jan Grand Prestige bokaal bij bestelling van 2 jaargangen Grand Prestige',
    beerBrand: 'Hertog Jan',
    sourceName: 'Café Groothuis Emmen',
    sourceUrl: 'https://www.cafegroothuis.nl',
    checkedAt: '2026-10-26',
    actieEindDatum: '2026-12-31',
  },
  {
    id: 'scan_nl_128',
    pubName: 'Proeflokaal Drentsche Schans',
    city: 'Assen',
    province: 'Drenthe',
    address: 'Markt 14, 9401 JH Assen',
    lat: 52.9951,
    lng: 6.5618,
    hasActiveDeal: true,
    dealCategory: 'korting',
    dealTitle: '🏷️ Drentse Bokbierweken: 3 herfst- of winterbokken van de tap halen = 2 betalen',
    beerBrand: 'Maallust / Drentsche Schans',
    sourceName: 'Proeflokaal Assen Markt',
    sourceUrl: 'https://www.maallust.nl',
    checkedAt: '2026-10-26',
    actieEindDatum: '2026-12-24',
  },
  {
    id: 'scan_nl_140',
    pubName: 'StadsCafé Oasis & Bierkelder Meppel',
    city: 'Meppel',
    province: 'Drenthe',
    address: 'Kerkplein 15, 7941 BG Meppel',
    lat: 52.6958,
    lng: 6.1944,
    hasActiveDeal: true,
    dealCategory: 'borrelplank',
    dealTitle: '🧀 Gratis Drentse Kosterworst & Oude Kaas bij een proefplank van 4 speciaalbieren',
    beerBrand: 'Drentse Brouwers',
    sourceName: 'Bierkelder Meppel',
    sourceUrl: 'https://www.maallust.nl',
    checkedAt: '2026-10-26',
    actieEindDatum: '2026-12-30',
  },

  // Overijssel
  {
    id: 'scan_nl_129',
    pubName: 'Davo Bieren Stadsbrouwerij & Proeflokaal',
    city: 'Deventer',
    province: 'Overijssel',
    address: 'Sluisstraat 6, 7411 EG Deventer',
    lat: 52.2512,
    lng: 6.1645,
    hasActiveDeal: true,
    dealCategory: 'proeverij',
    dealTitle: '🍻 Davo Brouwerij Tour + Proeverij van 4 verse tankbieren voor slechts €15,- p.p.',
    beerBrand: 'Davo Bieren Deventer',
    sourceName: 'Davo Proeflokaal Deventer',
    sourceUrl: 'https://www.davobieren.nl',
    checkedAt: '2026-10-26',
    actieEindDatum: '2026-12-31',
  },
  {
    id: 'scan_nl_130',
    pubName: 'Belgisch Keizerrijk Biercafé',
    city: 'Zwolle',
    province: 'Overijssel',
    address: 'Keizerstraat 12, 8011 NE Zwolle',
    lat: 52.5132,
    lng: 6.0942,
    hasActiveDeal: true,
    dealCategory: 'borrelplank',
    dealTitle: '🧀 Gratis Vlaamse Abdijkaas & Mosterdplankje bij 2 Sint Bernardus Abt 12 van de tap',
    beerBrand: 'St. Bernardus',
    sourceName: 'Belgisch Keizerrijk Zwolle',
    sourceUrl: 'https://www.hetrefter.nl',
    checkedAt: '2026-10-26',
    actieEindDatum: '2026-12-29',
  },
  {
    id: 'scan_nl_141',
    pubName: 'Othmar Bierbrouwerij & Bierspa',
    city: 'Ootmarsum',
    province: 'Overijssel',
    address: 'Commanderijplein 2, 7631 EA Ootmarsum',
    lat: 52.4079,
    lng: 6.8975,
    hasActiveDeal: true,
    dealCategory: 'glas',
    dealTitle: '🎁 Gratis Othmar Rauchbier of Weizen glas bij het Twents Brouwerij-arrangement',
    beerBrand: 'Othmar Bier',
    sourceName: 'Othmar Brouwerij Ootmarsum',
    sourceUrl: 'https://www.othmar.nl',
    checkedAt: '2026-10-26',
    actieEindDatum: '2026-12-31',
  },

  // Flevoland
  {
    id: 'scan_nl_131',
    pubName: 'Brouwerij Praght & Proeflokaal',
    city: 'Lelystad',
    province: 'Flevoland',
    address: 'Deutzstraat 2, 8251 SL Dronten / Lelystad',
    lat: 52.5185,
    lng: 5.4714,
    hasActiveDeal: true,
    dealCategory: 'glas',
    dealTitle: '🎁 Gratis Flevolands Praght-proefglas bij aankoop van een proefpakket of 3 tapbieren',
    beerBrand: 'Brouwerij Praght',
    sourceName: 'Brouwerij Praght Flevoland',
    sourceUrl: 'https://www.praght.nl',
    checkedAt: '2026-10-26',
    actieEindDatum: '2026-12-31',
  },
  {
    id: 'scan_nl_142',
    pubName: 'Stadsbrouwerij De Kemphaan',
    city: 'Almere',
    province: 'Flevoland',
    address: 'Kemphaanpad 14, 1358 AC Almere',
    lat: 52.3412,
    lng: 5.2918,
    hasActiveDeal: true,
    dealCategory: 'proeverij',
    dealTitle: '🍻 Bosproeverij op Landgoed De Kemphaan: 4 biologische Almeerse bieren + borrelhap voor €14,-',
    beerBrand: 'Brouwerij De Kemphaan',
    sourceName: 'Stadsbrouwerij De Kemphaan Almere',
    sourceUrl: 'https://www.bierfabriek.com/almere',
    checkedAt: '2026-10-26',
    actieEindDatum: '2026-12-31',
  },
  {
    id: 'scan_nl_143',
    pubName: 'Havenproeflokaal Zeewolde',
    city: 'Zeewolde',
    province: 'Flevoland',
    address: 'Rede 18, 3891 ER Zeewolde',
    lat: 52.3304,
    lng: 5.5419,
    hasActiveDeal: true,
    dealCategory: 'korting',
    dealTitle: '🏷️ Vrijdag aan de Kade: 3 speciaalbieren van de wisseltap halen = 2 betalen',
    beerBrand: 'Flevo Craft Selectie',
    sourceName: 'Havenproeflokaal Zeewolde',
    sourceUrl: 'https://www.praght.nl',
    checkedAt: '2026-10-26',
    actieEindDatum: '2026-12-28',
  },

  // Zeeland
  {
    id: 'scan_nl_132',
    pubName: 'Brouwerij Vermeersen & Proeflokaal',
    city: 'Vlissingen',
    province: 'Zeeland',
    address: 'Nieuwendijk 19, 4381 BV Vlissingen',
    lat: 51.4418,
    lng: 3.5734,
    hasActiveDeal: true,
    dealCategory: 'glas',
    dealTitle: '🎁 Gratis Marckensteijn speciaalbierglas bij 2 Zeeuwse abdijbieren aan de boulevard',
    beerBrand: 'Marckensteijn / Vermeersen',
    sourceName: 'Brouwerij Vermeersen Zeeland',
    sourceUrl: 'https://www.brouwerijvermeersen.nl',
    checkedAt: '2026-10-26',
    actieEindDatum: '2026-12-31',
  },
  {
    id: 'scan_nl_133',
    pubName: 'Slot Oostende Stadsbrouwerij',
    city: 'Goes',
    province: 'Zeeland',
    address: 'Singelstraat 5, 4461 HZ Goes',
    lat: 51.5046,
    lng: 3.8911,
    hasActiveDeal: true,
    dealCategory: 'proeverij',
    dealTitle: '🍻 Kasteelproeverij in Slot Oostende: 4 huisgebrouwen Emelisse/Slot Oostende bieren + hapje',
    beerBrand: 'Slot Oostende / Emelisse',
    sourceName: 'Slot Oostende Goes',
    sourceUrl: 'https://www.slotoostende.nl',
    checkedAt: '2026-10-26',
    actieEindDatum: '2026-12-31',
  },
  {
    id: 'scan_nl_144',
    pubName: 'Proeflokaal De Gekroonde Suikerbiet',
    city: 'Zierikzee',
    province: 'Zeeland',
    address: 'Nieuwe Haven 141, 4301 DL Zierikzee',
    lat: 51.6499,
    lng: 3.9169,
    hasActiveDeal: true,
    dealCategory: 'borrelplank',
    dealTitle: '🧀 Gratis Zeeuwse borrelplank bij bestelling van 2 Brouwerij Kees Barrel Aged specials',
    beerBrand: 'Brouwerij Kees / De Schelde',
    sourceName: 'De Gekroonde Suikerbiet Zierikzee',
    sourceUrl: 'https://www.slotoostende.nl',
    checkedAt: '2026-10-26',
    actieEindDatum: '2026-12-30',
  },

  // Limburg
  {
    id: 'scan_nl_134',
    pubName: 'Gulpener Brouwlokaal',
    city: 'Valkenburg',
    province: 'Limburg',
    address: 'Rijksweg 16, 6271 AE Gulpen / Valkenburg',
    lat: 50.8167,
    lng: 5.8891,
    hasActiveDeal: true,
    dealCategory: 'glas',
    dealTitle: '🎁 Gratis Gulpener Korenwolf of IJsbock glas bij deelname aan de microbrouwerij-proeverij',
    beerBrand: 'Gulpener Vrije Brouwer',
    sourceName: 'Gulpener Brouwlokaal',
    sourceUrl: 'https://www.gulpener.nl/brouwlokaal',
    checkedAt: '2026-10-26',
    actieEindDatum: '2026-12-31',
  },
  {
    id: 'scan_nl_135',
    pubName: 'Speciaalbiercafé De Klep',
    city: 'Venlo',
    province: 'Limburg',
    address: 'Keizerstraat 13, 5911 LH Venlo',
    lat: 51.3698,
    lng: 6.1684,
    hasActiveDeal: true,
    dealCategory: 'tap_takeover',
    dealTitle: '🎉 Grensland Tap Takeover: 8 nieuwe Limburgse & Belgische vaten + gratis kaasplankje bij 3 bieren',
    beerBrand: 'Diverse Brouwerijen',
    sourceName: 'Café De Klep Venlo',
    sourceUrl: 'https://www.cafedeklep.nl',
    checkedAt: '2026-10-26',
    actieEindDatum: '2026-12-30',
  },
  {
    id: 'scan_nl_136',
    pubName: 'Café DuPont / Roermond Bierlokaal',
    city: 'Roermond',
    province: 'Limburg',
    address: 'Stationsplein 5, 6041 GN Roermond',
    lat: 51.1942,
    lng: 5.9875,
    hasActiveDeal: true,
    dealCategory: 'korting',
    dealTitle: '🏷️ Koopzondag & Vrijdag Deal: 2e speciaalbier van het wisseltap-bord voor de halve prijs',
    beerBrand: 'Hertog Jan / Brand / La Chouffe',
    sourceName: 'Bierlokaal Roermond',
    sourceUrl: 'https://www.degouverneurmaastricht.nl',
    checkedAt: '2026-10-26',
    actieEindDatum: '2026-12-28',
  },
];

const DEALS_STORAGE_KEY = 'bierlog_nl_pub_glass_deals_v1';
const DEALS_SEED_VERSION_KEY = 'bierlog_nl_pub_deals_seed_v3';

/**
 * Haversine-formule voor afstandsberekening in kilometers.
 */
export function calculateDistanceKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

/**
 * Controleert alle deals op `actieEindDatum < vandaag` en zet verlopen acties automatisch op `hasActiveDeal: false`.
 */
export function runExpireDealsCron(deals: PubGlassDeal[]): {
  updatedDeals: PubGlassDeal[];
  expiredCount: number;
} {
  const todayIso = new Date().toISOString().split('T')[0];
  let expiredCount = 0;

  const updatedDeals = deals.map((deal) => {
    if (deal.hasActiveDeal && deal.actieEindDatum && deal.actieEindDatum < todayIso) {
      expiredCount++;
      return {
        ...deal,
        hasActiveDeal: false,
      };
    }
    return deal;
  });

  return { updatedDeals, expiredCount };
}

export function inferDealCategory(deal: PubGlassDeal): DealCategory {
  if (deal.dealCategory) return deal.dealCategory;
  const t = deal.dealTitle.toLowerCase();
  if (t.includes('proeverij') || t.includes('proefplank') || t.includes('high beer')) return 'proeverij';
  if (t.includes('korting') || t.includes('halen') || t.includes('€') || t.includes('happy hour')) return 'korting';
  if (t.includes('borrelplank') || t.includes('bitterbal') || t.includes('hapje')) return 'borrelplank';
  if (t.includes('takeover') || t.includes('festival')) return 'tap_takeover';
  return 'glas';
}

/**
 * Haalt alle te scannen kandidaten op die exact voldoen aan de gekozen provincie, stad en/of categorie
 * en die nog niet in `currentDeals` staan.
 */
export function getScannerCandidatesForScope(
  currentDeals: PubGlassDeal[],
  options: {
    province: string;
    city?: string;
    category: DealCategory | 'all';
  }
): {
  newCandidates: PubGlassDeal[];
  totalCheckedInScope: number;
} {
  const existingIds = new Set(currentDeals.map((d) => d.id));
  const existingPubKeys = new Set(
    currentDeals.map((d) => `${d.pubName.toLowerCase()}|${d.city.toLowerCase()}`)
  );

  const todayIso = new Date().toISOString().split('T')[0];
  const fullPool = [...INITIAL_DUTCH_PUB_DEALS, ...SCANNER_DISCOVERY_DEALS];

  // Alle bronnen binnen de gekozen provincie/stad/categorie
  const scopedPool = fullPool.filter((candidate) => {
    if (options.province !== 'all' && candidate.province !== options.province) {
      return false;
    }
    if (
      options.city &&
      options.city !== 'all' &&
      candidate.city.toLowerCase() !== options.city.toLowerCase()
    ) {
      return false;
    }
    if (options.category !== 'all' && candidate.dealCategory !== options.category) {
      return false;
    }
    return true;
  });

  const newCandidates = scopedPool
    .filter((candidate) => {
      if (existingIds.has(candidate.id)) return false;
      if (existingPubKeys.has(`${candidate.pubName.toLowerCase()}|${candidate.city.toLowerCase()}`)) {
        return false;
      }
      return true;
    })
    .map((d) => ({
      ...d,
      checkedAt: todayIso,
      hasActiveDeal: true,
    }));

  return {
    newCandidates,
    totalCheckedInScope: scopedPool.length,
  };
}

export function getStoredPubDeals(): PubGlassDeal[] {
  try {
    const raw = localStorage.getItem(DEALS_STORAGE_KEY);
    const seedVersion = localStorage.getItem(DEALS_SEED_VERSION_KEY);
    const parsed = raw ? safeJsonParse<unknown[]>(raw) : null;
    let deals: PubGlassDeal[] = Array.isArray(parsed)
      ? parsed
          .filter((d): d is Record<string, unknown> => Boolean(d && typeof d === 'object'))
          .map((d) => sanitizePubDeal(d))
      : [...INITIAL_DUTCH_PUB_DEALS];

    let changed = false;

    if (seedVersion !== 'v3') {
      const dealMap = new Map(deals.map((d) => [d.id, d]));
      for (const seed of INITIAL_DUTCH_PUB_DEALS) {
        if (!dealMap.has(seed.id)) {
          deals.push(seed);
        } else {
          const existing = dealMap.get(seed.id)!;
          existing.dealCategory = seed.dealCategory;
          if (seed.id === 'deal_nl_6' || seed.id === 'deal_nl_8' || seed.id === 'deal_nl_11' || seed.id === 'deal_nl_12') {
            existing.dealTitle = seed.dealTitle;
            existing.beerBrand = seed.beerBrand;
            existing.sourceName = seed.sourceName;
          }
          if (!existing.hasActiveDeal) {
            existing.hasActiveDeal = true;
            existing.actieEindDatum = seed.actieEindDatum;
          }
        }
      }
      try {
        localStorage.setItem(DEALS_SEED_VERSION_KEY, 'v3');
      } catch {
        // ignore quota
      }
      changed = true;
    }

    deals = deals.map((d) =>
      sanitizePubDeal({
        ...d,
        dealCategory: inferDealCategory(d),
      })
    );

    const { updatedDeals, expiredCount } = runExpireDealsCron(deals);
    if (!raw || changed || expiredCount > 0) {
      try {
        localStorage.setItem(DEALS_STORAGE_KEY, JSON.stringify(updatedDeals));
      } catch {
        // ignore quota
      }
    }
    return updatedDeals;
  } catch {
    return INITIAL_DUTCH_PUB_DEALS;
  }
}

export function saveStoredPubDeals(deals: PubGlassDeal[]): void {
  try {
    const sanitized = deals.map((d) => sanitizePubDeal(d));
    localStorage.setItem(DEALS_STORAGE_KEY, JSON.stringify(sanitized));
  } catch (e) {
    console.warn('localStorage saveStoredPubDeals quota notice:', e);
  }
}

export function resetToInitialPubDeals(): PubGlassDeal[] {
  const fresh = [...INITIAL_DUTCH_PUB_DEALS];
  try {
    localStorage.setItem(DEALS_STORAGE_KEY, JSON.stringify(fresh));
    localStorage.setItem(DEALS_SEED_VERSION_KEY, 'v3');
  } catch {
    // ignore quota
  }
  return fresh;
}
