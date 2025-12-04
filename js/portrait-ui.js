/**
 * PortraitUIController
 * UI Controller for portrait mode layout
 * Works with the portrait-game.css styles and board-zoom.js
 */
class PortraitUIController {
    constructor(game) {
        this.game = game;
        game.ui = this;

        // Double-tap tracking
        this.lastTapTime = 0;
        this.lastTapTarget = null;
        this.doubleTapDelay = 300;

        // Game log messages (stored in memory since not displayed)
        this.logMessages = [];

        // Cache DOM elements
        this.elements = {
            // Main panes
            userPane: document.getElementById('user-pane'),
            boardPane: document.getElementById('board-pane'),
            opponentsPane: document.getElementById('opponents-pane'),
            buttonsPane: document.getElementById('buttons-pane'),

            // Board elements
            boardViewport: document.getElementById('board-viewport'),
            guildsGrid: document.getElementById('guilds-grid-portrait'),
            currentEventCard: document.getElementById('current-event-card'),
            previousEventCard: document.getElementById('previous-event-card'),
            expeditionCard: document.getElementById('expedition-card'),
            diceArea: document.getElementById('dice-area'),
            die1: document.getElementById('die1'),
            die2: document.getElementById('die2'),
            diceSum: document.getElementById('dice-sum'),

            // User pane elements
            playerName: document.querySelector('.player-name-badge'),
            emblemBadge: document.querySelector('.emblem-badge'),
            vpCount: document.querySelector('.vp-count'),
            characterName: document.querySelector('.character-name'),
            coinCount: document.querySelector('.coin-count'),
            reserveCount: document.querySelector('.reserve-count'),

            // Opponent panels
            opponent1: document.getElementById('opponent-1'),
            opponent2: document.getElementById('opponent-2'),

            // Bottom buttons
            fullscreenBtn: document.getElementById('fullscreen-btn'),
            helpBtn: document.getElementById('help-btn'),
            exitBtn: document.getElementById('exit-btn')
        };

        // Initialize zoom controller
        if (this.elements.boardViewport && this.elements.guildsGrid) {
            this.zoomController = new BoardZoomController(
                this.elements.boardViewport,
                this.elements.guildsGrid
            );
        }

        this.bindEvents();
    }

    bindEvents() {
        if (this.eventsBound) return;
        this.eventsBound = true;

        // Action buttons - event delegation
        const actionsGrid = document.querySelector('.actions-grid');
        if (actionsGrid) {
            actionsGrid.addEventListener('click', (e) => {
                const actionBtn = e.target.closest('.action-btn');
                if (actionBtn && !actionBtn.disabled) {
                    this.handleActionClick({ target: actionBtn });
                }
            });
        }

        // Bottom buttons
        if (this.elements.fullscreenBtn) {
            this.elements.fullscreenBtn.addEventListener('click', () => this.toggleFullscreen());
        }
        if (this.elements.helpBtn) {
            this.elements.helpBtn.addEventListener('click', () => this.showHelpModal());
        }
        if (this.elements.exitBtn) {
            this.elements.exitBtn.addEventListener('click', () => this.exitGame());
        }

        // Guild card tap handling (for investment)
        if (this.elements.guildsGrid) {
            this.elements.guildsGrid.addEventListener('click', (e) => {
                const guildCard = e.target.closest('.guild-card');
                if (guildCard) {
                    this.handleGuildClick(e, guildCard);
                }
            });

            // Expedition card tap handling
            if (this.elements.expeditionCard) {
                this.elements.expeditionCard.addEventListener('click', (e) => {
                    this.handleExpeditionClick(e);
                });
            }
        }
    }

    handleActionClick(e) {
        const action = e.target.dataset.action;
        const player = this.game.players[0]; // Human player

        switch (action) {
            case 'invest-guild':
                this.showGuildSelection('invest');
                break;
            case 'invest-expedition':
                if (this.game.investInExpedition(player)) {
                    this.updateGameState();
                }
                break;
            case 'buy-land':
                if (this.game.buyLand(player)) {
                    this.updateGameState();
                }
                break;
            case 'cultivate-land':
                this.selectLandToCultivate(player);
                break;
            case 'build-inn':
                this.selectLandForInn(player);
                break;
            case 'repair-inn':
                this.selectInnToRepair(player);
                break;
            case 'end-turn':
                this.game.endTurn();
                break;
            case 'cause-mutiny':
                this.showMutinyGuildSelection();
                break;
            case 'buy-treasure':
                if (this.game.buyTreasureArtisan && this.game.buyTreasureArtisan(player)) {
                    this.updateGameState();
                }
                break;
            case 'sell-treasure-artisan':
                this.showTreasureSellSelection();
                break;
        }
    }

    handleGuildClick(e, guildCard) {
        // Double-tap detection for investment
        const now = Date.now();
        const guildNumber = parseInt(guildCard.dataset.guildNumber);

        if (this.lastTapTarget === guildCard && (now - this.lastTapTime) < this.doubleTapDelay) {
            // Double-tap - invest
            const player = this.game.players[0];
            if (this.game.phase === 'investment' && !player.isAI) {
                if (this.game.investInGuild(player, guildNumber)) {
                    this.updateGameState();
                }
            }
            this.lastTapTime = 0;
            this.lastTapTarget = null;
        } else {
            // Single tap - visual feedback
            guildCard.classList.add('tap-highlight');
            setTimeout(() => guildCard.classList.remove('tap-highlight'), 200);
            this.lastTapTime = now;
            this.lastTapTarget = guildCard;
        }
    }

    handleExpeditionClick(e) {
        const now = Date.now();
        const expeditionCard = this.elements.expeditionCard;

        if (this.lastTapTarget === expeditionCard && (now - this.lastTapTime) < this.doubleTapDelay) {
            // Double-tap - invest
            const player = this.game.players[0];
            if (this.game.phase === 'investment' && !player.isAI) {
                if (this.game.investInExpedition(player)) {
                    this.updateGameState();
                }
            }
            this.lastTapTime = 0;
            this.lastTapTarget = null;
        } else {
            expeditionCard.classList.add('tap-highlight');
            setTimeout(() => expeditionCard.classList.remove('tap-highlight'), 200);
            this.lastTapTime = now;
            this.lastTapTarget = expeditionCard;
        }
    }

    // ==========================================
    // Main Update Methods
    // ==========================================

    updateGameState() {
        this.updateGuildsDisplay();
        this.updateExpeditionDisplay();
        this.updatePlayersDisplay();
        this.updateActionButtons();
        this.updateEventDeckCount();
    }

