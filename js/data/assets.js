// Asset definitions for Phaser loader

const ASSET_PATHS = {
    // Base path for all images
    basePath: 'assets/images/',

    // Character portraits (12 total)
    characters: {
        archbishop: 'characters/Archbishop.webp',
        artisan: 'characters/Artisan.webp',
        healer: 'characters/Healer.webp',
        governor: 'characters/Governor.webp',
        innkeeper: 'characters/Innkeeper.webp',
        master_builder: 'characters/Master_Builder.webp',
        mercenary: 'characters/Mercenary.webp',
        peasant: 'characters/Peasant.webp',
        pirate: 'characters/Pirate.webp',
        shopkeeper: 'characters/Shopkeeper.webp',
        stowaway: 'characters/Stowaway.webp',
        merchant: 'characters/Merchant.webp'
    },

    // Guild cards (11 total)
    guilds: {
        guild_2: 'guilds/Church.webp',
        guild_3: 'guilds/Blacksmith.webp',
        guild_4: 'guilds/Quarry.webp',
        guild_5: 'guilds/Port.webp',
        guild_6: 'guilds/Tavern.webp',
        guild_8: 'guilds/Farm.webp',
        guild_9: 'guilds/Market.webp',
        guild_10: 'guilds/Sawmill.webp',
        guild_11: 'guilds/Jewelers.webp',
        guild_12: 'guilds/Monastery.webp',
        expedition_card: 'guilds/Expedition.webp'
    },

    // Action event cards (9 types)
    actionEvents: {
        good_harvest: 'events/action/good_harvest.webp',
        prosperity: 'events/action/prosperity.webp',
        expedition: 'events/action/expedition.webp',
        bad_harvest: 'events/action/bad_harvest.webp',
        bankruptcy: 'events/action/bankruptcy.webp',
        mutiny: 'events/action/mutiny.webp',
        invasion: 'events/action/invasion.webp',
        expropriation: 'events/action/expropriation.webp',
        tax_collection: 'events/action/tax_collection.webp'
    },

    // Blocking event cards (5 types)
    blockingEvents: {
        mine_collapse: 'events/blocking/MineCollapse.webp',
        material_shortage: 'events/blocking/ResourcesOutage.webp',
        trade_blockade: 'events/blocking/TradeBlock.webp',
        famine: 'events/blocking/Famine.webp',
        plague: 'events/blocking/Plague.webp'
    },

    // UI elements
    ui: {
        // Coins
        gold: 'ui/gold.webp',
        bronze: 'ui/bronze.webp',
        silver: 'ui/silver.webp',

        // Resources
        land: 'ui/Land.webp',
        cultivated_land: 'ui/Cultivated_Land.webp',
        inn: 'ui/Inn.webp',
        destroyed_inn: 'ui/Destroyed_Inn.webp',

        // Treasures
        treasure: 'ui/Treasure.webp',
        treasure_1vp: 'ui/Treasure_1VP.webp',
        treasure_2vp: 'ui/Treasure_2VP.webp',
        wealth_3: 'ui/Wealth_3coins.webp',
        wealth_4: 'ui/Wealth_4coins.webp',

        // Other UI
        badge: 'ui/Badge.webp',
        event_back: 'ui/Event_Back.webp',
        player_hud: 'ui/player_hud.webp',
        vp_icon: 'ui/1VP.webp'
    },

    // Backgrounds
    backgrounds: {
        board: 'backgrounds/Board.webp',
        panoramic: 'backgrounds/Panoramic.webp'
    },

    // Brand logos
    brand: {
        gremios: 'brand/gremios.webp',
        elenport: 'brand/elenport.webp'
    },

    // Video (for intro - disabled during development)
    video: {
        intro: 'ui/Intro.mp4'
    },

    // Audio (background music)
    audio: {
        soundtrack_1: 'assets/audio/soundtrack_1.mp3',
        soundtrack_2: 'assets/audio/soundtrack_2.mp3',
        soundtrack_3: 'assets/audio/soundtrack_3.mp3',
        soundtrack_4: 'assets/audio/soundtrack_4.mp3'
    }
};

// Get full path for an asset
function getAssetPath(category, key) {
    const categoryPaths = ASSET_PATHS[category];
    if (categoryPaths && categoryPaths[key]) {
        return ASSET_PATHS.basePath + categoryPaths[key];
    }
    return null;
}

// Get all assets in a category as array of {key, path}
function getAssetsInCategory(category) {
    const categoryPaths = ASSET_PATHS[category];
    if (!categoryPaths) return [];

    return Object.entries(categoryPaths).map(([key, path]) => ({
        key: key,
        path: ASSET_PATHS.basePath + path
    }));
}

// Get event image key from event data
function getEventImageKey(event) {
    if (event.type === 'guild_foundation') {
        return 'guild_' + event.guild;
    }
    if (event.type === 'action') {
        return event.id;
    }
    if (event.type === 'temporary') {
        return event.id;
    }
    return 'event_back';
}

// Get treasure image key from treasure data
function getTreasureImageKey(treasure) {
    if (treasure.type === 'wealth') {
        return treasure.coinValue === 3 ? 'wealth_3' : 'wealth_4';
    }
    if (treasure.type === 'common') {
        return 'treasure_1vp';
    }
    if (treasure.type === 'rare') {
        return 'treasure_2vp';
    }
    return 'treasure';
}
