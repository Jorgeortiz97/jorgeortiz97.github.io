/**
 * Shared asset configuration for Gremios
 * Used by both the service worker (for caching) and loading screen (for preloading)
 */

const GAME_ASSETS = {
    // Core game images (small, preloaded during loading screen)
    images: [
        'resources/other/gold.png',
        'resources/other/bronze.png',
        'resources/other/silver.png',
        'resources/other/Badge.png',
        'resources/other/Land.png',
        'resources/other/Cultivated_Land.png',
        'resources/other/Inn.png',
        'resources/other/Destroyed_Inn.png',
        'resources/other/Treasure.png',
        'resources/other/Treasure_1VP.png',
        'resources/other/Treasure_2VP.png',
        'resources/other/Wealth_3coins.png',
        'resources/other/Wealth_4coins.png',
        'resources/other/Event_Back.png'
    ],

    // Large background images (cached by service worker, but not preloaded)
    backgrounds: [
        'resources/Board.png',
        'resources/Panoramic.png'
    ],

    // Character images (all 12)
    characters: [
        'resources/characters/Archbishop.png',
        'resources/characters/Artisan.png',
        'resources/characters/Governor.png',
        'resources/characters/Healer.png',
        'resources/characters/Innkeeper.png',
        'resources/characters/Master_Builder.png',
        'resources/characters/Mercenary.png',
        'resources/characters/Merchant.png',
        'resources/characters/Peasant.png',
        'resources/characters/Pirate.png',
        'resources/characters/Shopkeeper.png',
        'resources/characters/Stowaway.png'
    ],

    // Guild images (all 11)
    guilds: [
        'resources/guilds/Blacksmith.png',
        'resources/guilds/Church.png',
        'resources/guilds/Expedition.png',
        'resources/guilds/Farm.png',
        'resources/guilds/Jewelers.png',
        'resources/guilds/Market.png',
        'resources/guilds/Monastery.png',
        'resources/guilds/Port.png',
        'resources/guilds/Quarry.png',
        'resources/guilds/Sawmill.png',
        'resources/guilds/Tavern.png'
    ],

    // Action event images (9)
    actionEvents: [
        'resources/action_events/bad_harvest.png',
        'resources/action_events/bankruptcy.png',
        'resources/action_events/expedition.png',
        'resources/action_events/expropriation.png',
        'resources/action_events/good_harvest.png',
        'resources/action_events/invasion.png',
        'resources/action_events/mutiny.png',
        'resources/action_events/prosperity.png',
        'resources/action_events/tax_collection.png'
    ],

    // Blocking event images (5)
    blockingEvents: [
        'resources/blocking_events/Famine.png',
        'resources/blocking_events/MineCollapse.png',
        'resources/blocking_events/Plague.png',
        'resources/blocking_events/ResourcesOutage.png',
        'resources/blocking_events/TradeBlock.png'
    ],

    // PWA icons
    icons: [
        'resources/icons/icon-192x192.png',
        'resources/icons/icon-512x512.png'
    ],

    // Screenshots (for PWA)
    screenshots: [
        'resources/screenshots/1920x1080_desktop_03_game_board.png',
        'resources/screenshots/portrait_game_board.png'
    ],

    // Video
    video: [
        'resources/other/Intro.mp4'
    ],

    // App shell (HTML, CSS, JS)
    appShell: [
        './',
        './index.html',
        './css/styles.css',
        './css/portrait-game.css',
        './js/constants.js',
        './js/dom-cache.js',
        './js/modal-manager.js',
        './js/assets.js',
        './js/config.js',
        './js/cards.js',
        './js/characters.js',
        './js/player.js',
        './js/events.js',
        './js/ai.js',
        './js/ui-modals.js',
        './js/ui-board.js',
        './js/ui-players.js',
        './js/ui-actions.js',
        './js/ui.js',
        './js/portrait-ui.js',
        './js/board-zoom.js',
        './js/game.js',
        './js/main.js',
        './js/menu.js',
        './manifest.json'
    ]
};

/**
 * Get all image assets for preloading (loading screen)
 * @returns {string[]} Array of image paths (relative)
 */
function getPreloadImages() {
    return [
        ...GAME_ASSETS.images,
        ...GAME_ASSETS.characters,
        ...GAME_ASSETS.guilds,
        ...GAME_ASSETS.actionEvents,
        ...GAME_ASSETS.blockingEvents
    ];
}

/**
 * Get all assets for service worker caching
 * @returns {string[]} Array of all asset paths (relative paths with ./)
 */
function getCacheAssets() {
    const allAssets = [
        ...GAME_ASSETS.appShell,
        ...GAME_ASSETS.video.map(p => './' + p),
        ...GAME_ASSETS.icons.map(p => './' + p),
        ...GAME_ASSETS.screenshots.map(p => './' + p),
        ...GAME_ASSETS.backgrounds.map(p => './' + p),
        ...GAME_ASSETS.images.map(p => './' + p),
        ...GAME_ASSETS.characters.map(p => './' + p),
        ...GAME_ASSETS.guilds.map(p => './' + p),
        ...GAME_ASSETS.actionEvents.map(p => './' + p),
        ...GAME_ASSETS.blockingEvents.map(p => './' + p)
    ];
    return allAssets;
}

// Export for use in different contexts
if (typeof module !== 'undefined' && module.exports) {
    // Node.js
    module.exports = { GAME_ASSETS, getPreloadImages, getCacheAssets };
}
