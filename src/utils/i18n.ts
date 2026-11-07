export type SupportedLocale = 'nl' | 'en' | 'de' | 'fr' | 'es';

type TranslationEntry = {
  en: string;
  de: string;
  fr: string;
  es: string;
};

/**
 * Brand names & protected terms that must NEVER be translated
 */
const PROTECTED_BRAND_TERMS = ['Cervisium'];

/**
 * Exact and phrase translations from default Dutch UI strings into
 * English (en), German (de), French (fr), and Spanish (es).
 * Brand names (Cervisium, beer names, brewery names, glass brands) are never altered.
 */
const TRANSLATIONS: Record<string, TranslationEntry> = {
  // Login & Auth Screen
  'Persoonlijke Bier Collectie & Proefnotities': {
    en: 'Personal Beer Collection & Tasting Notes',
    de: 'Persönliche Biersammlung & Verkostungsnotizen',
    fr: 'Collection de Bières & Notes de Dégustation',
    es: 'Colección Personal de Cervezas y Notas de Cata',
  },
  'Persoonlijke Bier Collectie': {
    en: 'Personal Beer Collection',
    de: 'Persönliche Biersammlung',
    fr: 'Collection de Bières Personnelle',
    es: 'Colección Personal de Cervezas',
  },
  'Log veilig in met je e-mailadres of Google-account.': {
    en: 'Sign in securely with your email address or Google account.',
    de: 'Melde dich sicher mit deiner E-Mail-Adresse oder deinem Google-Konto an.',
    fr: 'Connectez-vous en toute sécurité avec votre adresse e-mail ou votre compte Google.',
    es: 'Inicia sesión de forma segura con tu correo electrónico o cuenta de Google.',
  },
  'Log veilig in met je e-mailadres of je gekoppelde account.': {
    en: 'Sign in securely with your email address or linked account.',
    de: 'Melde dich sicher mit deiner E-Mail-Adresse oder deinem verknüpften Konto an.',
    fr: 'Connectez-vous en toute sécurité avec votre adresse e-mail ou votre compte lié.',
    es: 'Inicia sesión de forma segura con tu correo electrónico o cuenta vinculada.',
  },
  'Account Toegang': {
    en: 'Account Access',
    de: 'Kontozugang',
    fr: 'Accès au Compte',
    es: 'Acceso a la Cuenta',
  },
  'Mijn Bieren': {
    en: 'My Beers',
    de: 'Meine Biere',
    fr: 'Mes Bières',
    es: 'Mis Cervezas',
  },
  'Inloggen': {
    en: 'Sign in',
    de: 'Anmelden',
    fr: 'Connexion',
    es: 'Iniciar sesión',
  },
  'Account aanmaken': {
    en: 'Create account',
    de: 'Konto erstellen',
    fr: 'Créer un compte',
    es: 'Crear cuenta',
  },
  'Nieuw Account Aanmaken': {
    en: 'Create New Account',
    de: 'Neues Konto erstellen',
    fr: 'Créer un nouveau compte',
    es: 'Crear nueva cuenta',
  },
  'Beveiligde Inlog': {
    en: 'Secure Sign-In',
    de: 'Sichere Anmeldung',
    fr: 'Connexion sécurisée',
    es: 'Inicio de sesión seguro',
  },
  'Beveiligd': {
    en: 'Secured',
    de: 'Gesichert',
    fr: 'Sécurisé',
    es: 'Protegido',
  },
  'Weergavenaam': {
    en: 'Display Name',
    de: 'Anzeigename',
    fr: "Nom d'affichage",
    es: 'Nombre para mostrar',
  },
  'Jouw naam of bijnaam': {
    en: 'Your name or nickname',
    de: 'Dein Name oder Spitzname',
    fr: 'Votre nom ou surnom',
    es: 'Tu nombre o apodo',
  },
  'E-mailadres': {
    en: 'Email Address',
    de: 'E-Mail-Adresse',
    fr: 'Adresse e-mail',
    es: 'Correo electrónico',
  },
  'naam@voorbeeld.nl': {
    en: 'name@example.com',
    de: 'name@beispiel.de',
    fr: 'nom@exemple.fr',
    es: 'nombre@ejemplo.es',
  },
  'Wachtwoord': {
    en: 'Password',
    de: 'Passwort',
    fr: 'Mot de passe',
    es: 'Contraseña',
  },
  'Wachtwoord (min. 6 tekens)': {
    en: 'Password (min. 6 characters)',
    de: 'Passwort (mind. 6 Zeichen)',
    fr: 'Mot de passe (min. 6 caractères)',
    es: 'Contraseña (mín. 6 caracteres)',
  },
  'Wachtwoord vergeten?': {
    en: 'Forgot password?',
    de: 'Passwort vergessen?',
    fr: 'Mot de passe oublié ?',
    es: '¿Olvidaste tu contraseña?',
  },
  'Bezig...': {
    en: 'Processing...',
    de: 'Bitte warten...',
    fr: 'Chargement...',
    es: 'Procesando...',
  },
  'Of ga verder met': {
    en: 'Or continue with',
    de: 'Oder weiter mit',
    fr: 'Ou continuer avec',
    es: 'O continuar con',
  },
  'Inloggen met Google': {
    en: 'Sign in with Google',
    de: 'Mit Google anmelden',
    fr: 'Se connecter avec Google',
    es: 'Iniciar sesión con Google',
  },
  'Lokaal Testaccount Openen': {
    en: 'Open Local Demo Account',
    de: 'Lokales Testkonto öffnen',
    fr: 'Ouvrir un compte démo local',
    es: 'Abrir cuenta de prueba local',
  },

  // Navbar & Navigation
  'Dashboard': {
    en: 'Dashboard',
    de: 'Dashboard',
    fr: 'Tableau de bord',
    es: 'Panel',
  },
  'Mijn Biertjes': {
    en: 'My Beers',
    de: 'Meine Biere',
    fr: 'Mes Bières',
    es: 'Mis Cervezas',
  },
  'Top Lijsten': {
    en: 'Top Rankings',
    de: 'Bestenlisten',
    fr: 'Classements',
    es: 'Rankings',
  },
  'Categorieën': {
    en: 'Categories',
    de: 'Kategorien',
    fr: 'Catégories',
    es: 'Categorías',
  },
  'Bierglazen': {
    en: 'Beer Glasses',
    de: 'Biergläser',
    fr: 'Verres à Bière',
    es: 'Vasos de Cerveza',
  },
  "Extra's": {
    en: 'Extras',
    de: 'Extras',
    fr: 'Extras',
    es: 'Extras',
  },
  'Instellingen': {
    en: 'Settings',
    de: 'Einstellungen',
    fr: 'Paramètres',
    es: 'Ajustes',
  },
  'Admin Panel': {
    en: 'Admin Panel',
    de: 'Admin-Bereich',
    fr: 'Panneau Admin',
    es: 'Panel de Admin',
  },
  'Biertje Toevoegen': {
    en: 'Add Beer',
    de: 'Bier hinzufügen',
    fr: 'Ajouter une Bière',
    es: 'Añadir Cerveza',
  },
  'Bier Toevoegen': {
    en: 'Add Beer',
    de: 'Bier hinzufügen',
    fr: 'Ajouter une Bière',
    es: 'Añadir Cerveza',
  },
  'Bier Collectie': {
    en: 'Beer Collection',
    de: 'Biersammlung',
    fr: 'Collection de Bières',
    es: 'Colección de Cervezas',
  },
  'Proost op goede smaak — Drink met mate': {
    en: 'Cheers to great taste — Drink responsibly',
    de: 'Prost auf guten Geschmack — Genieße verantwortungsvoll',
    fr: 'Santé au bon goût — À consommer avec modération',
    es: 'Salud por el buen gusto — Bebe con moderación',
  },

  // Dashboard
  'Jouw Persoonlijke Bier Logboek': {
    en: 'Your Personal Beer Logbook',
    de: 'Dein persönliches Bier-Logbuch',
    fr: 'Votre carnet de dégustation personnel',
    es: 'Tu registro personal de cervezas',
  },
  'Welkom in je eigen proeflokaal': {
    en: 'Welcome to your personal tasting room',
    de: 'Willkommen in deinem eigenen Verkostungsraum',
    fr: 'Bienvenue dans votre espace de dégustation',
    es: 'Bienvenido a tu sala de cata personal',
  },
  'Bieren Geproefd': {
    en: 'Beers Tasted',
    de: 'Verkostete Biere',
    fr: 'Bières Dégustées',
    es: 'Cervezas Probadas',
  },
  'Unieke bieren': {
    en: 'Unique beers',
    de: 'Einzigartige Biere',
    fr: 'Bières uniques',
    es: 'Cervezas únicas',
  },
  'Proefnotities': {
    en: 'Tasting Notes',
    de: 'Verkostungsnotizen',
    fr: 'Notes de dégustation',
    es: 'Notas de cata',
  },
  'Totale sessies': {
    en: 'Total sessions',
    de: 'Gesamte Sitzungen',
    fr: 'Sessions totales',
    es: 'Sesiones totales',
  },
  'Gemiddeld Cijfer': {
    en: 'Average Rating',
    de: 'Durchschnittsnote',
    fr: 'Note Moyenne',
    es: 'Nota Media',
  },
  'Op schaal van 10': {
    en: 'On a scale of 10',
    de: 'Auf einer Skala von 10',
    fr: 'Sur une échelle de 10',
    es: 'En escala de 10',
  },
  'Favoriete Stijl': {
    en: 'Favorite Style',
    de: 'Lieblingsstil',
    fr: 'Style Préféré',
    es: 'Estilo Favorito',
  },
  'Meest gedronken': {
    en: 'Most tasted',
    de: 'Am meisten getrunken',
    fr: 'Le plus dégusté',
    es: 'Más probado',
  },
  'Jouw Top 3 Hoogst Beoordeeld': {
    en: 'Your Top 3 Highest Rated',
    de: 'Deine Top 3 am besten bewertet',
    fr: 'Votre Top 3 des mieux notées',
    es: 'Tu Top 3 mejor valoradas',
  },
  'Bekijk alle rankings': {
    en: 'View all rankings',
    de: 'Alle Bestenlisten ansehen',
    fr: 'Voir tous les classements',
    es: 'Ver todos los rankings',
  },
  'Recent Toegevoegd': {
    en: 'Recently Added',
    de: 'Kürzlich hinzugefügt',
    fr: 'Récemment ajoutées',
    es: 'Añadidas recientemente',
  },
  'Bekijk alles': {
    en: 'View all',
    de: 'Alle ansehen',
    fr: 'Tout voir',
    es: 'Ver todo',
  },
  'Verdeling per Categorie': {
    en: 'Distribution by Category',
    de: 'Verteilung nach Kategorie',
    fr: 'Répartition par Catégorie',
    es: 'Distribución por Categoría',
  },
  'Nog geen bieren in je collectie': {
    en: 'No beers in your collection yet',
    de: 'Noch keine Biere in deiner Sammlung',
    fr: 'Aucune bière dans votre collection',
    es: 'Aún no hay cervezas en tu colección',
  },
  'Eerste Biertje Toevoegen': {
    en: 'Add Your First Beer',
    de: 'Erstes Bier hinzufügen',
    fr: 'Ajouter votre première bière',
    es: 'Añadir primera cerveza',
  },

  // Beer Cards & Beer List
  'Geen proefnotities': {
    en: 'No tasting notes',
    de: 'Keine Verkostungsnotizen',
    fr: 'Aucune note de dégustation',
    es: 'Sin notas de cata',
  },
  'Geen recente proefnotities': {
    en: 'No recent tasting notes',
    de: 'Keine aktuellen Verkostungsnotizen',
    fr: 'Aucune note récente',
    es: 'Sin notas de cata recientes',
  },
  'Onbekende categorie': {
    en: 'Unknown category',
    de: 'Unbekannte Kategorie',
    fr: 'Catégorie inconnue',
    es: 'Categoría desconocida',
  },
  'Onbekende brouwerij': {
    en: 'Unknown brewery',
    de: 'Unbekannte Brauerei',
    fr: 'Brasserie inconnue',
    es: 'Cervecería desconocida',
  },
  'Nogmaals drinken': {
    en: 'Drink again',
    de: 'Nochmals trinken',
    fr: 'Boire à nouveau',
    es: 'Beber de nuevo',
  },
  'Details & Geschiedenis': {
    en: 'Details & History',
    de: 'Details & Verlauf',
    fr: 'Détails & Historique',
    es: 'Detalles e Historial',
  },
  'Bewerken': {
    en: 'Edit',
    de: 'Bearbeiten',
    fr: 'Modifier',
    es: 'Editar',
  },
  'Verwijderen': {
    en: 'Delete',
    de: 'Löschen',
    fr: 'Supprimer',
    es: 'Eliminar',
  },
  'Inchecken': {
    en: 'Check in',
    de: 'Einchecken',
    fr: 'Enregistrer',
    es: 'Registrar',
  },
  '🍺 Van de tap': {
    en: '🍺 On tap',
    de: '🍺 Vom Fass',
    fr: '🍺 Pression',
    es: '🍺 De barril',
  },
  '🍾 Fles': {
    en: '🍾 Bottle',
    de: '🍾 Flasche',
    fr: '🍾 Bouteille',
    es: '🍾 Botella',
  },
  '🥫 Blik': {
    en: '🥫 Can',
    de: '🥫 Dose',
    fr: '🥫 Canette',
    es: '🥫 Lata',
  },
  'Biertje verwijderen?': {
    en: 'Delete beer?',
    de: 'Bier löschen?',
    fr: 'Supprimer la bière ?',
    es: '¿Eliminar cerveza?',
  },
  'Zoek op naam, brouwerij of smaaknotitie...': {
    en: 'Search by name, brewery or tasting note...',
    de: 'Suche nach Name, Brauerei oder Geschmacksnotiz...',
    fr: 'Rechercher par nom, brasserie ou note...',
    es: 'Buscar por nombre, cervecería o nota...',
  },
  'Alle Categorieën': {
    en: 'All Categories',
    de: 'Alle Kategorien',
    fr: 'Toutes les catégories',
    es: 'Todas las categorías',
  },
  'Hoogste Cijfer': {
    en: 'Highest Rating',
    de: 'Höchste Bewertung',
    fr: 'Meilleure note',
    es: 'Mayor puntuación',
  },
  'Laagste Cijfer': {
    en: 'Lowest Rating',
    de: 'Niedrigste Bewertung',
    fr: 'Note la plus basse',
    es: 'Menor puntuación',
  },
  'Nieuwste Eerst': {
    en: 'Newest First',
    de: 'Neueste zuerst',
    fr: 'Plus récentes',
    es: 'Más recientes primero',
  },
  'Naam (A-Z)': {
    en: 'Name (A-Z)',
    de: 'Name (A-Z)',
    fr: 'Nom (A-Z)',
    es: 'Nombre (A-Z)',
  },
  'Hoogste Alcohol %': {
    en: 'Highest ABV %',
    de: 'Höchster Alkohol %',
    fr: 'Alcool % le plus élevé',
    es: 'Mayor % de alcohol',
  },
  'Favorieten': {
    en: 'Favorites',
    de: 'Favoriten',
    fr: 'Favoris',
    es: 'Favoritos',
  },
  'Alleen Favorieten': {
    en: 'Favorites Only',
    de: 'Nur Favoriten',
    fr: 'Favoris uniquement',
    es: 'Solo favoritos',
  },
  'Filters wissen': {
    en: 'Clear filters',
    de: 'Filter zurücksetzen',
    fr: 'Effacer les filtres',
    es: 'Limpiar filtros',
  },
  'Wissen': {
    en: 'Clear',
    de: 'Löschen',
    fr: 'Effacer',
    es: 'Limpiar',
  },
  'Geen biertjes gevonden': {
    en: 'No beers found',
    de: 'Keine Biere gefunden',
    fr: 'Aucune bière trouvée',
    es: 'No se encontraron cervezas',
  },

  // Top Rankings & Categories
  'Top Rankings & Ranglijsten': {
    en: 'Top Rankings & Leaderboards',
    de: 'Top-Rankings & Bestenlisten',
    fr: 'Classements & Palmarès',
    es: 'Top Rankings y Clasificaciones',
  },
  'Algemeen Klassement': {
    en: 'Overall Ranking',
    de: 'Gesamtwertung',
    fr: 'Classement général',
    es: 'Clasificación general',
  },
  'Bier Categorieën': {
    en: 'Beer Categories',
    de: 'Bierkategorien',
    fr: 'Catégories de Bières',
    es: 'Categorías de Cerveza',
  },
  'Nieuwe Categorie': {
    en: 'New Category',
    de: 'Neue Kategorie',
    fr: 'Nouvelle Catégorie',
    es: 'Nueva Categoría',
  },

  // Beer Glasses
  'Mijn Glazenkast': {
    en: 'My Glass Cabinet',
    de: 'Mein Gläserschrank',
    fr: 'Mon Vaisselier',
    es: 'Mi Vitrina de Vasos',
  },
  'Bierglazen Collectie': {
    en: 'Beer Glass Collection',
    de: 'Biergläser-Sammlung',
    fr: 'Collection de Verres à Bière',
    es: 'Colección de Vasos de Cerveza',
  },
  'Houd bij welke speciaalbierglazen je in huis hebt, voeg een foto toe en geef direct aan hoeveel stuks je van elk glas hebt.': {
    en: 'Keep track of which craft beer glasses you own, add a photo, and set how many pieces you have of each glass.',
    de: 'Behalte den Überblick über deine Biergläser, füge Fotos hinzu und gib an, wie viele Stück du von jedem Glas besitzt.',
    fr: 'Suivez les verres à bière que vous possédez, ajoutez une photo et indiquez la quantité de chaque verre.',
    es: 'Lleva el registro de tus vasos de cerveza, añade una foto e indica cuántas unidades tienes de cada uno.',
  },
  'Bierglas Toevoegen': {
    en: 'Add Beer Glass',
    de: 'Bierglas hinzufügen',
    fr: 'Ajouter un Verre',
    es: 'Añadir Vaso',
  },
  'Eerste Bierglas Toevoegen': {
    en: 'Add First Beer Glass',
    de: 'Erstes Bierglas hinzufügen',
    fr: 'Ajouter le premier verre',
    es: 'Añadir primer vaso',
  },
  'Unieke Glazen': {
    en: 'Unique Glasses',
    de: 'Einzigartige Gläser',
    fr: 'Verres Uniques',
    es: 'Vasos Únicos',
  },
  'verschillende modellen': {
    en: 'different models',
    de: 'verschiedene Modelle',
    fr: 'modèles différents',
    es: 'modelos diferentes',
  },
  'Totaal Stuks': {
    en: 'Total Pieces',
    de: 'Gesamtstückzahl',
    fr: 'Total des Pièces',
    es: 'Total de Unidades',
  },
  'glazen in de kast': {
    en: 'glasses in cabinet',
    de: 'Gläser im Schrank',
    fr: 'verres dans le vaisselier',
    es: 'vasos en la vitrina',
  },
  'mooiste glazen': {
    en: 'favorite glasses',
    de: 'schönste Gläser',
    fr: 'plus beaux verres',
    es: 'vasos favoritos',
  },
  'Zoek op glasnaam, brouwerij of type...': {
    en: 'Search by glass name, brewery or type...',
    de: 'Suche nach Glasname, Brauerei oder Typ...',
    fr: 'Rechercher par nom de verre, brasserie ou type...',
    es: 'Buscar por nombre de vaso, cervecería o tipo...',
  },
  'Geen brouwerij/merk opgegeven': {
    en: 'No brewery/brand specified',
    de: 'Keine Brauerei/Marke angegeben',
    fr: 'Aucune brasserie/marque indiquée',
    es: 'Sin cervecería/marca especificada',
  },
  'Geen foto toegevoegd': {
    en: 'No photo added',
    de: 'Kein Foto hinzugefügt',
    fr: 'Aucune photo ajoutée',
    es: 'Sin foto añadida',
  },
  'Vergroten': {
    en: 'Enlarge',
    de: 'Vergrößern',
    fr: 'Agrandir',
    es: 'Ampliar',
  },
  'Aantal:': {
    en: 'Quantity:',
    de: 'Anzahl:',
    fr: 'Quantité :',
    es: 'Cantidad:',
  },

  // Extras Hub
  'Extra Tools & Interactieve Functies': {
    en: 'Extra Tools & Interactive Features',
    de: 'Extra-Tools & Interaktive Funktionen',
    fr: 'Outils Supplémentaires & Fonctions Interactives',
    es: 'Herramientas Extra y Funciones Interactivas',
  },
  'Kies een functie': {
    en: 'Choose a feature',
    de: 'Wähle eine Funktion',
    fr: 'Choisissez une fonction',
    es: 'Elige una función',
  },
  'Selecteer hieronder welke tool je wilt gebruiken om speciaalbierdeals te ontdekken of je drankjes bij te houden.': {
    en: 'Select which tool you want to use below to discover craft beer deals or track your drinks.',
    de: 'Wähle unten aus, welches Tool du nutzen möchtest, um Bier-Angebote zu entdecken oder deine Getränke zu zählen.',
    fr: 'Sélectionnez ci-dessous l’outil que vous souhaitez utiliser pour découvrir des offres ou compter vos verres.',
    es: 'Selecciona abajo qué herramienta quieres usar para descubrir ofertas o llevar la cuenta de tus bebidas.',
  },
  'Terug naar Tegeloverzicht': {
    en: 'Back to Overview',
    de: 'Zurück zur Übersicht',
    fr: "Retour à l'aperçu",
    es: 'Volver al resumen',
  },
  'Bier & Kroeg Acties': {
    en: 'Beer & Pub Deals',
    de: 'Bier- & Kneipen-Aktionen',
    fr: 'Offres Bières & Bars',
    es: 'Ofertas de Cerveza y Bares',
  },
  'Bier Counter': {
    en: 'Beer Counter',
    de: 'Bierzähler',
    fr: 'Compteur de Bières',
    es: 'Contador de Cervezas',
  },

  // Settings & Admin Panel
  'Instellingen & Data Beheer': {
    en: 'Settings & Data Management',
    de: 'Einstellungen & Datenverwaltung',
    fr: 'Paramètres & Gestion des Données',
    es: 'Ajustes y Gestión de Datos',
  },
  'Back-up Exporteren': {
    en: 'Export Backup',
    de: 'Backup exportieren',
    fr: 'Exporter la sauvegarde',
    es: 'Exportar copia de seguridad',
  },
  'Back-up Importeren': {
    en: 'Import Backup',
    de: 'Backup importieren',
    fr: 'Importer une sauvegarde',
    es: 'Importar copia de seguridad',
  },
  'Opslaan': {
    en: 'Save',
    de: 'Speichern',
    fr: 'Enregistrer',
    es: 'Guardar',
  },
  'Annuleren': {
    en: 'Cancel',
    de: 'Abbrechen',
    fr: 'Annuler',
    es: 'Cancelar',
  },
  'Sluiten': {
    en: 'Close',
    de: 'Schließen',
    fr: 'Fermer',
    es: 'Cerrar',
  },
  'Uitloggen': {
    en: 'Sign out',
    de: 'Abmelden',
    fr: 'Déconnexion',
    es: 'Cerrar sesión',
  },
  'Server Schijfopslag (Disk)': {
    en: 'Server Disk Storage',
    de: 'Server-Festplattenspeicher (Disk)',
    fr: 'Stockage Disque du Serveur',
    es: 'Almacenamiento en Disco del Servidor',
  },
  'Server RAM-Geheugen': {
    en: 'Server RAM Memory',
    de: 'Server-Arbeitsspeicher (RAM)',
    fr: 'Mémoire RAM du Serveur',
    es: 'Memoria RAM del Servidor',
  },
  'Vernieuwen': {
    en: 'Refresh',
    de: 'Aktualisieren',
    fr: 'Actualiser',
    es: 'Actualizar',
  },
  'Scannen...': {
    en: 'Scanning...',
    de: 'Scannen...',
    fr: 'Analyse...',
    es: 'Escaneando...',
  },
};

