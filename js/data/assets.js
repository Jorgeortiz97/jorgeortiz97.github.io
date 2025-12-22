// Asset definitions for Phaser loader

const ASSET_PATHS = {
    // Base path for all images
    basePath: 'assets/images/',

    // Character portraits (12 total)
    characters: {
        archbishop: 'characters/Archbishop.png',
        artisan: 'characters/Artisan.png',
        healer: 'characters/Healer.png',
        governor: 'characters/Governor.png',
        innkeeper: 'characters/Innkeeper.png',
        master_builder: 'characters/Master_Builder.png',
        mercenary: 'characters/Mercenary.png',
        peasant: 'characters/Peasant.png',
        pirate: 'characters/Pirate.png',
        shopkeeper: 'characters/Shopkeeper.png',
        stowaway: 'characters/Stowaway.png',
        merchant: 'characters/Merchant.png'
    },

    // Guild cards (11 total)
    guilds: {
        guild_2: 'guilds/Church.png',
        guild_3: 'guilds/Blacksmith.png',
        guild_4: 'guilds/Quarry.png',
        guild_5: 'guilds/Port.png',
        guild_6: 'guilds/Tavern.png',
        guild_8: 'guilds/Farm.png',
        guild_9: 'guilds/Market.png',
        guild_10: 'guilds/Sawmill.png',
        guild_11: 'guilds/Jewelers.png',
        guild_12: 'guilds/Monastery.png',
        expedition_card: 'guilds/Expedition.png'
    },

    // Action event cards (9 types)
    actionEvents: {
        good_harvest: 'events/action/good_harvest.png',
        prosperity: 'events/action/prosperity.png',
        expedition: 'events/action/expedition.png',
        bad_harvest: 'events/action/bad_harvest.png',
        bankruptcy: 'events/action/bankruptcy.png',
        mutiny: 'events/action/mutiny.png',
        invasion: 'events/action/invasion.png',
        expropriation: 'events/action/expropriation.png',
        tax_collection: 'events/action/tax_collection.png'
    },

    // Blocking event cards (5 types)
    blockingEvents: {
        mine_collapse: 'events/blocking/MineCollapse.png',
        material_shortage: 'events/blocking/ResourcesOutage.png',
        trade_blockade: 'events/blocking/TradeBlock.png',
        famine: 'events/blocking/Famine.png',
        plague: 'events/blocking/Plague.png'
    },

    // UI elements
    ui: {
        // Coins
        gold: 'ui/gold.png',
        bronze: 'ui/bronze.png',
        silver: 'ui/silver.png',

        // Resources
        land: 'ui/Land.png',
        cultivated_land: 'ui/Cultivated_Land.png',
        inn: 'ui/Inn.png',
        destroyed_inn: 'ui/Destroyed_Inn.png',

        // Treasures
        treasure: 'ui/Treasure.png',
        treasure_1vp: 'ui/Treasure_1VP.png',
        treasure_2vp: 'ui/Treasure_2VP.png',
        wealth_3: 'ui/Wealth_3coins.png',
        wealth_4: 'ui/Wealth_4coins.png',

        // Other UI
        badge: 'ui/Badge.png',
        event_back: 'ui/Event_Back.png',
        player_hud: 'ui/player_hud.png',
        vp_icon: 'ui/1VP.png'
    },

    // Backgrounds
    backgrounds: {
        board: 'backgrounds/Board.png',
        panoramic: 'backgrounds/Panoramic.png'
    },

    // Brand logos
    brand: {
        gremios: 'brand/gremios.png',
        elenport: 'brand/elenport.png'
    },

    // Video (for intro - disabled during development)
    video: {
        intro: 'ui/Intro.mp4'
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
