// Main Game Logic for Gremios

class GremiosGame {
    constructor(numPlayers = 2) {
        this.numPlayers = numPlayers;
        this.players = [];
        this.currentPlayerIndex = 0;
        this.phase = 'setup'; // setup, event, roll, collection, investment
        this.round = 0;

        // Decks
        this.eventDeck = [];
        this.eventDiscard = [];
        this.setAsideEvents = []; // 3 cards set aside
        this.treasureDeck = [];

        // Active game elements
        this.activeGuilds = [];
        this.activeTemporaryEvents = [];
        this.expedition = {
            investments: [],
            maxSlots: 4
        };

        // Game state flags
        this.nextRollBankruptcy = false;
        this.nextRollMutiny = false;
        this.currentEvent = null;
        this.lastDiceRoll = null;
        // Removed: this.pendingLandExpropriation (land loss is now automatic)

        // Event handler
        this.eventHandler = new EventHandler(this);

        // UI reference
        this.ui = null;

        // Medieval names for AI players
        this.medievalNames = [
            'Alaric', 'Baldric', 'Cedric', 'Draven', 'Edric',
            'Gareth', 'Hadrian', 'Isidor', 'Jorund', 'Kaelum',
            'Leofric', 'Magnus', 'Nicodemus', 'Osric', 'Percival',
            'Quillan', 'Roderick', 'Siegfried', 'Thaddeus', 'Ulric',
            'Valen', 'Wolfram', 'Aldwin', 'Bertram', 'Caspian'
        ];
        this.usedNames = [];
    }

    initialize(numPlayers, difficulty = 'medium') {
        this.numPlayers = numPlayers;
        this.aiDifficulty = difficulty;
        this.setupPlayers();
        this.setupDecks();
        this.setupInitialGuilds();
        this.determineStartingPlayer();
        this.phase = 'character-selection';
    }

    setupPlayers() {
        this.players = [];
        this.usedNames = [];

        // Human player (always player 0)
        const humanPlayer = new Player(0, 'Tú', false);
        humanPlayer.setColor(PLAYER_CONFIG[0].color);
        this.players.push(humanPlayer);

        // AI players - use the difficulty selected by user and assign random medieval names
        for (let i = 1; i < this.numPlayers; i++) {
            const aiName = this.getRandomMedievalName();
            const aiPlayer = new Player(i, aiName, true);
            aiPlayer.setColor(PLAYER_CONFIG[i].color);
            aiPlayer.aiController = new AIPlayer(this.aiDifficulty || 'medium');
            this.players.push(aiPlayer);
        }
    }

    getRandomMedievalName() {
        // Get available names (not yet used)
        const availableNames = this.medievalNames.filter(name => !this.usedNames.includes(name));

        // If all names used, reset
        if (availableNames.length === 0) {
            this.usedNames = [];
            return this.medievalNames[Math.floor(Math.random() * this.medievalNames.length)];
        }

        // Pick a random available name
        const name = availableNames[Math.floor(Math.random() * availableNames.length)];
        this.usedNames.push(name);
        return name;
    }

    setupDecks() {
        // Create treasure deck
        this.treasureDeck = createTreasureDeck();

        // Create event deck
        this.eventDeck = createEventDeck(this.numPlayers);

        // Note: 3 cards will be discarded after initial guilds are placed
    }

    setupInitialGuilds() {
        // Place initial guilds based on number of players
        const initialGuildCount = this.numPlayers; // 2-4 guilds
        const guildNumbers = [2, 3, 4, 5, 6, 8, 9, 10, 11, 12];

        // Randomly select initial guilds
        const selectedGuilds = [];
        const shuffledNumbers = shuffleArray([...guildNumbers]);

        for (let i = 0; i < initialGuildCount; i++) {
            const guildNum = shuffledNumbers[i];
            selectedGuilds.push(guildNum);

            this.activeGuilds.push({
                number: guildNum,
                name: GUILDS[guildNum].nameES,
                investments: [],
                maxInvestor: null,
                blocked: false
            });

            // Remove guild foundation event from deck
            this.eventDeck = this.eventDeck.filter(e =>
                !(e.type === EVENT_TYPES.GUILD_FOUNDATION && e.guild === guildNum)
            );
        }

        this.activeGuilds.sort((a, b) => a.number - b.number);

        // Discard 3 random event cards after showing initial guilds
        this.discardRandomEvents(3);
    }

