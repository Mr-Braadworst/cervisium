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
  'Beheer je voorkeuren, weergave-opties, profiel en back-ups voor Cervisium': {
    en: 'Manage your preferences, display options, profile and backups for Cervisium',
    de: 'Verwalte deine Einstellungen, Anzeigeoptionen, dein Profil und Backups für Cervisium',
    fr: 'Gérez vos préférences, options d’affichage, profil et sauvegardes pour Cervisium',
    es: 'Administra tus preferencias, opciones de visualización, perfil y copias de seguridad para Cervisium',
  },
  'Herstel standaard': {
    en: 'Reset defaults',
    de: 'Standard wiederherstellen',
    fr: 'Réinitialiser',
    es: 'Restablecer valores',
  },
  'Standaardinstellingen zijn hersteld!': {
    en: 'Default settings have been restored!',
    de: 'Standardeinstellungen wurden wiederhergestellt!',
    fr: 'Les paramètres par défaut ont été restaurés !',
    es: '¡Se han restablecido los ajustes predeterminados!',
  },
  'Taal & Regio': {
    en: 'Language & Region',
    de: 'Sprache & Region',
    fr: 'Langue & Région',
    es: 'Idioma y Región',
  },
  'Kies de taal van de app of volg automatisch je browser- en telefooninstellingen (merknamen blijven ongewijzigd)': {
    en: 'Choose the app language or automatically follow your browser and phone settings (brand names remain unchanged)',
    de: 'Wähle die App-Sprache oder folge automatisch deinen Browser- und Telefoneinstellungen (Markennamen bleiben unverändert)',
    fr: 'Choisissez la langue de l’application ou suivez automatiquement votre navigateur/téléphone (les marques restent inchangées)',
    es: 'Elige el idioma de la aplicación o sigue automáticamente tu navegador o teléfono (las marcas no cambian)',
  },
  'App-taal': {
    en: 'App language',
    de: 'App-Sprache',
    fr: 'Langue de l’application',
    es: 'Idioma de la aplicación',
  },
  'Automatisch (Browser / Telefoon)': {
    en: 'Automatic (Browser / Phone)',
    de: 'Automatisch (Browser / Telefon)',
    fr: 'Automatique (Navigateur / Téléphone)',
    es: 'Automático (Navegador / Teléfono)',
  },
  'Automatisch': {
    en: 'Automatic',
    de: 'Automatisch',
    fr: 'Automatique',
    es: 'Automático',
  },
  'Weergave & Navigatiebalk': {
    en: 'Display & Navigation Bar',
    de: 'Anzeige & Navigationsleiste',
    fr: 'Affichage & Barre de Navigation',
    es: 'Pantalla y Barra de Navegación',
  },
  'Weergave, Thema & Navigatiebalk': {
    en: 'Display, Theme & Navigation Bar',
    de: 'Anzeige, Thema & Navigationsleiste',
    fr: 'Affichage, Thème & Barre de Navigation',
    es: 'Pantalla, Tema y Barra de Navegación',
  },
  'Schakel Licht Modus (wit thema) in of pas de knoppen en tellers in de bovenbalk aan': {
    en: 'Enable Light Mode (white theme) or customize the buttons and counters in the top bar',
    de: 'Aktiviere den Hellen Modus (weißes Thema) oder passe die Buttons und Zähler in der oberen Leiste an',
    fr: 'Activez le Mode Clair (thème blanc) ou personnalisez les boutons et compteurs de la barre supérieure',
    es: 'Activa el Modo Claro (tema blanco) o personaliza los botones y contadores en la barra superior',
  },
  'Standaard': {
    en: 'Default',
    de: 'Standard',
    fr: 'Par défaut',
    es: 'Predeterminado',
  },
  'Licht Modus (Wit Thema)': {
    en: 'Light Mode (White Theme)',
    de: 'Heller Modus (Weißes Thema)',
    fr: 'Mode Clair (Thème Blanc)',
    es: 'Modo Claro (Tema Blanco)',
  },
  'Wit thema actief': {
    en: 'White theme active',
    de: 'Weißes Thema aktiv',
    fr: 'Thème blanc actif',
    es: 'Tema blanco activo',
  },
  'Donker thema actief': {
    en: 'Dark theme active',
    de: 'Dunkles Thema aktiv',
    fr: 'Thème sombre actif',
    es: 'Tema oscuro activo',
  },
  'Activeert een helder wit thema voor de volledige applicatie in plaats van de donkere modus.': {
    en: 'Activates a bright white theme for the entire application instead of dark mode.',
    de: 'Aktiviert ein helles weißes Thema für die gesamte Anwendung anstelle des dunklen Modus.',
    fr: 'Active un thème blanc lumineux pour toute l’application au lieu du mode sombre.',
    es: 'Activa un tema blanco brillante para toda la aplicación en lugar del modo oscuro.',
  },
  'Bepaal het kleurthema en welke onderdelen en tellers zichtbaar zijn in je menu': {
    en: 'Choose the color theme and which sections and counters are visible in your menu',
    de: 'Bestimme das Farbschema und welche Bereiche und Zähler im Menü sichtbar sind',
    fr: 'Choisissez le thème de couleur et les éléments visibles dans votre menu',
    es: 'Elige el tema de color y qué secciones y contadores son visibles en tu menú',
  },
  'Lichte Modus (Wit Thema)': {
    en: 'Light Mode (White Theme)',
    de: 'Heller Modus (Weißes Thema)',
    fr: 'Mode Clair (Thème Blanc)',
    es: 'Modo Claro (Tema Blanco)',
  },
  'Donkere Modus actief': {
    en: 'Dark Mode active',
    de: 'Dunkler Modus aktiv',
    fr: 'Mode Sombre actif',
    es: 'Modo Oscuro activo',
  },
  'Schakel over tussen het donkere kroeg-thema en een fris wit daglicht-thema.': {
    en: 'Switch between the dark pub theme and a crisp white daylight theme.',
    de: 'Wechsle zwischen dem dunklen Kneipen-Thema und einem hellen Tageslicht-Thema.',
    fr: 'Basculez entre le thème sombre et un thème clair lumineux.',
    es: 'Cambia entre el tema oscuro de bar y un tema claro de día.',
  },
  'Melding-icoontje op de “Extra’s” knop tonen': {
    en: 'Show notification badge on the “Extras” button',
    de: 'Benachrichtigungs-Badge auf dem „Extras“-Button anzeigen',
    fr: 'Afficher le badge de notification sur le bouton « Extras »',
    es: 'Mostrar insignia de notificación en el botón «Extras»',
  },
  'Melding-icoontje op de "Extra\'s" knop tonen': {
    en: 'Show notification badge on the "Extras" button',
    de: 'Benachrichtigungs-Badge auf dem „Extras“-Button anzeigen',
    fr: 'Afficher le badge de notification sur le bouton « Extras »',
    es: 'Mostrar insignia de notificación en el botón «Extras»',
  },
  'Standaard uitgeschakeld. Als je dit aanzet, verschijnt het groene aantal actieve kroegacties op de Extra\'s knop.': {
    en: 'Disabled by default. When enabled, shows the green count of active pub deals on the Extras button.',
    de: 'Standardmäßig deaktiviert. Wenn aktiviert, wird die grüne Anzahl aktiver Kneipen-Aktionen auf dem Extras-Button angezeigt.',
    fr: 'Désactivé par défaut. Affiche le nombre d’offres actives sur le bouton Extras.',
    es: 'Desactivado por defecto. Muestra el número verde de ofertas activas en el botón Extras.',
  },
  'Collectie-tellers in navigatiebalk tonen': {
    en: 'Show collection counters in navigation bar',
    de: 'Sammlungszähler in der Navigationsleiste anzeigen',
    fr: 'Afficher les compteurs de collection dans la barre de navigation',
    es: 'Mostrar contadores de colección en la barra de navegación',
  },
  'Toont het totaal aantal geproefde bieren en glazen als badge op de menuknoppen.': {
    en: 'Shows the total number of tasted beers and glasses as a badge on the menu buttons.',
    de: 'Zeigt die Gesamtanzahl der probierten Biere und Gläser als Badge auf den Menü-Buttons.',
    fr: 'Affiche le nombre total de bières et de verres sous forme de badge sur les boutons du menu.',
    es: 'Muestra el total de cervezas probadas y vasos como insignia en los botones del menú.',
  },
  '“Extra’s” knop in de navigatiebalk tonen': {
    en: 'Show “Extras” button in navigation bar',
    de: '„Extras“-Button in der Navigationsleiste anzeigen',
    fr: 'Afficher le bouton « Extras » dans la barre de navigation',
    es: 'Mostrar el botón «Extras» en la barra de navegación',
  },
  '"Extra\'s" knop in de navigatiebalk tonen': {
    en: 'Show "Extras" button in navigation bar',
    de: '„Extras“-Button in der Navigationsleiste anzeigen',
    fr: 'Afficher le bouton « Extras » dans la barre de navigation',
    es: 'Mostrar el botón «Extras» en la barra de navegación',
  },
  'Geeft direct toegang tot Bier & Kroeg Acties NL en de Live Bier Counter in het hoofdmenu.': {
    en: 'Provides direct access to Beer & Pub Deals and the Live Beer Counter in the main menu.',
    de: 'Bietet direkten Zugriff auf Bier- & Kneipen-Aktionen und den Live-Bierzähler im Hauptmenü.',
    fr: 'Donne un accès direct aux Offres Bières & Bars et au Compteur de Bières dans le menu principal.',
    es: 'Da acceso directo a Ofertas de Cerveza y Bares y al Contador de Cervezas en el menú principal.',
  },
  'Deal Scanner balk tonen bij Bier & Kroeg Acties': {
    en: 'Show Deal Scanner bar in Beer & Pub Deals',
    de: 'Deal-Scanner-Leiste bei Bier- & Kneipen-Aktionen anzeigen',
    fr: 'Afficher la barre Deal Scanner dans Offres Bières & Bars',
    es: 'Mostrar barra de Escáner de Ofertas en Ofertas de Cerveza y Bares',
  },
  'Toont de 1-Klik Deal Scanner bovenaan het acties-overzicht om nieuwe kroegdeals te zoeken.': {
    en: 'Shows the 1-Click Deal Scanner at the top of the deals overview to search for new pub deals.',
    de: 'Zeigt den 1-Klick-Deal-Scanner oben in der Aktionsübersicht an, um neue Kneipen-Deals zu suchen.',
    fr: 'Affiche le scanner d’offres en 1 clic en haut de l’aperçu des offres.',
    es: 'Muestra el escáner de ofertas en 1 clic en la parte superior del resumen de ofertas.',
  },
  'App Voorkeuren & Bier Counter': {
    en: 'App Preferences & Beer Counter',
    de: 'App-Einstellungen & Bierzähler',
    fr: 'Préférences & Compteur de Bières',
    es: 'Preferencias de la App y Contador de Cervezas',
  },
  'Standaard startscherm en berekeningswaarden voor je avondteller': {
    en: 'Default start screen and calculation values for your evening counter',
    de: 'Standard-Startbildschirm und Berechnungswerte für deinen Abendzähler',
    fr: 'Écran de démarrage par défaut et valeurs de calcul pour votre compteur de soirée',
    es: 'Pantalla de inicio predeterminada y valores de cálculo para tu contador nocturno',
  },
  'Standaard starttabblad bij openen van Cervisium': {
    en: 'Default start tab when opening Cervisium',
    de: 'Standard-Starttab beim Öffnen von Cervisium',
    fr: 'Onglet de démarrage par défaut à l’ouverture de Cervisium',
    es: 'Pestaña de inicio predeterminada al abrir Cervisium',
  },
  'Dashboard (Overzicht)': {
    en: 'Dashboard (Overview)',
    de: 'Dashboard (Übersicht)',
    fr: 'Tableau de bord (Aperçu)',
    es: 'Panel (Resumen)',
  },
  "Extra's (Acties & Bier Counter)": {
    en: 'Extras (Deals & Beer Counter)',
    de: 'Extras (Aktionen & Bierzähler)',
    fr: 'Extras (Offres & Compteur)',
    es: 'Extras (Ofertas y Contador)',
  },
  'Extra’s (Acties & Bier Counter)': {
    en: 'Extras (Deals & Beer Counter)',
    de: 'Extras (Aktionen & Bierzähler)',
    fr: 'Extras (Offres & Compteur)',
    es: 'Extras (Ofertas y Contador)',
  },
  'Standaard prijs per bier (€)': {
    en: 'Default price per beer (€)',
    de: 'Standardpreis pro Bier (€)',
    fr: 'Prix par défaut par bière (€)',
    es: 'Precio predeterminado por cerveza (€)',
  },
  'Standaard glasformaat (Bier Counter)': {
    en: 'Default glass size (Beer Counter)',
    de: 'Standard-Glasgröße (Bierzähler)',
    fr: 'Taille de verre par défaut (Compteur)',
    es: 'Tamaño de vaso predeterminado (Contador)',
  },
  'Mijn Google Profiel': {
    en: 'My Profile',
    de: 'Mein Profil',
    fr: 'Mon Profil',
    es: 'Mi Perfil',
  },
  'Beheer de weergavenaam van je gekoppelde Google-account': {
    en: 'Manage the display name of your account',
    de: 'Verwalte den Anzeigenamen deines Kontos',
    fr: 'Gérez le nom d’affichage de votre compte',
    es: 'Administra el nombre visible de tu cuenta',
  },
  'Jouw Weergavenaam (standaard je Google-accountnaam)': {
    en: 'Your Display Name',
    de: 'Dein Anzeigename',
    fr: 'Votre Nom d’Affichage',
    es: 'Tu Nombre Visible',
  },
  'Jouw naam...': {
    en: 'Your name...',
    de: 'Dein Name...',
    fr: 'Votre nom...',
    es: 'Tu nombre...',
  },
  'Data Back-up & Beheer': {
    en: 'Data Backup & Management',
    de: 'Datensicherung & Verwaltung',
    fr: 'Sauvegarde & Gestion des Données',
    es: 'Copia de Seguridad y Gestión de Datos',
  },
  'Download Back-up': {
    en: 'Download Backup',
    de: 'Backup herunterladen',
    fr: 'Télécharger la sauvegarde',
    es: 'Descargar copia de seguridad',
  },
  'Importeer JSON': {
    en: 'Import JSON',
    de: 'JSON importieren',
    fr: 'Importer JSON',
    es: 'Importar JSON',
  },
  'Laad voorbeeld bieren': {
    en: 'Load sample beers',
    de: 'Beispielbiere laden',
    fr: 'Charger des bières d’exemple',
    es: 'Cargar cervezas de ejemplo',
  },
  'Wis mijn data': {
    en: 'Clear my data',
    de: 'Meine Daten löschen',
    fr: 'Effacer mes données',
    es: 'Borrar mis datos',
  },
  'Bevestig wissen': {
    en: 'Confirm delete',
    de: 'Löschen bestätigen',
    fr: 'Confirmer la suppression',
    es: 'Confirmar borrado',
  },
  'Annuleer': {
    en: 'Cancel',
    de: 'Abbrechen',
    fr: 'Annuler',
    es: 'Cancelar',
  },
  'Gescheiden': {
    en: 'Separated',
    de: 'Getrennt',
    fr: 'Séparés',
    es: 'Separados',
  },
  "Nog geen foto's toegevoegd": {
    en: 'No photos added yet',
    de: 'Noch keine Fotos hinzugefügt',
    fr: 'Aucune photo ajoutée pour le moment',
    es: 'Aún no se han añadido fotos',
  },
  'Zodra je een foto toevoegt bij een biertje of een bierglas in je collectie, verschijnen ze hier automatisch.': {
    en: 'As soon as you add a photo to a beer or a beer glass in your collection, they will automatically appear here.',
    de: 'Sobald du ein Foto zu einem Bier oder Bierglas in deiner Sammlung hinzufügst, erscheint es automatisch hier.',
    fr: 'Dès que vous ajoutez une photo à une bière ou un verre de votre collection, elle apparaît automatiquement ici.',
    es: 'Tan pronto como añadas una foto a una cerveza o vaso de tu colección, aparecerá aquí automáticamente.',
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
  {
    regex: /^Mijn Foto['’]s \((\d+)\)$/i,
    replace: (m, locale) => {
      const count = m[1];
      if (locale === 'en') return `My Photos (${count})`;
      if (locale === 'de') return `Meine Fotos (${count})`;
      if (locale === 'fr') return `Mes Photos (${count})`;
      return `Mis Fotos (${count})`;
    },
  },
  {
    regex: /^Alles in 1 keer \((\d+)\)$/i,
    replace: (m, locale) => {
      const count = m[1];
      if (locale === 'en') return `All at once (${count})`;
      if (locale === 'de') return `Alle auf einmal (${count})`;
      if (locale === 'fr') return `Tout en une fois (${count})`;
      return `Todo a la vez (${count})`;
    },
  },
  {
    regex: /^Biertjes \((\d+)\)$/i,
    replace: (m, locale) => {
      const count = m[1];
      if (locale === 'en') return `Beers (${count})`;
      if (locale === 'de') return `Biere (${count})`;
      if (locale === 'fr') return `Bières (${count})`;
      return `Cervezas (${count})`;
    },
  },
  {
    regex: /^Bierglazen \((\d+)\)$/i,
    replace: (m, locale) => {
      const count = m[1];
      if (locale === 'en') return `Beer Glasses (${count})`;
      if (locale === 'de') return `Biergläser (${count})`;
      if (locale === 'fr') return `Verres à Bière (${count})`;
      return `Vasos de Cerveza (${count})`;
    },
  },
];

export type LanguagePreference = 'auto' | SupportedLocale;

const LANGUAGE_PREF_STORAGE_KEY = 'cervisium_language_preference';

let currentLanguagePreference: LanguagePreference = (() => {
  try {
    if (typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem(LANGUAGE_PREF_STORAGE_KEY);
      if (
        saved === 'auto' ||
        saved === 'nl' ||
        saved === 'en' ||
        saved === 'de' ||
        saved === 'fr' ||
        saved === 'es'
      ) {
        return saved;
      }
    }
  } catch {
    // ignore
  }
  return 'auto';
})();

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
 * Returns the user's configured language preference ('auto' | 'nl' | 'en' | 'de' | 'fr' | 'es').
 */
export function getLanguagePreference(): LanguagePreference {
  return currentLanguagePreference;
}

/**
 * Returns the effective active locale (either the manual preference or the detected browser/phone locale).
 */
export function getActiveLocale(): SupportedLocale {
  if (currentLanguagePreference !== 'auto') {
    return currentLanguagePreference;
  }
  return detectBrowserLocale();
}

/**
 * Updates the active language preference ('auto' or a specific locale) and immediately updates the entire DOM.
 */
export function setLanguagePreference(pref: LanguagePreference): void {
  const validPref: LanguagePreference =
    pref === 'nl' || pref === 'en' || pref === 'de' || pref === 'fr' || pref === 'es'
      ? pref
      : 'auto';
  currentLanguagePreference = validPref;
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(LANGUAGE_PREF_STORAGE_KEY, validPref);
    }
  } catch {
    // ignore
  }
  if (typeof document !== 'undefined') {
    const resolved = getActiveLocale();
    document.documentElement.lang = resolved;
    if (document.body) {
      applyDomLocalization(document.body, resolved);
    }
  }
}

