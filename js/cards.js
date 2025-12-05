// Card Definitions for Gremios

// Guild Cards
const GUILDS = {
    2: { number: 2, name: 'Iglesia', nameES: 'Iglesia' },
    3: { number: 3, name: 'Herrería', nameES: 'Herrería' },
    4: { number: 4, name: 'Cantera', nameES: 'Cantera' },
    5: { number: 5, name: 'Puerto', nameES: 'Puerto' },
    6: { number: 6, name: 'Granja', nameES: 'Granja' },
    8: { number: 8, name: 'Taberna', nameES: 'Taberna' },
    9: { number: 9, name: 'Mercado', nameES: 'Mercado' },
    10: { number: 10, name: 'Serrería', nameES: 'Serrería' },
    11: { number: 11, name: 'Joyería', nameES: 'Joyería' },
    12: { number: 12, name: 'Monasterio', nameES: 'Monasterio' }
};

// Event Types
const EVENT_TYPES = {
    GUILD_FOUNDATION: 'guild_foundation',
    ACTION: 'action',
    TEMPORARY: 'temporary'
};

// Event Card Definitions (templates with quantities)
const EVENT_DEFINITIONS = {
    // Guild Foundation Events (1 of each - unique)
    GUILD_FOUNDATIONS: [
        { type: EVENT_TYPES.GUILD_FOUNDATION, guild: 2, name: 'Fundación: Iglesia' },
        { type: EVENT_TYPES.GUILD_FOUNDATION, guild: 3, name: 'Fundación: Herrería' },
        { type: EVENT_TYPES.GUILD_FOUNDATION, guild: 4, name: 'Fundación: Cantera' },
        { type: EVENT_TYPES.GUILD_FOUNDATION, guild: 5, name: 'Fundación: Puerto' },
        { type: EVENT_TYPES.GUILD_FOUNDATION, guild: 6, name: 'Fundación: Granja' },
        { type: EVENT_TYPES.GUILD_FOUNDATION, guild: 8, name: 'Fundación: Taberna' },
        { type: EVENT_TYPES.GUILD_FOUNDATION, guild: 9, name: 'Fundación: Mercado' },
        { type: EVENT_TYPES.GUILD_FOUNDATION, guild: 10, name: 'Fundación: Serrería' },
        { type: EVENT_TYPES.GUILD_FOUNDATION, guild: 11, name: 'Fundación: Joyería' },
        { type: EVENT_TYPES.GUILD_FOUNDATION, guild: 12, name: 'Fundación: Monasterio' }
    ],
    // Action Events (with quantities)
    ACTION_EVENTS: [
        { type: EVENT_TYPES.ACTION, id: 'good_harvest', name: 'Buenas Cosechas',
          description: 'Todos reciben 1 moneda por tierra cultivada', count: 5 },
        { type: EVENT_TYPES.ACTION, id: 'prosperity', name: 'Época de Bonanza',
          description: 'Todos reciben 1 moneda. Eliminar eventos temporales', count: 2 },
        { type: EVENT_TYPES.ACTION, id: 'expedition', name: 'Expedición',
          description: 'Resolver expedición (si hay inversiones)', count: 3 },
        { type: EVENT_TYPES.ACTION, id: 'bad_harvest', name: 'Malas Cosechas',
          description: 'Todos pierden 1 tierra cultivada', count: 2 },
        { type: EVENT_TYPES.ACTION, id: 'bankruptcy', name: 'Bancarrota',
          description: 'Bancarrota en gremio según siguiente tirada', count: 2 },
        { type: EVENT_TYPES.ACTION, id: 'mutiny', name: 'Motín',
          description: 'Motín en gremio según siguiente tirada', count: 3 },
        { type: EVENT_TYPES.ACTION, id: 'invasion', name: 'Invasión Extranjera',
          description: 'Todos destruyen la mitad de sus posadas', count: 5 },
        { type: EVENT_TYPES.ACTION, id: 'expropriation', name: 'Expropiación de Terrenos',
          description: 'Todos pierden la mitad de sus tierras', count: 1 },
        { type: EVENT_TYPES.ACTION, id: 'tax_collection', name: 'Recaudación de Impuestos',
          description: 'Jugadores con 4+ monedas pierden la mitad', count: 5 }
    ],
    // Temporary Events (with quantities)
    TEMPORARY_EVENTS: [
        { type: EVENT_TYPES.TEMPORARY, id: 'mine_collapse', name: 'Derrumbamiento de Minas',
          affectedGuilds: [3, 11], description: 'Bloquea Herrería y Joyería', count: 2 },
        { type: EVENT_TYPES.TEMPORARY, id: 'material_shortage', name: 'Escasez de Materiales',
          affectedGuilds: [4, 10], description: 'Bloquea Cantera y Serrería', count: 3 },
        { type: EVENT_TYPES.TEMPORARY, id: 'trade_blockade', name: 'Bloqueo Comercial',
          affectedGuilds: [5, 9], description: 'Bloquea Puerto y Mercado', count: 3 },
        { type: EVENT_TYPES.TEMPORARY, id: 'famine', name: 'Hambruna',
          affectedGuilds: [6, 8], description: 'Bloquea Granja y Taberna', count: 3 },
        { type: EVENT_TYPES.TEMPORARY, id: 'plague', name: 'Peste',
          affectedGuilds: 'all', immuneGuilds: [2, 12],
          description: 'Solo Iglesia y Monasterio generan recursos', count: 1 }
    ]
};

