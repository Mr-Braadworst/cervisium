import { ActivePubCrawlState, PubCrawl, PubCrawlStop, PubDeal } from '../types';
import { buildServerAuthHeaders } from './storage';

const PUB_CRAWLS_STORAGE_PREFIX = 'cervisium_pub_crawls_v1_';
const ACTIVE_PUB_CRAWL_STORAGE_PREFIX = 'cervisium_active_pub_crawl_v1_';

export type PubCrawlTheme = 'speciaalbier' | 'bruin' | 'mix';

interface CuratedPubStop {
  pubName: string;
  address: string;
  city: string;
  specialty: string;
  recommendedBeer: string;
  themeTag: 'speciaalbier' | 'bruin' | 'mix';
  lat?: number;
  lng?: number;
}

const CURATED_PUBS_BY_CITY: Record<string, CuratedPubStop[]> = {
  utrecht: [
    {
      pubName: 'Kafé België',
      address: 'Oudegracht 196, Utrecht',
      city: 'Utrecht',
      specialty: 'Iconisch biercafé aan de Oudegracht met meer dan 200 speciaalbieren',
      recommendedBeer: 'Belgische Tripel of Geuze van de wisseltap',
      themeTag: 'speciaalbier',
      lat: 52.0888,
      lng: 5.1211,
    },
    {
      pubName: 'Olivier Belgian Beer Café',
      address: 'Achter Clarenburg 6A, Utrecht',
      city: 'Utrecht',
      specialty: 'Gevestigd in een voormalige schuilkerk met hoog plafond en Belgische klassiekers',
      recommendedBeer: 'La Chouffe of St. Bernardus Abt 12',
      themeTag: 'speciaalbier',
      lat: 52.0908,
      lng: 5.1152,
    },
    {
      pubName: 'De Drie Dorstige Herten',
      address: 'Lange Nieuwstraat 47, Utrecht',
      city: 'Utrecht',
      specialty: 'Intiem en huiskamerachtig proeflokaal met bijzondere Nederlandse en buitenlandse bieren',
      recommendedBeer: 'Lokaal gebrouwen Craft IPA of Barrel Aged Stout',
      themeTag: 'speciaalbier',
      lat: 52.0871,
      lng: 5.1243,
    },
    {
      pubName: 'Brouwerij Maximus Proeflokaal',
      address: 'Pratumplaats 2A, Utrecht',
      city: 'Utrecht',
      specialty: 'Utrechtse brouwerij met koperen brouwketels en zonnig terras',
      recommendedBeer: 'Maximus Pandora of Brutus',
      themeTag: 'speciaalbier',
      lat: 52.0825,
      lng: 5.0598,
    },
    {
      pubName: 'Café Derat',
      address: 'Lange Smeestraat 7, Utrecht',
      city: 'Utrecht',
      specialty: 'Authentiek bruin speciaalbiercafé zonder muziek, puur gericht op gezelligheid en goed bier',
      recommendedBeer: 'Donkere Trappist of Saison',
      themeTag: 'bruin',
      lat: 52.0863,
      lng: 5.1218,
    },
    {
      pubName: 'Taphuys Utrecht',
      address: 'Mariaplaats 11, Utrecht',
      city: 'Utrecht',
      specialty: 'Zelf tientallen speciaalbieren tappen van de tapwand midden op de Mariaplaats',
      recommendedBeer: 'Proefglas van de tapwand',
      themeTag: 'mix',
      lat: 52.0897,
      lng: 5.1165,
    },
  ],
  amsterdam: [
    {
      pubName: 'In de Wildeman',
      address: 'Kolksteeg 3, Amsterdam',
      city: 'Amsterdam',
      specialty: 'Historisch proeflokaal in een voormalige distilleerderij met 18 wisseltaps',
      recommendedBeer: 'Ambachtelijke Cask Ale of Nederlandse IPA',
      themeTag: 'speciaalbier',
      lat: 52.3762,
      lng: 4.8952,
    },
    {
      pubName: 'Proeflokaal Arendsnest',
      address: 'Herengracht 90, Amsterdam',
      city: 'Amsterdam',
      specialty: 'Uitsluitend Nederlandse speciaalbieren van meer dan 50 Nederlandse brouwerijen',
      recommendedBeer: 'Nederlandse Imperial Stout of Tripel van het vat',
      themeTag: 'speciaalbier',
      lat: 52.3765,
      lng: 4.8891,
    },
    {
      pubName: "Brouwerij 't IJ",
      address: 'Funenkade 7, Amsterdam',
      city: 'Amsterdam',
      specialty: 'Beroemd proeflokaal direct naast molen De Gooyer',
      recommendedBeer: 'IJwit of Zatte Tripel',
      themeTag: 'speciaalbier',
      lat: 52.3667,
      lng: 4.9264,
    },
    {
      pubName: 'Biercafé Gollem (Raamsteeg)',
      address: 'Raamsteeg 4, Amsterdam',
      city: 'Amsterdam',
      specialty: 'Het oudste speciaalbiercafé van Amsterdam met legendarische bierkaart',
      recommendedBeer: 'Belgische Trappist of Gollem Precious IPA',
      themeTag: 'bruin',
      lat: 52.3694,
      lng: 4.8887,
    },
    {
      pubName: "Café 't Smalle",
      address: 'Egelantiersgracht 12, Amsterdam',
      city: 'Amsterdam',
      specialty: 'Monumentaal bruin café uit 1786 in het hart van de Jordaan',
      recommendedBeer: 'Affligem Blond of Texels Skuumkoppe',
      themeTag: 'bruin',
      lat: 52.3768,
      lng: 4.8832,
    },
    {
      pubName: 'Foeders',
      address: 'Van Woustraat 110, Amsterdam',
      city: 'Amsterdam',
      specialty: 'Paradijs voor liefhebbers van Lambiek, Geuze en houtgerijpte bieren',
      recommendedBeer: 'Cantillon, 3 Fonteinen of Farmhouse Saison',
      themeTag: 'speciaalbier',
      lat: 52.3545,
      lng: 4.9016,
    },
  ],
  rotterdam: [
    {
      pubName: 'Locus Publicus',
      address: 'Oostzeedijk 364, Rotterdam',
      city: 'Rotterdam',
      specialty: 'Rotterdams instituut met meer dan 200 bieren op fles en 14 kranen',
      recommendedBeer: 'Zware Belgische Klassieker of Wisseltap',
      themeTag: 'speciaalbier',
      lat: 51.9221,
      lng: 4.5048,
    },
    {
      pubName: 'Kaapse Brouwers (Fenixeder)',
      address: 'Nico Koomanskade 1025, Rotterdam',
      city: 'Rotterdam',
      specialty: 'Stoere Rotterdamse craft beer taproom met uitzicht over het water',
      recommendedBeer: 'Kaapse Carrie of Kaapse Karel',
      themeTag: 'speciaalbier',
      lat: 51.9019,
      lng: 4.4865,
    },
    {
      pubName: 'Proeflokaal Reijngoud',
      address: 'Schiedamse Vest 148, Rotterdam',
      city: 'Rotterdam',
      specialty: 'Groot terras op de hoek van de Witte de Withstraat met 20 tapkranen',
      recommendedBeer: 'Noordt Blond of Hazy New England IPA',
      themeTag: 'mix',
      lat: 51.9154,
      lng: 4.4774,
    },
    {
      pubName: 'Melief Bender',
      address: 'Oude Binnenweg 134, Rotterdam',
      city: 'Rotterdam',
      specialty: 'Het oudste en gezelligste bruine café van Rotterdam (sinds 1876)',
      recommendedBeer: 'Speciaalbier van de tap met Rotterdamse bitterballen',
      themeTag: 'bruin',
      lat: 51.9178,
      lng: 4.4732,
    },
    {
      pubName: 'Bierboutique',
      address: 'Witte de Withstraat 49A, Rotterdam',
      city: 'Rotterdam',
      specialty: 'Levende huiskamersfeer op de populairste uitgaansstraat van Rotterdam',
      recommendedBeer: 'Belgische Tripel of Rotterdamse Craft Pale Ale',
      themeTag: 'mix',
      lat: 51.9157,
      lng: 4.4765,
    },
  ],
  'den haag': [
    {
      pubName: 'Huppel The Pub',
      address: "Oude Molstraat 21, Den Haag",
      city: 'Den Haag',
      specialty: 'Knus en legendarisch Haags speciaalbiercafé in het Hofkwartier',
      recommendedBeer: 'Wisselende Craft Tap of Schotse Ale',
      themeTag: 'speciaalbier',
      lat: 52.0785,
      lng: 4.3072,
    },
    {
      pubName: 'Kompaan Binnenhaven',
      address: 'Torenstraat 49, Den Haag',
      city: 'Den Haag',
      specialty: 'Stadsbar van de Haagse brouwerij Kompaan met 20 taps',
      recommendedBeer: 'Kompaan Bondgenoot of Bloedbroeder',
      themeTag: 'speciaalbier',
      lat: 52.0781,
      lng: 4.3054,
    },
    {
      pubName: 'De Paas',
      address: 'Dunne Bierkade 16A, Den Haag',
      city: 'Den Haag',
      specialty: 'Monumentaal biercafé met terrasboot aan de historische Dunne Bierkade',
      recommendedBeer: 'Belgisch Abdijbier of Weizen',
      themeTag: 'bruin',
      lat: 52.0736,
      lng: 4.3182,
    },
    {
      pubName: "Café 't Neutje",
      address: 'Plein 22, Den Haag',
      city: 'Den Haag',
      specialty: 'Levendige kroeg aan het Plein met groot terras en ruime speciaalbierkaart',
      recommendedBeer: 'La Chouffe of Karmeliet van de tap',
      themeTag: 'mix',
      lat: 52.0797,
      lng: 4.3161,
    },
  ],
  haarlem: [
    {
      pubName: 'Jopenkerk Haarlem',
      address: 'Gedempte Voldersgracht 2, Haarlem',
      city: 'Haarlem',
      specialty: 'Stadsbrouwerij en grand café midden in een voormalige kerk',
      recommendedBeer: 'Jopen Mooie Nel IPA of Hoppenbier',
      themeTag: 'speciaalbier',
      lat: 52.3812,
      lng: 4.6298,
    },
    {
      pubName: 'Proeflokaal In den Uiver',
      address: 'Riviervismarkt 13, Haarlem',
      city: 'Haarlem',
      specialty: 'Authentiek monumentaal proeflokaal naast de Grote Kerk',
      recommendedBeer: 'Nederlandse wisseltap of donker seizoensbier',
      themeTag: 'bruin',
      lat: 52.3816,
      lng: 4.6378,
    },
    {
      pubName: 'Bierlokaal De Uiltje Bar',
      address: 'Zijlstraat 18, Haarlem',
      city: 'Haarlem',
      specialty: 'Eigenzinnige craft beer bar van Uiltje Brewing met 30 tapkranen',
      recommendedBeer: 'Uiltje Bird of Prey IPA of vers blikbier',
      themeTag: 'speciaalbier',
      lat: 52.3821,
      lng: 4.6327,
    },
    {
      pubName: 'Café Brussel',
      address: 'Lange Wijngaardstraat 16, Haarlem',
      city: 'Haarlem',
      specialty: 'Gezellige Belgische bierkroeg met meer dan 100 bieren op de kaart',
      recommendedBeer: 'Gouden Carolus Classic of Orval',
      themeTag: 'bruin',
      lat: 52.3806,
      lng: 4.6339,
    },
  ],
  breda: [
    {
      pubName: 'Biercafé De Beyerd',
      address: 'Boschstraat 26, Breda',
      city: 'Breda',
      specialty: 'Familiebedrijf sinds 1938 met eigen stadsbrouwerij De Drie Hoefijzers',
      recommendedBeer: 'Drie Hoefijzers Klassiek van de tap',
      themeTag: 'speciaalbier',
      lat: 51.5903,
      lng: 4.7804,
    },
    {
      pubName: 'Dok 19',
      address: 'Houtmarkt 19, Breda',
      city: 'Breda',
      specialty: 'Sfeervol bruin speciaalbiercafé met tientallen bijzondere bieren',
      recommendedBeer: 'Brabantse Quadrupel of Hazy IPA',
      themeTag: 'bruin',
      lat: 51.5867,
      lng: 4.7772,
    },
    {
      pubName: 'Frontaal Little Bar / Taproom',
      address: 'Liniestraat 31, Breda',
      city: 'Breda',
      specialty: 'Bredase craft beer trots met vooruitstrevende bieren van de tap',
      recommendedBeer: 'Frontaal Juice Punch of Rhodesian',
      themeTag: 'speciaalbier',
      lat: 51.5936,
      lng: 4.7918,
    },
    {
      pubName: 'Zeezicht Breda',
      address: 'Grote Markt 16, Breda',
      city: 'Breda',
      specialty: 'Gezelligste terras en bruine kroeg midden op de Grote Markt van Breda',
      recommendedBeer: 'Speciaalbier van het seizoen op de Grote Markt',
      themeTag: 'mix',
      lat: 51.5887,
      lng: 4.7762,
    },
  ],
  eindhoven: [
    {
      pubName: 'Stadsbrouwerij Eindhoven (100 Watt)',
      address: 'Bleekweg 1M, Eindhoven',
      city: 'Eindhoven',
      specialty: 'Bekroonde Eindhovense stadsbrouwerij aan het kanaal met proeflokaal',
      recommendedBeer: '100 Watt Witte Dame of Stoere Kerel',
      themeTag: 'speciaalbier',
      lat: 51.4366,
      lng: 5.4859,
    },
    {
      pubName: 'Van Moll Brewpub',
      address: 'Keizersgracht 16A, Eindhoven',
      city: 'Eindhoven',
      specialty: 'Craft beer hotspot in Eindhoven met eigen brouwerij en topbieren van over de hele wereld',
      recommendedBeer: 'Van Moll Wanderlust of Toewijding',
      themeTag: 'speciaalbier',
      lat: 51.4375,
      lng: 5.4754,
    },
    {
      pubName: 'Drinkers Pub',
      address: 'Kerkstraat 11, Eindhoven',
      city: 'Eindhoven',
      specialty: 'Een van de grootste speciaalbiercollecties van Zuid-Nederland',
      recommendedBeer: 'Bijzondere wisseltap of gerijpte Imperial Stout',
      themeTag: 'speciaalbier',
      lat: 51.4378,
      lng: 5.4793,
    },
    {
      pubName: 'Café Wilhelmina',
      address: 'Wilhelminaplein 6, Eindhoven',
      city: 'Eindhoven',
      specialty: 'Authentiek bruin muziek- en biercafé aan het gezellige Wilhelminaplein',
      recommendedBeer: 'La Trappe Tripel of Eindhovens speciaalbier',
      themeTag: 'bruin',
      lat: 51.4371,
      lng: 5.4718,
    },
  ],
  groningen: [
    {
      pubName: 'De Pintelier',
      address: 'Kleine Kromme Elleboog 9, Groningen',
      city: 'Groningen',
      specialty: 'Hét Belgische biercafé van Groningen met warme huiskamersfeer',
      recommendedBeer: 'Rochefort 8 of Tripel Karmeliet van de tap',
      themeTag: 'speciaalbier',
      lat: 53.2181,
      lng: 6.5632,
    },
    {
      pubName: 'Brouwerij Martinus',
      address: 'Kostersgang 32-34, Groningen',
      city: 'Groningen',
      specialty: 'Zelfbrouwende Groningse stadsbrouwerij met proeflokaal en dakterras',
      recommendedBeer: 'Martinus Binnenstad Blond of IPA',
      themeTag: 'speciaalbier',
      lat: 53.2165,
      lng: 6.5719,
    },
    {
      pubName: 'Café De Koffer',
      address: 'Nieuwe Blekerstraat 1, Groningen',
      city: 'Groningen',
      specialty: 'Gepassioneerd speciaalbiercafé met meer dan 300 bieren op de kaart',
      recommendedBeer: 'Baxbier Koning Honing of buitenlandse craft tap',
      themeTag: 'speciaalbier',
      lat: 53.2169,
      lng: 6.5571,
    },
    {
      pubName: 'Café Wolthoorn & Co',
      address: 'Turftorenstraat 6, Groningen',
      city: 'Groningen',
      specialty: 'Monumentale bruine kroeg uit 1924 met authentiek interieur',
      recommendedBeer: 'Westmalle Dubbel van de tap',
      themeTag: 'bruin',
      lat: 53.2183,
      lng: 6.5624,
    },
  ],
  maastricht: [
    {
      pubName: 'Café De Gouverneur',
      address: 'Boschstraat 105A, Maastricht',
      city: 'Maastricht',
      specialty: 'Bekend speciaalbiercafé met meer dan 300 bieren en gezellige binnentuin',
      recommendedBeer: 'Zundert Trappist of Gouverneur Blond',
      themeTag: 'speciaalbier',
      lat: 50.8531,
      lng: 5.6897,
    },
    {
      pubName: 'In den Ouden Vogelstruys',
      address: 'Vrijthof 15, Maastricht',
      city: 'Maastricht',
      specialty: 'Het oudste café van Maastricht (sinds 1730), de huiskamer van het Vrijthof',
      recommendedBeer: 'Gulpener Mestreechs Aajt of Korenwolf',
      themeTag: 'bruin',
      lat: 50.8485,
      lng: 5.6879,
    },
    {
      pubName: 'Stadsbrouwerij Maastricht',
      address: 'Oeverwal 12, Maastricht',
      city: 'Maastricht',
      specialty: 'Proeflokaal aan de Maas in het historische Wijck',
      recommendedBeer: 'Maastrichtse Maltezer of Mergelwit',
      themeTag: 'speciaalbier',
      lat: 50.8482,
      lng: 5.6968,
    },
    {
      pubName: 'Café Falstaff',
      address: 'Sint Amorsplein 6, Maastricht',
      city: 'Maastricht',
      specialty: 'Bourgondisch speciaalbiercafé op een van de mooiste pleintjes van de stad',
      recommendedBeer: 'Sint Bernardus Tripel of La Chouffe',
      themeTag: 'mix',
      lat: 50.8487,
      lng: 5.6908,
    },
  ],
  'den bosch': [
    {
      pubName: 'Jongens van De Wit',
      address: 'Paleisbrug / Vughterstraat 175, Den Bosch',
      city: 'Den Bosch',
      specialty: 'Stadsbrouwerij en bruin proeflokaal met eigen gebrouwen Bossche bieren',
      recommendedBeer: 'Witbier of Bossche Tripel van eigen ketel',
      themeTag: 'speciaalbier',
      lat: 51.6845,
      lng: 5.3016,
    },
    {
      pubName: 'Bar Le Duc',
      address: 'Korenbloemstraat 16, Den Bosch',
      city: 'Den Bosch',
      specialty: 'Bossche speciaalbierparel met eigen gebrouwen bieren en 150+ keuzes',
      recommendedBeer: 'Le Duc Blond of Brabantse Quadrupel',
      themeTag: 'speciaalbier',
      lat: 51.6898,
      lng: 5.3014,
    },
    {
      pubName: "Café 't Paultje",
      address: 'Lepelstraat 29A, Den Bosch',
      city: 'Den Bosch',
      specialty: 'Beroemd speciaalbiercafé in de gezellige Uilenburg',
      recommendedBeer: 'Belgische Geuze of Zware Donkere Klassieker',
      themeTag: 'bruin',
      lat: 51.6892,
      lng: 5.3007,
    },
    {
      pubName: 'Café Reinders',
      address: 'Kruisstraat 29, Den Bosch',
      city: 'Den Bosch',
      specialty: 'Bourgondisch café in het hart van de Korte Putstraat / Kruisstraat',
      recommendedBeer: 'Hertog Jan Grand Prestige of La Trappe',
      themeTag: 'mix',
      lat: 51.6889,
      lng: 5.3025,
    },
  ],
  nijmegen: [
    {
      pubName: 'In de Blaauwe Hand',
      address: 'Achter de Hoofdwacht 3, Nijmegen',
      city: 'Nijmegen',
      specialty: 'Het oudste café van Nijmegen (sinds 1542) met prachtige speciaalbierselectie',
      recommendedBeer: 'Oersoep Speciaalbier of Trappist van het vat',
      themeTag: 'bruin',
      lat: 51.8476,
      lng: 5.8628,
    },
    {
      pubName: 'Café Samson',
      address: 'Houtstraat 4, Nijmegen',
      city: 'Nijmegen',
      specialty: 'Bekroond speciaalbiercafé met meer dan 25 taps en 100+ flesbieren',
      recommendedBeer: 'Wisselende Nijmeegse Craft IPA of Sour',
      themeTag: 'speciaalbier',
      lat: 51.8449,
      lng: 5.8641,
    },
    {
      pubName: 'Stadsbrouwerij De Hemel',
      address: 'Franseplaats 1, Nijmegen',
      city: 'Nijmegen',
      specialty: 'Brouwerij en proeflokaal in de eeuwenoude Commanderie van Sint Jan',
      recommendedBeer: 'De Hemel Serafijn of Nieuw Ligt',
      themeTag: 'speciaalbier',
      lat: 51.8482,
      lng: 5.8617,
    },
    {
      pubName: 'Bierhoeder',
      address: 'Bloemerstraat 86, Nijmegen',
      city: 'Nijmegen',
      specialty: 'Craft beer bar met vooruitstrevende kleine brouwerijen op tap',
      recommendedBeer: 'DIPA of Imperial Pastry Stout van de tap',
      themeTag: 'speciaalbier',
      lat: 51.8434,
      lng: 5.8632,
    },
  ],
  tilburg: [
    {
      pubName: 'Kandinsky Beer Bar',
      address: 'Telegraafstraat 58, Tilburg',
      city: 'Tilburg',
      specialty: 'Top 10 speciaalbiercafé van Nederland met meer dan 250 bieren',
      recommendedBeer: 'La Trappe Isid’or of Belgische Lambiek',
      themeTag: 'speciaalbier',
      lat: 51.5582,
      lng: 5.0846,
    },
    {
      pubName: 'LOC Brewery Taproom',
      address: 'Burgemeester Brokxlaan 20, Tilburg',
      city: 'Tilburg',
      specialty: 'Tilburgse craft brouwerij in de hippe Spoorzone',
      recommendedBeer: 'LOC Hop met de Giet of Tilburgs Blond',
      themeTag: 'speciaalbier',
      lat: 51.5612,
      lng: 5.0861,
    },
    {
      pubName: 'Biercafé Bakker',
      address: 'Korte Heuvel 22, Tilburg',
      city: 'Tilburg',
      specialty: 'Gezellige huiskamer aan de Korte Heuvel met uitgebreide bierkaart',
      recommendedBeer: 'KraftBier of Brabantse Tripel',
      themeTag: 'bruin',
      lat: 51.5562,
      lng: 5.0908,
    },
  ],
  antwerpen: [
    {
      pubName: 'Kulminator',
      address: 'Vleminckveld 32, Antwerpen',
      city: 'Antwerpen',
      specialty: 'Wereldberoemd biercafé gespecialiseerd in gerijpte kelderbieren',
      recommendedBeer: 'Gerijpte Chimay Blauw of Pannepot',
      themeTag: 'speciaalbier',
      lat: 51.2149,
      lng: 4.4038,
    },
    {
      pubName: 'Billies Bier Kafétaria',
      address: 'Kammenstraat 12, Antwerpen',
      city: 'Antwerpen',
      specialty: 'Moderne craft beer bar met Belgische en internationale topbrouwerijen',
      recommendedBeer: 'Vers getapte Craft IPA of Oude Geuze',
      themeTag: 'speciaalbier',
      lat: 51.2175,
      lng: 4.4012,
    },
    {
      pubName: 'Paters Vaetje',
      address: 'Blauwmoezelstraat 1, Antwerpen',
      city: 'Antwerpen',
      specialty: 'Klassiek Antwerps biercafé aan de voet van de Onze-Lieve-Vrouwekathedraal',
      recommendedBeer: 'Bolleke De Koninck of Westmalle Tripel',
      themeTag: 'bruin',
      lat: 51.2206,
      lng: 4.4008,
    },
    {
      pubName: 'Stadsbrouwerij De Koninck',
      address: 'Mechelsesteenweg 291, Antwerpen',
      city: 'Antwerpen',
      specialty: 'De thuisbasis van het Antwerpse Bolleke en Wild Jo',
      recommendedBeer: 'Vers getapt Bolleke De Koninck',
      themeTag: 'mix',
      lat: 51.1996,
      lng: 4.4192,
    },
  ],
};

