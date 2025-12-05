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
        this.pendingExpedition = false;
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

    // Helper: Get max investments per turn for a player
    getMaxInvestmentsPerTurn(player) {
        return player.hasAdditionalInvestment() ? 3 : 2;
    }

    // Helper: Check if player has reached total investment limit
    hasReachedInvestmentLimit(player) {
        return player.investmentsThisTurn >= this.getMaxInvestmentsPerTurn(player);
    }

    // Helper: Check if player can make another investment of a specific type
    canInvestInType(player, type) {
        if (this.hasReachedInvestmentLimit(player)) {
            return { allowed: false, reason: 'Has alcanzado el límite de inversiones este turno' };
        }

        const hasAdditionalInvestment = player.hasAdditionalInvestment();

        if (type === 'guild') {
            if (player.guildInvestmentsThisTurn >= 2) {
                return { allowed: false, reason: 'Has alcanzado el límite de inversiones en gremios este turno' };
            }
            if (player.investedInGuildThisTurn && !hasAdditionalInvestment) {
                return { allowed: false, reason: 'Ya has invertido en un gremio este turno' };
            }
        } else if (type === 'expedition') {
            if (player.expeditionInvestmentsThisTurn >= 2) {
                return { allowed: false, reason: 'Has alcanzado el límite de inversiones en expedición este turno' };
            }
            if (player.investedInExpeditionThisTurn && !hasAdditionalInvestment) {
                return { allowed: false, reason: 'Ya has invertido en la expedición este turno' };
            }
        }

        return { allowed: true };
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
                // Phase transition happens after event completes in continueDrawAndApplyEvent()
            } else {
                // UI should handle showing 2 events for selection
                if (this.ui) {
                    this.ui.showGovernorEventChoice();
                }
            }
        } else {
            this.drawAndApplyEvent();
            // Phase transition happens after event completes in continueDrawAndApplyEvent()
        }
    }

    drawAndApplyEvent() {
        // Discard the previous event before drawing a new one
        if (this.currentEvent && this.currentEvent.type !== EVENT_TYPES.TEMPORARY) {
            this.eventDiscard.push(this.currentEvent);
        }

        // Check if deck needs reshuffling
        if (this.eventDeck.length === 0) {
            // Show reshuffle animation first
            if (this.ui) {
                this.ui.showReshuffleAnimation(() => {
                    // After animation completes, reshuffle the deck
                    this.reshuffleEventDeck();

                    // Update UI to show deck is refilled
                    if (this.ui) {
                        this.ui.updateGameState();
                    }

                    // Wait 1 second before showing the next event
                    setTimeout(() => {
                        this.continueDrawAndApplyEvent();
                    }, 1000);
                });
            } else {
                // No UI available, just reshuffle immediately
                this.reshuffleEventDeck();
                this.continueDrawAndApplyEvent();
            }
        } else {
            // Deck has cards, continue normally
            this.continueDrawAndApplyEvent();
        }
    }

    continueDrawAndApplyEvent() {
        const event = this.eventDeck.pop();

        // Safety check: if deck is empty (shouldn't happen with our fix, but just in case)
        if (!event) {
            this.log('⚠️ Error: Mazo de eventos vacío. Se intenta rebarajar...', 'error');
            // Trigger another reshuffle
            this.drawAndApplyEvent();
            return;
        }

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

            // After event is fully displayed and effects applied, move to roll phase
            setTimeout(() => {
                this.phase = 'roll';
                this.nextPhase();
            }, 500); // Small buffer to let players see the event result
        }, 3500); // Apply effects after 3.5 seconds (modal flip + display time)
    }

    reshuffleEventDeck() {
        // Get active guild numbers
        const activeGuildNumbers = this.activeGuilds.map(g => g.number);

        // Filter out guild foundation events for guilds that are already active
        // Guilds are unique and should not be reshuffled once they're on the board
        const filteredDiscard = this.eventDiscard.filter(event => {
            if (event.type === EVENT_TYPES.GUILD_FOUNDATION) {
                return !activeGuildNumbers.includes(event.guild);
            }
            return true; // Keep all ACTION and TEMPORARY events
        });

        const filteredSetAside = this.setAsideEvents.filter(event => {
            if (event.type === EVENT_TYPES.GUILD_FOUNDATION) {
                return !activeGuildNumbers.includes(event.guild);
            }
            return true; // Keep all ACTION and TEMPORARY events
        });

        // Shuffle discard pile and set-aside events back into deck
        this.eventDeck = shuffleArray([...filteredDiscard, ...filteredSetAside]);
        this.eventDiscard = [];
        this.setAsideEvents = [];

        this.log('Se rebaraja el mazo de eventos (gremios activos excluidos)');

        // Discard 3 random cards again after reshuffle, but ensure at least 3 cards remain
        // (one for each player in a full round)
        const cardsToDiscard = Math.min(3, Math.max(0, this.eventDeck.length - 3));
        if (cardsToDiscard > 0) {
            this.discardRandomEvents(cardsToDiscard);
        }
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

        // Check for pending expedition resolution
        if (this.pendingExpedition) {
            this.pendingExpedition = false;
            // Use the current dice roll to resolve the expedition
            this.resolveExpedition(true);
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

            let pirateReceivedCoins = false;
            for (let player of this.players) {
                if (affectedByTradeBlockade && player.character && player.character.immuneToTradeBlockade) {
                    const investments = guild.investments.filter(inv => inv.playerId === player.id).length;
                    if (investments > 0) {
                        player.addCoins(investments);
                        this.log(`${player.name} (Pirata) recibe ${investments} monedas de ${guild.name} (inmune a bloqueo)`, 'action');
                        pirateReceivedCoins = true;
                    }
                }
            }

            if (!pirateReceivedCoins) {
                this.log(`${guild.name} está bloqueado, no genera recursos`, 'info');
            }
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

        if (guild.investments.length >= 4) {
            this.log(`${guild.name} ya tiene el máximo de 4 inversiones`);
            return false;
        }

        const investCheck = this.canInvestInType(player, 'guild');
        if (!investCheck.allowed) {
            this.log(investCheck.reason);
            return false;
        }

        const isFree = player.hasFirstInvestmentFree(guildNumber) &&
                       guild.investments.filter(inv => inv.playerId === player.id).length === 0;

        if (isFree) {
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

        guild.investments.push({ playerId: player.id, color: player.color });
        player.investedInGuildThisTurn = true;
        player.investmentsThisTurn++;
        player.guildInvestmentsThisTurn++;

        this.updateMaxInvestor(guild);
        this.log(`${player.name} invierte en ${guild.name}`, 'action');
        this.triggerInvestmentAbilities(player, guild);
        this.checkVictory();

        return true;
    }

    updateMaxInvestor(guild) {
        if (guild.investments.length === 0) {
            guild.maxInvestor = null;
            return;
        }

        const currentMaxInvestor = guild.maxInvestor;

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
            // Tie - current max investor keeps the guild if they're tied
            if (currentMaxInvestor !== null && tiedPlayers.includes(currentMaxInvestor)) {
                guild.maxInvestor = currentMaxInvestor;
            } else {
                // No current max investor or they're not in the tie - first investor wins
                const firstInvestor = tiedPlayers.reduce((first, playerId) => {
                    return investmentOrder[playerId] < investmentOrder[first] ? playerId : first;
                });
                guild.maxInvestor = firstInvestor;
            }
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
        const investCheck = this.canInvestInType(player, 'expedition');
        if (!investCheck.allowed) {
            this.log(investCheck.reason);
            return false;
        }

        if (this.expedition.investments.length >= this.expedition.maxSlots) {
            this.log('La expedición está llena');
            return false;
        }

        const isFree = player.hasFreeExpeditionInvestment() &&
                       this.expedition.investments.length === 0;

        if (!isFree) {
            if (player.coins < 2) {
                this.log('No tienes suficientes monedas');
                return false;
            }
            player.removeCoins(2);
            player.addToReserve(1);
        }

        this.expedition.investments.push({ playerId: player.id, color: player.color });
        player.investedInExpeditionThisTurn = true;
        player.investmentsThisTurn++;
        player.expeditionInvestmentsThisTurn++;

        this.log(`${player.name} invierte en la expedición`, 'action');
        if (this.expedition.investments.length === this.expedition.maxSlots) {
            setTimeout(() => {
                this.log('La expedición está completa, se resuelve ahora', 'event');
                this.resolveExpedition();
            }, 1000);
        }

        return true;
    }

    resolveExpedition(useExistingRoll = false) {
        let die1, die2, sum;

        if (useExistingRoll && this.lastDiceRoll) {
            // Use the dice roll from the collection phase
            die1 = this.lastDiceRoll.die1;
            die2 = this.lastDiceRoll.die2;
            sum = this.lastDiceRoll.sum;
            this.log(`🎲 La expedición se resuelve con la tirada: ${die1} + ${die2} = ${sum}`, 'event');
        } else {
            // Roll new dice for the expedition
            die1 = Math.floor(Math.random() * 6) + 1;
            die2 = Math.floor(Math.random() * 6) + 1;
            sum = die1 + die2;
            this.log(`🎲 Expedición: ${die1} + ${die2} = ${sum}`, 'event');

            // Update dice display for separate expedition roll
            if (this.ui) {
                this.ui.updateDiceDisplay(die1, die2, sum);
            }
        }

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
        if (!player.isMercenary()) {
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
        if (!player.isArtisan()) {
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
        if (!player.isArtisan()) {
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