    discardRandomEvents(count) {
        // Discard specified number of random events to randomize the deck
        for (let i = 0; i < count && this.eventDeck.length > 0; i++) {
            const randomIndex = Math.floor(Math.random() * this.eventDeck.length);
            this.setAsideEvents.push(this.eventDeck.splice(randomIndex, 1)[0]);
        }
        this.log(`Se descartan ${count} cartas de evento aleatoriamente`);
    }

    determineStartingPlayer() {
        // For simplicity, human always goes first
        // In a full implementation, this would be a dice roll
        this.currentPlayerIndex = 0;
    }

    startGame() {
        this.phase = 'event';
        this.round = 1;
        this.log('¡Comienza la partida!');
        this.nextPhase();
    }

    nextPhase() {
        switch (this.phase) {
            case 'event':
                this.eventPhase();
                break;
            case 'roll':
                this.rollPhase();
                break;
            case 'collection':
                this.collectionPhase();
                break;
            case 'investment':
                this.investmentPhase();
                break;
        }
    }

    eventPhase() {
        this.phase = 'event';
        const currentPlayer = this.players[this.currentPlayerIndex];

        // Governor special ability
        if (currentPlayer.character && currentPlayer.character.drawTwoEvents && this.eventDeck.length >= 2) {
            // For AI, auto-select first event. For human, present choice
            if (currentPlayer.isAI) {
                this.drawAndApplyEvent();
                this.phase = 'roll';
                setTimeout(() => this.nextPhase(), 4000); // Wait for event modal animation to complete (3.5s) + buffer
            } else {
                // UI should handle showing 2 events for selection
                if (this.ui) {
                    this.ui.showGovernorEventChoice();
                }
            }
        } else {
            this.drawAndApplyEvent();
            this.phase = 'roll';
            setTimeout(() => this.nextPhase(), 4000); // Wait for event modal animation to complete (3.5s) + buffer
        }
    }

    drawAndApplyEvent() {
        // Discard the previous event before drawing a new one
        if (this.currentEvent && this.currentEvent.type !== EVENT_TYPES.TEMPORARY) {
            this.eventDiscard.push(this.currentEvent);
        }

        if (this.eventDeck.length === 0) {
            this.reshuffleEventDeck();
        }

        const event = this.eventDeck.pop();
        this.currentEvent = event;

        // Show event modal first
        if (this.ui) {
            this.ui.showEventModal(event);
        }

        // Wait for modal to display, then apply event effects
        setTimeout(() => {
            const message = this.eventHandler.handleEvent(event);
            this.log(message, 'event');

            if (this.ui) {
                this.ui.updateEventDisplay(event);
                this.ui.updateGameState();
            }
        }, 3500); // Apply effects after 3.5 seconds (modal flip + display time)
    }

    reshuffleEventDeck() {
        // Shuffle discard pile and set-aside events back into deck
        // This includes all event types: GUILD_FOUNDATION, ACTION, and TEMPORARY
        this.eventDeck = shuffleArray([...this.eventDiscard, ...this.setAsideEvents]);
        this.eventDiscard = [];
        this.setAsideEvents = [];

        this.log('Se rebaraja el mazo de eventos');

        // Discard 3 random cards again after reshuffle
        this.discardRandomEvents(3);
    }

