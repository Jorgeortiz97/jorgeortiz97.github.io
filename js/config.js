// config.js - Centralized game configuration

const PLAYER_CONFIG = {
    0: {
        id: 0,
        color: '#c9a961',  // Gold
        coinType: 'gold',
        coinImage: 'resources/other/gold.png',
        name: 'Humano'
    },
    1: {
        id: 1,
        color: '#6b4423',  // Bronze
        coinType: 'bronze',
        coinImage: 'resources/other/bronze.png',
        name: 'IA 1'
    },
    2: {
        id: 2,
        color: '#8a8d8f',  // Silver
        coinType: 'silver',
        coinImage: 'resources/other/silver.png',
        name: 'IA 2'
    }
};

// Helper functions
function getPlayerConfig(playerId) {
    return PLAYER_CONFIG[playerId];
}

function getConfigByColor(color) {
    return Object.values(PLAYER_CONFIG).find(p => p.color === color);
}

function getCoinImageFromColor(color) {
    const config = getConfigByColor(color);
    return config ? config.coinImage : PLAYER_CONFIG[0].coinImage;
}

function getCoinTypeFromColor(color) {
    const config = getConfigByColor(color);
    return config ? config.coinType : 'gold';
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        PLAYER_CONFIG,
        getPlayerConfig,
        getConfigByColor,
        getCoinImageFromColor,
        getCoinTypeFromColor
    };
}