/**
 * Pattern replacements for dynamic strings containing numbers (e.g. "3x gedronken", "2 stuks")
 */
const DYNAMIC_PATTERNS: Array<{
  regex: RegExp;
  replace: (match: RegExpExecArray, locale: Exclude<SupportedLocale, 'nl'>) => string;
}> = [
  {
    regex: /^(\d+)x gedronken$/i,
    replace: (m, locale) => {
      const count = m[1];
      if (locale === 'en') return `${count}x tasted`;
      if (locale === 'de') return `${count}x getrunken`;
      if (locale === 'fr') return `Bu ${count}x`;
      return `${count}x probado`;
    },
  },
  {
    regex: /^(\d+)\s+stuk(s)?$/i,
    replace: (m, locale) => {
      const count = Number(m[1]);
      if (locale === 'en') return `${count} ${count === 1 ? 'piece' : 'pieces'}`;
      if (locale === 'de') return `${count} Stück`;
      if (locale === 'fr') return `${count} ${count === 1 ? 'pièce' : 'pièces'}`;
      return `${count} ${count === 1 ? 'unidad' : 'unidades'}`;
    },
  },
  {
    regex: /^Alle Types \((\d+)\)$/i,
    replace: (m, locale) => {
      const count = m[1];
      if (locale === 'en') return `All Types (${count})`;
      if (locale === 'de') return `Alle Typen (${count})`;
      if (locale === 'fr') return `Tous les types (${count})`;
      return `Todos los tipos (${count})`;
    },
  },
  {
    regex: /^(\d+)\s+actieve acties$/i,
    replace: (m, locale) => {
      const count = m[1];
      if (locale === 'en') return `${count} active deals`;
      if (locale === 'de') return `${count} aktive Aktionen`;
      if (locale === 'fr') return `${count} offres actives`;
      return `${count} ofertas activas`;
    },
  },
];