    rollPhase() {
        this.phase = 'roll';
        const die1 = Math.floor(Math.random() * 6) + 1;
        const die2 = Math.floor(Math.random() * 6) + 1;
        const sum = die1 + die2;

        this.lastDiceRoll = { die1, die2, sum };

        // Update UI immediately to show dice
        if (this.ui) {
            this.ui.updateDiceDisplay(die1, die2, sum);
            this.ui.updateGameState();
        }

        this.log(`🎲 Dados: ${die1} + ${die2} = ${sum}`);

        // Check for 7 (deactivate temporary events)
        if (sum === 7) {
            this.activeTemporaryEvents = [];
            this.eventHandler.updateGuildBlocking();
            this.log('¡Suma 7! Se eliminan todos los eventos temporales', 'info');
        } else {
            // Distribute coins from guild
            this.distributeGuildCoins(sum);
        }

        // Apply special roll effects (bankruptcy, mutiny from events)
        if (this.nextRollBankruptcy) {
            const guild = this.activeGuilds.find(g => g.number === sum);
            if (guild) {
                this.eventHandler.applyBankruptcy(guild);
                this.log(`Bancarrota en ${guild.name}!`, 'event');
            }
            this.nextRollBankruptcy = false;
        }

        if (this.nextRollMutiny) {
            const guild = this.activeGuilds.find(g => g.number === sum);
            if (guild) {
                this.eventHandler.applyMutiny(guild);
                this.log(`Motín en ${guild.name}!`, 'event');
            }
            this.nextRollMutiny = false;
        }

        this.phase = 'collection';
        setTimeout(() => this.nextPhase(), 1500);
    }

    distributeGuildCoins(guildNumber) {
        const guild = this.activeGuilds.find(g => g.number === guildNumber);

        if (!guild) {
            this.log(`No hay gremio para el número ${guildNumber}`);
            return;
        }

        if (guild.blocked) {
            // Check for Pirate immunity to Trade Blockade
            const tradeBlockade = this.activeTemporaryEvents.find(e => e.id === 'trade_blockade');
            const affectedByTradeBlockade = tradeBlockade && tradeBlockade.affectedGuilds.includes(guildNumber);

            for (let player of this.players) {
                if (affectedByTradeBlockade && player.character && player.character.immuneToTradeBlockade) {
                    const investments = guild.investments.filter(inv => inv.playerId === player.id).length;
                    if (investments > 0) {
                        player.addCoins(investments);
                        this.log(`${player.name} (Pirata) recibe ${investments} monedas de ${guild.name} (inmune a bloqueo)`, 'action');
                    }
                }
            }

            this.log(`${guild.name} está bloqueado, no genera recursos`);
            return;
        }

        // Distribute coins to investors
        for (let player of this.players) {
            const investments = guild.investments.filter(inv => inv.playerId === player.id).length;
            if (investments > 0) {
                player.addCoins(investments);
                this.log(`${player.name} recibe ${investments} monedas de ${guild.name}`, 'action');
            }
        }
    }

    collectionPhase() {
        this.phase = 'collection';
        const currentPlayer = this.players[this.currentPlayerIndex];

        // Base: 1 coin for turn
        currentPlayer.addCoins(1);
        let collected = 1;

        // Additional: 1 coin per active inn
        const activeInns = currentPlayer.getActiveInnsCount();
        currentPlayer.addCoins(activeInns);
        collected += activeInns;

        // Character abilities on turn start
        if (currentPlayer.character && currentPlayer.character.onTurnStart) {
            const result = currentPlayer.character.onTurnStart(this, currentPlayer);
            if (result && result.coins > 0) {
                currentPlayer.addCoins(result.coins, result.fromReserve);
                collected += result.coins;
                this.log(`${currentPlayer.name} recibe ${result.coins} monedas adicionales (habilidad)`, 'action');
            }
        }

        this.log(`${currentPlayer.name} recoge ${collected} monedas`, 'action');

        currentPlayer.resetTurnFlags();

        this.phase = 'investment';
        setTimeout(() => this.nextPhase(), 1000);
    }

