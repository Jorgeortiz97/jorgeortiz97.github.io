// Event Handlers for Gremios

class EventHandler {
    constructor(game) {
        this.game = game;
    }

    handleEvent(event) {
        switch (event.type) {
            case EVENT_TYPES.GUILD_FOUNDATION:
                return this.handleGuildFoundation(event);
            case EVENT_TYPES.ACTION:
                return this.handleActionEvent(event);
            case EVENT_TYPES.TEMPORARY:
                return this.handleTemporaryEvent(event);
            default:
                return `Evento desconocido: ${event.name}`;
        }
    }

    handleGuildFoundation(event) {
        // Add guild to active guilds
        const guild = {
            number: event.guild,
            name: GUILDS[event.guild].nameES,
            investments: [],
            maxInvestor: null,
            blocked: false
        };
        this.game.activeGuilds.push(guild);
        this.game.activeGuilds.sort((a, b) => a.number - b.number);

        // Apply blocking from active temporary events to new guild
        this.updateGuildBlocking();

        return `Se funda el gremio: ${guild.name} (${guild.number})`;
    }

    handleActionEvent(event) {
        switch (event.id) {
            case 'good_harvest':
                return this.goodHarvest();
            case 'prosperity':
                return this.prosperity();
            case 'expedition':
                return this.expeditionEvent();
            case 'bad_harvest':
                return this.badHarvest();
            case 'bankruptcy':
                this.game.nextRollBankruptcy = true;
                return 'Bancarrota en el siguiente gremio que salga';
            case 'mutiny':
                this.game.nextRollMutiny = true;
                return 'Motín en el siguiente gremio que salga';
            case 'invasion':
                return this.foreignInvasion();
            case 'expropriation':
                return this.landExpropriation();
            case 'tax_collection':
                return this.taxCollection();
            default:
                return `Evento de acción: ${event.name}`;
        }
    }

    goodHarvest() {
        let message = 'Buenas Cosechas: ';
        const messages = [];

        for (let player of this.game.players) {
            const cultivatedLands = player.getCultivatedLandsCount();
            let coinsGained = cultivatedLands;

            // Peasant special ability
            if (player.character && player.character.id === 'peasant') {
                const rivalsCultivated = this.game.players
                    .filter(p => p.id !== player.id)
                    .reduce((sum, p) => sum + p.getCultivatedLandsCount(), 0);

                if (cultivatedLands > rivalsCultivated) {
                    const bonusCoins = this.game.players.length - 1;
                    coinsGained += bonusCoins;
                    messages.push(`${player.name} recibe ${cultivatedLands} + ${bonusCoins} (bonus Campesino) monedas`);
                } else {
                    messages.push(`${player.name} recibe ${coinsGained} monedas`);
                }
            } else {
                messages.push(`${player.name} recibe ${coinsGained} monedas`);
            }

            player.addCoins(coinsGained);
        }

        return message + messages.join(', ');
    }

    prosperity() {
        let message = 'Época de Bonanza: ';
        const messages = [];

        // Everyone receives 1 coin
        for (let player of this.game.players) {
            player.addCoins(1);
            messages.push(`${player.name} recibe 1 moneda`);
        }

        // Check for Plague before clearing (for Healer ability)
        const hadPlague = this.game.activeTemporaryEvents.some(e => e.id === 'plague');

        // Remove all temporary events
        this.game.activeTemporaryEvents = [];
        this.updateGuildBlocking();
        messages.push('Se eliminan todos los eventos temporales');

        // Healer ability: receives coins when Plague ends
        if (hadPlague) {
            const plagueEndMessages = this.triggerPlagueEndAbility();
            messages.push(...plagueEndMessages);
        }

        return message + messages.join(', ');
    }

