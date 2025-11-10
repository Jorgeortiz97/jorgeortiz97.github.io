// Character Definitions for Gremios

const CHARACTERS = {
    ARCHBISHOP: {
        id: 'archbishop',
        name: 'Arzobispo',
        nameES: 'Arzobispo',
        abilities: [
            'Iglesia y Monasterio dan 2 VP (en vez de 1)',
            'Recibe 1 moneda cuando otro jugador invierte en Iglesia/Monasterio o compra tierra'
        ],
        onOtherPlayerInvestChurch: function(game, player) {
            // Ability 2: Receive 1 coin when others invest in Church/Monastery
            return { coins: 1, fromReserve: true };
        },
        onOtherPlayerBuyLand: function(game, player) {
            // Ability 2: Receive 1 coin when others buy land
            return { coins: 1, fromReserve: true };
        },
        getGuildVP: function(guildNumber) {
            // Ability 1: Church and Monastery give 2 VP instead of 1
            if (guildNumber === 2 || guildNumber === 12) {
                return 2;
            }
            return 1;
        }
    },

    ARTISAN: {
        id: 'artisan',
        name: 'Artesano',
        nameES: 'Artesano',
        abilities: [
            'Una vez por turno, puede comprar/vender un tesoro por 4 monedas',
            'Primera inversión en Herrería y Joyería cuesta 0 (moneda de reserva)'
        ],
        canBuySellTreasure: true,
        firstInvestmentFree: [3, 11] // Herrería (3) and Joyería (11)
    },

    HEALER: {
        id: 'healer',
        name: 'Curandero',
        nameES: 'Curandero',
        abilities: [
            'Recibe 1 moneda de reserva cuando ocurre Invasión Extranjera',
            'Recibe 2 monedas al desactivarse Peste por cada gremio donde es inversor máximo (excepto Iglesia/Monasterio)'
        ],
        onInvasion: function(game, player) {
            return { coins: 1, fromReserve: true };
        },
        onPlagueEnd: function(game, player) {
            let maxInvestorGuilds = 0;
            for (let guild of game.activeGuilds) {
                if (guild.maxInvestor === player.id && guild.number !== 2 && guild.number !== 12) {
                    maxInvestorGuilds++;
                }
            }
            return { coins: maxInvestorGuilds * 2, fromReserve: false };
        }
    },

    GOVERNOR: {
        id: 'governor',
        name: 'Gobernador',
        nameES: 'Gobernador',
        abilities: [
            'Recibe todas las monedas perdidas por Recaudación de Impuestos',
            'Al inicio del turno, revela 2 eventos, aplica el que prefiera y deja el otro para el siguiente'
        ],
        onTaxCollection: function(game, player, coinsCollected) {
            return { coins: coinsCollected };
        },
        drawTwoEvents: true
    },

    INNKEEPER: {
        id: 'innkeeper',
        name: 'Posadera',
        nameES: 'Posadera',
        abilities: [
            'Empieza el juego con 2 tierras sin cultivar',
            'Recibe 1 moneda de reserva cuando otro jugador construye una posada'
        ],
        startingLands: 2,
        onOtherPlayerBuildInn: function(game, player) {
            return { coins: 1, fromReserve: true };
        }
    },

    MASTER_BUILDER: {
        id: 'master_builder',
        name: 'Maestro Constructor',
        nameES: 'Maestro Constructor',
        abilities: [
            'Construye posadas por 5 monedas (en vez de 6)',
            'Una vez por turno, repara 1 posada destruida gratis'
        ],
        innCost: 5,
        freeRepairPerTurn: true
    },

    MERCENARY: {
        id: 'mercenary',
        name: 'Mercenario',
        nameES: 'Mercenario',
        abilities: [
            'Una vez por turno, puede pagar 1 moneda para causar motín en un gremio donde haya invertido',
            'Recibe 1 moneda por cada posada rival destruida por Invasión Extranjera (solo recién destruidas)'
        ],
        canCauseMutiny: true,
        onInvasionInnsDestroyed: function(game, player, innsDestroyed) {
            return { coins: innsDestroyed };
        }
    },

    PEASANT: {
        id: 'peasant',
        name: 'Campesino',
        nameES: 'Campesino',
        abilities: [
            'Puede cultivar 1 tierra gratis una vez por turno (puede hacerse al comprarla)',
            'Si tiene más tierras cultivadas que todos los rivales juntos durante Buenas Cosechas, recibe 1 moneda adicional por rival'
        ],
        freeCultivatePerTurn: true,
        onGoodHarvest: function(game, player, rivalsCultivatedTotal) {
            const playerCultivated = player.lands.filter(l => l.cultivated).length;
            if (playerCultivated > rivalsCultivatedTotal) {
                const numRivals = game.players.length - 1;
                return { coins: numRivals };
            }
            return { coins: 0 };
        }
    },

    PIRATE: {
        id: 'pirate',
        name: 'Pirata',
        nameES: 'Pirata',
        abilities: [
            'Recibe todas las monedas perdidas de expediciones fallidas',
            'Puede cobrar de Puerto y Mercado aunque haya Bloqueo Comercial activo (pero sigue afectado por motín/bancarrota)'
        ],
        onFailedExpedition: function(game, player, coinsLost) {
            return { coins: coinsLost };
        },
        immuneToTradeBlockade: true
    },

    SHOPKEEPER: {
        id: 'shopkeeper',
        name: 'Tendera',
        nameES: 'Tendera',
        abilities: [
            'Recibe 1 moneda de reserva cuando otro jugador invierte en Granja o Taberna',
            'Al inicio del turno, recibe 1 moneda adicional por cada evento Hambruna activo'
        ],
        onOtherPlayerInvestFarmTavern: function(game, player) {
            return { coins: 1, fromReserve: true };
        },
        onTurnStart: function(game, player) {
            const famineEvents = game.activeTemporaryEvents.filter(e => e.id === 'famine').length;
            return { coins: famineEvents };
        }
    },

    STOWAWAY: {
        id: 'stowaway',
        name: 'Polizón',
        nameES: 'Polizón',
        abilities: [
            'Si expedición no tiene inversiones, puede invertir gratis (sin coste). Cuando ocurre evento Expedición y no ha invertido, puede añadir 1 inversión gratis antes de resolver',
            'Al inicio del turno, si tiene 3+ inversiones entre Expedición y Puerto juntos, recibe 1 moneda adicional'
        ],
        freeExpeditionInvestment: true,
        onTurnStart: function(game, player) {
            const expeditionInvestments = game.expedition.investments.filter(inv => inv.playerId === player.id).length;
            const portGuild = game.activeGuilds.find(g => g.number === 5); // Puerto is now 5
            const portInvestments = portGuild ? portGuild.investments.filter(inv => inv.playerId === player.id).length : 0;
            const total = expeditionInvestments + portInvestments;

            if (total >= 3) {
                return { coins: 1 };
            }
            return { coins: 0 };
        }
    },

    MERCHANT: {
        id: 'merchant',
        name: 'Mercader',
        nameES: 'Mercader',
        abilities: [
            'Puede invertir una vez adicional por turno (total 3 inversiones: máx 2 gremios y/o máx 2 expedición)',
            'Recibe monedas iguales a inversiones perdidas cuando ocurre motín o bancarrota en gremios donde invirtió'
        ],
        additionalInvestment: true,
        onMutinyBankruptcy: function(game, player, investmentsLost) {
            return { coins: investmentsLost };
        }
    }
};