    investmentPhase() {
        this.phase = 'investment';
        const currentPlayer = this.players[this.currentPlayerIndex];

        if (this.ui) {
            this.ui.updateGameState();
        }

        if (currentPlayer.isAI) {
            setTimeout(() => this.executeAITurn(), 1000);
        } else {
            // Human player - wait for actions
            this.log('Tu turno - realiza acciones', 'info');
        }
    }

    executeAITurn() {
        const currentPlayer = this.players[this.currentPlayerIndex];
        const decisions = currentPlayer.aiController.makeDecision(this, currentPlayer);

        // Execute decisions with delays
        let delay = 500;
        for (let decision of decisions) {
            setTimeout(() => {
                this.executeAction(currentPlayer, decision);
                if (this.ui) {
                    this.ui.updateGameState();
                }
            }, delay);
            delay += 800;
        }

        // End turn after all actions
        setTimeout(() => this.endTurn(), delay + 500);
    }

    executeAction(player, action) {
        switch (action.action) {
            case 'invest-guild':
                return this.investInGuild(player, action.guild);
            case 'invest-expedition':
                return this.investInExpedition(player);
            case 'buy-land':
                return this.buyLand(player);
            case 'cultivate-land':
                return this.cultivateLand(player, action.landIndex);
            case 'build-inn':
                return this.buildInn(player, action.landIndex);
            case 'repair-inn':
                return this.repairInn(player, action.innIndex);
            case 'cause-mutiny':
                return this.causeMutiny(player, action.guild);
            case 'buy-treasure':
                return this.buyTreasureArtisan(player);
            case 'sell-treasure-artisan':
                return this.sellTreasureArtisan(player, action.treasureIndex);
        }
    }

    investInGuild(player, guildNumber) {
        const guild = this.activeGuilds.find(g => g.number === guildNumber);
        if (!guild) {
            this.log('Gremio no encontrado');
            return false;
        }

        // Check if guild already has 4 investments (maximum)
        if (guild.investments.length >= 4) {
            this.log(`${guild.name} ya tiene el máximo de 4 inversiones`);
            return false;
        }

        // Note: Blocked guilds can still receive investments, they just don't generate resources

        // Check investment limits
        const maxInvestments = (player.character && player.character.additionalInvestment) ? 3 : 2;
        if (player.investmentsThisTurn >= maxInvestments) {
            this.log('Has alcanzado el límite de inversiones este turno');
            return false;
        }

        // Check guild investment limit (max 2 per turn)
        if (player.guildInvestmentsThisTurn >= 2) {
            this.log('Has alcanzado el límite de inversiones en gremios este turno');
            return false;
        }

        // Check if already invested in a guild this turn (unless merchant with additional investment)
        if (player.investedInGuildThisTurn && !(player.character && player.character.additionalInvestment)) {
            this.log('Ya has invertido en un gremio este turno');
            return false;
        }

        // Check for free investment (Artisan in Blacksmith/Jewelry)
        const isFree = player.character && player.character.firstInvestmentFree &&
                       player.character.firstInvestmentFree.includes(guildNumber) &&
                       guild.investments.filter(inv => inv.playerId === player.id).length === 0;

        if (isFree) {
            // Use reserve coin
            if (player.reserve < 1) {
                this.log('No hay monedas en reserva');
                return false;
            }
            player.removeFromReserve(1);
        } else {
            // Normal cost: 2 coins (1 to guild, 1 to reserve)
            if (player.coins < 2) {
                this.log('No tienes suficientes monedas');
                return false;
            }
            player.removeCoins(2);
            player.addToReserve(1);
        }

        // Add investment
        guild.investments.push({ playerId: player.id, color: player.color });
        player.investedInGuildThisTurn = true;
        player.investmentsThisTurn++;
        player.guildInvestmentsThisTurn++;

        // Update max investor
        this.updateMaxInvestor(guild);

        this.log(`${player.name} invierte en ${guild.name}`, 'action');

        // Trigger character abilities
        this.triggerInvestmentAbilities(player, guild);

        // Check for victory after VP change
        this.checkVictory();

        return true;
    }