/**
 * Returns the full locale tag for `toLocaleDateString` (e.g. 'nl-NL', 'en-GB', 'de-DE', 'fr-FR', 'es-ES')
 */
export function getBrowserDateLocale(): string {
  const active = getActiveLocale();
  if (currentLanguagePreference !== 'auto') {
    const map: Record<SupportedLocale, string> = {
      nl: 'nl-NL',
      en: 'en-GB',
      de: 'de-DE',
      fr: 'fr-FR',
      es: 'es-ES',
    };
    return map[active] || 'nl-NL';
  }
  if (typeof navigator !== 'undefined' && navigator.language) {
    return navigator.language;
  }
  return 'nl-NL';
}

/**
 * Translates a single UI string according to the active locale.
 * Strictly preserves brand names (e.g., Cervisium).
 */
export function translateText(input: string, locale: SupportedLocale = getActiveLocale()): string {
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

interface TrackedStringState {
  source: string;
  lastRendered: string;
}

const trackedTextNodes = new WeakMap<Text, TrackedStringState>();
const trackedAttributes = new WeakMap<Element, Map<string, TrackedStringState>>();

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
        const currentVal = textNode.nodeValue || '';
        const tracked = trackedTextNodes.get(textNode);
        // Als dit een nieuwe node is, of als React de tekst dynamisch heeft bijgewerkt:
        const sourceText =
          !tracked || currentVal !== tracked.lastRendered ? currentVal : tracked.source;
        const translated = locale === 'nl' ? sourceText : translateText(sourceText, locale);
        trackedTextNodes.set(textNode, {
          source: sourceText,
          lastRendered: translated,
        });
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
            let attrMap = trackedAttributes.get(el);
            if (!attrMap) {
              attrMap = new Map<string, TrackedStringState>();
              trackedAttributes.set(el, attrMap);
            }
            const tracked = attrMap.get(attr);
            const sourceAttr = !tracked || val !== tracked.lastRendered ? val : tracked.source;
            const translatedAttr = locale === 'nl' ? sourceAttr : translateText(sourceAttr, locale);
            attrMap.set(attr, {
              source: sourceAttr,
              lastRendered: translatedAttr,
            });
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
 * Starts automatic browser/phone and user-selected language synchronization on the document.
 */
export function initBrowserLanguageSync(): void {
  if (typeof window === 'undefined' || typeof document === 'undefined' || observerInitialized) {
    return;
  }
  observerInitialized = true;

  const syncLanguage = () => {
    const locale = getActiveLocale();
    document.documentElement.lang = locale;
    if (document.body) {
      applyDomLocalization(document.body, locale);
    }
  };

  syncLanguage();

  const observer = new MutationObserver((mutations) => {
    const locale = getActiveLocale();
    if (locale === 'nl') return;
    for (const m of mutations) {
      if (m.type === 'childList') {
        m.addedNodes.forEach((node) => {
          applyDomLocalization(node, locale);
        });
      } else if (m.type === 'characterData' && m.target) {
        applyDomLocalization(m.target, locale);
      }
    }
  });

  if (document.body) {
    observer.observe(document.body, {
      childList: true,
      characterData: true,
      subtree: true,
    });
  }

  window.addEventListener('languagechange', () => {
    syncLanguage();
  });
}

