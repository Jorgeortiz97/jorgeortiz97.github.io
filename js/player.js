// Player Class for Gremios

class Player {
    constructor(id, name, isAI = false) {
        this.id = id;
        this.name = name;
        this.isAI = isAI;
        this.coins = 3; // Starting coins
        this.reserve = 0; // Reserve coins for investments
        this.character = null;
        this.lands = []; // Array of ResourceCard objects
        this.inns = []; // Array of ResourceCard objects
        this.treasures = []; // Array of treasure objects
        this.hasDiscovererEmblem = false;
        this.treasureTimestamp = 0; // Track when player reached current treasure count for tie-breaking
        this.color = null; // Color for investment tracking

        // Turn tracking
        this.investedInGuildThisTurn = false;
        this.investedInExpeditionThisTurn = false;
        this.investmentsThisTurn = 0; // Total investments made this turn
        this.guildInvestmentsThisTurn = 0; // Guild investments this turn
        this.expeditionInvestmentsThisTurn = 0; // Expedition investments this turn
        this.usedFreeRepair = false;
        this.usedFreeCultivate = false;
        this.usedMutinyAbility = false;
        this.usedArtisanTreasureAbility = false;
    }

    setCharacter(character) {
        this.character = character;

        // Apply starting bonuses
        if (character.startingLands) {
            for (let i = 0; i < character.startingLands; i++) {
                this.lands.push(new ResourceCard('land', false));
            }
        }
    }

    setColor(color) {
        this.color = color;
    }

    resetTurnFlags() {
        this.investedInGuildThisTurn = false;
        this.investedInExpeditionThisTurn = false;
        this.investmentsThisTurn = 0;
        this.guildInvestmentsThisTurn = 0;
        this.expeditionInvestmentsThisTurn = 0;
        this.usedFreeRepair = false;
        this.usedFreeCultivate = false;
        this.usedMutinyAbility = false;
        this.usedArtisanTreasureAbility = false;
    }

    addCoins(amount, fromReserve = false) {
        if (fromReserve) {
            const actual = Math.min(amount, this.reserve);
            this.reserve -= actual;
            this.coins += actual;
            return actual;
        } else {
            this.coins += amount;
            return amount;
        }
    }

    removeCoins(amount) {
        if (this.coins >= amount) {
            this.coins -= amount;
            return true;
        }
        return false;
    }

    addToReserve(amount) {
        this.reserve += amount;
    }

    removeFromReserve(amount) {
        if (this.reserve >= amount) {
            this.reserve -= amount;
            return true;
        }
        return false;
    }

    buyLand() {
        if (this.removeCoins(2)) {
            this.lands.push(new ResourceCard('land', false));
            return true;
        }
        return false;
    }

    cultivateLand(index, isFree = false) {
        if (index >= 0 && index < this.lands.length && !this.lands[index].cultivated) {
            if (isFree || this.removeCoins(1)) {
                this.lands[index].cultivated = true;
                return true;
            }
        }
        return false;
    }

    buildInn(landIndex) {
        const cost = this.character && this.character.innCost ? this.character.innCost : 6;

        if (landIndex >= 0 && landIndex < this.lands.length && this.removeCoins(cost)) {
            this.lands.splice(landIndex, 1); // Remove the land
            this.inns.push(new ResourceCard('inn', false, false));
            return true;
        }
        return false;
    }

    repairInn(innIndex, isFree = false) {
        if (innIndex >= 0 && innIndex < this.inns.length && this.inns[innIndex].destroyed) {
            if (isFree || this.removeCoins(1)) {
                this.inns[innIndex].destroyed = false;
                return true;
            }
        }
        return false;
    }

    addTreasure(treasure) {
        this.treasures.push(treasure);
        // Update timestamp when treasure count changes
        this.treasureTimestamp = Date.now();
    }

    removeTreasure(index) {
        if (index >= 0 && index < this.treasures.length) {
            const removed = this.treasures.splice(index, 1)[0];
            // Update timestamp when treasure count changes
            this.treasureTimestamp = Date.now();
            return removed;
        }
        return null;
    }

    getVictoryPoints(game, includeTreasures = true) {
        let vp = 0;

        // Guild investments (max investor)
        for (let guild of game.activeGuilds) {
            if (guild.maxInvestor === this.id) {
                if (this.character && this.character.getGuildVP) {
                    vp += this.character.getGuildVP(guild.number);
                } else {
                    vp += 1;
                }
            }
        }

        // Inns (only active ones)
        vp += this.inns.filter(inn => !inn.destroyed).reduce((sum, inn) => sum + inn.getVP(), 0);

        // Treasures (only include if parameter is true)
        if (includeTreasures) {
            vp += this.treasures.reduce((sum, treasure) => sum + (treasure.vp || 0), 0);
        }

        // Discoverer's Emblem
        if (this.hasDiscovererEmblem) {
            vp += 1;
        }

        return vp;
    }

    getCultivatedLandsCount() {
        return this.lands.filter(l => l.cultivated).length;
    }

    getActiveInnsCount() {
        return this.inns.filter(i => !i.destroyed).length;
    }

    getDestroyedInnsCount() {
        return this.inns.filter(i => i.destroyed).length;
    }

    getTreasureCount() {
        return this.treasures.length;
    }

    // Get uncultivated land indices
    getUncultivatedLandIndices() {
        return this.lands
            .map((land, index) => ({ land, index }))
            .filter(item => !item.land.cultivated)
            .map(item => item.index);
    }

    // Get destroyed inn indices
    getDestroyedInnIndices() {
        return this.inns
            .map((inn, index) => ({ inn, index }))
            .filter(item => item.inn.destroyed)
            .map(item => item.index);
    }

    // Get wealth treasure indices
    getWealthTreasureIndices() {
        return this.treasures
            .map((treasure, index) => ({ treasure, index }))
            .filter(item => item.type === TREASURE_TYPES.WEALTH)
            .map(item => item.index);
    }

    // Convert coin treasures to actual coins (for AI players)
    convertCoinTreasures() {
        const wealthIndices = this.getWealthTreasureIndices();
        let totalCoinsGained = 0;

        // Convert all wealth treasures from back to front to avoid index issues
        for (let i = wealthIndices.length - 1; i >= 0; i--) {
            const index = wealthIndices[i];
            const treasure = this.removeTreasure(index);
            if (treasure && treasure.coinValue) {
                this.addCoins(treasure.coinValue);
                totalCoinsGained += treasure.coinValue;
            }
        }

        return totalCoinsGained;
    }
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { Player };
}