    updateMaxInvestor(guild) {
        // If no investments, no max investor
        if (guild.investments.length === 0) {
            guild.maxInvestor = null;
            return;
        }

        const investmentCounts = {};
        const investmentOrder = {};

        for (let i = 0; i < guild.investments.length; i++) {
            const playerId = guild.investments[i].playerId;
            investmentCounts[playerId] = (investmentCounts[playerId] || 0) + 1;

            // Track first investment order
            if (!investmentOrder[playerId]) {
                investmentOrder[playerId] = i;
            }
        }

        const maxCount = Math.max(...Object.values(investmentCounts));
        const tiedPlayers = Object.keys(investmentCounts)
            .filter(pid => investmentCounts[pid] === maxCount)
            .map(pid => parseInt(pid));

        if (tiedPlayers.length === 1) {
            guild.maxInvestor = tiedPlayers[0];
        } else if (tiedPlayers.length > 1) {
            // Tie - first investor wins
            const firstInvestor = tiedPlayers.reduce((first, playerId) => {
                return investmentOrder[playerId] < investmentOrder[first] ? playerId : first;
            });
            guild.maxInvestor = firstInvestor;
        } else {
            // Shouldn't happen, but safety check
            guild.maxInvestor = null;
        }
    }

    triggerInvestmentAbilities(investor, guild) {
        for (let player of this.players) {
            if (player.id === investor.id) continue;

            // Archbishop: receives coin when others invest in Church/Monastery
            if (player.character && player.character.onOtherPlayerInvestChurch &&
                (guild.number === 2 || guild.number === 12)) {
                const result = player.character.onOtherPlayerInvestChurch(this, player);
                player.addCoins(result.coins, result.fromReserve);
                this.log(`${player.name} (Arzobispo) recibe ${result.coins} moneda`, 'action');
            }

            // Shopkeeper: receives coin when others invest in Farm/Tavern
            if (player.character && player.character.onOtherPlayerInvestFarmTavern &&
                (guild.number === 6 || guild.number === 8)) { // Granja (6) or Taberna (8)
                const result = player.character.onOtherPlayerInvestFarmTavern(this, player);
                player.addCoins(result.coins, result.fromReserve);
                this.log(`${player.name} (Tendera) recibe ${result.coins} moneda`, 'action');
            }
        }
    }

    investInExpedition(player) {
        // Check investment limits
        const maxInvestments = (player.character && player.character.additionalInvestment) ? 3 : 2;
        if (player.investmentsThisTurn >= maxInvestments) {
            this.log('Has alcanzado el límite de inversiones este turno');
            return false;
        }

        // Check expedition investment limit (max 2 per turn)
        if (player.expeditionInvestmentsThisTurn >= 2) {
            this.log('Has alcanzado el límite de inversiones en expedición este turno');
            return false;
        }

        // Check if already invested in expedition this turn (unless merchant with additional investment)
        if (player.investedInExpeditionThisTurn && !(player.character && player.character.additionalInvestment)) {
            this.log('Ya has invertido en la expedición este turno');
            return false;
        }

        if (this.expedition.investments.length >= this.expedition.maxSlots) {
            this.log('La expedición está llena');
            return false;
        }

        // Check for free investment (Stowaway): truly free if expedition is empty
        const isFree = player.character && player.character.freeExpeditionInvestment &&
                       this.expedition.investments.length === 0;

        if (!isFree) {
            if (player.coins < 2) {
                this.log('No tienes suficientes monedas');
                return false;
            }
            player.removeCoins(2);
            player.addToReserve(1);
        }
        // If free, no cost at all

        this.expedition.investments.push({ playerId: player.id, color: player.color });
        player.investedInExpeditionThisTurn = true;
        player.investmentsThisTurn++;
        player.expeditionInvestmentsThisTurn++;

        this.log(`${player.name} invierte en la expedición`, 'action');

        // Check if expedition is full (4th investment triggers immediate resolution)
        if (this.expedition.investments.length === this.expedition.maxSlots) {
            setTimeout(() => {
                this.log('La expedición está completa, se resuelve ahora', 'event');
                this.resolveExpedition();
            }, 1000);
        }

        return true;
    }