/**
 * Detects the active browser or phone language from `navigator.languages` / `navigator.language`.
 * - Dutch ('nl-*') -> 'nl'
 * - English ('en-*') -> 'en'
 * - German ('de-*') -> 'de'
 * - French ('fr-*') -> 'fr'
 * - Spanish ('es-*') -> 'es'
 * - Any other non-Dutch browser/phone language -> 'en' (international fallback)
 */
export function detectBrowserLocale(): SupportedLocale {
  if (typeof navigator === 'undefined') return 'nl';

  const rawLang =
    (Array.isArray(navigator.languages) && navigator.languages.length > 0
      ? navigator.languages[0]
      : navigator.language) || 'nl';

  const primary = rawLang.toLowerCase().split(/[-_]/)[0];

  if (primary === 'nl') return 'nl';
  if (primary === 'de') return 'de';
  if (primary === 'fr') return 'fr';
  if (primary === 'es') return 'es';
  if (primary === 'en') return 'en';

  // For any other non-Dutch phone/browser language, use English international UI
  return 'en';
}

/**
 * Returns the browser's full locale tag for `toLocaleDateString` (e.g. 'nl-NL', 'en-US', 'de-DE')
 */
export function getBrowserDateLocale(): string {
  if (typeof navigator !== 'undefined' && navigator.language) {
    return navigator.language;
  }
  return 'nl-NL';
}

