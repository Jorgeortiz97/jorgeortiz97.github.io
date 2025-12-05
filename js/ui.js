// UI Controller for Gremios

class UIController {
    constructor(game) {
        this.game = game;
        game.ui = this;

        // Double-tap tracking
        this.lastTapTime = 0;
        this.lastTapTarget = null;
        this.doubleTapDelay = 300; // milliseconds

        // Cache DOM elements
        this.elements = {
            guildsGrid: document.getElementById('guilds-grid'),
            currentEventCard: document.getElementById('current-event-card'),
            previousEventCard: document.getElementById('previous-event-card'),
            expeditionCard: document.getElementById('expedition-card'),
            playerHuman: document.getElementById('player-human'),
            aiPlayer1: document.getElementById('ai-player-1'),
            aiPlayer2: document.getElementById('ai-player-2'),
            die1: document.getElementById('die1'),
            die2: document.getElementById('die2'),
            diceSum: document.getElementById('dice-sum'),
            gameLog: document.getElementById('game-log'),
            gameLogSection: document.getElementById('game-log-section'),
            toggleLogBtn: document.getElementById('toggle-log-btn'),
            logMessages: document.getElementById('log-messages'),
            characterModal: document.getElementById('character-modal'),
            characterOptions: document.getElementById('character-options'),
            guildModal: document.getElementById('guild-modal'),
            guildOptions: document.getElementById('guild-options'),
            gameOverModal: document.getElementById('game-over-modal'),
            finalScores: document.getElementById('final-scores'),
            selectCharacterBtn: document.getElementById('select-character-btn'),
            newGameBtn: document.getElementById('new-game-btn'),
            cancelGuildBtn: document.getElementById('cancel-guild-btn')
        };

        // Bind event listeners
        this.bindEvents();
    }

    bindEvents() {
        // Only bind events once to avoid duplicates
        if (this.eventsBound) return;
        this.eventsBound = true;

        // Action buttons - use event delegation to avoid multiple listeners
        // Listen on the parent section to catch all action buttons
        const humanSection = document.getElementById('human-column');
        humanSection.addEventListener('click', (e) => {
            // Use closest() to handle clicks on child elements (like spans inside buttons)
            const actionBtn = e.target.closest('.action-btn');
            if (actionBtn) {
                // Create a new event object with the button as the target
                const buttonEvent = { ...e, target: actionBtn };
                this.handleActionClick(buttonEvent);
            }
        });

        // Character selection
        this.elements.selectCharacterBtn.addEventListener('click', () => {
            this.showCharacterSelection();
        });

        // New game
        this.elements.newGameBtn.addEventListener('click', () => {
            window.location.reload();
        });

        // Cancel guild selection
        this.elements.cancelGuildBtn.addEventListener('click', () => {
            this.hideGuildModal();
        });

        // Toggle game log
        this.elements.toggleLogBtn.addEventListener('click', () => {
            this.toggleGameLog();
        });

    }

    toggleGameLog() {
        const isCollapsed = this.elements.gameLogSection.classList.toggle('collapsed');
        this.elements.toggleLogBtn.textContent = isCollapsed ? '▲ Mostrar Registro' : '▼ Ocultar Registro';
    }

    setupDragAndDrop() {
        // This will be called after rendering guilds
        this.setupGuildDropZones();
        this.setupExpeditionDropZone();
    }

    setupGuildDropZones() {
        const guilds = document.querySelectorAll('.guild-card');
        guilds.forEach(guild => {
            guild.addEventListener('dragover', (e) => this.handleDragOver(e));
            guild.addEventListener('dragleave', (e) => this.handleDragLeave(e));
            guild.addEventListener('drop', (e) => this.handleDropOnGuild(e));

            // Add double-click handler for desktop
            guild.addEventListener('dblclick', (e) => this.handleGuildDoubleClick(e));

            // Add touch handler for mobile double-tap
            guild.addEventListener('click', (e) => this.handleGuildClick(e));
        });
    }

    setupExpeditionDropZone() {
        const expedition = document.getElementById('expedition-card');
        if (!expedition) return; // Safety check

        expedition.addEventListener('dragover', (e) => this.handleDragOver(e));
        expedition.addEventListener('dragleave', (e) => this.handleDragLeave(e));
        expedition.addEventListener('drop', (e) => this.handleDropOnExpedition(e));

        // Add double-click handler for desktop
        expedition.addEventListener('dblclick', (e) => this.handleExpeditionDoubleClick(e));

        // Add touch handler for mobile double-tap
        expedition.addEventListener('click', (e) => this.handleExpeditionClick(e));
    }

    handleDragStart(e) {
        const player = this.game.players[this.game.currentPlayerIndex];

        // Only allow dragging during investment phase and if it's human player's turn
        if (player.isAI || this.game.phase !== 'investment') {
            e.preventDefault();
            return;
        }

        e.target.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/html', e.target.innerHTML);
    }

    handleDragEnd(e) {
        e.target.classList.remove('dragging');
    }

    handleDragOver(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';

        const target = e.currentTarget;
        if (!target.classList.contains('drag-over')) {
            target.classList.add('drag-over');
        }

        return false;
    }

    handleDragLeave(e) {
        e.currentTarget.classList.remove('drag-over');
    }

    // ============================================
    // TOUCH EVENT HANDLERS FOR MOBILE
    // ============================================

    handleTouchStart(e) {
        const player = this.game.players[this.game.currentPlayerIndex];

        // Only allow dragging during investment phase and if it's human player's turn
        if (player.isAI || this.game.phase !== 'investment') {
            return;
        }

        e.preventDefault(); // Prevent scrolling

        this.touchedCoin = e.target;
        this.touchedCoin.classList.add('dragging');

        // Store the initial touch position
        const touch = e.touches[0];
        this.touchStartX = touch.clientX;
        this.touchStartY = touch.clientY;

        // Create a clone for visual feedback
        this.coinClone = this.touchedCoin.cloneNode(true);
        this.coinClone.style.position = 'fixed';
        this.coinClone.style.pointerEvents = 'none';
        this.coinClone.style.zIndex = '10000';
        this.coinClone.style.opacity = '0.8';
        this.coinClone.style.transform = 'scale(1.2)';
        this.coinClone.style.left = touch.clientX + 'px';
        this.coinClone.style.top = touch.clientY + 'px';
        document.body.appendChild(this.coinClone);
    }

