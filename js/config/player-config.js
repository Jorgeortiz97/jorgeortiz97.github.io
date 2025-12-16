// Player configuration - colors, coin types, names

const PLAYER_CONFIG = {
    0: {
        id: 0,
        color: '#c9a961',
        coinType: 'gold',
        coinImage: 'assets/images/ui/gold.png',
        name: 'Humano',
        isAI: false
    },
    1: {
        id: 1,
        color: '#6b4423',
        coinType: 'bronze',
        coinImage: 'assets/images/ui/bronze.png',
        name: 'IA 1',
        isAI: true
    },
    2: {
        id: 2,
        color: '#8a8d8f',
        coinType: 'silver',
        coinImage: 'assets/images/ui/silver.png',
        name: 'IA 2',
        isAI: true
    }
};

function getPlayerConfig(playerId) {
    return PLAYER_CONFIG[playerId];
}

function getConfigByColor(color) {
    return Object.values(PLAYER_CONFIG).find(p => p.color === color);
}

function getCoinTypeFromPlayerId(playerId) {
    const config = PLAYER_CONFIG[playerId];
    return config ? config.coinType : 'gold';
}