/**
 * Translates a single UI string according to the detected browser/phone locale.
 * Strictly preserves brand names (e.g., Cervisium).
 */
export function translateText(input: string, locale: SupportedLocale = detectBrowserLocale()): string {
  if (locale === 'nl' || !input) return input;

  const trimmed = input.trim();
  if (!trimmed) return input;

  // Never translate protected brand names
  for (const brand of PROTECTED_BRAND_TERMS) {
    if (trimmed.toLowerCase() === brand.toLowerCase()) {
      return input;
    }
  }

  // Exact match
  const exact = TRANSLATIONS[trimmed];
  if (exact && exact[locale]) {
    const leadingSpaces = input.match(/^\s*/)?.[0] || '';
    const trailingSpaces = input.match(/\s*$/)?.[0] || '';
    return `${leadingSpaces}${exact[locale]}${trailingSpaces}`;
  }

  // Dynamic pattern match
  for (const pattern of DYNAMIC_PATTERNS) {
    const match = pattern.regex.exec(trimmed);
    if (match) {
      const leadingSpaces = input.match(/^\s*/)?.[0] || '';
      const trailingSpaces = input.match(/\s*$/)?.[0] || '';
      return `${leadingSpaces}${pattern.replace(match, locale)}${trailingSpaces}`;
    }
  }

  return input;
}