    resolveExpedition() {
        const die1 = Math.floor(Math.random() * 6) + 1;
        const die2 = Math.floor(Math.random() * 6) + 1;
        const sum = die1 + die2;

        this.log(`🎲 Expedición: ${die1} + ${die2} = ${sum}`, 'event');

        const success = sum >= 6 && sum <= 8;

        if (success) {
            this.log('¡Expedición exitosa!', 'event');

            // Distribute treasures
            for (let investment of this.expedition.investments) {
                const player = this.players.find(p => p.id === investment.playerId);
                if (player && this.treasureDeck.length > 0) {
                    const treasure = this.treasureDeck.pop();
                    player.addTreasure(treasure);
                    this.log(`${player.name} recibe un tesoro`, 'action');

                    // AI players automatically convert coin treasures
                    if (player.isAI && treasure.type === TREASURE_TYPES.WEALTH) {
                        setTimeout(() => {
                            const coinsGained = player.convertCoinTreasures();
                            if (coinsGained > 0) {
                                this.log(`${player.name} convierte tesoro en ${coinsGained} monedas`, 'action');
                                if (this.ui) {
                                    this.ui.updateGameState();
                                }
                            }
                        }, 800);
                    }
                }
            }

            // Update Discoverer's Emblem
            this.updateDiscovererEmblem();

            // Check for victory after treasures distributed
            this.checkVictory();
        } else {
            this.log('Expedición fallida', 'event');

            // Pirate ability
            let coinsLost = this.expedition.investments.length;
            const pirate = this.players.find(p => p.character && p.character.id === 'pirate');
            if (pirate) {
                pirate.addCoins(coinsLost);
                this.log(`${pirate.name} (Pirata) recibe ${coinsLost} monedas`, 'action');
            }
        }

        // Return investments to reserves
        for (let investment of this.expedition.investments) {
            const player = this.players.find(p => p.id === investment.playerId);
            if (player) {
                player.addToReserve(1);
            }
        }

        this.expedition.investments = [];

        if (this.ui) {
            this.ui.updateGameState();
        }

        return success ? 'Expedición exitosa' : 'Expedición fallida';
    }

    updateDiscovererEmblem() {
        // Find player with most treasures (minimum 2)
        // In case of tie, player who reached that count first wins
        let maxTreasures = 1; // Start at 1 so we require at least 2
        let discoverer = null;
        let earliestTimestamp = Infinity;

        // Track previous holder before updating
        const previousHolder = this.players.find(p => p.hasDiscovererEmblem);

        for (let player of this.players) {
            const treasureCount = player.getTreasureCount();

            if (treasureCount >= 2) {
                if (treasureCount > maxTreasures) {
                    // New leader
                    maxTreasures = treasureCount;
                    discoverer = player;
                    earliestTimestamp = player.treasureTimestamp;
                } else if (treasureCount === maxTreasures) {
                    // Tie - check who got there first
                    if (player.treasureTimestamp < earliestTimestamp) {
                        discoverer = player;
                        earliestTimestamp = player.treasureTimestamp;
                    }
                }
            }
        }

        // Update emblem
        for (let player of this.players) {
            player.hasDiscovererEmblem = (player === discoverer);
        }

        // Log emblem change if it changed
        if (discoverer && previousHolder && discoverer !== previousHolder && this.ui) {
            this.log(`${discoverer.name} ahora tiene el Emblema del Descubridor (${discoverer.getTreasureCount()} tesoros)`, 'info');
        }
    }