    triggerPlagueEndAbility() {
        const messages = [];
        for (let player of this.game.players) {
            if (player.character && player.character.onPlagueEnd) {
                const result = player.character.onPlagueEnd(this.game, player);
                if (result && result.coins > 0) {
                    player.addCoins(result.coins, result.fromReserve);
                    messages.push(`${player.name} (Curandero) recibe ${result.coins} monedas por fin de Peste`);
                    this.game.log(`${player.name} (Curandero) recibe ${result.coins} monedas por fin de Peste`, 'ability');
                }
            }
        }
        return messages;
    }

    expeditionEvent() {
        // Check for Stowaway ability: add free investment before resolving if not already invested
        for (let player of this.game.players) {
            if (player.character && player.character.freeExpeditionInvestment) {
                const hasInvestment = this.game.expedition.investments.some(inv => inv.playerId === player.id);
                if (!hasInvestment && this.game.expedition.investments.length < this.game.expedition.maxSlots) {
                    // Polizón gets truly free investment (no cost)
                    this.game.expedition.investments.push({ playerId: player.id, color: player.color });
                    this.game.log(`${player.name} (Polizón) añade 1 inversión gratis a la expedición`, 'action');
                }
            }
        }

        if (this.game.expedition.investments.length === 0) {
            return 'Expedición: No hay inversiones';
        }

        // Set pending flag - expedition will resolve on next dice roll
        this.game.pendingExpedition = true;
        this.game.log('La expedición se resolverá en la siguiente tirada de dados', 'event');
        return 'Expedición pendiente de resolución';
    }

    badHarvest() {
        let message = 'Malas Cosechas: ';
        const messages = [];

        for (let player of this.game.players) {
            const cultivatedIndices = player.lands
                .map((land, index) => ({ land, index }))
                .filter(item => item.land.cultivated);

            if (cultivatedIndices.length > 0) {
                // Randomly select one cultivated land to lose cultivation
                const randomIndex = Math.floor(Math.random() * cultivatedIndices.length);
                const landIndex = cultivatedIndices[randomIndex].index;
                player.lands[landIndex].cultivated = false;
                messages.push(`${player.name} pierde 1 tierra cultivada`);
            } else {
                messages.push(`${player.name} no tiene tierras cultivadas`);
            }
        }

        return message + messages.join(', ');
    }

    foreignInvasion() {
        let message = 'Invasión Extranjera: ';
        const messages = [];

        for (let player of this.game.players) {
            const activeInns = player.inns.filter(inn => !inn.destroyed).length;
            const toDestroy = Math.ceil(activeInns / 2);

            if (toDestroy > 0) {
                let destroyed = 0;
                for (let inn of player.inns) {
                    if (!inn.destroyed && destroyed < toDestroy) {
                        inn.destroyed = true;
                        destroyed++;
                    }
                }
                messages.push(`${player.name} destruye ${destroyed} posadas`);

                // Mercenary ability: receives 1 coin per rival inn destroyed
                for (let otherPlayer of this.game.players) {
                    if (otherPlayer.id !== player.id && otherPlayer.character && otherPlayer.character.id === 'mercenary') {
                        otherPlayer.addCoins(destroyed);
                        messages.push(`${otherPlayer.name} (Mercenario) recibe ${destroyed} monedas`);
                    }
                }
            } else {
                messages.push(`${player.name} no tiene posadas activas`);
            }
        }

        // Healer ability: receives 1 reserve coin when invasion occurs (regardless of whose inns)
        for (let player of this.game.players) {
            if (player.character && player.character.onInvasion) {
                const result = player.character.onInvasion(this.game, player);
                if (result && result.coins > 0) {
                    player.addCoins(result.coins, result.fromReserve);
                    messages.push(`${player.name} (Curandero) recibe ${result.coins} moneda de reserva`);
                }
            }
        }

        return message + messages.join(', ');
    }