    updateGuildsDisplay() {
        // Preserve special elements
        const expeditionCard = this.elements.expeditionCard;
        const currentEventCard = this.elements.currentEventCard;
        const previousEventCard = this.elements.previousEventCard;
        const diceArea = this.elements.diceArea;

        // Clear and rebuild
        this.elements.guildsGrid.innerHTML = '';

        // Restore preserved elements
        if (currentEventCard) this.elements.guildsGrid.appendChild(currentEventCard);
        if (previousEventCard) this.elements.guildsGrid.appendChild(previousEventCard);
        if (expeditionCard) this.elements.guildsGrid.appendChild(expeditionCard);
        if (diceArea) this.elements.guildsGrid.appendChild(diceArea);

        // Guild layout
        const row1Guilds = [2, 3, 4, 5, 6];
        const row3Guilds = [12, 11, 10, 9, 8];

        const guildMap = {};
        this.game.activeGuilds.forEach(guild => {
            guildMap[guild.number] = guild;
        });

        // Render guilds
        row1Guilds.forEach((guildNum) => {
            this.renderGuildCard(guildMap[guildNum]);
        });

        this.renderBlockingEventsRow();

        row3Guilds.forEach((guildNum) => {
            this.renderGuildCard(guildMap[guildNum]);
        });
    }

    renderGuildCard(guild) {
        if (!guild) return;

        const div = document.createElement('div');
        div.className = 'guild-card';
        div.dataset.guildNumber = guild.number;

        if (guild.blocked) {
            div.classList.add('blocked');
        }

        // Max investor indicator
        let maxInvestorHTML = '';
        if (guild.maxInvestor !== null) {
            const maxPlayer = this.game.players.find(p => p.id === guild.maxInvestor);
            if (maxPlayer) {
                const coinImage = getCoinImageFromColor(maxPlayer.color);
                maxInvestorHTML = `<div class="max-investor-indicator" style="background-image: url('${coinImage}'); background-size: cover; background-position: center;"></div>`;
            }
        }

        // Investment slots
        const slotsHTML = this.renderInvestmentSlots(guild.investments, 4);

        div.innerHTML = `
            ${maxInvestorHTML}
            <div class="investment-slots">
                ${slotsHTML}
            </div>
        `;

        this.elements.guildsGrid.appendChild(div);
    }

    renderBlockingEventsRow() {
        const blockingEventPositions = {
            'mine_collapse': { column: 2, guilds: [3, 11] },
            'material_shortage': { column: 3, guilds: [4, 10] },
            'trade_blockade': { column: 4, guilds: [5, 9] },
            'famine': { column: 5, guilds: [6, 8] },
            'plague': { column: 1, guilds: 'all' }
        };

        const eventsByColumn = { 1: [], 2: [], 3: [], 4: [], 5: [] };

        for (let event of this.game.activeTemporaryEvents) {
            const eventPos = blockingEventPositions[event.id];
            if (eventPos) {
                eventsByColumn[eventPos.column].push(event);
            }
        }

        for (let col = 1; col <= 5; col++) {
            const div = document.createElement('div');
            div.className = 'blocking-event-row';
            div.style.gridColumn = col;

            const eventsHere = eventsByColumn[col];

            if (eventsHere.length > 0) {
                const eventCounts = {};
                eventsHere.forEach(e => {
                    eventCounts[e.id] = (eventCounts[e.id] || 0) + 1;
                });

                const uniqueEvents = [...new Set(eventsHere.map(e => e.id))];

                let eventsHTML = '';
                uniqueEvents.forEach(eventId => {
                    const event = eventsHere.find(e => e.id === eventId);
                    const count = eventCounts[eventId];

                    eventsHTML += `
                        <div class="blocking-event-card" data-event-id="${eventId}">
                            ${count > 1 ? `<div class="event-count">x${count}</div>` : ''}
                        </div>
                    `;
                });

                div.innerHTML = eventsHTML;
            }

            this.elements.guildsGrid.appendChild(div);
        }
    }

    renderInvestmentSlots(investments, maxSlots) {
        let html = '';
        for (let i = 0; i < maxSlots; i++) {
            if (i < investments.length) {
                const coinImage = getCoinImageFromColor(investments[i].color);
                html += `<div class="investment-slot filled" style="background-image: url('${coinImage}'); background-size: cover; background-position: center; background-repeat: no-repeat;"></div>`;
            } else {
                html += `<div class="investment-slot"></div>`;
            }
        }
        return html;
    }

    updateExpeditionDisplay() {
        const slotsContainer = this.elements.expeditionCard.querySelector('.investment-slots');
        if (slotsContainer) {
            slotsContainer.innerHTML = this.renderInvestmentSlots(
                this.game.expedition.investments,
                this.game.expedition.maxSlots
            );
        }
    }

    updatePlayersDisplay() {
        // Update human player
        this.updateHumanPlayerDisplay(this.game.players[0]);

        // Update AI players
        for (let i = 1; i < this.game.numPlayers; i++) {
            this.updateAIPlayerDisplay(this.game.players[i], i);
        }

        // Highlight current player
        this.highlightCurrentPlayer();
    }

    updateHumanPlayerDisplay(player) {
        // Name
        if (this.elements.playerName) {
            this.elements.playerName.textContent = player.name || 'Tu';
        }

        // Emblem
        if (this.elements.emblemBadge) {
            this.elements.emblemBadge.classList.toggle('hidden', !player.hasDiscovererEmblem);
        }

        // VP (include treasures)
        if (this.elements.vpCount) {
            this.elements.vpCount.textContent = player.getVictoryPoints(this.game, true);
        }

        // Character name (clickable)
        if (this.elements.characterName) {
            this.elements.characterName.textContent = player.character ? player.character.nameES : 'Sin personaje';
            if (player.character) {
                this.elements.characterName.style.cursor = 'pointer';
                this.elements.characterName.onclick = () => this.showCharacterDetail(player.character);
            } else {
                this.elements.characterName.style.cursor = 'default';
                this.elements.characterName.onclick = null;
            }
        }

        // Coins
        if (this.elements.coinCount) {
            this.elements.coinCount.textContent = player.coins;
        }

        // Reserve
        if (this.elements.reserveCount) {
            this.elements.reserveCount.textContent = player.reserve;
        }

        // Update resources (now includes treasure breakdown)
        this.updateResourceDisplay(player);
    }