function isInsideNoTranslate(node: Node | null): boolean {
  let current: Node | null = node;
  while (current) {
    if (current instanceof HTMLElement) {
      if (
        current.getAttribute('translate') === 'no' ||
        current.getAttribute('data-no-translate') === 'true' ||
        current.classList.contains('notranslate')
      ) {
        return true;
      }
    }
    current = current.parentNode;
  }
  return false;
}

const originalTextNodes = new WeakMap<Text, string>();
const originalAttributes = new WeakMap<Element, Map<string, string>>();

function applyDomLocalization(root: Node, locale: SupportedLocale) {
  if (typeof document === 'undefined') return;

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
  let currentNode: Node | null = walker.currentNode;

  while (currentNode) {
    if (currentNode.nodeType === Node.TEXT_NODE) {
      const textNode = currentNode as Text;
      const parentTag = textNode.parentElement?.tagName;
      if (
        parentTag !== 'SCRIPT' &&
        parentTag !== 'STYLE' &&
        parentTag !== 'NOSCRIPT' &&
        !isInsideNoTranslate(textNode)
      ) {
        if (!originalTextNodes.has(textNode)) {
          originalTextNodes.set(textNode, textNode.nodeValue || '');
        }
        const sourceText = originalTextNodes.get(textNode) ?? textNode.nodeValue ?? '';
        const translated = locale === 'nl' ? sourceText : translateText(sourceText, locale);
        if (textNode.nodeValue !== translated) {
          textNode.nodeValue = translated;
        }
      }
    } else if (currentNode.nodeType === Node.ELEMENT_NODE) {
      const el = currentNode as HTMLElement;
      if (!isInsideNoTranslate(el)) {
        const attrs = ['placeholder', 'title', 'aria-label'];
        for (const attr of attrs) {
          const val = el.getAttribute(attr);
          if (val) {
            let attrMap = originalAttributes.get(el);
            if (!attrMap) {
              attrMap = new Map<string, string>();
              originalAttributes.set(el, attrMap);
            }
            if (!attrMap.has(attr)) {
              attrMap.set(attr, val);
            }
            const sourceAttr = attrMap.get(attr) ?? val;
            const translatedAttr = locale === 'nl' ? sourceAttr : translateText(sourceAttr, locale);
            if (val !== translatedAttr) {
              el.setAttribute(attr, translatedAttr);
            }
          }
        }
      }
    }
    currentNode = walker.nextNode();
  }
}

let observerInitialized = false;

/**
 * Starts automatic browser/phone language synchronization on the document.
 */
export function initBrowserLanguageSync(): void {
  if (typeof window === 'undefined' || typeof document === 'undefined' || observerInitialized) {
    return;
  }
  observerInitialized = true;

  const syncLanguage = () => {
    const locale = detectBrowserLocale();
    document.documentElement.lang = locale;
    if (document.body) {
      applyDomLocalization(document.body, locale);
    }
  };

  syncLanguage();

  const observer = new MutationObserver((mutations) => {
    const locale = detectBrowserLocale();
    if (locale === 'nl') return;
    for (const m of mutations) {
      if (m.type === 'childList') {
        m.addedNodes.forEach((node) => {
          applyDomLocalization(node, locale);
        });
      }
    }
  });

  if (document.body) {
    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
  }

  window.addEventListener('languagechange', () => {
    syncLanguage();
  });
}