    landExpropriation() {
        let message = 'Expropiación de Terrenos: ';
        const messages = [];

        for (let player of this.game.players) {
            const landsCount = player.lands.length;
            const toLose = Math.ceil(landsCount / 2);

            if (toLose > 0) {
                // Remove worst lands first (uncultivated before cultivated)
                let removed = 0;

                // First, remove uncultivated lands
                while (removed < toLose && player.lands.length > 0) {
                    const uncultivatedIndex = player.lands.findIndex(land => !land.cultivated);
                    if (uncultivatedIndex !== -1) {
                        player.lands.splice(uncultivatedIndex, 1);
                        this.game.log(`${player.name} pierde 1 tierra (sin cultivar)`, 'action');
                        removed++;
                    } else {
                        break; // No more uncultivated lands
                    }
                }

                // If still need to remove more, remove cultivated lands
                while (removed < toLose && player.lands.length > 0) {
                    const cultivatedIndex = player.lands.findIndex(land => land.cultivated);
                    if (cultivatedIndex !== -1) {
                        player.lands.splice(cultivatedIndex, 1);
                        this.game.log(`${player.name} pierde 1 tierra (cultivada)`, 'action');
                        removed++;
                    } else {
                        break;
                    }
                }

                messages.push(`${player.name} pierde ${removed} tierra${removed > 1 ? 's' : ''}`);
            } else {
                messages.push(`${player.name} no tiene tierras`);
            }
        }

        // Update UI after lands are removed
        if (this.game.ui) {
            this.game.ui.updateGameState();
        }

        return message + messages.join(', ');
    }

    taxCollection() {
        let message = 'Recaudación de Impuestos: ';
        const messages = [];
        let totalCollected = 0;

        // Tax affects ALL players (human and AI) with 4 or more coins
        for (let player of this.game.players) {
            if (player.coins >= 4) {
                const toLose = Math.ceil(player.coins / 2);
                player.removeCoins(toLose);
                totalCollected += toLose;
                messages.push(`${player.name} pierde ${toLose} monedas`);
            }
        }

        // Governor ability
        const governor = this.game.players.find(p => p.character && p.character.id === 'governor');
        if (governor && totalCollected > 0) {
            governor.addCoins(totalCollected);
            messages.push(`${governor.name} (Gobernador) recibe ${totalCollected} monedas`);
        }

        if (messages.length === 0) {
            return message + 'Ningún jugador tiene 4 o más monedas';
        }

        return message + messages.join(', ');
    }

    handleTemporaryEvent(event) {
        // Check if same type already exists (for mutiny/bankruptcy escalation)
        const existingCount = this.game.activeTemporaryEvents.filter(e => e.id === event.id).length;

        if (existingCount === 0) {
            // First occurrence - add to active events
            this.game.activeTemporaryEvents.push(event);
            this.updateGuildBlocking();
            return `${event.name}: ${event.description}`;
        } else if (existingCount === 1) {
            // Second occurrence - Mutiny
            this.game.activeTemporaryEvents.push(event);
            const affectedGuilds = event.affectedGuilds;
            let message = `${event.name} (2ª vez): Motín en `;

            if (Array.isArray(affectedGuilds)) {
                for (let guildNum of affectedGuilds) {
                    const guild = this.game.activeGuilds.find(g => g.number === guildNum);
                    if (guild) {
                        this.applyMutiny(guild);
                        message += `${guild.name}, `;
                    }
                }
            }

            return message;
        } else if (existingCount === 2) {
            // Third occurrence - Bankruptcy and remove all 3
            const affectedGuilds = event.affectedGuilds;
            let message = `${event.name} (3ª vez): Bancarrota en `;

            if (Array.isArray(affectedGuilds)) {
                for (let guildNum of affectedGuilds) {
                    const guild = this.game.activeGuilds.find(g => g.number === guildNum);
                    if (guild) {
                        this.applyBankruptcy(guild);
                        message += `${guild.name}, `;
                    }
                }
            }

            // Remove all 3 instances of this event
            this.game.activeTemporaryEvents = this.game.activeTemporaryEvents.filter(e => e.id !== event.id);
            this.updateGuildBlocking();

            return message;
        }

        return '';
    }