    updateResourceDisplay(player) {
        const resourceHud = document.querySelector('.resource-hud');
        if (!resourceHud) return;

        // Count treasures by type
        const treasures = player.treasures || [];
        const vp1Count = treasures.filter(t => t.vp === 1).length;
        const vp2Count = treasures.filter(t => t.vp === 2).length;
        const coin3Count = treasures.filter(t => t.type === TREASURE_TYPES.WEALTH && t.coinValue === 3).length;
        const coin4Count = treasures.filter(t => t.type === TREASURE_TYPES.WEALTH && t.coinValue === 4).length;

        // Check if it's human player's turn and in action phase (for Artisan sell ability)
        const canSell = this.game.currentPlayerIndex === 0 &&
                       this.game.phase === 'action' &&
                       player.character?.id === 'artisan';

        // Single row HUD: Lands, CLands, Inns, DInns, 1VP, 2VP, 3Coin, 4Coin
        resourceHud.innerHTML = `
            <div class="resource-item" title="Tierras">
                <img src="resources/other/Land.png" class="resource-icon" alt="Lands">
                <span class="resource-count">${player.getUncultivatedLandsCount()}</span>
            </div>
            <div class="resource-item" title="Tierras Cultivadas">
                <img src="resources/other/Cultivated_Land.png" class="resource-icon" alt="Cultivated">
                <span class="resource-count ${player.getCultivatedLandsCount() > 0 ? 'text-green' : ''}">${player.getCultivatedLandsCount()}</span>
            </div>
            <div class="resource-item" title="Posadas">
                <img src="resources/other/Inn.png" class="resource-icon" alt="Inns">
                <span class="resource-count">${player.getActiveInnsCount()}</span>
            </div>
            <div class="resource-item" title="Posadas Destruidas">
                <img src="resources/other/Destroyed_Inn.png" class="resource-icon" alt="Destroyed">
                <span class="resource-count ${player.getDestroyedInnsCount() > 0 ? 'text-red' : ''}">${player.getDestroyedInnsCount()}</span>
            </div>
            <div class="resource-item treasure-cell ${vp1Count === 0 || !canSell ? 'disabled' : ''}"
                 data-treasure-type="vp1" title="Tesoros 1 VP">
                <img src="resources/other/Treasure_1VP.png" class="resource-icon" alt="1VP">
                <span class="resource-count">${vp1Count}</span>
            </div>
            <div class="resource-item treasure-cell ${vp2Count === 0 || !canSell ? 'disabled' : ''}"
                 data-treasure-type="vp2" title="Tesoros 2 VP">
                <img src="resources/other/Treasure_2VP.png" class="resource-icon" alt="2VP">
                <span class="resource-count">${vp2Count}</span>
            </div>
            <div class="resource-item treasure-cell ${coin3Count === 0 || !canSell ? 'disabled' : ''}"
                 data-treasure-type="coin3" title="Tesoros 3 monedas">
                <img src="resources/other/Wealth_3coins.png" class="resource-icon" alt="3 Coins">
                <span class="resource-count">${coin3Count}</span>
            </div>
            <div class="resource-item treasure-cell ${coin4Count === 0 || !canSell ? 'disabled' : ''}"
                 data-treasure-type="coin4" title="Tesoros 4 monedas">
                <img src="resources/other/Wealth_4coins.png" class="resource-icon" alt="4 Coins">
                <span class="resource-count">${coin4Count}</span>
            </div>
        `;

        // Add click handlers for treasure cells
        resourceHud.querySelectorAll('.treasure-cell:not(.disabled)').forEach(cell => {
            cell.addEventListener('click', () => this.handleTreasureSellClick(cell.dataset.treasureType));
        });
    }

    handleTreasureSellClick(treasureType) {
        const player = this.game.players[0];

        // Find the treasure to sell
        let treasureIndex = -1;
        let treasureLabel = '';

        if (treasureType === 'vp1') {
            treasureIndex = player.treasures.findIndex(t => t.vp === 1);
            treasureLabel = '1 VP';
        } else if (treasureType === 'vp2') {
            treasureIndex = player.treasures.findIndex(t => t.vp === 2);
            treasureLabel = '2 VP';
        } else if (treasureType === 'coin3') {
            treasureIndex = player.treasures.findIndex(t => t.type === TREASURE_TYPES.WEALTH && t.coinValue === 3);
            treasureLabel = '3 monedas';
        } else if (treasureType === 'coin4') {
            treasureIndex = player.treasures.findIndex(t => t.type === TREASURE_TYPES.WEALTH && t.coinValue === 4);
            treasureLabel = '4 monedas';
        }

        if (treasureIndex === -1) return;

        // Show confirmation dialog
        this.showTreasureSellConfirmation(treasureIndex, treasureLabel);
    }

    showTreasureSellConfirmation(treasureIndex, treasureLabel) {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 280px;">
                <div class="modal-header">
                    <span class="modal-title">Vender Tesoro</span>
                </div>
                <div class="modal-body" style="text-align: center;">
                    <p>¿Vender tesoro de ${treasureLabel}?</p>
                    <div style="display: flex; gap: 10px; margin-top: 15px;">
                        <button class="action-btn" id="confirm-sell" style="flex: 1;">Vender</button>
                        <button class="action-btn" id="cancel-sell" style="flex: 1;">Cancelar</button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        modal.querySelector('#confirm-sell').onclick = () => {
            const player = this.game.players[0];
            const treasure = player.removeTreasure(treasureIndex);
            if (treasure) {
                if (treasure.type === TREASURE_TYPES.WEALTH) {
                    player.addCoins(treasure.coinValue);
                }
                // VP treasures just get removed (no coin value)
            }
            this.game.updateDiscovererEmblem();
            this.updateGameState();
            modal.remove();
        };

        modal.querySelector('#cancel-sell').onclick = () => modal.remove();
        modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
    }