// Generate event deck based on definitions
function generateEventDeck() {
    const deck = [];

    // Add all guild foundation events (1 of each)
    deck.push(...EVENT_DEFINITIONS.GUILD_FOUNDATIONS);

    // Add action events based on count
    for (const eventDef of EVENT_DEFINITIONS.ACTION_EVENTS) {
        for (let i = 0; i < eventDef.count; i++) {
            const { count, ...eventCard } = eventDef; // Remove count property
            deck.push({ ...eventCard }); // Create a copy
        }
    }

    // Add temporary events based on count
    for (const eventDef of EVENT_DEFINITIONS.TEMPORARY_EVENTS) {
        for (let i = 0; i < eventDef.count; i++) {
            const { count, ...eventCard } = eventDef; // Remove count property
            deck.push({ ...eventCard }); // Create a copy
        }
    }

    return deck;
}

// Event Cards (generated from definitions)
const EVENTS = generateEventDeck();

// Treasure Types
const TREASURE_TYPES = {
    WEALTH: 'wealth',      // 0 VP, can be exchanged for 3-4 coins
    COMMON: 'common',      // 1 VP
    RARE: 'rare'           // 2 VP
};

// Treasure deck distribution
function createTreasureDeck() {
    const deck = [];
    // 8 Wealth cards
    for (let i = 0; i < 8; i++) {
        deck.push({ type: TREASURE_TYPES.WEALTH, vp: 0, coinValue: Math.random() < 0.5 ? 3 : 4 });
    }
    // 15 Common treasures
    for (let i = 0; i < 15; i++) {
        deck.push({ type: TREASURE_TYPES.COMMON, vp: 1 });
    }
    // 8 Rare treasures
    for (let i = 0; i < 8; i++) {
        deck.push({ type: TREASURE_TYPES.RARE, vp: 2 });
    }
    return shuffleArray(deck);
}

// Resource Cards
class ResourceCard {
    constructor(type, cultivated = false, destroyed = false) {
        this.type = type; // 'land' or 'inn'
        this.cultivated = cultivated; // for lands
        this.destroyed = destroyed; // for inns
    }

    getVP() {
        if (this.type === 'inn' && !this.destroyed) {
            return 2;
        }
        return 0;
    }
}

// Helper function to shuffle an array
function shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

// Create event deck
function createEventDeck(numPlayers) {
    // Start with all events
    let deck = [...EVENTS];

    // Add guild cards to deck (except those already on table)
    // In setup, we'll remove the initial guilds

    // Shuffle the deck
    deck = shuffleArray(deck);

    return deck;
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { GUILDS, EVENT_TYPES, EVENTS, TREASURE_TYPES, ResourceCard, createTreasureDeck, createEventDeck, shuffleArray };
}
