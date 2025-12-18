// Main Game Logic for Gremios - Phaser version with event emitter

class GremiosGame extends SimpleEventEmitter {
    constructor(numPlayers = 3, difficulty = 'medium') {
        super();

        this.numPlayers = numPlayers;
        this.aiDifficulty = difficulty;
        this.players = [];
        this.currentPlayerIndex = 0;
        this.phase = 'setup';
        this.round = 0;

        // Decks
        this.eventDeck = [];
        this.eventDiscard = [];
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
        this.isPaused = false;

        // Event handler
        this.eventHandler = new EventHandler(this);

        // Initialize players
        this.setupPlayers();
        this.setupDecks();
        this.setupInitialGuilds();
    }

    log(message, type = 'info') {
        console.log(`[${type}] ${message}`);
    }

    setupPlayers() {
        this.players = [];

        // Human player (always player 0)
        const humanPlayer = new Player(0, 'Tu', false);
        humanPlayer.setColor(PLAYER_CONFIG[0].color);
        this.players.push(humanPlayer);

        // AI players
        for (let i = 1; i < this.numPlayers; i++) {
            const aiPlayer = new Player(i, PLAYER_CONFIG[i].name, true);
            aiPlayer.setColor(PLAYER_CONFIG[i].color);
            aiPlayer.aiController = new AIPlayer(this.aiDifficulty);
            this.players.push(aiPlayer);
        }
    }

    setupDecks() {
        this.treasureDeck = createTreasureDeck();
        this.eventDeck = createEventDeck(this.numPlayers);
    }