    updateAIPlayerDisplay(player, index) {
        const panel = document.getElementById(`opponent-${index}`);
        if (!panel) return;

        const vpValue = player.getVictoryPoints(this.game, false);
        const emblemClass = player.hasDiscovererEmblem ? '' : 'hidden';
        const landsCount = player.getUncultivatedLandsCount ? player.getUncultivatedLandsCount() :
                           (player.lands ? player.lands.filter(l => !l.cultivated).length : 0);
        const cultivatedCount = player.getCultivatedLandsCount ? player.getCultivatedLandsCount() : 0;
        const innsCount = player.getActiveInnsCount ? player.getActiveInnsCount() : 0;
        const destroyedInnsCount = player.getDestroyedInnsCount ? player.getDestroyedInnsCount() : 0;
        const treasuresCount = player.getTreasureCount ? player.getTreasureCount() : 0;

        // Show character name only if game has started (human has selected)
        const characterName = this.shouldShowAICharacters()
            ? (player.character ? player.character.nameES : '???')
            : '???';

        // Get player-specific coin image
        const playerConfig = typeof getPlayerConfig === 'function' ? getPlayerConfig(player.id) : null;
        const coinImage = playerConfig?.coinImage || 'resources/other/gold.png';

        panel.innerHTML = `
            <div class="opponent-header">
                <span class="opponent-name">${player.name}</span>
                <span class="opponent-emblem ${emblemClass}"></span>
                <span class="opponent-vp">${vpValue} VP</span>
            </div>
            <div class="opponent-info">
                <span class="opponent-character">${characterName}</span>
                <span class="opponent-coins">
                    <span class="opp-coin-value">${player.coins}</span>
                    <img src="${coinImage}" class="coin-icon-small" alt="coins">
                </span>
            </div>
            <div class="opponent-resources-grid">
                <!-- Row 1: Lands, Cultivated, Treasures -->
                <div class="opp-resource-item">
                    <img src="resources/other/Land.png" class="resource-icon-tiny">
                    <span>${landsCount}</span>
                </div>
                <div class="opp-resource-item">
                    <img src="resources/other/Cultivated_Land.png" class="resource-icon-tiny">
                    <span>${cultivatedCount}</span>
                </div>
                <div class="opp-resource-item">
                    <img src="resources/other/Treasure.png" class="resource-icon-tiny">
                    <span>${treasuresCount}</span>
                </div>
                <!-- Row 2: Inns, Destroyed (centered) -->
                <div class="opp-resource-item">
                    <img src="resources/other/Inn.png" class="resource-icon-tiny">
                    <span>${innsCount}</span>
                </div>
                <div class="opp-resource-item">
                    <img src="resources/other/Destroyed_Inn.png" class="resource-icon-tiny">
                    <span>${destroyedInnsCount}</span>
                </div>
            </div>
        `;
    }

    shouldShowAICharacters() {
        // Show AI characters only after human has selected (game started)
        const humanPlayer = this.game.players[0];
        return humanPlayer && humanPlayer.character !== null && this.game.phase !== 'character-selection';
    }

    highlightCurrentPlayer() {
        // Remove highlights
        if (this.elements.userPane) {
            this.elements.userPane.classList.remove('current-player-highlight');
        }
        document.querySelectorAll('.opponent-panel').forEach(p => {
            p.classList.remove('current-turn');
        });

        // Add highlight to current player
        const currentPlayer = this.game.players[this.game.currentPlayerIndex];
        if (currentPlayer) {
            if (currentPlayer.id === 0) {
                this.elements.userPane.classList.add('current-player-highlight');
            } else {
                const panel = document.getElementById(`opponent-${currentPlayer.id}`);
                if (panel) panel.classList.add('current-turn');
            }
        }
    }

    updateActionButtons() {
        const player = this.game.players[this.game.currentPlayerIndex];
        const isHumanTurn = !player.isAI && this.game.phase === 'investment';

        // Invest in Guild
        const investGuildBtn = document.querySelector('[data-action="invest-guild"]');
        if (investGuildBtn) {
            const maxInvestments = (player.character && player.character.additionalInvestment) ? 3 : 2;
            const canInvestInGuild = player.investmentsThisTurn < maxInvestments &&
                player.guildInvestmentsThisTurn < 2;
            const canInvestGuildFree = player.character && player.character.firstInvestmentFree &&
                player.reserve >= 1;
            const hasCoinsForGuild = canInvestGuildFree || player.coins >= 2;
            investGuildBtn.disabled = !isHumanTurn || !hasCoinsForGuild || !canInvestInGuild;
        }

        // Invest in Expedition
        const investExpeditionBtn = document.querySelector('[data-action="invest-expedition"]');
        if (investExpeditionBtn) {
            const maxInvestments = (player.character && player.character.additionalInvestment) ? 3 : 2;
            const canInvestExpeditionFree = player.character && player.character.freeExpeditionInvestment &&
                this.game.expedition.investments.length === 0;
            const hasCoinsForExpedition = canInvestExpeditionFree || player.coins >= 2;
            const canInvestInExpedition = player.investmentsThisTurn < maxInvestments &&
                player.expeditionInvestmentsThisTurn < 2;
            investExpeditionBtn.disabled = !isHumanTurn || !hasCoinsForExpedition ||
                this.game.expedition.investments.length >= 4 || !canInvestInExpedition;
        }

        // Buy Land
        const buyLandBtn = document.querySelector('[data-action="buy-land"]');
        if (buyLandBtn) {
            buyLandBtn.disabled = !isHumanTurn || player.coins < 2;
        }

        // Cultivate Land - disabled if no uncultivated lands or not enough coins (unless free cultivate available)
        const cultivateLandBtn = document.querySelector('[data-action="cultivate-land"]');
        if (cultivateLandBtn) {
            const uncultivatedCount = player.getUncultivatedLandIndices().length;
            const hasUncultivatedLands = uncultivatedCount > 0;
            // Peasant can cultivate for free once per turn
            const canCultivateFree = player.character && player.character.freeCultivatePerTurn && !player.usedFreeCultivate;
            const hasCoinsOrFree = canCultivateFree || player.coins >= 1;
            cultivateLandBtn.disabled = !isHumanTurn || !hasCoinsOrFree || !hasUncultivatedLands;
        }

        // Build Inn
        const buildInnBtn = document.querySelector('[data-action="build-inn"]');
        if (buildInnBtn) {
            const innCost = player.character && player.character.innCost ? player.character.innCost : 6;
            buildInnBtn.disabled = !isHumanTurn || player.coins < innCost || player.lands.length === 0;
        }

        // Repair Inn
        const repairInnBtn = document.querySelector('[data-action="repair-inn"]');
        if (repairInnBtn) {
            repairInnBtn.disabled = !isHumanTurn || player.coins < 1 ||
                player.getDestroyedInnIndices().length === 0;
        }

        // End Turn
        const endTurnBtn = document.querySelector('[data-action="end-turn"]');
        if (endTurnBtn) {
            endTurnBtn.disabled = !isHumanTurn;
        }

        // Character abilities
        this.updateCharacterAbilityButtons(player, isHumanTurn);
    }