    buyLand(player) {
        if (player.buyLand()) {
            this.log(`${player.name} compra una tierra`, 'action');

            // Trigger abilities
            for (let otherPlayer of this.players) {
                if (otherPlayer.id !== player.id) {
                    // Archbishop
                    if (otherPlayer.character && otherPlayer.character.onOtherPlayerBuyLand) {
                        const result = otherPlayer.character.onOtherPlayerBuyLand(this, otherPlayer);
                        otherPlayer.addCoins(result.coins, result.fromReserve);
                        this.log(`${otherPlayer.name} (Arzobispo) recibe ${result.coins} moneda`, 'action');
                    }
                }
            }

            // Peasant free cultivate
            if (player.character && player.character.freeCultivatePerTurn && !player.usedFreeCultivate) {
                const newLandIndex = player.lands.length - 1;
                player.cultivateLand(newLandIndex, true);
                player.usedFreeCultivate = true;
                this.log(`${player.name} (Campesino) cultiva la tierra gratis`, 'action');
            }

            return true;
        }
        return false;
    }

    cultivateLand(player, landIndex) {
        const isFree = player.character && player.character.freeCultivatePerTurn && !player.usedFreeCultivate;

        if (player.cultivateLand(landIndex, isFree)) {
            if (isFree) {
                player.usedFreeCultivate = true;
                this.log(`${player.name} cultiva una tierra (gratis)`, 'action');
            } else {
                this.log(`${player.name} cultiva una tierra`, 'action');
            }
            return true;
        }
        return false;
    }

    buildInn(player, landIndex) {
        if (player.buildInn(landIndex)) {
            this.log(`${player.name} construye una posada`, 'action');

            // Trigger abilities
            for (let otherPlayer of this.players) {
                if (otherPlayer.id !== player.id) {
                    // Innkeeper
                    if (otherPlayer.character && otherPlayer.character.onOtherPlayerBuildInn) {
                        const result = otherPlayer.character.onOtherPlayerBuildInn(this, otherPlayer);
                        otherPlayer.addCoins(result.coins, result.fromReserve);
                        this.log(`${otherPlayer.name} (Posadera) recibe ${result.coins} moneda`, 'action');
                    }
                }
            }

            // Check for victory after VP change
            this.checkVictory();

            return true;
        }
        return false;
    }

    repairInn(player, innIndex) {
        const isFree = player.character && player.character.freeRepairPerTurn && !player.usedFreeRepair;

        if (player.repairInn(innIndex, isFree)) {
            if (isFree) {
                player.usedFreeRepair = true;
                this.log(`${player.name} repara una posada (gratis)`, 'action');
            } else {
                this.log(`${player.name} repara una posada`, 'action');
            }

            // Check for victory after VP change
            this.checkVictory();

            return true;
        }
        return false;
    }

    causeMutiny(player, guildNumber) {
        // Check if player is Mercenary
        if (!player.character || player.character.id !== 'mercenary') {
            this.log('Solo el Mercenario puede causar motines');
            return false;
        }

        // Check if already used this turn
        if (player.usedMutinyAbility) {
            this.log('Ya has usado la habilidad de motín este turno');
            return false;
        }

        // Check if has 1 coin
        if (player.coins < 1) {
            this.log('No tienes suficientes monedas');
            return false;
        }

        // Find the guild
        const guild = this.activeGuilds.find(g => g.number === guildNumber);
        if (!guild) {
            this.log('Gremio no encontrado');
            return false;
        }

        // Check if player has invested in this guild
        const hasInvestment = guild.investments.some(inv => inv.playerId === player.id);
        if (!hasInvestment) {
            this.log('No has invertido en este gremio');
            return false;
        }

        // Pay the cost
        player.removeCoins(1);
        player.usedMutinyAbility = true;

        // Apply mutiny
        const message = this.eventHandler.applyMutiny(guild);
        this.log(`${player.name} (Mercenario) causa un motín en ${guild.name}`, 'action');
        if (message) {
            this.log(message, 'event');
        }

        return true;
    }