    setupInitialGuilds() {
        const initialGuildCount = this.numPlayers;
        const guildNumbers = [2, 3, 4, 5, 6, 8, 9, 10, 11, 12];
        const shuffledNumbers = shuffleArray([...guildNumbers]);

        for (let i = 0; i < initialGuildCount; i++) {
            const guildNum = shuffledNumbers[i];

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
    }

    startGame() {
        // Discard 3 random events at game start
        this.discardRandomEvents(3);

        this.phase = 'event';
        this.round = 1;
        this.emit('gameStarted');
        this.emit('stateChanged');
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
        this.emit('phaseChanged', 'event');

        // Check if there's a pending event from previous Governor
        if (this.nextPlayerPendingEvent) {
            this.currentEvent = this.nextPlayerPendingEvent;
            this.nextPlayerPendingEvent = null;
            this.emit('eventDrawn', this.currentEvent);
            this.processCurrentEvent();
            return;
        }

        // Check if deck needs reshuffling
        if (this.eventDeck.length === 0) {
            this.reshuffleEventDeck();
        }

        const currentPlayer = this.players[this.currentPlayerIndex];

        // Governor ability: draw 2 events, choose 1
        if (currentPlayer.character && currentPlayer.character.drawTwoEvents) {
            const event1 = this.eventDeck.pop();

            // Handle case where no events are available
            if (!event1) {
                this.log('No hay eventos disponibles - saltando fase de evento', 'system');
                this.phase = 'roll';
                this.nextPhase();
                return;
            }

            const event2 = this.eventDeck.length > 0 ? this.eventDeck.pop() : null;

            if (event2) {
                // Store pending choice and emit event for UI
                this.pendingGovernorChoice = { event1, event2 };
                this.emit('governorEventChoice', {
                    event1,
                    event2,
                    playerId: currentPlayer.id,
                    isHuman: !currentPlayer.isAI
                });
                // UI will call resolveGovernorChoice(chosenEventIndex)
                return;
            } else {
                // Only one event available, use it
                this.currentEvent = event1;
                this.emit('eventDrawn', event1);
            }
        } else {
            // Normal flow: draw single event
            const event = this.eventDeck.pop();
            if (!event) {
                // No events available - skip event phase and go to roll
                this.log('No hay eventos disponibles - saltando fase de evento', 'system');
                this.phase = 'roll';
                this.nextPhase();
                return;
            }

            this.currentEvent = event;
            this.emit('eventDrawn', event);
        }

        this.processCurrentEvent();
    }

    resolveGovernorChoice(chosenEventIndex) {
        if (!this.pendingGovernorChoice) return;

        const { event1, event2 } = this.pendingGovernorChoice;
        const chosenEvent = chosenEventIndex === 0 ? event1 : event2;
        const unchosen = chosenEventIndex === 0 ? event2 : event1;

        // Store unchosen event for next player
        this.nextPlayerPendingEvent = unchosen;

        this.currentEvent = chosenEvent;
        this.pendingGovernorChoice = null;
        this.emit('eventDrawn', chosenEvent);
        this.processCurrentEvent();
    }

    processCurrentEvent() {
        // Apply event effects after delay
        setTimeout(() => {
            this.eventHandler.handleEvent(this.currentEvent);

            // Add event to discard pile (except permanent events like guild foundations)
            if (this.currentEvent.type !== EVENT_TYPES.GUILD_FOUNDATION) {
                this.eventDiscard.push(this.currentEvent);
            }

            this.emit('stateChanged');

            // Move to roll phase
            setTimeout(() => {
                this.phase = 'roll';
                this.nextPhase();
            }, 500);
        }, GAME_CONSTANTS.EVENT_DISPLAY_DURATION);
    }

    reshuffleEventDeck() {
        const activeGuildNumbers = this.activeGuilds.map(g => g.number);

        const filteredDiscard = this.eventDiscard.filter(event => {
            if (event.type === EVENT_TYPES.GUILD_FOUNDATION) {
                return !activeGuildNumbers.includes(event.guild);
            }
            return true;
        });

        // Shuffle the discard pile
        const shuffled = shuffleArray(filteredDiscard);

        // Discard 3 random cards (or fewer if not enough cards)
        const cardsToDiscard = Math.min(3, shuffled.length);
        this.eventDiscard = shuffled.splice(0, cardsToDiscard);

        // Remaining cards form the new deck
        this.eventDeck = shuffled;
        this.emit('deckReshuffled');
    }

    discardRandomEvents(count) {
        // Discard random events from the deck at game start
        const cardsToDiscard = Math.min(count, this.eventDeck.length);
        for (let i = 0; i < cardsToDiscard; i++) {
            const discarded = this.eventDeck.pop();
            if (discarded) {
                this.eventDiscard.push(discarded);
            }
        }
    }

    rollPhase() {
        this.phase = 'roll';
        this.emit('phaseChanged', 'roll');

        const die1 = rollDie();
        const die2 = rollDie();
        const sum = die1 + die2;

        this.lastDiceRoll = { die1, die2, sum };
        this.emit('diceRolled', this.lastDiceRoll);

        // Handle roll effects
        setTimeout(() => {
            if (sum === 7) {
                // Check for Plague before clearing (for Healer ability)
                const hadPlague = this.activeTemporaryEvents.some(e => e.id === 'plague');

                this.activeTemporaryEvents = [];
                this.eventHandler.updateGuildBlocking();

                // Healer ability: receives coins when Plague ends
                if (hadPlague) {
                    this.eventHandler.triggerPlagueEndAbility();
                }
            } else {
                this.distributeGuildCoins(sum);
            }

            if (this.nextRollBankruptcy) {
                const guild = this.activeGuilds.find(g => g.number === sum);
                if (guild) {
                    this.eventHandler.applyBankruptcy(guild);
                }
                this.nextRollBankruptcy = false;
            }

            if (this.nextRollMutiny) {
                const guild = this.activeGuilds.find(g => g.number === sum);
                if (guild) {
                    this.eventHandler.applyMutiny(guild);
                }
                this.nextRollMutiny = false;
            }

            if (this.pendingExpedition) {
                this.pendingExpedition = false;
                this.resolveExpedition(true);
            }

            this.emit('stateChanged');

            this.phase = 'collection';
            setTimeout(() => this.nextPhase(), GAME_CONSTANTS.PHASE_TRANSITION_DELAY);
        }, GAME_CONSTANTS.DICE_ROLL_DURATION);
    }

    distributeGuildCoins(guildNumber) {
        const guild = this.activeGuilds.find(g => g.number === guildNumber);
        if (!guild) {
            this.log(`Gremio ${guildNumber} no fundado - sin pagos`, 'system');
            this.emit('guildPayment', { guildNumber, guildName: null, notFounded: true });
            return;
        }

        // Debug logging for guild state
        const activeEvents = this.activeTemporaryEvents.map(e => e.id).join(', ') || 'ninguno';
        this.log(`Gremio ${guild.name} (${guildNumber}): bloqueado=${guild.blocked}, eventos=[${activeEvents}]`, 'system');

        for (let player of this.players) {
            const investments = guild.investments.filter(inv => inv.playerId === player.id).length;
            if (investments > 0) {
                if (guild.blocked) {
                    // Pirate immunity: can collect from Port (5) and Market (9) even with Trade Blockade
                    if (player.character && player.character.immuneToTradeBlockade) {
                        if (guildNumber === 5 || guildNumber === 9) {
                            // Check if blocked specifically by trade_blockade (not by bankruptcy effect)
                            const tradeBlockadeCount = this.activeTemporaryEvents
                                .filter(e => e.id === 'trade_blockade').length;
                            // Pirate is immune to blocking (1st and 2nd stack), but bankruptcy (3rd) clears investments anyway
                            if (tradeBlockadeCount > 0 && tradeBlockadeCount <= 2) {
                                player.addCoins(investments);
                                this.log(`${player.name} (Pirata) cobra ${investments} moneda${investments > 1 ? 's' : ''} de ${guild.name} pese al Bloqueo`, 'ability');
                                continue;
                            }
                        }
                    }
                    // Guild is blocked and player is not immune, skip
                    this.log(`${player.name} no cobra de ${guild.name} (bloqueado)`, 'system');
                    continue;
                }
                player.addCoins(investments);
                this.log(`${player.name} cobra ${investments} moneda${investments > 1 ? 's' : ''} de ${guild.name}`, 'system');
            }
        }

        this.emit('guildPayment', { guildNumber, guildName: guild.name, blocked: guild.blocked });
        this.emit('guildUpdated');
    }

    collectionPhase() {
        this.phase = 'collection';
        this.emit('phaseChanged', 'collection');

        const currentPlayer = this.players[this.currentPlayerIndex];

        // Base: 1 coin
        currentPlayer.addCoins(1);

        // 1 coin per active inn
        const activeInns = currentPlayer.getActiveInnsCount();
        currentPlayer.addCoins(activeInns);

        // Character abilities
        if (currentPlayer.character && currentPlayer.character.onTurnStart) {
            const result = currentPlayer.character.onTurnStart(this, currentPlayer);
            if (result && result.coins > 0) {
                currentPlayer.addCoins(result.coins, result.fromReserve);
            }
        }

        currentPlayer.resetTurnFlags();
        this.emit('playerUpdated', currentPlayer.id);
        this.emit('stateChanged');

        this.phase = 'investment';
        setTimeout(() => this.nextPhase(), GAME_CONSTANTS.PHASE_TRANSITION_DELAY);
    }

    investmentPhase() {
        this.phase = 'investment';
        this.emit('phaseChanged', 'investment');

        const currentPlayer = this.players[this.currentPlayerIndex];

        if (currentPlayer.isAI) {
            setTimeout(() => this.executeAITurn(), GAME_CONSTANTS.AI_ACTION_BASE_DELAY);
        }
    }

    executeAITurn() {
        const currentPlayer = this.players[this.currentPlayerIndex];
        const decisions = currentPlayer.aiController.makeDecision(this, currentPlayer);

        let delay = 0;
        for (let decision of decisions) {
            setTimeout(() => {
                this.executeAction(currentPlayer.id, decision);
            }, delay);
            delay += GAME_CONSTANTS.AI_ACTION_STEP_DELAY;
        }

        setTimeout(() => this.endTurn(), delay + GAME_CONSTANTS.AI_ACTION_BASE_DELAY);
    }

    executeAction(playerId, action) {
        const player = this.players[playerId];

        switch (action.action) {
            case 'invest-guild':
                return this.investInGuild(playerId, action.guild);
            case 'invest-expedition':
                return this.investInExpedition(playerId);
            case 'buy-land':
                return this.buyLand(playerId);
            case 'cultivate-land':
                return this.cultivateLand(playerId, action.landIndex);
            case 'build-inn':
                return this.buildInn(playerId, action.landIndex);
            case 'repair-inn':
                return this.repairInn(playerId, action.innIndex);
        }
    }

    investInGuild(playerId, guildNumber) {
        const player = this.players[playerId];
        const guild = this.activeGuilds.find(g => g.number === guildNumber);

        if (!guild || guild.investments.length >= 4) {
            return { success: false, reason: 'Invalid guild or full' };
        }

        // Check investment limits
        const maxGuildInvestments = player.hasAdditionalInvestment() ? 2 : 1;
        if (player.guildInvestmentsThisTurn >= maxGuildInvestments) {
            return { success: false, reason: 'Max guild investments reached this turn' };
        }

        const maxTotalInvestments = player.hasAdditionalInvestment() ?
            GAME_CONSTANTS.MAX_INVESTMENTS_MERCHANT : GAME_CONSTANTS.MAX_INVESTMENTS_PER_TURN;
        if (player.investmentsThisTurn >= maxTotalInvestments) {
            return { success: false, reason: 'Max total investments reached this turn' };
        }

        // Artisan: First investment in Blacksmith (3) or Jewelers (11) is free
        let isFreeInvestment = false;
        if (player.character && player.character.firstInvestmentFree &&
            player.character.firstInvestmentFree.includes(guildNumber)) {
            const hasExistingInvestment = guild.investments.some(inv => inv.playerId === player.id);
            if (!hasExistingInvestment) {
                isFreeInvestment = true;
            }
        }

        if (!isFreeInvestment && player.coins < 2) {
            return { success: false, reason: 'Not enough coins' };
        }

        if (isFreeInvestment) {
            player.addToReserve(1);
            this.log(`${player.name} (Artesano) invierte gratis en ${guild.name}`, 'ability');
        } else {
            player.removeCoins(2);
            player.addToReserve(1);
        }

        guild.investments.push({ playerId: player.id, color: player.color });
        player.investedInGuildThisTurn = true;
        player.guildInvestmentsThisTurn++;
        player.investmentsThisTurn++;

        this.updateMaxInvestor(guild);
        this.emit('guildUpdated');
        this.emit('playerUpdated', playerId);
        this.emit('stateChanged');
        this.checkVictory();

        // Archbishop: Receives 1 coin when others invest in Church (2) or Monastery (12)
        if (guildNumber === 2 || guildNumber === 12) {
            this.notifyCharacterAbility('onOtherPlayerInvestChurch', playerId);
        }

        // Shopkeeper: Receives 1 coin when others invest in Farm (6) or Tavern (8)
        if (guildNumber === 6 || guildNumber === 8) {
            this.notifyCharacterAbility('onOtherPlayerInvestFarmTavern', playerId);
        }

        return { success: true, free: isFreeInvestment };
    }

    updateMaxInvestor(guild) {
        if (guild.investments.length === 0) {
            guild.maxInvestor = null;
            return;
        }

        const investmentCounts = {};
        for (let inv of guild.investments) {
            investmentCounts[inv.playerId] = (investmentCounts[inv.playerId] || 0) + 1;
        }

        const maxCount = Math.max(...Object.values(investmentCounts));
        const tiedPlayers = Object.keys(investmentCounts)
            .filter(pid => investmentCounts[pid] === maxCount)
            .map(pid => parseInt(pid));

        if (tiedPlayers.length === 1) {
            guild.maxInvestor = tiedPlayers[0];
        } else if (guild.maxInvestor === null || !tiedPlayers.includes(guild.maxInvestor)) {
            guild.maxInvestor = tiedPlayers[0];
        }
    }

    notifyCharacterAbility(triggerType, triggeringPlayerId, data = {}) {
        for (let player of this.players) {
            if (player.id === triggeringPlayerId) continue;

            const callback = player.character && player.character[triggerType];
            if (callback) {
                const result = callback(this, player, data);
                if (result && result.coins > 0) {
                    player.addCoins(result.coins, result.fromReserve);
                    this.emit('characterAbilityTriggered', {
                        player: player,
                        ability: triggerType,
                        coins: result.coins,
                        fromReserve: result.fromReserve
                    });
                    this.log(`${player.name} (${player.character.nameES}) recibe ${result.coins} moneda${result.coins > 1 ? 's' : ''}${result.fromReserve ? ' de reserva' : ''}`, 'ability');
                }
            }
        }
    }

    investInExpedition(playerId) {
        const player = this.players[playerId];

        if (this.expedition.investments.length >= this.expedition.maxSlots) {
            return { success: false, reason: 'Expedition full' };
        }

        // Check investment limits
        const maxExpeditionInvestments = player.hasAdditionalInvestment() ? 2 : 1;
        if (player.expeditionInvestmentsThisTurn >= maxExpeditionInvestments) {
            return { success: false, reason: 'Max expedition investments reached this turn' };
        }

        const maxTotalInvestments = player.hasAdditionalInvestment() ?
            GAME_CONSTANTS.MAX_INVESTMENTS_MERCHANT : GAME_CONSTANTS.MAX_INVESTMENTS_PER_TURN;
        if (player.investmentsThisTurn >= maxTotalInvestments) {
            return { success: false, reason: 'Max total investments reached this turn' };
        }

        // Stowaway (Polizón) can invest for free if expedition has no investments
        const isFreeInvestment = player.hasFreeExpeditionInvestment() &&
                                  this.expedition.investments.length === 0;

        if (!isFreeInvestment) {
            if (player.coins < 2) {
                return { success: false, reason: 'Not enough coins' };
            }
            player.removeCoins(2);
            player.addToReserve(1);
        }

        this.expedition.investments.push({ playerId: player.id, color: player.color });
        player.investedInExpeditionThisTurn = true;
        player.expeditionInvestmentsThisTurn++;
        player.investmentsThisTurn++;

        if (isFreeInvestment) {
            this.log(`${player.name} (Polizón) invierte gratis en la expedición`, 'action');
        }

        this.emit('playerUpdated', playerId);
        this.emit('stateChanged');

        // When expedition is full, immediately roll dice and resolve (no guild payments)
        if (this.expedition.investments.length === this.expedition.maxSlots) {
            this.log('La expedición está llena - tirando dados para resolución', 'expedition');
            setTimeout(() => this.resolveExpedition(false), 500);
        }

        return { success: true, free: isFreeInvestment };
    }

    resolveExpedition(useExistingRoll = false) {
        let sum;
        if (useExistingRoll && this.lastDiceRoll) {
            sum = this.lastDiceRoll.sum;
            this.log(`Expedition using existing roll: ${sum}`, 'expedition');
        } else {
            const dice = rollDice();
            sum = dice.sum;
            this.emit('diceRolled', dice);
            this.log(`Expedition new roll: ${dice.die1} + ${dice.die2} = ${sum}`, 'expedition');
        }

        const success = sum >= 6 && sum <= 8;
        this.log(`Expedition result: sum=${sum}, success=${success} (needs 6-8)`, 'expedition');

        if (success) {
            for (let investment of this.expedition.investments) {
                const player = this.players.find(p => p.id === investment.playerId);
                if (player && this.treasureDeck.length > 0) {
                    const treasure = this.treasureDeck.pop();
                    player.addTreasure(treasure);
                }
            }
            this.updateDiscovererEmblem();
            this.checkVictory();
        } else {
            // Pirate ability: receives coins from failed expeditions
            const pirate = this.players.find(p => p.character && p.character.onFailedExpedition);
            if (pirate && this.expedition.investments.length > 0) {
                // Each investment represents 2 coins invested
                const coinsLost = this.expedition.investments.length * 2;
                const result = pirate.character.onFailedExpedition(this, pirate, coinsLost);
                if (result && result.coins > 0) {
                    pirate.addCoins(result.coins);
                    this.log(`${pirate.name} (Pirata) recibe ${result.coins} monedas de expedición fallida`, 'ability');
                }
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
        this.emit('expeditionResolved', { success, sum });
        this.emit('stateChanged');
    }

    updateDiscovererEmblem() {
        let maxTreasures = 1;
        let discoverer = null;

        for (let player of this.players) {
            const count = player.getTreasureCount();
            if (count >= 2 && count > maxTreasures) {
                maxTreasures = count;
                discoverer = player;
            }
        }

        for (let player of this.players) {
            player.hasDiscovererEmblem = (player === discoverer);
        }
    }

    buyLand(playerId) {
        const player = this.players[playerId];
        if (player.buyLand()) {
            this.emit('playerUpdated', playerId);
            this.emit('stateChanged');

            // Archbishop: Receives 1 coin when others buy land
            this.notifyCharacterAbility('onOtherPlayerBuyLand', playerId);

            return { success: true };
        }
        return { success: false };
    }

    cultivateLand(playerId, landIndex) {
        const player = this.players[playerId];
        if (player.cultivateLand(landIndex)) {
            this.emit('playerUpdated', playerId);
            this.emit('stateChanged');
            return { success: true };
        }
        return { success: false };
    }

    buildInn(playerId, landIndex) {
        const player = this.players[playerId];
        if (player.buildInn(landIndex)) {
            this.emit('playerUpdated', playerId);
            this.emit('stateChanged');
            this.checkVictory();

            // Innkeeper: Receives 1 coin when others build inn
            this.notifyCharacterAbility('onOtherPlayerBuildInn', playerId);

            return { success: true };
        }
        return { success: false };
    }

    repairInn(playerId, innIndex) {
        const player = this.players[playerId];
        if (player.repairInn(innIndex)) {
            this.emit('playerUpdated', playerId);
            this.emit('stateChanged');
            this.checkVictory();
            return { success: true };
        }
        return { success: false };
    }

    checkVictory() {
        if (this.phase === 'game-over') return;

        for (let player of this.players) {
            const vp = player.getVictoryPoints(this, true);
            if (vp >= GAME_CONSTANTS.WINNING_VP) {
                this.endGame(player);
                return;
            }
        }
    }

    endTurn() {
        this.checkVictory();
        if (this.phase === 'game-over') return;

        this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.numPlayers;

        if (this.currentPlayerIndex === 0) {
            this.round++;
        }

        this.phase = 'event';
        this.emit('turnChanged', this.currentPlayerIndex);
        this.emit('stateChanged');
        setTimeout(() => this.nextPhase(), GAME_CONSTANTS.PHASE_TRANSITION_DELAY);
    }

    endGame(winner) {
        this.phase = 'game-over';
        this.emit('gameOver', winner);
    }

    pause() {
        this.isPaused = true;
        this.emit('paused');
    }

    resume() {
        this.isPaused = false;
        this.emit('resumed');
    }
}