    updateCharacterAbilityButtons(player, isHumanTurn) {
        // Mutiny (Mercenary)
        const mutinyBtn = document.querySelector('[data-action="cause-mutiny"]');
        if (mutinyBtn) {
            if (player.character && player.character.id === 'mercenary') {
                mutinyBtn.classList.remove('hidden');
                mutinyBtn.disabled = !isHumanTurn || player.coins < 1 ||
                    (player.usedMutinyAbility || false) ||
                    !this.game.activeGuilds.some(g => g.investments.some(inv => inv.playerId === player.id));
            } else {
                mutinyBtn.classList.add('hidden');
            }
        }

        // Buy Treasure (Artisan)
        const buyTreasureBtn = document.querySelector('[data-action="buy-treasure"]');
        if (buyTreasureBtn) {
            if (player.character && player.character.id === 'artisan') {
                buyTreasureBtn.classList.remove('hidden');
                buyTreasureBtn.disabled = !isHumanTurn || player.coins < 4 || player.usedArtisanTreasureAbility;
            } else {
                buyTreasureBtn.classList.add('hidden');
            }
        }

        // Sell Treasure (Artisan)
        const sellTreasureBtn = document.querySelector('[data-action="sell-treasure-artisan"]');
        if (sellTreasureBtn) {
            if (player.character && player.character.id === 'artisan') {
                sellTreasureBtn.classList.remove('hidden');
                sellTreasureBtn.disabled = !isHumanTurn || player.usedArtisanTreasureAbility || player.treasures.length === 0;
            } else {
                sellTreasureBtn.classList.add('hidden');
            }
        }
    }

    updateEventDeckCount() {
        // Deck count indicator removed - just handle opacity
        if (this.elements.currentEventCard) {
            const deckCount = this.game.eventDeck ? this.game.eventDeck.length : 0;
            if (deckCount === 0) {
                this.elements.currentEventCard.style.opacity = '0.5';
            } else {
                this.elements.currentEventCard.style.opacity = '1';
            }
        }
    }

    // ==========================================
    // Selection Modals
    // ==========================================

    showGuildSelection(purpose) {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <span class="modal-title">Selecciona un Gremio</span>
                    <button class="modal-close">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="guild-selection-grid"></div>
                </div>
            </div>
        `;

        const grid = modal.querySelector('.guild-selection-grid');
        const player = this.game.players[0];

        this.game.activeGuilds.forEach(guild => {
            const canInvest = this.canInvestInGuild(player, guild);

            const item = document.createElement('div');
            item.className = 'guild-selection-item';
            item.style.backgroundImage = `url('resources/guilds/${this.getGuildImageName(guild.number)}.png')`;
            item.dataset.guildNumber = guild.number;

            if (!canInvest) {
                item.style.opacity = '0.5';
                item.style.pointerEvents = 'none';
            }

            item.addEventListener('click', () => {
                if (this.game.investInGuild(player, guild.number)) {
                    this.updateGameState();
                }
                modal.remove();
            });

            grid.appendChild(item);
        });

        modal.querySelector('.modal-close').addEventListener('click', () => modal.remove());
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.remove();
        });

        document.body.appendChild(modal);
    }

    canInvestInGuild(player, guild) {
        if (guild.blocked) return false;
        if (guild.investments.length >= 4) return false;

        // Check for free investment ability
        const canInvestFree = player.character && player.character.firstInvestmentFree &&
            player.reserve >= 1 &&
            player.character.firstInvestmentFree.includes(guild.number) &&
            guild.investments.filter(inv => inv.playerId === player.id).length === 0;

        return canInvestFree || player.coins >= 2;
    }

    getGuildImageName(number) {
        const guildNames = {
            2: 'Church', 3: 'Blacksmith', 4: 'Quarry', 5: 'Port', 6: 'Farm',
            8: 'Tavern', 9: 'Market', 10: 'Sawmill', 11: 'Jewelers', 12: 'Monastery'
        };
        return guildNames[number] || 'unknown';
    }

    selectLandToCultivate(player) {
        const indices = player.getUncultivatedLandIndices();
        if (indices.length === 1) {
            this.game.cultivateLand(player, indices[0]);
            this.updateGameState();
        } else if (indices.length > 1) {
            this.showSelectionModal('Cultivar Tierra', indices.length, (index) => {
                this.game.cultivateLand(player, indices[index]);
                this.updateGameState();
            });
        }
    }

    selectLandForInn(player) {
        const landIndices = player.lands.map((_, i) => i);
        if (landIndices.length === 1) {
            this.game.buildInn(player, 0);
            this.updateGameState();
        } else if (landIndices.length > 1) {
            this.showSelectionModal('Construir Posada', landIndices.length, (index) => {
                this.game.buildInn(player, index);
                this.updateGameState();
            });
        }
    }

    selectInnToRepair(player) {
        const indices = player.getDestroyedInnIndices();
        if (indices.length === 1) {
            this.game.repairInn(player, indices[0]);
            this.updateGameState();
        } else if (indices.length > 1) {
            this.showSelectionModal('Reparar Posada', indices.length, (index) => {
                this.game.repairInn(player, indices[index]);
                this.updateGameState();
            });
        }
    }

    showSelectionModal(title, count, callback) {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <span class="modal-title">${title}</span>
                    <button class="modal-close">&times;</button>
                </div>
                <div class="modal-body">
                    <p>Selecciona cual (${count} disponibles):</p>
                    <div class="selection-buttons"></div>
                </div>
            </div>
        `;

        const buttonsDiv = modal.querySelector('.selection-buttons');
        for (let i = 0; i < count; i++) {
            const btn = document.createElement('button');
            btn.className = 'action-btn';
            btn.textContent = `#${i + 1}`;
            btn.style.margin = '5px';
            btn.style.padding = '10px 20px';
            btn.addEventListener('click', () => {
                callback(i);
                modal.remove();
            });
            buttonsDiv.appendChild(btn);
        }

        modal.querySelector('.modal-close').addEventListener('click', () => modal.remove());
        document.body.appendChild(modal);
    }

    showMutinyGuildSelection() {
        const player = this.game.players[0];
        const eligibleGuilds = this.game.activeGuilds.filter(g =>
            g.investments.some(inv => inv.playerId === player.id)
        );

        if (eligibleGuilds.length === 0) return;

        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <span class="modal-title">Provocar Motin</span>
                    <button class="modal-close">&times;</button>
                </div>
                <div class="modal-body">
                    <p>Selecciona gremio para retirar inversion:</p>
                    <div class="guild-selection-grid"></div>
                </div>
            </div>
        `;

        const grid = modal.querySelector('.guild-selection-grid');

        eligibleGuilds.forEach(guild => {
            const item = document.createElement('div');
            item.className = 'guild-selection-item';
            item.style.backgroundImage = `url('resources/guilds/${this.getGuildImageName(guild.number)}.png')`;

            item.addEventListener('click', () => {
                if (this.game.causeMutiny && this.game.causeMutiny(player, guild.number)) {
                    this.updateGameState();
                }
                modal.remove();
            });

            grid.appendChild(item);
        });

        modal.querySelector('.modal-close').addEventListener('click', () => modal.remove());
        document.body.appendChild(modal);
    }

    showTreasureSellSelection() {
        const player = this.game.players[0];
        if (player.treasures.length === 0) return;

        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <span class="modal-title">Vender Tesoro</span>
                    <button class="modal-close">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="selection-buttons"></div>
                </div>
            </div>
        `;

        const buttonsDiv = modal.querySelector('.selection-buttons');
        player.treasures.forEach((treasure, index) => {
            const btn = document.createElement('button');
            btn.className = 'action-btn';
            btn.style.margin = '5px';
            btn.style.padding = '10px';

            let label = treasure.type === 'WEALTH' ? `${treasure.coinValue} monedas` : `${treasure.vp} VP`;
            btn.textContent = label;

            btn.addEventListener('click', () => {
                if (this.game.sellTreasureArtisan && this.game.sellTreasureArtisan(player, index)) {
                    this.updateGameState();
                }
                modal.remove();
            });

            buttonsDiv.appendChild(btn);
        });

        modal.querySelector('.modal-close').addEventListener('click', () => modal.remove());
        document.body.appendChild(modal);
    }