// Get character image path from character ID
function getCharacterImagePath(characterId) {
    // Map character IDs to image file names (PascalCase with underscores)
    const imageNameMap = {
        'archbishop': 'Archbishop.png',
        'artisan': 'Artisan.png',
        'healer': 'Healer.png',
        'governor': 'Governor.png',
        'innkeeper': 'Innkeeper.png',
        'master_builder': 'Master_Builder.png',
        'mercenary': 'Mercenary.png',
        'peasant': 'Peasant.png',
        'pirate': 'Pirate.png',
        'shopkeeper': 'Shopkeeper.png',
        'stowaway': 'Stowaway.png',
        'merchant': 'Merchant.png'
    };

    const imageName = imageNameMap[characterId];
    return imageName ? `resources/characters/${imageName}` : null;
}

// Get a random character
function getRandomCharacter(excludeIds = []) {
    const availableCharacters = Object.values(CHARACTERS).filter(c => !excludeIds.includes(c.id));
    return availableCharacters[Math.floor(Math.random() * availableCharacters.length)];
}

// Get two random characters for selection
function getTwoRandomCharacters(excludeIds = []) {
    const availableCharacters = Object.values(CHARACTERS).filter(c => !excludeIds.includes(c.id));
    const shuffled = [...availableCharacters].sort(() => Math.random() - 0.5);
    return [shuffled[0], shuffled[1]];
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { CHARACTERS, getRandomCharacter, getTwoRandomCharacters, getCharacterImagePath };
}