    handleTouchMove(e) {
        if (!this.touchedCoin) return;

        e.preventDefault(); // Prevent scrolling

        const touch = e.touches[0];

        // Move the clone with the finger
        if (this.coinClone) {
            this.coinClone.style.left = (touch.clientX - 20) + 'px';
            this.coinClone.style.top = (touch.clientY - 20) + 'px';
        }

        // Find the element under the touch
        const elementUnderTouch = document.elementFromPoint(touch.clientX, touch.clientY);

        // Remove drag-over from all possible drop zones
        document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));

        // Add drag-over to the current drop zone
        if (elementUnderTouch) {
            const dropZone = elementUnderTouch.closest('.guild-card, #expedition-card');
            if (dropZone) {
                dropZone.classList.add('drag-over');
                this.currentDropZone = dropZone;
            } else {
                this.currentDropZone = null;
            }
        }
    }

    handleTouchEnd(e) {
        if (!this.touchedCoin) return;

        e.preventDefault();

        // Remove the clone
        if (this.coinClone) {
            this.coinClone.remove();
            this.coinClone = null;
        }

        // Remove dragging class
        this.touchedCoin.classList.remove('dragging');

        // Remove drag-over from all elements
        document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));

        // Process the drop if we're over a valid drop zone
        if (this.currentDropZone) {
            const player = this.game.players[0]; // Human player

            if (this.currentDropZone.classList.contains('guild-card')) {
                // Drop on guild
                const guildNumber = parseInt(this.currentDropZone.dataset.guildNumber);
                if (this.game.investInGuild(player, guildNumber)) {
                    this.updateGameState();
                }
            } else if (this.currentDropZone.id === 'expedition-card') {
                // Drop on expedition
                if (this.game.investInExpedition(player)) {
                    this.updateGameState();
                }
            }
        }

        // Reset touch tracking
        this.touchedCoin = null;
        this.currentDropZone = null;
    }

    handleDropOnGuild(e) {
        e.stopPropagation();
        e.preventDefault();

        const guildCard = e.currentTarget;
        guildCard.classList.remove('drag-over');

        const guildNumber = parseInt(guildCard.dataset.guildNumber);
        const player = this.game.players[0]; // Human player

        // Note: Players can invest in blocked guilds (they just won't generate resources)

        // Attempt investment
        if (this.game.investInGuild(player, guildNumber)) {
            this.updateGameState();
        }

        return false;
    }

    handleDropOnExpedition(e) {
        e.stopPropagation();
        e.preventDefault();

        const expeditionCard = e.currentTarget;
        expeditionCard.classList.remove('drag-over');

        const player = this.game.players[0]; // Human player

        // Attempt investment
        if (this.game.investInExpedition(player)) {
            this.updateGameState();
        }

        return false;
    }

    // Double-click/tap handlers for guild investment
    handleGuildDoubleClick(e) {
        e.preventDefault();
        e.stopPropagation();

        const guildCard = e.currentTarget;
        const guildNumber = parseInt(guildCard.dataset.guildNumber);
        const player = this.game.players[0]; // Human player

        // Check if it's human player's turn and investment phase
        if (player.isAI || this.game.phase !== 'investment') {
            return;
        }

        // Attempt investment
        if (this.game.investInGuild(player, guildNumber)) {
            this.updateGameState();
        }
    }

    handleGuildClick(e) {
        const currentTime = Date.now();
        const guildCard = e.currentTarget;

        // Check if this is a double-tap (same target within delay time)
        if (this.lastTapTarget === guildCard && (currentTime - this.lastTapTime) < this.doubleTapDelay) {
            // Double-tap detected
            this.handleGuildDoubleClick(e);
            // Reset tracking
            this.lastTapTime = 0;
            this.lastTapTarget = null;
            // Remove visual feedback
            guildCard.classList.remove('tap-highlight');
        } else {
            // First tap - show visual feedback
            this.lastTapTime = currentTime;
            this.lastTapTarget = guildCard;

            // Add highlight effect
            guildCard.classList.add('tap-highlight');
            setTimeout(() => {
                guildCard.classList.remove('tap-highlight');
            }, this.doubleTapDelay);
        }
    }

    // Double-click/tap handlers for expedition investment
    handleExpeditionDoubleClick(e) {
        e.preventDefault();
        e.stopPropagation();

        const player = this.game.players[0]; // Human player

        // Check if it's human player's turn and investment phase
        if (player.isAI || this.game.phase !== 'investment') {
            return;
        }

        // Attempt investment
        if (this.game.investInExpedition(player)) {
            this.updateGameState();
        }
    }

    handleExpeditionClick(e) {
        const currentTime = Date.now();
        const expeditionCard = e.currentTarget;

        // Check if this is a double-tap (same target within delay time)
        if (this.lastTapTarget === expeditionCard && (currentTime - this.lastTapTime) < this.doubleTapDelay) {
            // Double-tap detected
            this.handleExpeditionDoubleClick(e);
            // Reset tracking
            this.lastTapTime = 0;
            this.lastTapTarget = null;
            // Remove visual feedback
            expeditionCard.classList.remove('tap-highlight');
        } else {
            // First tap - show visual feedback
            this.lastTapTime = currentTime;
            this.lastTapTarget = expeditionCard;

            // Add highlight effect
            expeditionCard.classList.add('tap-highlight');
            setTimeout(() => {
                expeditionCard.classList.remove('tap-highlight');
            }, this.doubleTapDelay);
        }
    }

    getCoinImageFromColor(color) {
        // Use centralized config helper
        return getCoinImageFromColor(color);
    }

    getCoinIconHTML(player) {
        // Use centralized config helper
        const config = getPlayerConfig(player.id);
        const coinImage = config ? config.coinImage : PLAYER_CONFIG[0].coinImage;
        return `<img src="${coinImage}" class="coin-icon coin-image" alt="💰">`;
    }

    /**
     * Dynamically adjusts font-size to fit text within container
     * Short names keep larger font, long names get smaller font
     */
    adjustFontSizeToFit(element, minFontSize = 6) {
        if (!element) return;

        // Defer until after browser finishes rendering/layout
        requestAnimationFrame(() => {
            // Force reflow to get accurate measurements
            element.offsetHeight;

            // Reset to default (remove inline style to use CSS default)
            element.style.fontSize = '';

            // Force another reflow after reset
            element.offsetHeight;

            // Get computed font-size from CSS
            const computedStyle = window.getComputedStyle(element);
            let currentFontSize = parseFloat(computedStyle.fontSize);

            // Check if text overflows its container
            if (element.scrollWidth > element.clientWidth && currentFontSize > minFontSize) {
                // Text overflows - reduce font-size progressively
                while (element.scrollWidth > element.clientWidth && currentFontSize > minFontSize) {
                    currentFontSize -= 0.5; // Reduce by 0.5px increments
                    element.style.fontSize = currentFontSize + 'px';
                }
            }
            // If no overflow, keep the default CSS font-size (already reset above)
        });
    }

    renderInvestmentSlots(investments, maxSlots = 4) {
        let html = '';
        for (let i = 0; i < maxSlots; i++) {
            if (i < investments.length) {
                const coinImage = this.getCoinImageFromColor(investments[i].color);
                html += `<div class="investment-slot filled" style="background-image: url('${coinImage}'); background-size: cover; background-position: center; background-repeat: no-repeat;"></div>`;
            } else {
                html += `<div class="investment-slot"></div>`;
            }
        }
        return html;
    }

    handleActionClick(e) {
        const action = e.target.dataset.action;
        const player = this.game.players[this.game.currentPlayerIndex];

        if (player.isAI || this.game.phase !== 'investment') {
            return;
        }

        switch (action) {
            case 'invest-guild':
                this.showGuildSelection('invest');
                break;
            case 'invest-expedition':
                this.game.investInExpedition(player);
                this.updateGameState();
                break;
            case 'buy-land':
                this.game.buyLand(player);
                this.updateGameState();
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
            case 'cause-mutiny':
                this.showMutinyGuildSelection();
                break;
            case 'buy-treasure':
                this.game.buyTreasureArtisan(player);
                this.updateGameState();
                break;
            case 'sell-treasure-artisan':
                this.showTreasureSellSelection();
                break;
            case 'end-turn':
                this.game.endTurn();
                this.updateGameState();
                break;
        }
    }

    showMutinyGuildSelection() {
        const player = this.game.players[0]; // Human player

        // Get guilds where player has invested
        const guildsWithInvestments = this.game.activeGuilds.filter(guild => {
            return guild.investments.some(inv => inv.playerId === player.id);
        });

        if (guildsWithInvestments.length === 0) {
            this.game.log('No has invertido en ningún gremio');
            return;
        }

        this.elements.guildOptions.innerHTML = '<h3>Causar Motín en:</h3>';

        guildsWithInvestments.forEach(guild => {
            const div = document.createElement('div');
            div.className = 'guild-option';
            div.innerHTML = `
                <strong>${guild.name} (${guild.number})</strong><br>
                Tus inversiones: ${guild.investments.filter(inv => inv.playerId === player.id).length}
            `;
            div.addEventListener('click', () => {
                if (this.game.causeMutiny(player, guild.number)) {
                    this.updateGameState();
                }
                this.hideGuildModal();
            });

            this.elements.guildOptions.appendChild(div);
        });

        this.elements.guildModal.classList.remove('hidden');
    }

    showTreasureSellSelection() {
        const player = this.game.players[0]; // Human player

        if (player.treasures.length === 0) {
            this.game.log('No tienes tesoros para vender');
            return;
        }

        this.elements.guildOptions.innerHTML = '<h3>Vender Tesoro 4💰:</h3>';

        player.treasures.forEach((treasure, index) => {
            const div = document.createElement('div');
            div.className = 'guild-option';

            let treasureDesc;
            if (treasure.type === TREASURE_TYPES.WEALTH) {
                treasureDesc = `💰 Tesoro de ${treasure.coinValue} monedas`;
            } else if (treasure.vp === 1) {
                treasureDesc = '⭐ Tesoro de 1 VP';
            } else if (treasure.vp === 2) {
                treasureDesc = '⭐⭐ Tesoro de 2 VP';
            }

            div.innerHTML = `<strong>${treasureDesc}</strong>`;
            div.addEventListener('click', () => {
                if (this.game.sellTreasureArtisan(player, index)) {
                    this.updateGameState();
                }
                this.hideGuildModal();
            });

            this.elements.guildOptions.appendChild(div);
        });

        this.elements.guildModal.classList.remove('hidden');
    }

    showCharacterSelection() {
        const player = this.game.players[0]; // Human player
        const selectedCharacterIds = []; // Track already selected characters

        // AI players select characters FIRST
        for (let i = 1; i < this.game.numPlayers; i++) {
            const aiPlayer = this.game.players[i];
            const aiOptions = getTwoRandomCharacters(selectedCharacterIds);
            const selected = aiPlayer.aiController.selectCharacter(aiOptions);
            aiPlayer.setCharacter(selected);
            selectedCharacterIds.push(selected.id); // Track this selection
        }

        // Human player gets options excluding AI selections
        const options = getTwoRandomCharacters(selectedCharacterIds);

        // Display the initial guilds on the board
        this.updateGuildsDisplay();

        // Show/hide AI Player 2 based on number of players
        if (this.game.numPlayers >= 3) {
            this.elements.aiPlayer2.classList.remove('hidden');
            this.elements.aiPlayer2.classList.remove('hidden');
        } else {
            this.elements.aiPlayer2.classList.add('hidden');
            this.elements.aiPlayer2.classList.add('hidden');
        }

        // Render AI players with their selected characters (conditionally based on difficulty)
        const showAICharacters = this.game.aiDifficulty === 'easy' || this.game.aiDifficulty === 'medium';
        if (showAICharacters) {
            this.renderAIPlayers();
        } else {
            // Hide AI characters for hard difficulty
            if (this.elements.aiPlayer1 && this.elements.aiPlayer1) {
                this.elements.aiPlayer1.classList.remove('hidden');
                this.elements.aiPlayer1.innerHTML = '<div class="player-header"><h3 class="player-name">???</h3></div>';
                this.elements.aiPlayer1.innerHTML = '<p style="text-align: center; color: #888;">Personaje oculto</p>';
            }
            if (this.game.numPlayers >= 3 && this.elements.aiPlayer2 && this.elements.aiPlayer2) {
                this.elements.aiPlayer2.classList.remove('hidden');
                this.elements.aiPlayer2.classList.remove('hidden');
                this.elements.aiPlayer2.innerHTML = '<div class="player-header"><h3 class="player-name">???</h3></div>';
                this.elements.aiPlayer2.innerHTML = '<p style="text-align: center; color: #888;">Personaje oculto</p>';
            }
        }

        // Render character options in the inline container
        const characterOptionsInline = document.getElementById('character-options-inline');
        if (!characterOptionsInline) return;

        characterOptionsInline.innerHTML = '';

        options.forEach(character => {
            const div = document.createElement('div');
            div.className = 'character-option';
            const imagePath = getCharacterImagePath(character.id);
            div.innerHTML = `
                <div class="character-image-container">
                    <img src="${imagePath}" alt="${character.nameES}" class="character-image" data-character-id="${character.id}">
                </div>
            `;

            // Clicking character opens modal with select button
            div.addEventListener('click', (e) => {
                e.stopPropagation();
                this.showCharacterSelectionModal(character, player, showAICharacters);
            });

            characterOptionsInline.appendChild(div);
        });

        // Add class to body to enable character selection phase styling
        document.body.classList.add('character-selection-phase');

        // Show both character selection view AND player info view (with resources hidden by CSS)
        document.getElementById('character-selection-view').style.display = 'block';
        document.getElementById('player-info-view').style.display = 'block';
        document.getElementById('player-info-view').classList.remove('hidden');

        // Auto-select first character if in quickstart mode
        if (window.quickstartMode) {
            console.log('Quickstart mode: Auto-selecting first character');
            setTimeout(() => {
                const firstCharacter = options[0];
                player.setCharacter(firstCharacter);
                this.hideCharacterSelection();
                this.updatePlayerDisplay(player);

                // Reveal AI characters if they were hidden
                if (!showAICharacters) {
                    this.renderAIPlayers();
                }

                this.game.startGame();
                this.updateGameState();

                // Clear quickstart flag
                window.quickstartMode = false;
            }, 500);
        }
    }

    hideCharacterSelection() {
        // Remove character selection phase class from body
        document.body.classList.remove('character-selection-phase');

        // Hide character selection view, keep player info view visible
        document.getElementById('character-selection-view').style.display = 'none';
        document.getElementById('player-info-view').style.display = 'block';
    }

    showCharacterSelectionModal(character, player, showAICharacters) {
        const modal = document.getElementById('character-info-modal');
        const title = document.getElementById('character-info-modal-title');
        const body = document.getElementById('character-info-modal-body');

        if (!modal || !title || !body || !character) return;

        // Hide title
        title.style.display = 'none';

        const imagePath = getCharacterImagePath(character.id);

        body.innerHTML = `
            <div class="character-modal-layout">
                <div class="character-modal-image-container">
                    <img src="${imagePath}" alt="${character.nameES}" class="character-image-modal">
                </div>
                <div class="character-modal-buttons-column">
                    <button class="btn-select-character-modal" id="select-character-modal-btn">Seleccionar</button>
                    <button class="btn-cancel-character-modal" id="cancel-character-modal-btn">Cancelar</button>
                </div>
            </div>
        `;

        // Add click handler for select button
        const selectBtn = body.querySelector('#select-character-modal-btn');
        selectBtn.addEventListener('click', () => {
            player.setCharacter(character);
            this.hideCharacterInfoModal();
            this.hideCharacterSelection();
            this.updatePlayerDisplay(player);

            // Reveal AI characters if they were hidden
            if (!showAICharacters) {
                this.renderAIPlayers();
            }

            this.game.startGame();
            this.updateGameState();
        });

        // Add click handler for cancel button
        const cancelBtn = body.querySelector('#cancel-character-modal-btn');
        cancelBtn.addEventListener('click', () => {
            this.hideCharacterInfoModal();
        });

        // Add backdrop click to close (click outside content)
        const modalBackdropHandler = (e) => {
            if (e.target === modal) {
                this.hideCharacterInfoModal();
                modal.removeEventListener('click', modalBackdropHandler);
            }
        };
        modal.addEventListener('click', modalBackdropHandler);

        modal.classList.remove('hidden');
    }

    hideCharacterModal() {
        this.elements.characterModal.classList.add('hidden');
    }

    showGuildSelection(purpose) {
        const availableGuilds = this.game.activeGuilds; // Can invest in blocked guilds too

        this.elements.guildOptions.innerHTML = '';

        // Define the specific display order: Row 1: 2,3,4,5,6  Row 2: 12,11,10,9,8
        const displayOrder = [2, 3, 4, 5, 6, 12, 11, 10, 9, 8];

        // Create a map for quick lookup
        const guildMap = new Map();
        availableGuilds.forEach(guild => {
            guildMap.set(guild.number, guild);
        });

        // Display guilds in the specified order with placeholders for inactive guilds
        displayOrder.forEach(guildNumber => {
            const guild = guildMap.get(guildNumber);

            const div = document.createElement('div');

            // If guild is not active, create an invisible placeholder
            if (!guild) {
                div.className = 'guild-option guild-placeholder';
                div.style.visibility = 'hidden';
                div.style.pointerEvents = 'none';
                this.elements.guildOptions.appendChild(div);
                return;
            }

            // Guild is active - display it normally
            div.className = 'guild-option';

            // Add blocked class for visual indication
            if (guild.blocked) {
                div.classList.add('guild-blocked');
            }

            // Get guild image path
            const guildImage = this.getGuildImageFromNumber(guild.number);

            // Create image element
            const img = document.createElement('img');
            img.src = guildImage;
            img.alt = guild.name;
            img.style.width = '100%';
            img.style.height = '100%';
            img.style.objectFit = 'cover';
            img.style.display = 'block';
            img.style.pointerEvents = 'none'; // Let clicks pass through to parent div

            div.appendChild(img);

            div.addEventListener('click', () => {
                if (purpose === 'invest') {
                    const player = this.game.players[0];
                    this.game.investInGuild(player, guild.number);
                    this.updateGameState();
                }
                this.hideGuildModal();
            });

            this.elements.guildOptions.appendChild(div);
        });

        this.elements.guildModal.classList.remove('hidden');
    }

    hideGuildModal() {
        this.elements.guildModal.classList.add('hidden');
    }

    selectLandToCultivate(player) {
        const uncultivatedIndices = player.getUncultivatedLandIndices();

        if (uncultivatedIndices.length === 0) {
            this.game.log('No tienes tierras sin cultivar');
            return;
        }

        // For simplicity, cultivate first uncultivated land
        // In a full implementation, show a selection UI
        this.game.cultivateLand(player, uncultivatedIndices[0]);
        this.updateGameState();
    }

    selectLandForInn(player) {
        if (player.lands.length === 0) {
            this.game.log('No tienes tierras');
            return;
        }

        // For simplicity, use first land
        // In a full implementation, show a selection UI
        this.game.buildInn(player, 0);
        this.updateGameState();
    }

    selectInnToRepair(player) {
        const destroyedIndices = player.getDestroyedInnIndices();

        if (destroyedIndices.length === 0) {
            this.game.log('No tienes posadas destruidas');
            return;
        }

        // For simplicity, repair first destroyed inn
        this.game.repairInn(player, destroyedIndices[0]);
        this.updateGameState();
    }

    updateGameState() {
        this.updateGuildsDisplay();
        this.updateExpeditionDisplay();
        this.updatePlayersDisplay();
        this.updateActionButtons();
        this.updateEventDeckCount();
    }

    updateEventDeckCount() {
        // Update event deck count and visibility
        const currentContent = this.elements.currentEventCard.querySelector('.event-card-content');
        if (currentContent) {
            const deckCount = this.game.eventDeck ? this.game.eventDeck.length : 0;

            // Hide deck when empty, show when has cards
            if (deckCount === 0) {
                this.elements.currentEventCard.style.opacity = '0';
                this.elements.currentEventCard.style.pointerEvents = 'none';
            } else {
                this.elements.currentEventCard.style.opacity = '1';
                this.elements.currentEventCard.style.pointerEvents = 'auto';
            }

            // Update just the count span, not the whole content
            const countSpan = currentContent.querySelector('.event-deck-count span');
            if (countSpan) {
                countSpan.textContent = deckCount;
            }
        }
    }


    updateGuildsDisplay() {
        // Save event cards, expedition card, and dice area before clearing
        const expeditionCard = document.getElementById('expedition-card');
        const expeditionParent = expeditionCard ? expeditionCard.parentNode : null;
        const currentEventCard = document.getElementById('current-event-card');
        const currentEventParent = currentEventCard ? currentEventCard.parentNode : null;
        const previousEventCard = document.getElementById('previous-event-card');
        const previousEventParent = previousEventCard ? previousEventCard.parentNode : null;
        const diceArea = document.getElementById('dice-area');
        const diceAreaParent = diceArea ? diceArea.parentNode : null;

        this.elements.guildsGrid.innerHTML = '';

        // Restore event cards, expedition card, and dice area
        if (currentEventCard && currentEventParent === this.elements.guildsGrid) {
            this.elements.guildsGrid.appendChild(currentEventCard);
        }
        if (previousEventCard && previousEventParent === this.elements.guildsGrid) {
            this.elements.guildsGrid.appendChild(previousEventCard);
        }
        if (expeditionCard && expeditionParent === this.elements.guildsGrid) {
            this.elements.guildsGrid.appendChild(expeditionCard);
        }
        if (diceArea && diceAreaParent === this.elements.guildsGrid) {
            this.elements.guildsGrid.appendChild(diceArea);
        }

        // Define the guild layout: 2 3 4 5 6 (row 1), 12 11 10 9 8 (row 3)
        const row1Guilds = [2, 3, 4, 5, 6];
        const row3Guilds = [12, 11, 10, 9, 8];

        // Create a map for quick guild lookup
        const guildMap = {};
        this.game.activeGuilds.forEach(guild => {
            guildMap[guild.number] = guild;
        });

        // Render row 1 guilds
        row1Guilds.forEach((guildNum, index) => {
            this.renderGuildCard(guildMap[guildNum], 1, index + 1);
        });

        // Render blocking events in row 2 (between guilds)
        this.renderBlockingEventsRow(row1Guilds, row3Guilds);

        // Render row 3 guilds
        row3Guilds.forEach((guildNum, index) => {
            this.renderGuildCard(guildMap[guildNum], 3, index + 1);
        });

        // Setup drop zones after rendering
        this.setupGuildDropZones();
    }

    renderGuildCard(guild, row, column) {
        if (!guild) return; // Guild not yet active

        const div = document.createElement('div');
        div.className = 'guild-card';
        div.classList.add(`guild-row-${row}`);
        div.style.gridColumn = column;
        div.dataset.guildNumber = guild.number;

        if (guild.blocked) {
            div.classList.add('blocked');

            // Determine block level visual indicator
            const blockInfo = this.getGuildBlockInfo(guild.number);
            if (blockInfo.isPlagueAffected) {
                div.classList.add('plague-affected');
            } else if (blockInfo.maxEventCount >= 2) {
                div.classList.add('double-block');
            } else if (blockInfo.maxEventCount === 1) {
                div.classList.add('single-block');
            }
        }

        // Max investor indicator
        let maxInvestorHTML = '';
        if (guild.maxInvestor !== null) {
            const maxPlayer = this.game.players.find(p => p.id === guild.maxInvestor);
            if (maxPlayer) {
                const coinImage = this.getCoinImageFromColor(maxPlayer.color);
                maxInvestorHTML = `<div class="max-investor" style="background-image: url('${coinImage}'); background-size: cover; background-position: center; background-repeat: no-repeat;"></div>`;
            }
        }

        // Investment slots - use extracted helper function
        const slotsHTML = this.renderInvestmentSlots(guild.investments, 4);

        div.innerHTML = `
            ${maxInvestorHTML}
            <div class="investment-slots">
                ${slotsHTML}
            </div>
        `;

        this.elements.guildsGrid.appendChild(div);
    }

    renderBlockingEventsRow(row1Guilds, row3Guilds) {
        // Define which blocking events affect which columns
        // Column mapping: 1=2/12, 2=3/11, 3=4/10, 4=5/9, 5=6/8
        const blockingEventPositions = {
            'mine_collapse': { column: 2, guilds: [3, 11] },      // Herrería (3) y Joyería (11)
            'material_shortage': { column: 3, guilds: [4, 10] },  // Cantera (4) y Serrería (10)
            'trade_blockade': { column: 4, guilds: [5, 9] },      // Puerto (5) y Mercado (9)
            'famine': { column: 5, guilds: [6, 8] },              // Granja (6) y Taberna (8)
            'plague': { column: 1, guilds: 'all' }                // All guilds except 2 and 12
        };

        // Group events by column
        const eventsByColumn = {1: [], 2: [], 3: [], 4: [], 5: []};

        for (let event of this.game.activeTemporaryEvents) {
            const eventPos = blockingEventPositions[event.id];
            if (eventPos) {
                eventsByColumn[eventPos.column].push(event);
            }
        }

        // Create 5 empty slots for row 2
        for (let col = 1; col <= 5; col++) {
            const div = document.createElement('div');
            div.className = 'blocking-event-row';
            div.style.gridColumn = col;

            const eventsHere = eventsByColumn[col];

            // Render stacked events in this position
            if (eventsHere.length > 0) {
                // Count occurrences of each event type
                const eventCounts = {};
                eventsHere.forEach(e => {
                    eventCounts[e.id] = (eventCounts[e.id] || 0) + 1;
                });

                // Get unique events
                const uniqueEvents = [...new Set(eventsHere.map(e => e.id))];

                // Render all unique events stacked
                let eventsHTML = '';
                uniqueEvents.forEach(eventId => {
                    const event = eventsHere.find(e => e.id === eventId);
                    const count = eventCounts[eventId];
                    // Determine block level class: single (1 event) or double (2+ events)
                    const blockLevelClass = count >= 2 ? 'double-block' : 'single-block';

                    eventsHTML += `
                        <div class="blocking-event-card stacked-event ${blockLevelClass}" data-event-id="${eventId}">
                            <div class="event-name">${event.name}</div>
                            <div class="event-count">${count > 1 ? `x${count}` : ''}</div>
                        </div>
                    `;
                });

                div.innerHTML = eventsHTML;
            }

            this.elements.guildsGrid.appendChild(div);
        }
    }

    // Helper function to get blocking event info for a specific guild
    getGuildBlockInfo(guildNumber) {
        const result = {
            isPlagueAffected: false,
            maxEventCount: 0
        };

        // Define which blocking events affect which guilds
        const eventGuildMapping = {
            'mine_collapse': [3, 11],
            'material_shortage': [4, 10],
            'trade_blockade': [5, 9],
            'famine': [6, 8],
            'plague': 'all'
        };

        // Immune guilds for Plague
        const plagueImmuneGuilds = [2, 12];

        // Count events affecting this guild
        const eventCounts = {};

        for (const event of this.game.activeTemporaryEvents) {
            const affectedGuilds = eventGuildMapping[event.id];

            if (event.id === 'plague') {
                // Plague affects all except immune guilds
                if (!plagueImmuneGuilds.includes(guildNumber)) {
                    result.isPlagueAffected = true;
                }
            } else if (Array.isArray(affectedGuilds) && affectedGuilds.includes(guildNumber)) {
                // Count this event type
                eventCounts[event.id] = (eventCounts[event.id] || 0) + 1;
            }
        }

        // Find max event count for this guild
        for (const count of Object.values(eventCounts)) {
            if (count > result.maxEventCount) {
                result.maxEventCount = count;
            }
        }

        return result;
    }

    updateExpeditionDisplay() {
        const slotsContainer = this.elements.expeditionCard.querySelector('.investment-slots');

        // Use extracted helper function
        slotsContainer.innerHTML = this.renderInvestmentSlots(
            this.game.expedition.investments,
            this.game.expedition.maxSlots
        );

        // Setup drop zone after rendering
        this.setupExpeditionDropZone();
    }

    updatePlayersDisplay() {
        // Update human player
        const humanPlayer = this.game.players[0];
        this.updatePlayerDisplay(humanPlayer);

        // Update AI players
        for (let i = 1; i < this.game.numPlayers; i++) {
            this.updateAIPlayerDisplay(this.game.players[i], i);
        }

        // Highlight current player
        // Remove active-player class from all zones
        this.elements.playerHuman.classList.remove('active-player');
        if (this.elements.aiPlayer1) {
            this.elements.aiPlayer1.classList.remove('active-player');
        }
        if (this.elements.aiPlayer2) {
            this.elements.aiPlayer2.classList.remove('active-player');
        }

        // Add active-player class to current player
        const currentPlayer = this.game.players[this.game.currentPlayerIndex];
        if (currentPlayer) {
            if (currentPlayer.id === 0) {
                this.elements.playerHuman.classList.add('active-player');
            } else if (currentPlayer.id === 1 && this.elements.aiPlayer1) {
                this.elements.aiPlayer1.classList.add('active-player');
            } else if (currentPlayer.id === 2 && this.elements.aiPlayer2) {
                this.elements.aiPlayer2.classList.add('active-player');
            }
        }
    }

    updatePlayerDisplay(player) {
        const zone = document.getElementById('player-info-view');
        if (!zone) return;

        // Player color indicator removed

        // Update coin icon color and make it draggable
        const coinIcon = zone.querySelector('.coin-icon');
        if (coinIcon && player.color) {
            coinIcon.style.color = player.color;
            coinIcon.style.filter = `drop-shadow(0 0 2px ${player.color})`;

            // Make coin draggable for human player
            if (player.id === 0) {
                coinIcon.setAttribute('draggable', 'true');
                coinIcon.style.cursor = 'grab';

                // Remove any existing listeners before adding new ones
                const newCoinIcon = coinIcon.cloneNode(true);
                coinIcon.parentNode.replaceChild(newCoinIcon, coinIcon);

                // Add drag event listeners for desktop
                newCoinIcon.addEventListener('dragstart', (e) => this.handleDragStart(e));
                newCoinIcon.addEventListener('dragend', (e) => this.handleDragEnd(e));

                // Add touch event listeners for mobile
                newCoinIcon.addEventListener('touchstart', (e) => this.handleTouchStart(e), { passive: false });
                newCoinIcon.addEventListener('touchmove', (e) => this.handleTouchMove(e), { passive: false });
                newCoinIcon.addEventListener('touchend', (e) => this.handleTouchEnd(e), { passive: false });
            }
        }

        const coinCount = zone.querySelector('.coin-count');
        const vpCount = zone.querySelector('.vp-count');
        const landsCount = zone.querySelector('.lands-count');
        const cultivatedCount = zone.querySelector('.cultivated-count');
        const innsCount = zone.querySelector('.inns-count');
        const destroyedCount = zone.querySelector('.destroyed-count');
        const treasuresCount = zone.querySelector('.treasures-count');

        if (coinCount) coinCount.textContent = player.coins;
        // Show full VP including treasures for human player
        if (vpCount) vpCount.textContent = player.getVictoryPoints(this.game, true);
        if (landsCount) landsCount.textContent = player.getUncultivatedLandsCount();

        // Cultivated lands with green color if > 0
        if (cultivatedCount) {
            cultivatedCount.textContent = player.getCultivatedLandsCount();
            if (player.getCultivatedLandsCount() > 0) {
                cultivatedCount.classList.add('resource-count-green');
            } else {
                cultivatedCount.classList.remove('resource-count-green');
            }
        }

        if (innsCount) innsCount.textContent = player.getActiveInnsCount();

        // Destroyed inns with red color if > 0
        if (destroyedCount) {
            destroyedCount.textContent = player.getDestroyedInnsCount();
            if (player.getDestroyedInnsCount() > 0) {
                destroyedCount.classList.add('resource-count-red');
            } else {
                destroyedCount.classList.remove('resource-count-red');
            }
        }

        if (treasuresCount) treasuresCount.textContent = player.getTreasureCount();

        // Show/hide Discoverer's Emblem badge in player name
        const emblemBadge = zone.querySelector('.emblem-badge');
        if (emblemBadge) {
            emblemBadge.style.display = player.hasDiscovererEmblem ? 'inline' : 'none';
        }

        // Show/hide Discoverer's Emblem icon next to treasure count
        const emblemIcon = zone.querySelector('.discoverer-emblem');
        if (emblemIcon) {
            if (player.hasDiscovererEmblem) {
                emblemIcon.style.display = 'inline';
            } else {
                emblemIcon.style.display = 'none';
            }
        }

        // Render inline treasure details
        this.renderInlineTreasureDetails(player);

        // Render treasure breakdown for human player
        this.renderHumanTreasureBreakdown(player);

        // Character info
        if (player.character) {
            const characterInfo = zone.querySelector('.character-info');
            const imagePath = getCharacterImagePath(player.character.id);
            characterInfo.innerHTML = `
                <div class="character-name">${player.character.nameES}</div>
                <div class="character-image-container">
                    <img src="${imagePath}" alt="${player.character.nameES}" class="character-image" title="Click para ver detalles">
                </div>
            `;

            // Adjust character name font-size to fit
            const characterNameEl = characterInfo.querySelector('.character-name');
            this.adjustFontSizeToFit(characterNameEl);

            zone.querySelector('#select-character-btn').style.display = 'none';

            // Make character info clickable to show full details in modal
            this.makeCharacterInfoClickable(characterInfo, player.character, 'Tú');

            // Show/hide character ability buttons (in the actions section, not player zone)
            const humanSection = document.getElementById('human-column');

            const mutinyBtn = humanSection.querySelector('[data-action="cause-mutiny"]');
            if (mutinyBtn) {
                if (player.character.id === 'mercenary') {
                    mutinyBtn.classList.remove('character-ability-hidden');
                    mutinyBtn.style.display = 'flex';  // Match button default display
                } else {
                    mutinyBtn.classList.add('character-ability-hidden');
                    mutinyBtn.style.display = 'none';
                }
            }

            const buyTreasureBtn = humanSection.querySelector('[data-action="buy-treasure"]');
            if (buyTreasureBtn) {
                if (player.character.id === 'artisan') {
                    buyTreasureBtn.classList.remove('character-ability-hidden');
                    buyTreasureBtn.style.display = 'flex';  // Match button default display
                } else {
                    buyTreasureBtn.classList.add('character-ability-hidden');
                    buyTreasureBtn.style.display = 'none';
                }
            }

            const sellTreasureBtn = humanSection.querySelector('[data-action="sell-treasure-artisan"]');
            if (sellTreasureBtn) {
                if (player.character.id === 'artisan') {
                    sellTreasureBtn.classList.remove('character-ability-hidden');
                    sellTreasureBtn.style.display = 'flex';  // Match button default display
                } else {
                    sellTreasureBtn.classList.add('character-ability-hidden');
                    sellTreasureBtn.style.display = 'none';
                }
            }
        }
    }

    renderPlayerTreasures(player) {
        const treasuresContainer = document.getElementById('human-treasures');
        if (!treasuresContainer) return;

        if (player.treasures.length === 0) {
            treasuresContainer.innerHTML = '';
            return;
        }

        const treasuresByType = {
            '1 VP': [],
            '2 VP': [],
            '3 💰': [],
            '4 💰': []
        };

        player.treasures.forEach((treasure, index) => {
            let label;
            if (treasure.type === TREASURE_TYPES.WEALTH) {
                label = `${treasure.coinValue} 💰`;
            } else if (treasure.vp === 1) {
                label = '1 VP';
            } else if (treasure.vp === 2) {
                label = '2 VP';
            }

            if (label) {
                treasuresByType[label].push(index);
            }
        });

        let html = '<div class="treasures-list" style="margin-top: 10px; font-size: 0.9em;">';
        html += '<h5 style="margin: 5px 0;">Mis Tesoros:</h5>';

        for (let [type, indices] of Object.entries(treasuresByType)) {
            if (indices.length > 0) {
                html += `<div class="treasure-type-row" style="display: flex; align-items: center; margin: 5px 0; gap: 8px;">`;
                html += `<span style="min-width: 50px;">${type}</span>`;
                html += `<span style="color: #888;">x${indices.length}</span>`;

                // Add sell button for coin treasures
                if (type.includes('💰')) {
                    html += `<button class="sell-treasure-btn" data-treasure-index="${indices[0]}"
                             style="padding: 2px 8px; font-size: 0.8em; cursor: pointer;">Vender</button>`;
                }

                html += `</div>`;
            }
        }

        html += '</div>';
        treasuresContainer.innerHTML = html;

        // Bind sell buttons
        const sellButtons = treasuresContainer.querySelectorAll('.sell-treasure-btn');
        sellButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const index = parseInt(e.target.dataset.treasureIndex);
                this.handleSellTreasure(player, index);
            });
        });
    }

    renderInlineTreasureDetails(player) {
        const detailsContainer = document.getElementById('human-treasure-details');
        if (!detailsContainer) return;

        if (player.treasures.length === 0) {
            detailsContainer.innerHTML = '';
            return;
        }

        const treasuresByType = {
            'WEALTH': 0,
            '1VP': 0,
            '2VP': 0
        };

        player.treasures.forEach(treasure => {
            if (treasure.type === TREASURE_TYPES.WEALTH) {
                treasuresByType['WEALTH']++;
            } else if (treasure.type === TREASURE_TYPES.COMMON) {
                treasuresByType['1VP']++;
            } else if (treasure.type === TREASURE_TYPES.RARE) {
                treasuresByType['2VP']++;
            }
        });

        let html = '';
        if (treasuresByType['WEALTH'] > 0) {
            html += `<span class="treasure-item" title="Tesoros de riqueza (se pueden vender por monedas)">(💰×${treasuresByType['WEALTH']})</span>`;
        }
        if (treasuresByType['1VP'] > 0) {
            html += `<span class="treasure-item" title="Tesoros de 1 VP">(1VP×${treasuresByType['1VP']})</span>`;
        }
        if (treasuresByType['2VP'] > 0) {
            html += `<span class="treasure-item" title="Tesoros de 2 VP">(2VP×${treasuresByType['2VP']})</span>`;
        }

        detailsContainer.innerHTML = html;
    }

    renderHumanTreasureBreakdown(player) {
        const breakdownContainer = document.getElementById('human-treasures-detail');
        if (!breakdownContainer) return;

        if (player.treasures.length === 0) {
            breakdownContainer.innerHTML = '';
            return;
        }

        // Count treasures by type
        const treasureCounts = {
            '1VP': 0,
            '2VP': 0,
            '3coins': 0,
            '4coins': 0
        };

        player.treasures.forEach(treasure => {
            if (treasure.type === TREASURE_TYPES.WEALTH) {
                if (treasure.coinValue === 3) {
                    treasureCounts['3coins']++;
                } else if (treasure.coinValue === 4) {
                    treasureCounts['4coins']++;
                }
            } else if (treasure.type === TREASURE_TYPES.COMMON) {
                treasureCounts['1VP']++;
            } else if (treasure.type === TREASURE_TYPES.RARE) {
                treasureCounts['2VP']++;
            }
        });

        let html = '<div class="treasure-breakdown-inline">';

        if (treasureCounts['1VP'] > 0) {
            html += `<div class="resource-item treasure-breakdown-item">
                <img src="resources/other/Treasure_1VP.png" class="resource-icon-small" alt="1VP" title="Tesoros de 1 VP">
                <span class="resource-count-small">×${treasureCounts['1VP']}</span>
            </div>`;
        }

        if (treasureCounts['2VP'] > 0) {
            html += `<div class="resource-item treasure-breakdown-item">
                <img src="resources/other/Treasure_2VP.png" class="resource-icon-small" alt="2VP" title="Tesoros de 2 VP">
                <span class="resource-count-small">×${treasureCounts['2VP']}</span>
            </div>`;
        }

        if (treasureCounts['3coins'] > 0) {
            // Find first 3-coin treasure index
            const index3 = player.treasures.findIndex(t => t.type === TREASURE_TYPES.WEALTH && t.coinValue === 3);
            html += `<div class="resource-item treasure-breakdown-item treasure-item-with-sell">
                <img src="resources/other/Wealth_3coins.png" class="resource-icon-small" alt="3 Coins" title="Riquezas de 3 monedas">
                <span class="resource-count-small">×${treasureCounts['3coins']}</span>
                <button class="sell-treasure-btn" data-treasure-index="${index3}">Vender</button>
            </div>`;
        }

        if (treasureCounts['4coins'] > 0) {
            // Find first 4-coin treasure index
            const index4 = player.treasures.findIndex(t => t.type === TREASURE_TYPES.WEALTH && t.coinValue === 4);
            html += `<div class="resource-item treasure-breakdown-item treasure-item-with-sell">
                <img src="resources/other/Wealth_4coins.png" class="resource-icon-small" alt="4 Coins" title="Riquezas de 4 monedas">
                <span class="resource-count-small">×${treasureCounts['4coins']}</span>
                <button class="sell-treasure-btn" data-treasure-index="${index4}">Vender</button>
            </div>`;
        }

        html += '</div>';
        breakdownContainer.innerHTML = html;

        // Bind sell button click handlers
        const sellButtons = breakdownContainer.querySelectorAll('.sell-treasure-btn');
        sellButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const index = parseInt(e.target.dataset.treasureIndex);
                this.handleSellTreasure(player, index);
            });
        });
    }

    handleSellTreasure(player, treasureIndex) {
        const treasure = player.treasures[treasureIndex];
        if (!treasure || treasure.type !== TREASURE_TYPES.WEALTH) {
            this.game.log('Solo puedes vender tesoros de monedas');
            return;
        }

        // Convert treasure to coins
        const coinsGained = treasure.coinValue;
        player.removeTreasure(treasureIndex);
        player.addCoins(coinsGained);

        // Update discoverer's emblem after selling treasure
        this.game.updateDiscovererEmblem();

        this.game.log(`Vendes un tesoro por ${coinsGained} monedas`, 'action');
        this.updateGameState();

        // Check for victory (in case selling gave emblem to someone at 9 VP)
        this.game.checkVictory();
    }

    renderAIPlayers() {
        // Show/hide AI Player 2 based on number of players
        if (this.game.numPlayers >= 3) {
            this.elements.aiPlayer2.classList.remove('hidden');
        } else {
            this.elements.aiPlayer2.classList.add('hidden');
        }

        // Render AI Player 1 (always exists in 2+ player games)
        if (this.game.numPlayers >= 2) {
            this.renderAIPlayer(this.game.players[1], this.elements.aiPlayer1);
        }

        // Render AI Player 2 (only in 3+ player games)
        if (this.game.numPlayers >= 3) {
            this.renderAIPlayer(this.game.players[2], this.elements.aiPlayer2);
        }
    }

    // Format VP display for AI players showing visible points + hidden treasures
    formatAIPlayerVP(player) {
        const visibleVP = player.getVictoryPoints(this.game, false); // Exclude treasures
        const hasTreasures = player.getTreasureCount() > 0;

        if (hasTreasures) {
            return `${visibleVP} + ? VP`;
        } else {
            return `${visibleVP} VP`;
        }
    }

    renderAIPlayer(player, container) {
        // Render complete player info in a single container
        container.innerHTML = `
            <div class="ai-player-header">
                <div class="player-header">
                    <h3 class="player-name">
                        ${player.name}
                        <span class="emblem-badge" style="display: ${player.hasDiscovererEmblem ? 'inline' : 'none'}; margin-left: 8px; font-size: 1.2em;" title="Emblema del Descubridor (+1 VP)">🏆</span>
                    </h3>
                    <div class="player-coins">
                        <span class="coin-count">${player.coins}</span> ${this.getCoinIconHTML(player)}
                    </div>
                    <div class="player-vp">
                        <span class="vp-count">${this.formatAIPlayerVP(player)}</span>
                    </div>
                </div>
                ${player.character ? `
                <div class="player-character-compact">
                    <div class="character-info" style="cursor: pointer;" title="Click para ver detalles">
                        <div class="character-name">${player.character.nameES}</div>
                    </div>
                </div>` : ''}
            </div>
            <div class="ai-player-info">
                ${player.character ? `
                <div class="player-character">
                    <div class="character-info">
                        <div class="character-image-container">
                            <img src="${getCharacterImagePath(player.character.id)}" alt="${player.character.nameES}" class="character-image" title="Click para ver detalles">
                        </div>
                    </div>
                </div>` : ''}
                <div class="player-resources ai-resources-grid">
                    <!-- Row 1: Lands, Cultivated Lands, Treasures (3 columns) -->
                    <div class="resource-item">
                        <img src="resources/other/Land.png" class="resource-icon-large" alt="Lands" title="Tierras">
                        <span class="resource-count lands-count">${player.getUncultivatedLandsCount()}</span>
                    </div>
                    <div class="resource-item">
                        <img src="resources/other/Cultivated_Land.png" class="resource-icon-large" alt="Cultivated" title="Tierras Cultivadas">
                        <span class="resource-count cultivated-count ${player.getCultivatedLandsCount() > 0 ? 'resource-count-green' : ''}">${player.getCultivatedLandsCount()}</span>
                    </div>
                    <div class="resource-item">
                        <img src="resources/other/Treasure.png" class="resource-icon-large" alt="Treasures" title="Tesoros">
                        <span class="resource-count treasures-count">${player.getTreasureCount()}</span>
                    </div>

                    <!-- Row 2: Inns, Destroyed Inns (2 items span across) -->
                    <div class="resource-item resource-item-wide">
                        <img src="resources/other/Inn.png" class="resource-icon-large" alt="Inns" title="Posadas">
                        <span class="resource-count inns-count">${player.getActiveInnsCount()}</span>
                    </div>
                    <div class="resource-item resource-item-wide">
                        <img src="resources/other/Destroyed_Inn.png" class="resource-icon-large" alt="Destroyed" title="Posadas Destruidas">
                        <span class="resource-count destroyed-count ${player.getDestroyedInnsCount() > 0 ? 'resource-count-red' : ''}">${player.getDestroyedInnsCount()}</span>
                    </div>
                </div>
            </div>
        `;

        // Adjust player name font-size to fit
        const playerNameEl = container.querySelector('.player-name');
        this.adjustFontSizeToFit(playerNameEl);

        // Adjust character name font-size to fit
        if (player.character) {
            const characterNameEl = container.querySelector('.character-name');
            this.adjustFontSizeToFit(characterNameEl);
        }

        // Make AI character info clickable
        if (player.character) {
            const characterInfos = container.querySelectorAll('.character-info');
            characterInfos.forEach(characterInfo => {
                this.makeCharacterInfoClickable(characterInfo, player.character, player.name);
            });
        }
    }

    updateAIPlayerDisplay(player, index) {
        const container = index === 1 ? this.elements.aiPlayer1 : this.elements.aiPlayer2;
        if (!container) return;

        // Update header elements
        const coinCount = container.querySelector('.coin-count');
        const vpCount = container.querySelector('.vp-count');

        if (coinCount) coinCount.textContent = player.coins;
        // AI players show visible VP + ? for hidden treasures
        if (vpCount) vpCount.textContent = this.formatAIPlayerVP(player);

        // Update resources elements
        const landsCount = container.querySelector('.lands-count');
        const cultivatedCount = container.querySelector('.cultivated-count');
        const innsCount = container.querySelector('.inns-count');
        const destroyedCount = container.querySelector('.destroyed-count');
        const treasuresCount = container.querySelector('.treasures-count');

        if (landsCount) landsCount.textContent = player.getUncultivatedLandsCount();
        if (cultivatedCount) cultivatedCount.textContent = player.getCultivatedLandsCount();
        if (innsCount) innsCount.textContent = player.getActiveInnsCount();
        if (destroyedCount) destroyedCount.textContent = player.getDestroyedInnsCount();
        if (treasuresCount) {
            treasuresCount.textContent = player.getTreasureCount();

            // Update emblem badge in player name
            const playerHeader = container.querySelector('.player-header');
            if (playerHeader) {
                let emblemBadge = playerHeader.querySelector('.emblem-badge');
                if (emblemBadge) {
                    emblemBadge.style.display = player.hasDiscovererEmblem ? 'inline' : 'none';
                }
            }

            // Update emblem icon next to treasure count
            const resourceGroup = treasuresCount.closest('.resource-group');
            if (resourceGroup) {
                let emblem = resourceGroup.querySelector('.discoverer-emblem');
                if (player.hasDiscovererEmblem && !emblem) {
                    // Add emblem if doesn't exist
                    emblem = document.createElement('span');
                    emblem.className = 'discoverer-emblem';
                    emblem.style.cssText = 'color: #ffd700; font-weight: bold; margin-left: 5px;';
                    emblem.title = 'Emblema del Descubridor (+1 VP)';
                    emblem.textContent = '🏆';
                    resourceGroup.appendChild(emblem);
                } else if (!player.hasDiscovererEmblem && emblem) {
                    // Remove emblem if exists
                    emblem.remove();
                }
            }
        }
    }

    updateEventDisplay(event) {
        // Update current event card - this is the EVENT DECK (always shows back)
        this.elements.currentEventCard.removeAttribute('data-event-id');

        const currentContent = this.elements.currentEventCard.querySelector('.event-card-content');
        if (currentContent) {
            // Update event deck count
            const deckCount = this.game.eventDeck ? this.game.eventDeck.length : 0;

            // Hide deck when empty, show when has cards
            if (deckCount === 0) {
                this.elements.currentEventCard.style.opacity = '0';
                this.elements.currentEventCard.style.pointerEvents = 'none';
            } else {
                this.elements.currentEventCard.style.opacity = '1';
                this.elements.currentEventCard.style.pointerEvents = 'auto';
            }

            let content = `<div class="event-name">Mazo de Eventos</div>`;
            content += `<div class="event-deck-count">Cartas: <span>${deckCount}</span></div>`;
            currentContent.innerHTML = content;
        }

        // Update previous event card - this is the DISCARD PILE
        // Skip guild foundation events and show the last non-guild-foundation event instead
        let displayEvent = null;

        if (event.type === 'guild_foundation') {
            // Find the most recent non-guild-foundation event in the discard pile
            if (this.game.eventDiscard && this.game.eventDiscard.length > 0) {
                for (let i = this.game.eventDiscard.length - 1; i >= 0; i--) {
                    if (this.game.eventDiscard[i].type !== 'guild_foundation') {
                        displayEvent = this.game.eventDiscard[i];
                        break;
                    }
                }
            }
        } else {
            displayEvent = event;
        }

        const prevContent = this.elements.previousEventCard.querySelector('.event-card-content');

        if (displayEvent) {
            // Show the event
            this.currentEvent = displayEvent;
            this.elements.previousEventCard.setAttribute('data-event-id', displayEvent.id);

            if (prevContent) {
                let content = `<div class="event-name">${displayEvent.name}</div>`;
                if (displayEvent.description) {
                    content += `<div style="font-size: 0.75em; margin-top: 4px;">${displayEvent.description}</div>`;
                }
                prevContent.innerHTML = content;
            }
        } else {
            // No event to display - clear the discard pile card
            this.elements.previousEventCard.removeAttribute('data-event-id');
            if (prevContent) {
                prevContent.innerHTML = `<div class="event-name">Descarte</div>`;
            }
        }
    }

    showEventModal(event) {
        const modal = document.getElementById('event-modal');
        const card = document.getElementById('event-modal-card');
        const frontCard = card.querySelector('.event-card-front');

        // Use unified getEventBackgroundImage to handle all event types
        let bgImage = this.getEventBackgroundImage(event);

        // Set the front card's background image
        if (bgImage) {
            frontCard.style.backgroundImage = `url('${bgImage}')`;
        } else {
            // Fallback to default back image if no specific image found
            frontCard.style.backgroundImage = `url('resources/other/Event_Back.png')`;
        }

        // Reset flip animation (show back first)
        card.classList.remove('flipped');

        // Show modal
        modal.classList.remove('hidden');

        // Trigger flip animation after a short delay
        setTimeout(() => {
            card.classList.add('flipped');
        }, 100);

        // Hide modal after total display time (flip time + display time)
        setTimeout(() => {
            modal.classList.add('hidden');
            // Reset for next time
            card.classList.remove('flipped');
        }, 3500);
    }

    showReshuffleAnimation(callback) {
        const modal = document.getElementById('reshuffle-modal');
        const eventDeckStack = document.querySelector('#reshuffle-event-deck .reshuffle-card-stack');
        const discardPileStack = document.querySelector('#reshuffle-discard-pile .reshuffle-card-stack');
        const eventDeckCard = eventDeckStack.querySelector('.event-deck-card');
        const discardPileCard = discardPileStack.querySelector('.discard-pile-card');

        // Get the last discarded event image
        let lastDiscardImage = 'resources/other/Event_Back.png'; // Default fallback
        if (this.game && this.game.eventDiscard && this.game.eventDiscard.length > 0) {
            const lastEvent = this.game.eventDiscard[this.game.eventDiscard.length - 1];
            const eventImage = this.getEventBackgroundImage(lastEvent);
            if (eventImage) {
                lastDiscardImage = eventImage;
            }
        }

        // Set both card images
        eventDeckCard.style.backgroundImage = `url('resources/other/Event_Back.png')`;
        discardPileCard.style.backgroundImage = `url('${lastDiscardImage}')`;

        // Reset all animation states
        eventDeckStack.classList.remove('moving', 'shuffling', 'settling');
        discardPileStack.classList.remove('moving', 'shuffling', 'settling');

        // Show modal
        modal.classList.remove('hidden');

        // Animation sequence with proper timing
        // Phase 1: Move and flip (0-2s)
        setTimeout(() => {
            eventDeckStack.classList.add('moving');
            discardPileStack.classList.add('moving');
        }, 100);

        // Phase 2: Shuffle blur (2-4s)
        setTimeout(() => {
            eventDeckStack.classList.remove('moving');
            discardPileStack.classList.remove('moving');
            eventDeckStack.classList.add('shuffling');

            // Clear discard pile image now that cards have "moved" to event deck
            discardPileCard.style.backgroundImage = '';
        }, 2100);

        // Phase 3: Hide modal and callback (4.1s - right after shuffle completes)
        setTimeout(() => {
            modal.classList.add('hidden');

            // Reset all animation states for next time
            eventDeckStack.classList.remove('moving', 'shuffling', 'settling');
            discardPileStack.classList.remove('moving', 'shuffling', 'settling');

            // Clear background images (safety fallback)
            eventDeckCard.style.backgroundImage = '';
            discardPileCard.style.backgroundImage = '';

            // Execute callback if provided
            if (callback && typeof callback === 'function') {
                callback();
            }
        }, 4100);
    }

    getGuildImageFromNumber(guildNumber) {
        // Map guild numbers to their images
        // Paths are relative to index.html location
        const guildImages = {
            2: 'resources/guilds/Church.png',
            3: 'resources/guilds/Blacksmith.png',
            4: 'resources/guilds/Quarry.png',
            5: 'resources/guilds/Port.png',
            6: 'resources/guilds/Farm.png',
            8: 'resources/guilds/Tavern.png',
            9: 'resources/guilds/Market.png',
            10: 'resources/guilds/Sawmill.png',
            11: 'resources/guilds/Jewelers.png',
            12: 'resources/guilds/Monastery.png'
        };

        return guildImages[guildNumber] || null;
    }

    getEventBackgroundImage(eventIdOrEvent) {
        // Handle both event objects and event IDs for backward compatibility
        let eventId = eventIdOrEvent;
        let event = null;

        if (typeof eventIdOrEvent === 'object') {
            event = eventIdOrEvent;
            eventId = event.id;
        }

        // Map event IDs to their background images
        // Paths are relative to index.html location
        const eventImages = {
            // Temporary/Blocking events
            'plague': 'resources/blocking_events/Plague.png',
            'famine': 'resources/blocking_events/Famine.png',
            'trade_blockade': 'resources/blocking_events/TradeBlock.png',
            'mine_collapse': 'resources/blocking_events/MineCollapse.png',
            'material_shortage': 'resources/blocking_events/ResourcesOutage.png',
            // Action events
            'good_harvest': 'resources/action_events/good_harvest.png',
            'prosperity': 'resources/action_events/prosperity.png',
            'expedition': 'resources/action_events/expedition.png',
            'bad_harvest': 'resources/action_events/bad_harvest.png',
            'bankruptcy': 'resources/action_events/bankruptcy.png',
            'mutiny': 'resources/action_events/mutiny.png',
            'invasion': 'resources/action_events/invasion.png',
            'expropriation': 'resources/action_events/expropriation.png',
            'tax_collection': 'resources/action_events/tax_collection.png'
        };

        // Guild number to image name mapping
        const guildImages = {
            2: 'Church',
            3: 'Blacksmith',
            4: 'Quarry',
            5: 'Port',
            6: 'Farm',
            8: 'Tavern',
            9: 'Market',
            10: 'Sawmill',
            11: 'Jewelers',
            12: 'Monastery'
        };

        // If event is a guild foundation, return guild image
        if (event && event.type === EVENT_TYPES.GUILD_FOUNDATION && event.guild) {
            const guildName = guildImages[event.guild];
            return guildName ? `resources/guilds/${guildName}.png` : null;
        }

        return eventImages[eventId] || null;
    }

    // Removed updateTemporaryEventsDisplay - events now shown in guild grid

    updateDiceDisplay(die1, die2, sum) {
        // Get references to dice elements and containers
        const diceArea = document.getElementById('dice-area');
        const die1Container = document.getElementById('die1-container');
        const die2Container = document.getElementById('die2-container');
        const die1Element = this.elements.die1;
        const die2Element = this.elements.die2;
        const diceSumElement = this.elements.diceSum;

        // Map die values to rotation angles
        const rotations = {
            1: 'rotateX(0deg) rotateY(0deg)',
            2: 'rotateX(0deg) rotateY(-90deg)',
            3: 'rotateX(0deg) rotateY(-180deg)',
            4: 'rotateX(0deg) rotateY(90deg)',
            5: 'rotateX(-90deg) rotateY(0deg)',
            6: 'rotateX(90deg) rotateY(0deg)'
        };

        // CRITICAL: Reset inline transforms to allow animation to work
        // Inline styles have higher specificity than CSS animations!
        die1Element.style.transform = '';
        die2Element.style.transform = '';

        // Force browser to apply the transform reset before starting animation
        // This is necessary to ensure the animation starts from the correct position
        void die1Element.offsetHeight; // Trigger reflow

        // Move dice to center and start rolling animation
        diceArea.classList.add('centered', 'rolling');
        die1Container.classList.add('rolling');
        die2Container.classList.add('rolling');

        const rollDuration = 2000; // 2 seconds rolling
        const displayDuration = 1000; // 1 second showing result in center

        // After rolling animation completes, show final result
        setTimeout(() => {
            // Remove rolling animation
            die1Container.classList.remove('rolling');
            die2Container.classList.remove('rolling');
            diceArea.classList.remove('rolling');

            // Rotate cubes to show the correct face
            die1Element.style.transform = rotations[die1];
            die2Element.style.transform = rotations[die2];

            // After displaying result in center for 1 second, move to bottom-right
            setTimeout(() => {
                // Remove centered class to move back to bottom-right corner
                diceArea.classList.remove('centered');
            }, displayDuration);
        }, rollDuration);
    }

    updateActionButtons() {
        const player = this.game.players[this.game.currentPlayerIndex];
        const isHumanTurn = !player.isAI && this.game.phase === 'investment';

        // Invest in Guild
        const investGuildBtn = document.querySelector('[data-action="invest-guild"]');
        const maxInvestments = (player.character && player.character.additionalInvestment) ? 3 : 2;
        const canInvestInGuild = player.investmentsThisTurn < maxInvestments &&
                                 player.guildInvestmentsThisTurn < 2 &&
                                 (!player.investedInGuildThisTurn || (player.character && player.character.additionalInvestment));
        // Check if artisan can make a free investment in Blacksmith/Jewelry
        const canInvestGuildFree = player.character && player.character.firstInvestmentFree &&
                                   player.reserve >= 1 &&
                                   player.character.firstInvestmentFree.some(guildNum => {
                                       const guild = this.game.activeGuilds.find(g => g.number === guildNum);
                                       return guild && guild.investments.filter(inv => inv.playerId === player.id).length === 0;
                                   });
        const hasCoinsForGuild = canInvestGuildFree || player.coins >= 2;
        investGuildBtn.disabled = !isHumanTurn || !hasCoinsForGuild || !canInvestInGuild;

        // Invest in Expedition
        const investExpeditionBtn = document.querySelector('[data-action="invest-expedition"]');
        const canInvestExpeditionFree = player.character && player.character.freeExpeditionInvestment &&
                                         this.game.expedition.investments.length === 0;
        const hasCoinsForExpedition = canInvestExpeditionFree || player.coins >= 2;
        const canInvestInExpedition = player.investmentsThisTurn < maxInvestments &&
                                      player.expeditionInvestmentsThisTurn < 2 &&
                                      (!player.investedInExpeditionThisTurn || (player.character && player.character.additionalInvestment));
        investExpeditionBtn.disabled = !isHumanTurn || !hasCoinsForExpedition ||
            this.game.expedition.investments.length >= 4 || !canInvestInExpedition;

        // Buy Land
        const buyLandBtn = document.querySelector('[data-action="buy-land"]');
        buyLandBtn.disabled = !isHumanTurn || player.coins < 2;

        // Cultivate Land
        const cultivateLandBtn = document.querySelector('[data-action="cultivate-land"]');
        cultivateLandBtn.disabled = !isHumanTurn || player.coins < 1 ||
            player.getUncultivatedLandIndices().length === 0;

        // Build Inn
        const innCost = player.character && player.character.innCost ? player.character.innCost : 6;
        const buildInnBtn = document.querySelector('[data-action="build-inn"]');
        buildInnBtn.disabled = !isHumanTurn || player.coins < innCost || player.lands.length === 0;
        buildInnBtn.innerHTML = `<span class="action-text">Construir Posada (${innCost})</span>`;

        // Repair Inn
        const repairInnBtn = document.querySelector('[data-action="repair-inn"]');
        repairInnBtn.disabled = !isHumanTurn || player.coins < 1 ||
            player.getDestroyedInnIndices().length === 0;

        // End Turn
        const endTurnBtn = document.querySelector('[data-action="end-turn"]');
        endTurnBtn.disabled = !isHumanTurn;

        // Cause Mutiny (Mercenary only)
        const mutinyBtn = document.querySelector('[data-action="cause-mutiny"]');
        if (mutinyBtn && mutinyBtn.style.display !== 'none') {
            mutinyBtn.disabled = !isHumanTurn || player.coins < 1 ||
                (player.usedMutinyAbility || false) ||
                !this.game.activeGuilds.some(g => g.investments.some(inv => inv.playerId === player.id));
        }

        // Buy Treasure (Artisan only)
        const buyTreasureBtn = document.querySelector('[data-action="buy-treasure"]');
        if (buyTreasureBtn && buyTreasureBtn.style.display !== 'none') {
            buyTreasureBtn.disabled = !isHumanTurn || player.coins < 4 || player.usedArtisanTreasureAbility;
            buyTreasureBtn.style.opacity = buyTreasureBtn.disabled ? '0.5' : '1';
        }

        // Sell Treasure (Artisan only)
        const sellTreasureBtn = document.querySelector('[data-action="sell-treasure-artisan"]');
        if (sellTreasureBtn && sellTreasureBtn.style.display !== 'none') {
            sellTreasureBtn.disabled = !isHumanTurn || player.usedArtisanTreasureAbility || player.treasures.length === 0;
            sellTreasureBtn.style.opacity = sellTreasureBtn.disabled ? '0.5' : '1';
        }
    }

    addLogMessage(message, type = 'info') {
        // Prevent duplicate messages (check last message)
        const lastMessage = this.elements.logMessages.lastChild;
        if (lastMessage && lastMessage.textContent === message) {
            return; // Don't add duplicate
        }

        const div = document.createElement('div');
        div.className = `log-message log-${type}`;
        div.textContent = message;

        // Add to the end (bottom) so newest messages appear at bottom
        this.elements.logMessages.appendChild(div);

        // Limit log to 30 messages
        while (this.elements.logMessages.children.length > 30) {
            this.elements.logMessages.removeChild(this.elements.logMessages.firstChild);
        }

        // Auto-scroll to bottom to show newest message
        this.elements.logMessages.scrollTop = this.elements.logMessages.scrollHeight;
    }

    showGameOver(winner) {
        // Always include treasures in final scores (true parameter)
        const scores = this.game.players
            .map(p => ({ name: p.name, vp: p.getVictoryPoints(this.game, true) }))
            .sort((a, b) => b.vp - a.vp);

        this.elements.finalScores.innerHTML = `
            <h3>🏆 ${winner.name} gana!</h3>
            <div style="margin-top: 20px;">
                ${scores.map((s, i) => `
                    <p style="font-size: 1.1em; margin: 10px 0;">
                        ${i + 1}. ${s.name}: <strong>${s.vp} VP</strong>
                    </p>
                `).join('')}
            </div>
        `;

        this.elements.gameOverModal.classList.remove('hidden');
    }

    showGovernorEventChoice() {
        if (this.game.eventDeck.length < 2) {
            // Not enough events, just draw one
            this.game.drawAndApplyEvent();
            this.game.phase = 'roll';
            setTimeout(() => this.game.nextPhase(), 1500);
            return;
        }

        // Draw two events without applying them
        const event1 = this.game.eventDeck[this.game.eventDeck.length - 1];
        const event2 = this.game.eventDeck[this.game.eventDeck.length - 2];

        // Get event image paths (pass full event objects to handle guild foundations)
        const event1Image = this.getEventBackgroundImage(event1);
        const event2Image = this.getEventBackgroundImage(event2);

        // Show modal for choice
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.style.display = 'flex';
        modal.style.zIndex = '2000';
        modal.style.padding = '10px';
        modal.innerHTML = `
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: clamp(10px, 2vw, 20px); max-width: 95vw; max-height: 90vh; width: auto; margin: 0 auto; padding: clamp(8px, 2vmin, 15px); background: rgba(26, 45, 61, 0.95); border-radius: 8px; border: 2px solid var(--color-illuminated-blue);">
                <h2 style="grid-column: 1 / -1; text-align: center; color: var(--color-antique-gold); margin: 0 0 clamp(8px, 1.5vmin, 12px) 0; font-size: clamp(14px, 3vmin, 20px);">Gobernador: Elige un Evento</h2>
                <div class="event-option" data-event-index="0" style="cursor: pointer; transition: transform 0.2s;">
                    <div class="event-card" style="
                        width: clamp(120px, 25vw, 200px);
                        height: clamp(180px, 37.5vw, 300px);
                        background-image: url('${event1Image}');
                        background-size: cover;
                        background-position: center;
                        border-radius: 6px;
                        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.5);
                        border: 2px solid transparent;
                    ">
                    </div>
                </div>
                <div class="event-option" data-event-index="1" style="cursor: pointer; transition: transform 0.2s;">
                    <div class="event-card" style="
                        width: clamp(120px, 25vw, 200px);
                        height: clamp(180px, 37.5vw, 300px);
                        background-image: url('${event2Image}');
                        background-size: cover;
                        background-position: center;
                        border-radius: 6px;
                        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.5);
                        border: 2px solid transparent;
                    ">
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        modal.offsetHeight; // Force reflow

        // Add click handlers and hover effects
        modal.querySelectorAll('.event-option').forEach(option => {
            const card = option.querySelector('.event-card');

            // Add hover effect
            option.addEventListener('mouseenter', () => {
                option.style.transform = 'scale(1.05)';
                card.style.border = '2px solid var(--color-antique-gold)';
                card.style.boxShadow = '0 0 20px rgba(201, 169, 97, 0.8)';
            });
            option.addEventListener('mouseleave', () => {
                option.style.transform = 'scale(1)';
                card.style.border = '2px solid transparent';
                card.style.boxShadow = '0 8px 16px rgba(0, 0, 0, 0.5)';
            });

            // Add touch support for mobile
            option.addEventListener('touchstart', () => {
                option.style.transform = 'scale(1.05)';
                card.style.border = '2px solid var(--color-antique-gold)';
                card.style.boxShadow = '0 0 20px rgba(201, 169, 97, 0.8)';
            });

            option.addEventListener('click', () => {
                const eventIndex = parseInt(option.dataset.eventIndex);

                // Remove selected event from deck and apply it
                const selectedEvent = this.game.eventDeck.splice(this.game.eventDeck.length - 1 - eventIndex, 1)[0];
                this.game.currentEvent = selectedEvent;

                const message = this.game.eventHandler.handleEvent(selectedEvent);
                this.game.log(message, 'event');

                // Discard event (unless it's temporary)
                if (selectedEvent.type !== EVENT_TYPES.TEMPORARY) {
                    this.game.eventDiscard.push(selectedEvent);
                }

                if (this.game.ui) {
                    this.game.ui.updateEventDisplay(selectedEvent);
                    this.game.ui.updateGameState();
                }

                // Remove modal
                document.body.removeChild(modal);

                // Continue to roll phase
                this.game.phase = 'roll';
                setTimeout(() => this.game.nextPhase(), 1500);
            });
        });
    }

    showCharacterInfoModal(character, playerName) {
        const modal = document.getElementById('character-info-modal');
        const title = document.getElementById('character-info-modal-title');
        const body = document.getElementById('character-info-modal-body');

        if (!modal || !title || !body || !character) return;

        // Hide title
        title.style.display = 'none';

        const imagePath = getCharacterImagePath(character.id);
        let contentHTML = '<div class="character-modal-layout">';
        contentHTML += `<div class="character-modal-image-container">`;
        contentHTML += `<img src="${imagePath}" alt="${character.nameES}" class="character-image-modal">`;
        contentHTML += `</div>`;
        contentHTML += `<div class="character-modal-buttons-column">`;
        contentHTML += `<button class="btn-cancel-character-modal" id="close-character-preview-btn">Cerrar</button>`;
        contentHTML += `</div>`;
        contentHTML += '</div>';

        body.innerHTML = contentHTML;

        // Add click handler for close button
        const closeBtn = body.querySelector('#close-character-preview-btn');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                this.hideCharacterInfoModal();
            });
        }

        // Add backdrop click to close
        const modalBackdropHandler = (e) => {
            if (e.target === modal) {
                this.hideCharacterInfoModal();
                modal.removeEventListener('click', modalBackdropHandler);
            }
        };
        modal.addEventListener('click', modalBackdropHandler);

        modal.classList.remove('hidden');
    }

    hideCharacterInfoModal() {
        const modal = document.getElementById('character-info-modal');
        if (modal) {
            modal.classList.add('hidden');
        }
    }

    makeCharacterInfoClickable(element, character, playerName) {
        if (!element || !character) return;

        element.style.cursor = 'pointer';
        element.title = 'Click para ver detalles del personaje';

        // Remove any existing listeners by cloning the element
        const newElement = element.cloneNode(true);
        element.parentNode.replaceChild(newElement, element);

        // Add new listener
        newElement.addEventListener('click', (e) => {
            e.stopPropagation();
            this.showCharacterInfoModal(character, playerName);
        });
    }
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { UIController };
}