    // ==========================================
    // Character Modal
    // ==========================================

    /**
     * Show a modal with character image in higher resolution
     * @param {Object} character - Character object with id, nameES
     * @param {Object} options - { showSelectButton: boolean, onSelect: function, onCancel: function }
     */
    showCharacterModal(character, options = {}) {
        const { showSelectButton = false, onSelect = null, onCancel = null } = options;

        const imagePath = typeof getCharacterImagePath === 'function'
            ? getCharacterImagePath(character.id)
            : `resources/characters/${character.id}.png`;

        const modal = document.createElement('div');
        modal.className = 'modal-overlay character-modal-overlay';
        modal.innerHTML = `
            <div class="character-modal-content">
                <div class="character-modal-header">${character.nameES}</div>
                <div class="character-modal-image-container">
                    <img src="${imagePath}" alt="${character.nameES}" class="character-modal-image">
                </div>
                <div class="character-modal-buttons">
                    ${showSelectButton ? '<button class="character-modal-btn select-btn">Seleccionar</button>' : ''}
                    <button class="character-modal-btn cancel-btn">${showSelectButton ? 'Cancelar' : 'Cerrar'}</button>
                </div>
            </div>
        `;

        // Select button handler
        if (showSelectButton && onSelect) {
            modal.querySelector('.select-btn')?.addEventListener('click', () => {
                modal.remove();
                onSelect();
            });
        }

        // Cancel/Close button handler
        modal.querySelector('.cancel-btn').addEventListener('click', () => {
            modal.remove();
            if (onCancel) onCancel();
        });

        // Close on overlay click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
                if (onCancel) onCancel();
            }
        });

        document.body.appendChild(modal);
    }

    // ==========================================
    // Character Selection
    // ==========================================

    showCharacterSelection() {
        const selectedCharacterIds = [];

        // AI players select characters FIRST
        for (let i = 1; i < this.game.numPlayers; i++) {
            const aiPlayer = this.game.players[i];
            if (aiPlayer.aiController && typeof getTwoRandomCharacters === 'function') {
                const aiOptions = getTwoRandomCharacters(selectedCharacterIds);
                const selected = aiPlayer.aiController.selectCharacter(aiOptions);
                aiPlayer.setCharacter(selected);
                selectedCharacterIds.push(selected.id);
            }
        }

        // Human player gets options excluding AI selections
        const characters = typeof getTwoRandomCharacters === 'function'
            ? getTwoRandomCharacters(selectedCharacterIds)
            : [];

        if (characters.length === 0) return;

        // Enter character selection phase
        document.body.classList.add('character-selection-phase');
        document.body.classList.remove('menu-active');

        // Update opponent displays to show their characters (if not Hard mode)
        this.updateOpponentsForCharacterSelection();

        // Show initial guilds on the board
        this.updateGuildsDisplay();

        // Get user pane and hide normal game content
        const userPane = document.getElementById('user-pane');
        const resourceHud = userPane?.querySelector('.resource-hud');
        const actionsGrid = userPane?.querySelector('.actions-grid');
        const endTurnBtn = userPane?.querySelector('.btn-end-turn');
        if (resourceHud) resourceHud.style.display = 'none';
        if (actionsGrid) actionsGrid.style.display = 'none';
        if (endTurnBtn) endTurnBtn.style.display = 'none';

        // Create character selection container in user pane
        let selectionContainer = userPane?.querySelector('.character-selection-container');
        if (!selectionContainer) {
            selectionContainer = document.createElement('div');
            selectionContainer.className = 'character-selection-container';
            userPane?.appendChild(selectionContainer);
        }

        selectionContainer.innerHTML = `
            <div class="character-selection-header">Elige tu Personaje</div>
            <div class="character-selection-grid-inline"></div>
        `;

        const grid = selectionContainer.querySelector('.character-selection-grid-inline');

        characters.forEach(char => {
            const option = document.createElement('div');
            option.className = 'character-option-inline';

            const imagePath = typeof getCharacterImagePath === 'function'
                ? getCharacterImagePath(char.id)
                : `resources/characters/${char.id}.png`;

            option.innerHTML = `
                <img src="${imagePath}" alt="${char.nameES}">
                <div class="character-name-inline">${char.nameES}</div>
            `;

            option.addEventListener('click', () => {
                // Show character modal with select/cancel buttons
                this.showCharacterModal(char, {
                    showSelectButton: true,
                    onSelect: () => {
                        this.game.players[0].setCharacter(char);

                        // Remove character selection container
                        selectionContainer.remove();

                        // Restore normal user pane content
                        if (resourceHud) resourceHud.style.display = '';
                        if (actionsGrid) actionsGrid.style.display = '';
                        if (endTurnBtn) endTurnBtn.style.display = '';

                        // Exit character selection phase
                        document.body.classList.remove('character-selection-phase');

                        // Restore opponent panels before updating game state
                        this.restoreOpponentPanels();

                        // Start game if all characters selected
                        if (this.game.phase === 'character-selection') {
                            this.game.startGame();
                        }
                        this.updateGameState();
                    }
                });
            });

            grid.appendChild(option);
        });
    }

    /**
     * Update opponent displays during character selection phase
     * Shows AI characters with images on Easy/Medium, hides them on Hard
     */
    updateOpponentsForCharacterSelection() {
        const showCharacters = this.game.aiDifficulty !== 'hard';

        this.game.players.slice(1).forEach((player, index) => {
            const panel = document.getElementById(`opponent-${index + 1}`);
            if (!panel) return;

            // Store original content for later restoration
            if (!panel.dataset.originalContent) {
                panel.dataset.originalContent = panel.innerHTML;
            }

            if (showCharacters && player.character) {
                const imagePath = typeof getCharacterImagePath === 'function'
                    ? getCharacterImagePath(player.character.id)
                    : `resources/characters/${player.character.id}.png`;

                panel.innerHTML = `
                    <div class="opponent-character-selection">
                        <img src="${imagePath}" alt="${player.character.nameES}" class="opponent-character-img">
                        <div class="opponent-character-label">${player.name}: ${player.character.nameES}</div>
                    </div>
                `;

                // Add click handler to show character modal (view only)
                panel.style.cursor = 'pointer';
                panel.onclick = () => {
                    this.showCharacterModal(player.character, { showSelectButton: false });
                };
            } else {
                panel.innerHTML = `
                    <div class="opponent-character-selection">
                        <div class="opponent-character-hidden">?</div>
                        <div class="opponent-character-label">${player.name}: ???</div>
                    </div>
                `;
                panel.style.cursor = 'default';
                panel.onclick = null;
            }
        });
    }

    /**
     * Restore opponent panels to normal display after character selection
     */
    restoreOpponentPanels() {
        this.game.players.slice(1).forEach((player, index) => {
            const panel = document.getElementById(`opponent-${index + 1}`);
            if (!panel) return;

            if (panel.dataset.originalContent) {
                panel.innerHTML = panel.dataset.originalContent;
                delete panel.dataset.originalContent;
            }
        });
    }

    // ==========================================
    // Dice Display
    // ==========================================

    showDiceRoll(die1, die2, sum) {
        this.updateDiceDisplay(die1, die2, sum);
    }

    updateDiceDisplay(die1, die2, sum) {
        const diceArea = document.getElementById('dice-area');
        const die1Container = document.getElementById('die1-container');
        const die2Container = document.getElementById('die2-container');
        const die1Element = document.getElementById('die1');
        const die2Element = document.getElementById('die2');

        if (!diceArea || !die1Container || !die2Container) return;

        // Map die values to 3D rotation angles
        const rotations = {
            1: 'rotateX(0deg) rotateY(0deg)',
            2: 'rotateX(0deg) rotateY(-90deg)',
            3: 'rotateX(0deg) rotateY(-180deg)',
            4: 'rotateX(0deg) rotateY(90deg)',
            5: 'rotateX(-90deg) rotateY(0deg)',
            6: 'rotateX(90deg) rotateY(0deg)'
        };

        // Reset inline transforms to allow animation to work
        if (die1Element) die1Element.style.transform = '';
        if (die2Element) die2Element.style.transform = '';

        // Force browser reflow
        void die1Element?.offsetHeight;

        // Move dice to center and start rolling animation
        diceArea.classList.add('centered', 'rolling');
        die1Container.classList.add('rolling');
        die2Container.classList.add('rolling');

        const rollDuration = 1500; // 1.5 seconds rolling
        const displayDuration = 1000; // 1 second showing result in center

        // After rolling animation completes, show final result
        setTimeout(() => {
            // Remove rolling animation
            die1Container.classList.remove('rolling');
            die2Container.classList.remove('rolling');
            diceArea.classList.remove('rolling');

            // Rotate cubes to show the correct face
            if (die1Element) die1Element.style.transform = rotations[die1];
            if (die2Element) die2Element.style.transform = rotations[die2];

            // After displaying result in center, move back to corner
            setTimeout(() => {
                diceArea.classList.remove('centered');
            }, displayDuration);
        }, rollDuration);
    }

    // ==========================================
    // Character Detail
    // ==========================================

    showCharacterDetail(character) {
        // Use the unified character modal
        this.showCharacterModal(character, { showSelectButton: false });
    }

    // ==========================================
    // Event Display
    // ==========================================

    showEventModal(event) {
        // Log the event
        this.addLogMessage(`Evento: ${event.name || event.id}`, 'event');

        const modal = document.getElementById('event-modal');
        const card = document.getElementById('event-modal-card');
        const frontCard = card?.querySelector('.event-card-front');

        if (!modal || !card || !frontCard) {
            // Fallback if modal elements don't exist
            console.log('Event modal elements not found');
            return;
        }

        // Set the front card image
        const bgImage = this.getEventImagePath(event);
        frontCard.style.backgroundImage = `url('${bgImage}')`;

        // Reset and show
        card.classList.remove('flipped');
        modal.classList.remove('hidden');

        // Start flip animation
        setTimeout(() => card.classList.add('flipped'), 100);

        // Hide after animation completes and update last played event
        setTimeout(() => {
            modal.classList.add('hidden');
            card.classList.remove('flipped');
            // Update the discarded event display
            this.updateLastPlayedEvent(event);
        }, 3500);
    }

    updateEventDisplay(event) {
        // Update current event card display - always show deck back
        if (this.elements.currentEventCard) {
            this.elements.currentEventCard.style.backgroundImage = `url('resources/other/Event_Back.png')`;
            this.elements.currentEventCard.style.backgroundSize = 'cover';
        }
    }

    updateLastPlayedEvent(event) {
        const prevCard = document.getElementById('previous-event-card');
        if (!prevCard) return;

        // Skip guild foundation events - find last non-guild event
        let displayEvent = event;
        if (event && event.type === 'guild_foundation') {
            // Look for the last non-guild event in the discard pile
            if (this.game.eventDiscard && this.game.eventDiscard.length > 0) {
                for (let i = this.game.eventDiscard.length - 1; i >= 0; i--) {
                    if (this.game.eventDiscard[i].type !== 'guild_foundation') {
                        displayEvent = this.game.eventDiscard[i];
                        break;
                    }
                }
            }
        }

        if (displayEvent && displayEvent.type !== 'guild_foundation') {
            const imagePath = this.getEventImagePath(displayEvent);
            prevCard.style.backgroundImage = `url('${imagePath}')`;
            prevCard.style.backgroundSize = 'cover';
            prevCard.classList.remove('hidden');
        } else {
            prevCard.classList.add('hidden');
        }
    }

    getEventImagePath(event) {
        if (!event) return 'resources/other/Event_Back.png';

        // Handle guild foundations
        if (event.type === 'guild_foundation' && event.guildNumber) {
            const guildName = this.getGuildImageName(event.guildNumber);
            return `resources/guilds/${guildName}.png`;
        }

        // Blocking events mapping (CamelCase filenames in blocking_events folder)
        const blockingEventImages = {
            'plague': 'resources/blocking_events/Plague.png',
            'famine': 'resources/blocking_events/Famine.png',
            'trade_blockade': 'resources/blocking_events/TradeBlock.png',
            'mine_collapse': 'resources/blocking_events/MineCollapse.png',
            'material_shortage': 'resources/blocking_events/ResourcesOutage.png'
        };

        // Check if it's a blocking event
        if (event.id && blockingEventImages[event.id]) {
            return blockingEventImages[event.id];
        }

        // Handle action events (lowercase filenames)
        if (event.id) {
            return `resources/action_events/${event.id}.png`;
        }

        return 'resources/other/Event_Back.png';
    }

    showReshuffleAnimation(callback) {
        // Show brief reshuffle message
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        overlay.innerHTML = `
            <div class="modal-content" style="text-align: center;">
                <h3 style="color: var(--color-antique-gold);">Barajando eventos...</h3>
            </div>
        `;

        document.body.appendChild(overlay);

        setTimeout(() => {
            overlay.remove();
            if (callback) callback();
        }, 1500);
    }

    showGovernorEventChoice() {
        // Governor ability - choose between two events
        if (this.game.eventDeck.length < 2) {
            this.game.drawAndApplyEvent();
            this.game.phase = 'roll';
            setTimeout(() => this.game.nextPhase(), 1500);
            return;
        }

        const event1 = this.game.eventDeck[this.game.eventDeck.length - 1];
        const event2 = this.game.eventDeck[this.game.eventDeck.length - 2];

        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <span class="modal-title">Gobernador: Elige Evento</span>
                </div>
                <div class="modal-body">
                    <div style="display: flex; gap: 10px; justify-content: center;">
                        <div class="event-option" data-index="0" style="cursor: pointer; padding: 10px; border: 2px solid transparent; border-radius: 8px;">
                            <div style="width: 100px; height: 140px; background-image: url('${this.getEventImagePath(event1)}'); background-size: cover; border-radius: 4px;"></div>
                            <p style="text-align: center; margin-top: 5px; font-size: 12px;">${event1.name || event1.id}</p>
                        </div>
                        <div class="event-option" data-index="1" style="cursor: pointer; padding: 10px; border: 2px solid transparent; border-radius: 8px;">
                            <div style="width: 100px; height: 140px; background-image: url('${this.getEventImagePath(event2)}'); background-size: cover; border-radius: 4px;"></div>
                            <p style="text-align: center; margin-top: 5px; font-size: 12px;">${event2.name || event2.id}</p>
                        </div>
                    </div>
                </div>
            </div>
        `;

        modal.querySelectorAll('.event-option').forEach(option => {
            option.addEventListener('click', () => {
                const index = parseInt(option.dataset.index);
                // Remove the non-selected event from deck
                if (index === 0) {
                    // Keep event1, remove event2
                    this.game.eventDeck.splice(this.game.eventDeck.length - 2, 1);
                } else {
                    // Keep event2, remove event1
                    this.game.eventDeck.pop();
                }

                modal.remove();

                // Now draw and apply the chosen event
                this.game.drawAndApplyEvent();
                this.game.phase = 'roll';
                setTimeout(() => this.game.nextPhase(), 1500);
            });

            // Hover effect
            option.addEventListener('mouseenter', () => {
                option.style.borderColor = 'var(--color-antique-gold)';
            });
            option.addEventListener('mouseleave', () => {
                option.style.borderColor = 'transparent';
            });
        });

        document.body.appendChild(modal);
    }

    // ==========================================
    // Game Over
    // ==========================================

    showGameOver(winner) {
        const scores = this.game.players
            .map(p => ({ name: p.name, vp: p.getVictoryPoints(this.game, true) }))
            .sort((a, b) => b.vp - a.vp);

        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <span class="modal-title">Fin del Juego</span>
                </div>
                <div class="modal-body">
                    <h3 style="color: var(--color-antique-gold); text-align: center;">
                        ${winner.name} gana!
                    </h3>
                    <div style="margin-top: 20px;">
                        ${scores.map((s, i) => `
                            <p style="font-size: 1.1em; margin: 10px 0;">
                                ${i + 1}. ${s.name}: <strong>${s.vp} VP</strong>
                            </p>
                        `).join('')}
                    </div>
                    <button id="new-game-btn" class="action-btn btn-end-turn" style="margin-top: 20px; width: 100%;">
                        Nuevo Juego
                    </button>
                </div>
            </div>
        `;

        modal.querySelector('#new-game-btn').addEventListener('click', () => {
            window.location.reload();
        });

        document.body.appendChild(modal);
    }

    // ==========================================
    // Bottom Button Handlers
    // ==========================================

    toggleFullscreen() {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(err => {
                console.log('Fullscreen not supported:', err);
            });
        } else {
            document.exitFullscreen();
        }
    }

    showHelpModal() {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <span class="modal-title">Ayuda</span>
                    <button class="modal-close">&times;</button>
                </div>
                <div class="modal-body">
                    <h4 style="color: var(--color-antique-gold);">Controles</h4>
                    <ul style="margin: 10px 0; padding-left: 20px;">
                        <li>Doble toque en gremio = Invertir</li>
                        <li>Pellizco = Zoom del tablero</li>
                        <li>Arrastrar = Mover tablero (cuando hay zoom)</li>
                        <li>Doble toque en tablero = Resetear zoom</li>
                    </ul>

                    <h4 style="color: var(--color-antique-gold); margin-top: 15px;">Registro del Juego</h4>
                    <div class="game-log-container">
                        ${this.logMessages.length > 0
                ? this.logMessages.slice(-20).map(msg =>
                    `<div class="log-message">${msg}</div>`
                ).join('')
                : '<p style="color: var(--color-text-muted);">No hay mensajes aun</p>'
            }
                    </div>
                </div>
            </div>
        `;

        modal.querySelector('.modal-close').addEventListener('click', () => modal.remove());
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.remove();
        });

        document.body.appendChild(modal);
    }

    exitGame() {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.id = 'exit-confirmation-modal';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 280px;">
                <div class="modal-header">
                    <span class="modal-title">Salir del Juego</span>
                </div>
                <div class="modal-body" style="text-align: center;">
                    <p>¿Seguro que quieres salir del juego?</p>
                    <div style="display: flex; gap: 10px; margin-top: 15px;">
                        <button class="action-btn" id="confirm-exit" style="flex: 1;">Salir</button>
                        <button class="action-btn" id="cancel-exit" style="flex: 1;">Cancelar</button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        modal.querySelector('#confirm-exit').onclick = () => {
            modal.remove();
            // Remove any game-related body classes
            document.body.classList.remove('character-selection-phase');
            document.body.classList.add('menu-active');
            window.menuInstance.showMainMenu();
        };

        modal.querySelector('#cancel-exit').onclick = () => modal.remove();
        modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
    }

    // ==========================================
    // Logging (stored in memory)
    // ==========================================

    addLogMessage(message, type = 'info') {
        this.logMessages.push(message);
        // Keep last 100 messages
        if (this.logMessages.length > 100) {
            this.logMessages.shift();
        }
    }
}

// Alias for compatibility
const PortraitUI = PortraitUIController;

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PortraitUIController;
}