function normalizePlaceKey(city: string): string {
  const clean = city.trim().toLowerCase();
  if (clean === "'s-hertogenbosch" || clean === 's-hertogenbosch' || clean === 'hertogenbosch') {
    return 'den bosch';
  }
  if (clean === "'s-gravenhage" || clean === 's-gravenhage' || clean === 'gravenhage') {
    return 'den haag';
  }
  return clean;
}

function formatCityDisplayName(city: string): string {
  const trimmed = city.trim();
  if (!trimmed) return 'Jouw Plaats';
  return trimmed
    .split(/\s+/)
    .map((word) => {
      if (word.toLowerCase() === 'den' || word.toLowerCase() === 'aan' || word.toLowerCase() === 'op') {
        return word.toLowerCase();
      }
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ');
}

/**
 * Sorteert stops in een logische wandelvolgorde (Nearest-Neighbor route op coördinaten).
 */
function sortStopsByWalkingRoute<T extends { lat?: number; lng?: number }>(stops: T[]): T[] {
  if (stops.length <= 2) return stops;
  const withCoords = stops.filter(
    (s) => typeof s.lat === 'number' && typeof s.lng === 'number'
  );
  if (withCoords.length < 2) return stops;

  const remaining = [...stops];
  const ordered: T[] = [remaining.shift()!];

  while (remaining.length > 0) {
    const last = ordered[ordered.length - 1];
    if (typeof last.lat !== 'number' || typeof last.lng !== 'number') {
      ordered.push(remaining.shift()!);
      continue;
    }
    let bestIdx = 0;
    let bestDist = Infinity;
    for (let i = 0; i < remaining.length; i++) {
      const candidate = remaining[i];
      if (typeof candidate.lat === 'number' && typeof candidate.lng === 'number') {
        const dLat = candidate.lat - last.lat;
        const dLng = candidate.lng - last.lng;
        const dist = dLat * dLat + dLng * dLng;
        if (dist < bestDist) {
          bestDist = dist;
          bestIdx = i;
        }
      }
    }
    ordered.push(remaining.splice(bestIdx, 1)[0]);
  }
  return ordered;
}

export function loadPubCrawlsForUser(userId: string): PubCrawl[] {
  if (!userId) return [];
  try {
    const raw = localStorage.getItem(`${PUB_CRAWLS_STORAGE_PREFIX}${userId}`);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function savePubCrawlsForUser(userId: string, crawls: PubCrawl[]): void {
  if (!userId) return;
  try {
    localStorage.setItem(`${PUB_CRAWLS_STORAGE_PREFIX}${userId}`, JSON.stringify(crawls));
  } catch {
    // Ignore quota errors
  }
}

export function loadActivePubCrawl(userId: string): ActivePubCrawlState | null {
  if (!userId) return null;
  try {
    const raw = localStorage.getItem(`${ACTIVE_PUB_CRAWL_STORAGE_PREFIX}${userId}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ActivePubCrawlState;
    if (!parsed || !parsed.pubCrawl || !Array.isArray(parsed.pubCrawl.stops)) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function saveActivePubCrawl(
  userId: string,
  state: ActivePubCrawlState | null
): void {
  if (!userId) return;
  try {
    const key = `${ACTIVE_PUB_CRAWL_STORAGE_PREFIX}${userId}`;
    if (!state) {
      localStorage.removeItem(key);
    } else {
      localStorage.setItem(key, JSON.stringify(state));
    }
  } catch {
    // Ignore storage errors
  }
}

export async function generateCityPubCrawl(params: {
  city: string;
  stopCount: number;
  theme: PubCrawlTheme;
  knownDeals?: PubDeal[];
  userTastingLocations?: string[];
  createdBy?: string;
}): Promise<PubCrawl> {
  const displayCity = formatCityDisplayName(params.city);
  const normalizedKey = normalizePlaceKey(params.city);
  const stopCount = Math.min(8, Math.max(2, params.stopCount || 4));
  const theme = params.theme || 'mix';

  const candidates: Array<{
    pubName: string;
    address: string;
    city: string;
    specialty: string;
    recommendedBeer: string;
    lat?: number;
    lng?: number;
  }> = [];

  const seenNames = new Set<string>();
  const addCandidate = (c: {
    pubName: string;
    address: string;
    city: string;
    specialty: string;
    recommendedBeer: string;
    lat?: number;
    lng?: number;
  }) => {
    const key = c.pubName.trim().toLowerCase();
    if (!key || seenNames.has(key)) return;
    seenNames.add(key);
    candidates.push(c);
  };

  // 1. Voeg gecureerde topkroegen voor deze stad toe (gefilterd op thema waar relevant)
  const curated = CURATED_PUBS_BY_CITY[normalizedKey] || [];
  const prioritizedCurated = [...curated].sort((a, b) => {
    const aMatch = a.themeTag === theme ? 1 : 0;
    const bMatch = b.themeTag === theme ? 1 : 0;
    return bMatch - aMatch;
  });

  for (const item of prioritizedCurated) {
    addCandidate({
      pubName: item.pubName,
      address: item.address,
      city: item.city,
      specialty: item.specialty,
      recommendedBeer: item.recommendedBeer,
      lat: item.lat,
      lng: item.lng,
    });
  }

  // 2. Voeg bekende cafés uit de Bier & Kroeg Acties van dezelfde plaats toe
  if (Array.isArray(params.knownDeals)) {
    for (const deal of params.knownDeals) {
      if (normalizePlaceKey(deal.city) === normalizedKey) {
        addCandidate({
          pubName: deal.pubName,
          address: deal.address || `Centrum, ${displayCity}`,
          city: displayCity,
          specialty: deal.dealTitle || 'Bekend speciaalbiercafé met wisselende tapselectie',
          recommendedBeer: deal.beerBrand || 'Speciaalbier van de tap',
          lat: deal.lat,
          lng: deal.lng,
        });
      }
    }
  }

  // 3. Vraag live lokale kroegen op uit OpenStreetMap via onze backend (werkt voor élke stad én elk dorp!)
  let resolvedPlaceName = displayCity;
  try {
    const headers = await buildServerAuthHeaders(true);
    const res = await fetch('/api/pub-crawls/generate', {
      method: 'POST',
      credentials: 'include',
      headers,
      body: JSON.stringify({
        city: params.city.trim(),
        stopCount,
        theme,
      }),
    });
    if (res.ok) {
      const data = (await res.json()) as {
        city?: string;
        osmPubs?: Array<{
          pubName: string;
          address: string;
          specialty: string;
          recommendedBeer: string;
          lat?: number;
          lng?: number;
        }>;
      };
      if (data.city) {
        resolvedPlaceName = formatCityDisplayName(data.city);
      }
      if (Array.isArray(data.osmPubs)) {
        for (const osm of data.osmPubs) {
          addCandidate({
            pubName: osm.pubName,
            address: osm.address || `Centrum, ${resolvedPlaceName}`,
            city: resolvedPlaceName,
            specialty: osm.specialty,
            recommendedBeer: osm.recommendedBeer,
            lat: osm.lat,
            lng: osm.lng,
          });
        }
      }
    }
  } catch {
    // Val terug op lokale gegevens wanneer offline
  }

  // 4. Als er nog plaatsen over zijn voor een kleiner dorp, vul aan met authentieke dorpskroeg-suggesties
  const villageFallbacks = [
    {
      pubName: `Grand Café & Proeflokaal ${resolvedPlaceName}`,
      address: `Markt / Dorpsstraat, ${resolvedPlaceName}`,
      specialty: `Gezellig startpunt midden in het centrum van ${resolvedPlaceName}`,
      recommendedBeer: 'Frisse Weizen of Blond van de tap',
    },
    {
      pubName: `Biercafé De Stamtafel (${resolvedPlaceName})`,
      address: `Kerkplein, ${resolvedPlaceName}`,
      specialty: `Sfeervol bruin café met verrassend mooie speciaalbierkaart in ${resolvedPlaceName}`,
      recommendedBeer: 'Belgische Tripel of lokaal seizoensbier',
    },
    {
      pubName: `Taverne 't Oude Raadhuis (${resolvedPlaceName})`,
      address: `Raadhuisstraat, ${resolvedPlaceName}`,
      specialty: 'Karakteristieke dorpskroeg met terras en hapjesplank',
      recommendedBeer: 'Krachtige IPA of Abdij Dubbel',
    },
    {
      pubName: `Proeflokaal De Brouwerij (${resolvedPlaceName})`,
      address: `Hoofdstraat, ${resolvedPlaceName}`,
      specialty: 'Ideale afsluiter van de kroegentocht met donkere bieren en proefplankjes',
      recommendedBeer: 'Quadrupel of Barrel Aged afsluiter',
    },
    {
      pubName: `Café De Herberg (${resolvedPlaceName})`,
      address: `Brink / Marktplein, ${resolvedPlaceName}`,
      specialty: 'Authentieke kroeg waar locals samenkomen voor een goed glas bier',
      recommendedBeer: 'Speciaalbier van de wisseltap',
    },
    {
      pubName: `Eet- & Biercafé De Linde (${resolvedPlaceName})`,
      address: `Stationsweg / Centrum, ${resolvedPlaceName}`,
      specialty: 'Gemoedelijk café op loopafstand met ruime keuze op fles en tap',
      recommendedBeer: 'Gouden Carolus of La Chouffe',
    },
  ];

  for (const fb of villageFallbacks) {
    if (candidates.length >= stopCount) break;
    addCandidate({
      pubName: fb.pubName,
      address: fb.address,
      city: resolvedPlaceName,
      specialty: fb.specialty,
      recommendedBeer: fb.recommendedBeer,
    });
  }

  const selected = sortStopsByWalkingRoute(candidates.slice(0, stopCount));

  const stops: PubCrawlStop[] = selected.map((item, idx) => ({
    id: `stop_${Date.now()}_${idx + 1}`,
    pubName: item.pubName,
    address: item.address,
    city: item.city || resolvedPlaceName,
    specialty: item.specialty,
    recommendedBeer: item.recommendedBeer,
    lat: item.lat,
    lng: item.lng,
  }));

  const themeLabels: Record<PubCrawlTheme, string> = {
    speciaalbier: 'Speciaalbier & Proeflokalen Route',
    bruin: 'Authentieke Bruine Kroegentocht',
    mix: 'Gezellige Kroegentocht',
  };

  return {
    id: `crawl_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    title: `${themeLabels[theme]} — ${resolvedPlaceName}`,
    city: resolvedPlaceName,
    description: `Complete kroegentocht langs ${stops.length} leuke kroegen in ${resolvedPlaceName}. Start de tocht om onderweg met één klik de juiste kroeg in te vullen bij elk biertje dat je aanmeldt!`,
    stops,
    createdBy: params.createdBy || 'Cervisium Routeplanner',
    createdAt: new Date().toISOString(),
  };
}

export async function sharePubCrawlWithFriendApi(
  friendId: string,
  pubCrawl: PubCrawl
): Promise<{ ok: boolean; message: string }> {
  try {
    const headers = await buildServerAuthHeaders(true);
    const res = await fetch('/api/pub-crawls/share', {
      method: 'POST',
      credentials: 'include',
      headers,
      body: JSON.stringify({ friendId, pubCrawl }),
    });
    const data = (await res.json().catch(() => ({}))) as {
      ok?: boolean;
      message?: string;
      error?: string;
    };
    if (!res.ok) {
      return {
        ok: false,
        message: data.error || 'Kon kroegentocht niet delen met je vriend.',
      };
    }
    return {
      ok: true,
      message: data.message || 'Kroegentocht succesvol gedeeld met je vriend!',
    };
  } catch {
    return {
      ok: false,
      message: 'Netwerkfout bij het delen van de kroegentocht.',
    };
  }
}

export async function syncPubCrawlsToServer(pubCrawls: PubCrawl[]): Promise<void> {
  try {
    const headers = await buildServerAuthHeaders(true);
    await fetch('/api/me/records/sync', {
      method: 'POST',
      credentials: 'include',
      headers,
      body: JSON.stringify({ pubCrawls }),
    });
  } catch {
    // Ignore offline errors
  }
}

export async function deletePubCrawlFromServer(crawlId: string): Promise<void> {
  try {
    const headers = await buildServerAuthHeaders(false);
    await fetch(`/api/me/records/pubCrawls/${encodeURIComponent(crawlId)}`, {
      method: 'DELETE',
      credentials: 'include',
      headers,
    });
  } catch {
    // Ignore offline errors
  }
}

export function encodePubCrawlShareParam(crawl: PubCrawl): string {
  const compact = {
    t: crawl.title,
    c: crawl.city,
    d: crawl.description || '',
    by: crawl.createdBy || '',
    s: crawl.stops.map((st) => ({
      n: st.pubName,
      a: st.address,
      sp: st.specialty || '',
      b: st.recommendedBeer || '',
    })),
  };
  const json = JSON.stringify(compact);
  return encodeURIComponent(btoa(unescape(encodeURIComponent(json))));
}

export function decodePubCrawlShareParam(encoded: string): PubCrawl | null {
  try {
    const raw = decodeURIComponent(encoded);
    const json = decodeURIComponent(escape(atob(raw)));
    const parsed = JSON.parse(json) as {
      t?: string;
      c?: string;
      d?: string;
      by?: string;
      s?: Array<{ n?: string; a?: string; sp?: string; b?: string }>;
    };
    if (!parsed || !parsed.t || !Array.isArray(parsed.s) || parsed.s.length === 0) {
      return null;
    }
    const city = parsed.c || 'Stad';
    const stops: PubCrawlStop[] = parsed.s
      .map((item, idx) => ({
        id: `stop_shared_${idx + 1}`,
        pubName: (item.n || '').trim(),
        address: (item.a || '').trim() || `Centrum, ${city}`,
        city,
        specialty: (item.sp || '').trim(),
        recommendedBeer: (item.b || '').trim(),
      }))
      .filter((st) => Boolean(st.pubName));

    if (stops.length === 0) return null;

    return {
      id: `crawl_link_${Date.now()}`,
      title: parsed.t,
      city,
      description: parsed.d || `Gedeelde kroegentocht in ${city}`,
      stops,
      sharedBy: parsed.by || 'Een biervriend',
      createdAt: new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

export function buildGoogleMapsWalkingRouteUrl(crawl: PubCrawl): string {
  if (!crawl.stops || crawl.stops.length === 0) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(crawl.city)}`;
  }
  if (crawl.stops.length === 1) {
    const s = crawl.stops[0];
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
      `${s.pubName}, ${s.address || crawl.city}`
    )}`;
  }
  const first = crawl.stops[0];
  const last = crawl.stops[crawl.stops.length - 1];
  const middle = crawl.stops.slice(1, -1);

  const origin = `${first.pubName}, ${first.address || crawl.city}`;
  const destination = `${last.pubName}, ${last.address || crawl.city}`;
  const waypoints = middle
    .map((s) => `${s.pubName}, ${s.address || crawl.city}`)
    .join('|');

  const url = new URL('https://www.google.com/maps/dir/');
  url.searchParams.set('api', '1');
  url.searchParams.set('origin', origin);
  url.searchParams.set('destination', destination);
  if (waypoints) {
    url.searchParams.set('waypoints', waypoints);
  }
  url.searchParams.set('travelmode', 'walking');
  return url.toString();
}