    buyTreasureArtisan(player) {
        // Check if player is Artisan
        if (!player.character || player.character.id !== 'artisan') {
            this.log('Solo el Artesano puede comprar tesoros');
            return false;
        }

        // Check if already used this turn
        if (player.usedArtisanTreasureAbility) {
            this.log('Ya has usado la habilidad de compra/venta de tesoros este turno');
            return false;
        }

        // Check if has 4 coins
        if (player.coins < 4) {
            this.log('No tienes suficientes monedas (necesitas 4)');
            return false;
        }

        // Check if treasure deck has treasures
        if (this.treasureDeck.length === 0) {
            this.log('No quedan tesoros en el mazo');
            return false;
        }

        // Pay the cost
        player.removeCoins(4);
        player.usedArtisanTreasureAbility = true;

        // Draw treasure
        const treasure = this.treasureDeck.pop();
        player.addTreasure(treasure);

        this.updateDiscovererEmblem();

        this.log(`${player.name} (Artesano) compra un tesoro por 4 monedas`, 'action');

        // Check for victory after VP change
        this.checkVictory();

        return true;
    }

    sellTreasureArtisan(player, treasureIndex) {
        // Check if player is Artisan
        if (!player.character || player.character.id !== 'artisan') {
            this.log('Solo el Artesano puede vender tesoros');
            return false;
        }

        // Check if already used this turn
        if (player.usedArtisanTreasureAbility) {
            this.log('Ya has usado la habilidad de compra/venta de tesoros este turno');
            return false;
        }

        // Check if treasure exists
        if (treasureIndex < 0 || treasureIndex >= player.treasures.length) {
            this.log('Tesoro no encontrado');
            return false;
        }

        // Remove treasure and gain 4 coins
        const treasure = player.removeTreasure(treasureIndex);
        player.addCoins(4);
        player.usedArtisanTreasureAbility = true;

        // Return treasure to deck (shuffle it back)
        this.treasureDeck.push(treasure);
        this.treasureDeck = shuffleArray(this.treasureDeck);

        this.updateDiscovererEmblem();

        this.log(`${player.name} (Artesano) vende un tesoro por 4 monedas`, 'action');

        // Check for victory after VP change
        this.checkVictory();

        return true;
    }

    checkVictory() {
        // Check all players for victory condition (10+ VP)
        // First player to reach 10 VP wins immediately
        if (this.phase === 'game-over') return; // Already ended

        for (let player of this.players) {
            const vp = player.getVictoryPoints(this, true);
            if (vp >= 10) {
                this.endGame(player);
                return;
            }
        }
    }

    endTurn() {
        const currentPlayer = this.players[this.currentPlayerIndex];
        this.log(`${currentPlayer.name} termina su turno`, 'info');

        // Check for victory one more time at turn end
        this.checkVictory();
        if (this.phase === 'game-over') return;

        // Move to next player
        this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.numPlayers;

        if (this.currentPlayerIndex === 0) {
            this.round++;
        }

        // Start next turn
        this.phase = 'event';
        setTimeout(() => this.nextPhase(), 1000);
    }

    endGame(winner) {
        this.phase = 'game-over';
        // Always include treasures in final VP count
        this.log(`¡${winner.name} gana con ${winner.getVictoryPoints(this, true)} VP!`, 'event');

        if (this.ui) {
            this.ui.showGameOver(winner);
        }
    }

    log(message, type = 'info') {
        if (this.ui) {
            this.ui.addLogMessage(message, type);
        }
    }
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { GremiosGame };
}