    updateGuildBlocking() {
        // Reset all guild blocking
        for (let guild of this.game.activeGuilds) {
            guild.blocked = false;
        }

        // Apply blocking from active events
        for (let event of this.game.activeTemporaryEvents) {
            if (event.affectedGuilds === 'all') {
                // Plague - block all except immune
                for (let guild of this.game.activeGuilds) {
                    if (!event.immuneGuilds || !event.immuneGuilds.includes(guild.number)) {
                        guild.blocked = true;
                    }
                }
            } else if (Array.isArray(event.affectedGuilds)) {
                for (let guildNum of event.affectedGuilds) {
                    const guild = this.game.activeGuilds.find(g => g.number === guildNum);
                    if (guild) {
                        guild.blocked = true;
                    }
                }
            }
        }
    }

    applyMutiny(guild) {
        const messages = [];
        const investmentsToRemove = [];

        // Find players with more than 1 investment and mark their LAST investment for removal
        for (let player of this.game.players) {
            const playerInvestmentIndices = [];

            // Collect all indices where this player has investments
            guild.investments.forEach((inv, index) => {
                if (inv.playerId === player.id) {
                    playerInvestmentIndices.push(index);
                }
            });

            // If player has more than 1 investment, mark the last one for removal
            if (playerInvestmentIndices.length > 1) {
                const lastInvestmentIndex = playerInvestmentIndices[playerInvestmentIndices.length - 1];
                investmentsToRemove.push(lastInvestmentIndex);
                messages.push(`${player.name} pierde 1 inversión en ${guild.name}`);

                // Merchant ability
                if (player.character && player.character.id === 'merchant') {
                    player.addCoins(1);
                    messages.push(`${player.name} (Mercader) recibe 1 moneda`);
                }
            }
        }

        // Remove investments from highest index to lowest to avoid index shifting issues
        investmentsToRemove.sort((a, b) => b - a);
        for (let index of investmentsToRemove) {
            guild.investments.splice(index, 1);
        }

        // Re-arrange remaining investments: group by player and maintain order
        // First, collect all remaining investments grouped by player
        const investmentsByPlayer = {};
        for (let investment of guild.investments) {
            if (!investmentsByPlayer[investment.playerId]) {
                investmentsByPlayer[investment.playerId] = [];
            }
            investmentsByPlayer[investment.playerId].push(investment);
        }

        // Rebuild investments array maintaining the original investment order per player
        guild.investments = [];
        const playerIds = Object.keys(investmentsByPlayer).map(id => parseInt(id));

        // Find the maximum number of investments any player has
        const maxInvestments = Math.max(...playerIds.map(id => investmentsByPlayer[id].length));

        // Re-arrange in top-left to bottom-right order (row by row)
        for (let investmentNum = 0; investmentNum < maxInvestments; investmentNum++) {
            for (let playerId of playerIds) {
                if (investmentsByPlayer[playerId][investmentNum]) {
                    guild.investments.push(investmentsByPlayer[playerId][investmentNum]);
                }
            }
        }

        // Update max investor (it can change after mutiny)
        this.game.updateMaxInvestor(guild);

        return messages.join(', ');
    }

    applyBankruptcy(guild) {
        const messages = [];
        const investmentsLost = {};

        // Count investments lost per player
        for (let investment of guild.investments) {
            investmentsLost[investment.playerId] = (investmentsLost[investment.playerId] || 0) + 1;
        }

        // Clear all investments
        guild.investments = [];
        guild.maxInvestor = null;

        // Merchant ability
        for (let playerId in investmentsLost) {
            const player = this.game.players.find(p => p.id === playerId);
            if (player && player.character && player.character.id === 'merchant') {
                player.addCoins(investmentsLost[playerId]);
                messages.push(`${player.name} (Mercader) recibe ${investmentsLost[playerId]} monedas`);
            }
        }

        return messages.join(', ');
    }
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { EventHandler };
}
