// GameScene - Main gameplay scene

class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });
        this.characterSelected = false;
    }

    create() {
        const { width, height } = this.cameras.main;

        // Reset state for new game session
        this.characterSelected = false;
        if (this.game_instance) {
            this.game_instance.removeAllListeners();
            this.game_instance = null;
        }

        // Get scaled layout values
        this.layout = getScaledLayout(width, height);

        // Mobile visibility handling - pause game when app is minimized
        this.visibilityHandler = () => {
            if (!this.game_instance) return;

            if (document.hidden) {
                this.game_instance.pause();
                this.scene.pause();
            } else {
                this.game_instance.resume();
                this.scene.resume();

                // Force canvas redraw after returning from background
                // This fixes blank screen on mobile when switching apps
                if (this.cameras && this.cameras.main) {
                    this.cameras.main.dirty = true;
                }

                // Trigger a manual render to ensure display is refreshed
                if (this.game && this.game.renderer) {
                    this.game.renderer.snapshot(() => {});
                }
            }
        };
        document.addEventListener('visibilitychange', this.visibilityHandler);

        // Clean up visibility handler when scene shuts down
        this.events.on('shutdown', () => {
            document.removeEventListener('visibilitychange', this.visibilityHandler);
        });

        // Fade in
        this.cameras.main.fadeIn(300);

        // Get difficulty from registry
        const difficulty = this.registry.get('difficulty') || 'medium';

        // Create the game instance
        this.game_instance = new GremiosGame(3, difficulty);

        // Assign random characters to AI players
        const usedCharacterIds = [];
        for (let i = 1; i < 3; i++) {
            const aiChar = getRandomCharacter(usedCharacterIds);
            this.game_instance.players[i].setCharacter(aiChar);
            usedCharacterIds.push(aiChar.id);
        }
        this.usedCharacterIds = usedCharacterIds;

        // Create UI in correct order (back to front)
        this.createBackground();
        this.createHUDPanel();
        this.createBoardElements();
        this.createHUDs();
        this.createEndTurnButton();

        // Create modal manager for dialogs
        this.modalManager = new ModalManager(this);

        // Show initial guilds
        this.updateGuildDisplay();

        // Show character selection overlay
        this.showCharacterSelection(difficulty);
    }

    createBackground() {
        const { width, height } = this.cameras.main;
        const L = this.layout;
        const board = L.board;

        // Dark background for entire screen (matches HUD panel)
        this.add.rectangle(width / 2, height / 2, width, height, 0x2a2015);

        // Board image - positioned at the RIGHT side
        this.boardBg = this.add.image(board.centerX, board.centerY, 'board');
        this.boardBg.setDisplaySize(board.width, board.height);
    }

    createHUDPanel() {
        const { height } = this.cameras.main;
        const L = this.layout;

        // HUD panel fills the actual area to the left of the board
        const actualHudAreaWidth = L.board.hudAreaWidth;
        this.hudPanelBg = this.add.rectangle(
            actualHudAreaWidth / 2,
            height / 2,
            actualHudAreaWidth,
            height,
            0x2a2015
        );

        // Menu button in top-right of HUD panel
        const btnSize = Math.floor(height * 0.09);
        const margin = Math.floor(actualHudAreaWidth * 0.03);
        const btnX = actualHudAreaWidth - margin - btnSize / 2;
        const btnY = margin + btnSize / 2;

        this.menuBtn = this.add.rectangle(btnX, btnY, btnSize, btnSize, 0x2a2015)
            .setStrokeStyle(2, 0xe6c870)
            .setInteractive({ useHandCursor: true });

        this.menuBtnText = this.add.text(btnX, btnY, '☰', {
            fontFamily: 'Arial, sans-serif',
            fontSize: Math.floor(btnSize * 0.6) + 'px',
            color: '#e6c870'
        }).setOrigin(0.5);

        this.menuBtn.on('pointerover', () => this.menuBtn.setFillStyle(0x3a3025));
        this.menuBtn.on('pointerout', () => this.menuBtn.setFillStyle(0x2a2015));
        this.menuBtn.on('pointerdown', () => this.showGameMenu());
    }

    createBoardElements() {
        const L = this.layout;

        // Get positions from board-relative coordinates
        const eventPos = getTopAreaPosition('currentEvent', L);
        const expeditionPos = getTopAreaPosition('expedition', L);
        const diceAreaPos = BOARD.topArea.diceArea;
        const dicePos = boardToScreen(L.board, diceAreaPos.x, diceAreaPos.y);

        // Event display (uses topCard dimensions for taller cards)
        this.eventDisplay = new EventDisplay(
            this,
            eventPos.x,
            eventPos.y,
            L.topCardWidth,
            L.topCardHeight
        );

        // Blocking events display (middle row of board)
        this.blockingEventDisplay = new BlockingEventDisplay(this, L);

        // Dice roller - positioned based on board coordinates
        const diceWidth = Math.floor(L.board.width * diceAreaPos.width / 100);
        this.diceRoller = new DiceRoller(
            this,
            dicePos.x + diceWidth / 2,
            dicePos.y + diceWidth / 2,
            L.fontSizeLarge
        );

        // Expedition card (uses topCard dimensions for taller cards)
        this.expeditionCard = new ExpeditionCard(
            this,
            expeditionPos.x,
            expeditionPos.y,
            L.topCardWidth,
            L.topCardHeight
        );

        // Guild cards container
        this.guildCardSprites = [];
    }

    createHUDs() {
        const { height } = this.cameras.main;
        const L = this.layout;

        this.huds = [];

        // Check if we should hide opponent characters (hard mode)
        const difficulty = this.registry.get('difficulty') || 'medium';
        const hideOpponents = difficulty === 'hard';

        // Scaling factors
        const activeScale = 1.8;
        const inactiveScale = 0.75;
        const HUD_ASPECT = 1150 / 600;  // width:height ratio

        // Total scale factor: 1 active (1.8) + 2 inactive (0.75 each) = 3.3
        const totalScaleFactor = activeScale + (inactiveScale * 2);

        // Use actual available space left of board (not the potentially smaller L.hudWidth)
        const actualHudAreaWidth = L.board.hudAreaWidth;
        const padding = Math.floor(actualHudAreaWidth * 0.02);  // 2% padding on each side
        const availableWidth = actualHudAreaWidth - padding * 2;

        // Vertical space: screen height minus button and margins
        const buttonHeight = Math.floor(height * 0.04);
        const availableHeight = height - buttonHeight - L.hudMargin * 5;

        // Calculate max base dimensions considering actual scaling usage
        // Width: active HUD at 1.2x must fit horizontally
        const maxBaseWidthFromHorizontal = availableWidth / activeScale;

        // Height: 1 active (1.2x) + 2 inactive (0.8x) must fit with spacing
        const maxBaseHeightFromVertical = (availableHeight - L.hudMargin * 2) / totalScaleFactor;

        // Apply aspect ratio to find the limiting dimension
        const widthFromMaxHeight = maxBaseHeightFromVertical * HUD_ASPECT;

        let hudWidth, hudHeight;
        if (widthFromMaxHeight <= maxBaseWidthFromHorizontal) {
            // Height is the limiting factor
            hudHeight = Math.floor(maxBaseHeightFromVertical);
            hudWidth = Math.floor(hudHeight * HUD_ASPECT);
        } else {
            // Width is the limiting factor
            hudWidth = Math.floor(maxBaseWidthFromHorizontal);
            hudHeight = Math.floor(hudWidth / HUD_ASPECT);
        }

        // Store for later calculations
        this.hudHeight = hudHeight;
        this.hudCenterX = padding + availableWidth / 2;

        // Calculate initial Y positions (player 0 active)
        const positions = this.calculateHudPositions(0);

        for (let i = 0; i < 3; i++) {
            const player = this.game_instance.players[i];
            const isHuman = i === 0;
            const hideCharacter = hideOpponents && !isHuman;

            const hud = new PlayerHUD(
                this,
                this.hudCenterX,
                positions[i],
                player,
                isHuman,
                hudWidth,
                hudHeight,
                L,
                i,
                hideCharacter
            );

            this.huds.push(hud);
        }

        // Set initial scales (player 0 starts active)
        this.huds.forEach((hud, i) => {
            hud.setActive(i === 0, false);
        });
    }

    calculateHudPositions(activeIndex) {
        const { height } = this.cameras.main;
        const L = this.layout;
        const hudHeight = this.hudHeight;

        const activeScale = 1.8;
        const inactiveScale = 0.75;
        const activeH = hudHeight * activeScale;
        const inactiveH = hudHeight * inactiveScale;

        const buttonHeight = Math.floor(height * 0.04);
        const margin = L.hudMargin;

        // Start from top with minimal margin (better use of vertical space)
        const startY = margin;

        // Calculate positions based on who is active
        const positions = [];
        let currentY = startY;

        for (let i = 0; i < 3; i++) {
            const isActive = i === activeIndex;
            const h = isActive ? activeH : inactiveH;
            positions[i] = currentY + h / 2;
            currentY += h + margin;
        }

        return positions;
    }

    createEndTurnButton() {
        const { height } = this.cameras.main;
        const L = this.layout;

        // Use actual available space (same as createHUDs)
        const actualHudAreaWidth = L.board.hudAreaWidth;
        const padding = Math.floor(actualHudAreaWidth * 0.02);
        const availableWidth = actualHudAreaWidth - padding * 2;

        const btnX = padding + availableWidth / 2;
        const btnWidth = availableWidth * 0.6;
        // Increased button height for better visibility on mobile
        const btnHeight = Math.floor(height * 0.055);

        // Calculate HUD dimensions (same as createHUDs)
        const activeScale = 1.8;
        const HUD_ASPECT = 1150 / 600;
        const buttonHeightCalc = Math.floor(height * 0.065);
        const availableHeight = height - buttonHeightCalc - L.hudMargin * 4;
        const maxBaseHeightFromVertical = (availableHeight - L.hudMargin * 2) / (3 * activeScale);
        const maxBaseWidthFromHorizontal = availableWidth / activeScale;
        const widthFromMaxHeight = maxBaseHeightFromVertical * HUD_ASPECT;

        let hudHeight;
        if (widthFromMaxHeight <= maxBaseWidthFromHorizontal) {
            hudHeight = Math.floor(maxBaseHeightFromVertical);
        } else {
            const hudWidth = Math.floor(maxBaseWidthFromHorizontal);
            hudHeight = Math.floor(hudWidth / HUD_ASPECT);
        }

        const scaledHeight = hudHeight * activeScale;
        const totalHudSpace = scaledHeight * 3 + L.hudMargin * 2;
        const startY = (height - buttonHeightCalc - totalHudSpace) / 2 + scaledHeight / 2;
        const hudEndY = startY + (scaledHeight + L.hudMargin) * 2 + scaledHeight / 2;

        // Small gap between HUDs and button, ensure 8px min margin from bottom
        const btnY = Math.min(hudEndY + L.hudMargin / 2 + btnHeight / 2, height - btnHeight / 2 - 8);

        this.endTurnBg = this.add.rectangle(btnX, btnY, btnWidth, btnHeight, 0x8b3545)
            .setStrokeStyle(2, 0xe6c870)
            .setInteractive({ useHandCursor: true });

        this.endTurnText = this.add.text(btnX, btnY, 'Terminar Turno', {
            fontFamily: 'Georgia, serif',
            fontSize: L.fontSizeMedium + 'px',
            color: '#ffffff'
        }).setOrigin(0.5);

        // Hide initially during character selection
        this.endTurnBg.setVisible(false);
        this.endTurnText.setVisible(false);

        this.endTurnBg.on('pointerdown', () => {
            if (this.characterSelected && this.canEndTurn()) {
                this.endTurn();
            }
        });

        this.endTurnBg.on('pointerover', () => {
            if (this.characterSelected && this.canEndTurn()) {
                this.endTurnBg.setFillStyle(0xa04555);
            }
        });

        this.endTurnBg.on('pointerout', () => {
            this.endTurnBg.setFillStyle(0x8b3545);
        });
    }

    showCharacterSelection(difficulty) {
        const { width, height } = this.cameras.main;
        const L = this.layout;

        // Use actual available space (same as createHUDs)
        const actualHudAreaWidth = L.board.hudAreaWidth;
        const padding = Math.floor(actualHudAreaWidth * 0.02);
        const availableWidth = actualHudAreaWidth - padding * 2;
        const centerX = padding + availableWidth / 2;

        // During character selection, AI HUDs are at scale 1.0 (not 0.75)
        const selectionScale = 1.8;  // Character selection area scale
        const aiSelectionScale = 1.0;  // AI HUDs during selection
        const HUD_ASPECT = 1150 / 600;

        // Total scale factor during selection: 1.8 + 1.0 * 2 = 3.8
        const totalScaleFactor = selectionScale + (aiSelectionScale * 2);

        // No end-turn button during character selection - use full height
        const availableHeight = height - L.hudMargin * 4;
        const maxBaseHeightFromVertical = (availableHeight - L.hudMargin * 2) / totalScaleFactor;
        const maxBaseWidthFromHorizontal = availableWidth / selectionScale;
        const widthFromMaxHeight = maxBaseHeightFromVertical * HUD_ASPECT;

        let hudWidth, hudHeight;
        if (widthFromMaxHeight <= maxBaseWidthFromHorizontal) {
            hudHeight = Math.floor(maxBaseHeightFromVertical);
            hudWidth = Math.floor(hudHeight * HUD_ASPECT);
        } else {
            hudWidth = Math.floor(maxBaseWidthFromHorizontal);
            hudHeight = Math.floor(hudWidth / HUD_ASPECT);
        }

        // Character selection area dimensions
        const scaledHeight = hudHeight * selectionScale;
        const scaledWidth = hudWidth * selectionScale;
        const aiHudHeight = hudHeight * aiSelectionScale;

        // Position character selection at top
        const startY = L.hudMargin + scaledHeight / 2;

        // Reposition AI HUDs for selection phase (below character selection)
        const aiHud1Y = startY + scaledHeight / 2 + L.hudMargin + aiHudHeight / 2;
        const aiHud2Y = aiHud1Y + aiHudHeight + L.hudMargin;

        // HIDE human player HUD completely during selection
        this.huds[0].setVisible(false);

        // Hide menu button during selection (would overlap with character cards)
        this.menuBtn.setVisible(false);
        this.menuBtnText.setVisible(false);

        // Set AI HUDs to scale 1 during character selection for better visibility
        this.huds[1].setScale(1);
        this.huds[2].setScale(1);

        // Reposition AI HUDs (below character selection area)
        this.huds[1].setY(aiHud1Y);
        this.huds[2].setY(aiHud2Y);

        // In hard mode, hide resource counts (could give clues about characters)
        if (difficulty === 'hard') {
            this.huds[1].hideResourceCounts();
            this.huds[2].hideResourceCounts();
        }

        // Create character selection container in HUD area (no board overlay)
        this.charSelectContainer = this.add.container(0, 0);

        // First HUD bounds
        const hudTop = startY - scaledHeight / 2;
        const hudBottom = startY + scaledHeight / 2;

        // Title at top of first HUD area
        const titleY = hudTop + L.hudMargin * 2;
        const title = this.add.text(centerX, titleY, 'Elige personaje', {
            fontFamily: 'Georgia, serif',
            fontSize: L.fontSizeMedium + 'px',
            color: '#e6c870',
            align: 'center'
        }).setOrigin(0.5, 0);
        this.charSelectContainer.add(title);

        // Pick 2 random characters
        const allCharacters = Object.values(CHARACTERS);
        const availableChars = allCharacters.filter(c => !this.usedCharacterIds.includes(c.id));
        const shuffled = shuffleArray([...availableChars]);
        const options = shuffled.slice(0, 2);

        // Character cards - centered in space below title
        const titleBottom = titleY + L.fontSizeMedium + L.hudMargin;
        const cardsAreaTop = titleBottom;
        const cardsAreaBottom = hudBottom - L.hudMargin;
        const cardsAreaHeight = cardsAreaBottom - cardsAreaTop;

        const cardHeight = cardsAreaHeight * 0.92;
        const cardWidth = scaledWidth * 0.46;
        const cardY = cardsAreaTop + cardsAreaHeight / 2;
        const spacing = scaledWidth * 0.04;

        options.forEach((char, index) => {
            const cardX = centerX + (index === 0 ? -cardWidth / 2 - spacing / 2 : cardWidth / 2 + spacing / 2);
            this.createCharacterCard(cardX, cardY, cardWidth, cardHeight, char);
        });
    }

    createCharacterCard(x, y, cardWidth, cardHeight, character) {
        const L = this.layout;

        // Use make to create without adding to scene display list
        const bg = this.make.graphics({ x: 0, y: 0, add: false });
        bg.fillStyle(0x2a2015);
        bg.fillRect(x - cardWidth / 2, y - cardHeight / 2, cardWidth, cardHeight);
        bg.setInteractive(new Phaser.Geom.Rectangle(x - cardWidth / 2, y - cardHeight / 2, cardWidth, cardHeight), Phaser.Geom.Rectangle.Contains);
        bg.input.cursor = 'pointer';
        this.charSelectContainer.add(bg);

        // Character image - create without adding to scene
        const img = this.make.image({ x: x, y: y, key: character.id, add: false });

        // Calculate scale to fill card while keeping proportions
        const maxWidth = cardWidth * 0.92;
        const maxHeight = cardHeight * 0.92;
        const scaleX = maxWidth / img.width;
        const scaleY = maxHeight / img.height;
        const scale = Math.min(scaleX, scaleY);
        img.setScale(scale);

        this.charSelectContainer.add(img);

        // Store original scale for hover effect
        const originalScale = scale;

        bg.on('pointerover', () => {
            bg.clear();
            bg.fillStyle(0x2a2015);
            bg.fillRect(x - cardWidth / 2, y - cardHeight / 2, cardWidth, cardHeight);
            bg.lineStyle(4, 0xffffff);
            bg.strokeRect(x - cardWidth / 2, y - cardHeight / 2, cardWidth, cardHeight);
            this.tweens.add({
                targets: img,
                scaleX: originalScale * 1.05,
                scaleY: originalScale * 1.05,
                duration: 100
            });
        });

        bg.on('pointerout', () => {
            bg.clear();
            bg.fillStyle(0x2a2015);
            bg.fillRect(x - cardWidth / 2, y - cardHeight / 2, cardWidth, cardHeight);
            this.tweens.add({
                targets: img,
                scaleX: originalScale,
                scaleY: originalScale,
                duration: 100
            });
        });

        bg.on('pointerdown', () => {
            this.previewCharacter(character);
        });
    }

    previewCharacter(character) {
        const L = this.layout;
        const { height } = this.cameras.main;
        const hudAreaWidth = L.board.hudAreaWidth;

        this.modalManager.show({
            showClose: false,
            width: hudAreaWidth * 0.98,
            height: height * 0.95,
            // Position modal in HUD area (left side)
            centerX: hudAreaWidth / 2,
            overlayX: hudAreaWidth / 2,
            overlayWidth: hudAreaWidth,
            fullScreenDismiss: true,
            content: (container, cx, cy, w, h) => {
                // Character image - positioned higher to leave room for button
                const img = this.make.image({ x: cx, y: cy - h * 0.12, key: character.id, add: false });
                const maxSize = Math.min(w * 0.95, h * 0.68);
                const scale = maxSize / Math.max(img.width, img.height);
                img.setScale(scale);
                container.add(img);
            },
            buttons: [
                { text: 'Confirmar', primary: true, large: true, onClick: () => this.selectCharacter(character) }
            ]
        });
    }

    selectCharacter(character) {
        this.game_instance.players[0].setCharacter(character);
        this.characterSelected = true;

        // Destroy selection immediately (no animation)
        this.charSelectContainer.destroy(true);

        // Reveal opponent characters if they were hidden (hard mode)
        const difficulty = this.registry.get('difficulty') || 'medium';
        if (difficulty === 'hard') {
            this.huds[1].revealCharacter();
            this.huds[2].revealCharacter();
            // Show resource counts that were hidden during selection
            this.huds[1].showResourceCounts();
            this.huds[2].showResourceCounts();
        }

        // Reset AI HUD scales and positions to normal gameplay layout
        const positions = this.calculateHudPositions(0);  // Player 0 starts active
        this.huds[0].setY(positions[0]);
        this.huds[1].setScale(0.75);
        this.huds[1].setY(positions[1]);
        this.huds[2].setScale(0.75);
        this.huds[2].setY(positions[2]);

        // Update HUD with character before showing
        this.huds[0].update(this.game_instance.players[0], this.game_instance);

        // Show human HUD immediately
        this.huds[0].setVisible(true);
        this.huds[0].setAlpha(1);

        // Show menu button again
        this.menuBtn.setVisible(true);
        this.menuBtnText.setVisible(true);

        // Start game after 0.5 sec delay
        this.time.delayedCall(500, () => {
            this.setupGameListeners();
            this.game_instance.startGame();
            this.updateAllUI();
        });
    }

    canEndTurn() {
        const game = this.game_instance;
        return game.phase === 'investment' &&
               game.currentPlayerIndex === 0 &&
               !game.players[0].isAI;
    }

    endTurn() {
        this.game_instance.endTurn();
    }

    setupGameListeners() {
        const game = this.game_instance;

        game.on('phaseChanged', (phase) => this.onPhaseChanged(phase));
        game.on('turnChanged', (playerIndex) => this.onTurnChanged(playerIndex));
        game.on('eventDrawn', (event) => this.onEventDrawn(event));
        game.on('diceRolled', (result) => this.onDiceRolled(result));
        game.on('guildUpdated', () => this.updateGuildDisplay());
        game.on('guildInvested', (data) => this.onGuildInvested(data));
        game.on('expeditionInvested', (data) => this.onExpeditionInvested(data));
        game.on('expeditionResolved', (data) => this.onExpeditionResolved(data));
        game.on('playerUpdated', (playerId) => this.updatePlayerHUD(playerId));
        game.on('gameOver', (winner) => this.onGameOver(winner));
        game.on('stateChanged', () => this.updateAllUI());
        game.on('governorEventChoice', (data) => this.showGovernorEventChoice(data));
        // guildPayment messages removed - too noisy after dice rolls
    }

    onGuildInvested(data) {
        const { guildNumber, playerId } = data;
        // Only show effect for AI players (not human player 0)
        if (playerId === 0) return;

        const guildCard = this.guildCardSprites.find(card => card.guild.number === guildNumber);
        if (guildCard) {
            guildCard.showInvestmentEffect(this);
        }
    }

    onExpeditionInvested(data) {
        const { playerId } = data;
        // Only show effect for AI players (not human player 0)
        if (playerId === 0) return;

        if (this.expeditionCard) {
            this.expeditionCard.showInvestmentEffect(this);
        }
    }

    onExpeditionResolved(data) {
        const { success } = data;
        if (!success || !this.expeditionCard) return;

        // Show success effect on expedition card for all players (respects animation speed)
        this.tweens.killTweensOf(this.expeditionCard);
        this.tweens.killTweensOf(this.expeditionCard.cardImage);

        const effectDuration = getAnimationDuration(250);

        // Celebratory pulse effect for successful expedition
        this.tweens.add({
            targets: this.expeditionCard,
            scaleX: 1.2,
            scaleY: 1.2,
            duration: effectDuration,
            ease: 'Sine.easeOut',
            yoyo: true,
            repeat: 1,
            onComplete: () => {
                this.expeditionCard.setScale(1);
            }
        });

        // Bright flash effect
        this.tweens.add({
            targets: this.expeditionCard.cardImage,
            alpha: 0.5,
            duration: getAnimationDuration(200),
            ease: 'Sine.easeInOut',
            yoyo: true,
            repeat: 1
        });
    }

    showGuildPaymentInfo(data) {
        const { width, height } = this.cameras.main;
        const L = this.layout;

        let message;
        let color = '#e6c870';

        if (data.notFounded) {
            message = `Gremio ${data.guildNumber} no fundado`;
            color = '#888888';
        } else if (data.blocked) {
            message = `${data.guildName} bloqueado`;
            color = '#ff6666';
        } else {
            message = `Pagos de ${data.guildName}`;
        }

        // Show temporary message above the board
        const boardCenterX = L.board.hudAreaWidth + (width - L.board.hudAreaWidth) / 2;
        const toast = this.add.text(boardCenterX, height * 0.12, message, {
            fontFamily: 'Georgia, serif',
            fontSize: L.fontSizeSmall + 'px',
            color: color,
            backgroundColor: '#1a1510',
            padding: { x: 10, y: 5 }
        }).setOrigin(0.5).setDepth(500);

        // Fade out after 2 seconds
        this.tweens.add({
            targets: toast,
            alpha: 0,
            delay: 2000,
            duration: 500,
            onComplete: () => toast.destroy()
        });
    }

    onPhaseChanged(phase) {
        this.updateEndTurnButton();
        this.updateAllUI();
    }

    onTurnChanged(playerIndex) {
        const positions = this.calculateHudPositions(playerIndex);

        this.huds.forEach((hud, i) => {
            const isActive = i === playerIndex;
            hud.setActive(isActive, true, positions[i]);
        });

        this.updateEndTurnButton();
    }

    onEventDrawn(event) {
        this.eventDisplay.showEvent(event, () => {});
    }

    onDiceRolled(result) {
        this.diceRoller.roll(result.die1, result.die2, () => {});
    }

    onGameOver(winner) {
        this.time.delayedCall(500, () => {
            this.showGameOverModal(winner);
        });
    }

    showGameOverModal(winner) {
        const { width, height } = this.cameras.main;
        const game = this.game_instance;
        const L = this.layout;

        // Sort players by VP descending
        const sortedPlayers = [...game.players].sort((a, b) => {
            return b.getVictoryPoints(game) - a.getVictoryPoints(game);
        });

        // Helper to get player resource breakdown
        const getPlayerBreakdown = (player) => {
            const breakdown = [];

            // Guilds as max investor
            const guildCount = game.activeGuilds.filter(g => g.maxInvestor === player.id).length;
            if (guildCount > 0) {
                breakdown.push({ icon: 'event_back', count: guildCount, vp: guildCount });
            }

            // Uncultivated lands
            const landCount = player.getUncultivatedLandsCount();
            if (landCount > 0) {
                breakdown.push({ icon: 'land', count: landCount, vp: 0 });
            }

            // Cultivated lands
            const cultivatedCount = player.getCultivatedLandsCount();
            if (cultivatedCount > 0) {
                breakdown.push({ icon: 'cultivated_land', count: cultivatedCount, vp: 0 });
            }

            // Active inns
            const innCount = player.getActiveInnsCount();
            if (innCount > 0) {
                breakdown.push({ icon: 'inn', count: innCount, vp: innCount });
            }

            // Destroyed inns
            const destroyedInnCount = player.getDestroyedInnsCount();
            if (destroyedInnCount > 0) {
                breakdown.push({ icon: 'destroyed_inn', count: destroyedInnCount, vp: 0 });
            }

            // 1 VP treasures (common)
            const treasure1VP = player.treasures.filter(t => t.type === 'common').length;
            if (treasure1VP > 0) {
                breakdown.push({ icon: 'treasure_1vp', count: treasure1VP, vp: treasure1VP });
            }

            // 2 VP treasures (rare)
            const treasure2VP = player.treasures.filter(t => t.type === 'rare').length;
            if (treasure2VP > 0) {
                breakdown.push({ icon: 'treasure_2vp', count: treasure2VP, vp: treasure2VP * 2 });
            }

            // 3 coins wealth treasures
            const wealth3 = player.treasures.filter(t => t.type === 'wealth' && t.coinValue === 3).length;
            if (wealth3 > 0) {
                breakdown.push({ icon: 'wealth_3', count: wealth3, vp: 0 });
            }

            // 4 coins wealth treasures
            const wealth4 = player.treasures.filter(t => t.type === 'wealth' && t.coinValue === 4).length;
            if (wealth4 > 0) {
                breakdown.push({ icon: 'wealth_4', count: wealth4, vp: 0 });
            }

            // Discoverer's emblem (badge)
            if (player.hasDiscovererEmblem) {
                breakdown.push({ icon: 'badge', count: 1, vp: 1, noBadge: true });
            }

            return breakdown;
        };

        this.modalManager.show({
            width: width * 0.85,
            height: height * 0.9,
            showClose: false,
            dismissible: false,
            content: (container, cx, cy, w, h) => {
                // Victory banner at top
                const bannerY = cy - h * 0.42;
                const bannerHeight = h * 0.08;
                const banner = this.make.graphics();
                banner.fillStyle(0x8b3545, 1);
                banner.fillRoundedRect(cx - w * 0.45, bannerY - bannerHeight / 2, w * 0.9, bannerHeight, 8);
                container.add(banner);

                // Victory text
                const isHumanWinner = winner.id === 0;
                const victoryMessage = isHumanWinner ? '¡Eres el vencedor!' : `¡${winner.name} es el vencedor!`;

                const victoryText = this.make.text({
                    x: cx, y: bannerY,
                    text: victoryMessage,
                    style: {
                        fontFamily: 'Cinzel, Georgia, serif',
                        fontSize: (L.fontSizeLarge + 2) + 'px',
                        color: '#ffffff',
                        fontStyle: 'bold'
                    }
                }).setOrigin(0.5);
                container.add(victoryText);

                // Player rows with breakdown - reduced height to fit 3 players + button
                const rowStartY = bannerY + h * 0.08;
                const rowHeight = h * 0.20;
                const iconSize = L.fontSizeSmall * 1.3;

                sortedPlayers.forEach((player, index) => {
                    const rowY = rowStartY + index * rowHeight;
                    const isWinner = player.id === winner.id;
                    const vp = player.getVictoryPoints(game);
                    const breakdown = getPlayerBreakdown(player);

                    // Row background
                    const rowBg = this.make.graphics();
                    if (isWinner) {
                        rowBg.fillStyle(0xe6c870, 0.15);
                    } else {
                        rowBg.fillStyle(0x3a3530, 0.5);
                    }
                    rowBg.fillRoundedRect(cx - w * 0.45, rowY - rowHeight * 0.35, w * 0.9, rowHeight * 0.9, 8);
                    container.add(rowBg);

                    // Rank colors
                    const rankColors = ['#ffd700', '#c0c0c0', '#cd7f32'];
                    const rankColor = index < 3 ? rankColors[index] : '#666666';

                    const leftX = cx - w * 0.4;

                    // Character portrait (left side, spanning both rows)
                    if (player.character) {
                        const portrait = this.make.image({
                            x: leftX + w * 0.06, y: rowY,
                            key: player.character.id
                        });
                        const portScale = (rowHeight * 0.75) / portrait.height;
                        portrait.setScale(portScale);
                        container.add(portrait);
                    }

                    // Content area starts after portrait
                    const contentX = leftX + w * 0.14;

                    // Top row: Rank, Name, VP
                    const topRowY = rowY - rowHeight * 0.15;

                    // Rank
                    const rankText = this.make.text({
                        x: contentX, y: topRowY,
                        text: `${index + 1}º`,
                        style: {
                            fontFamily: 'Arial, sans-serif',
                            fontSize: L.fontSizeMedium + 'px',
                            color: rankColor,
                            fontStyle: 'bold'
                        }
                    }).setOrigin(0, 0.5);
                    container.add(rankText);

                    // Player name
                    const nameText = this.make.text({
                        x: contentX + w * 0.06, y: topRowY,
                        text: player.name,
                        style: {
                            fontFamily: 'Georgia, serif',
                            fontSize: L.fontSizeMedium + 'px',
                            color: isWinner ? '#e6c870' : '#ffffff',
                            fontStyle: isWinner ? 'bold' : 'normal'
                        }
                    }).setOrigin(0, 0.5);
                    container.add(nameText);

                    // VP total on right side
                    const vpIcon = this.make.image({ x: cx + w * 0.32, y: topRowY, key: 'vp_icon' });
                    const vpIconScale = (iconSize * 1.2) / vpIcon.height;
                    vpIcon.setScale(vpIconScale);
                    container.add(vpIcon);

                    const vpText = this.make.text({
                        x: cx + w * 0.37, y: topRowY,
                        text: vp.toString(),
                        style: {
                            fontFamily: 'Arial, sans-serif',
                            fontSize: (L.fontSizeLarge) + 'px',
                            color: isWinner ? '#e6c870' : '#ffffff',
                            fontStyle: 'bold'
                        }
                    }).setOrigin(0, 0.5);
                    container.add(vpText);

                    // Bottom row: Resource breakdown (next to portrait)
                    const breakdownY = rowY + rowHeight * 0.18;
                    const itemSpacing = w * 0.08;
                    const startX = contentX;

                    breakdown.forEach((item, itemIndex) => {
                        const itemX = startX + itemIndex * itemSpacing;

                        // Icon
                        const icon = this.make.image({ x: itemX, y: breakdownY, key: item.icon });
                        icon.setDisplaySize(iconSize, iconSize);
                        container.add(icon);

                        // Count (skip for badge)
                        if (!item.noBadge) {
                            const countText = this.make.text({
                                x: itemX + iconSize * 0.6, y: breakdownY,
                                text: `×${item.count}`,
                                style: {
                                    fontFamily: 'Arial, sans-serif',
                                    fontSize: L.fontSizeSmall + 'px',
                                    color: item.vp > 0 ? '#e6c870' : '#888888'
                                }
                            }).setOrigin(0, 0.5);
                            container.add(countText);
                        }
                    });

                    // If no resources, show "Sin recursos" message
                    if (breakdown.length === 0) {
                        const noResourcesText = this.make.text({
                            x: startX, y: breakdownY,
                            text: 'Sin recursos',
                            style: {
                                fontFamily: 'Georgia, serif',
                                fontSize: L.fontSizeSmall + 'px',
                                color: '#666666',
                                fontStyle: 'italic'
                            }
                        }).setOrigin(0, 0.5);
                        container.add(noResourcesText);
                    }
                });
            },
            buttons: [
                {
                    text: 'Menú',
                    large: true,
                    primary: true,
                    onClick: () => {
                        this.modalManager.close();
                        this.scene.start('MenuScene');
                    }
                }
            ]
        });
    }

    updateAllUI() {
        if (!this.characterSelected) return;

        this.huds.forEach((hud, i) => {
            hud.update(this.game_instance.players[i], this.game_instance);
        });

        this.updateGuildDisplay();

        if (this.expeditionCard) {
            this.expeditionCard.update(this.game_instance.expedition);
        }

        // Update blocking events display
        if (this.blockingEventDisplay) {
            this.blockingEventDisplay.update(this.game_instance.activeTemporaryEvents);
        }

        this.updateEndTurnButton();
    }

    updatePlayerHUD(playerId) {
        if (this.huds[playerId]) {
            this.huds[playerId].update(this.game_instance.players[playerId], this.game_instance);
        }
    }

    updateGuildDisplay() {
        const L = this.layout;
        const game = this.game_instance;

        if (!game.activeGuilds || game.activeGuilds.length === 0) return;

        // Initialize array if needed
        if (!this.guildCardSprites) {
            this.guildCardSprites = [];
        }

        // Update existing cards or create new ones
        game.activeGuilds.forEach((guild) => {
            const existingCard = this.guildCardSprites.find(card => card.guild.number === guild.number);

            if (existingCard) {
                // Update existing card (preserves tweens/animations)
                existingCard.update(guild, game.players);
            } else {
                // Create new card for newly founded guild
                const pos = getGuildScreenPosition(guild.number, L);
                if (!pos) return;

                const card = new GuildCard(
                    this,
                    pos.x,
                    pos.y,
                    guild,
                    game.players,
                    L.cardWidth,
                    L.cardHeight,
                    L
                );
                this.guildCardSprites.push(card);
            }
        });

        // Remove cards for guilds that no longer exist (shouldn't happen normally)
        const activeGuildNumbers = game.activeGuilds.map(g => g.number);
        this.guildCardSprites = this.guildCardSprites.filter(card => {
            if (!activeGuildNumbers.includes(card.guild.number)) {
                card.destroy();
                return false;
            }
            return true;
        });
    }

    updateEndTurnButton() {
        if (!this.characterSelected) return;

        const game = this.game_instance;
        const isHumanTurn = game.currentPlayerIndex === 0;

        // Hide during event and roll phases, only show from collection onwards
        const phaseAllowsButton = game.phase === 'collection' || game.phase === 'investment';
        const shouldShow = isHumanTurn && phaseAllowsButton;

        this.endTurnBg.setVisible(shouldShow);
        this.endTurnText.setVisible(shouldShow);

        if (shouldShow) {
            const canEnd = this.canEndTurn();
            this.endTurnBg.setAlpha(canEnd ? 1 : 0.5);
            this.endTurnText.setAlpha(canEnd ? 1 : 0.5);
        }
    }

    // Action handlers
    investInGuild(guildNumber) {
        if (!this.characterSelected) return { success: false };
        const result = this.game_instance.investInGuild(0, guildNumber);
        if (result.success) this.updateAllUI();
        return result;
    }

    investInExpedition() {
        if (!this.characterSelected) return { success: false };
        const result = this.game_instance.investInExpedition(0);
        if (result.success) this.updateAllUI();
        return result;
    }

    buyLand() {
        if (!this.characterSelected) return { success: false };
        const result = this.game_instance.buyLand(0);
        if (result.success) this.updateAllUI();
        return result;
    }

    cultivateLand(landIndex) {
        if (!this.characterSelected) return { success: false };
        const result = this.game_instance.cultivateLand(0, landIndex);
        if (result.success) this.updateAllUI();
        return result;
    }

    buildInn(landIndex) {
        if (!this.characterSelected) return { success: false };
        const result = this.game_instance.buildInn(0, landIndex);
        if (result.success) this.updateAllUI();
        return result;
    }

    repairInn(innIndex) {
        if (!this.characterSelected) return { success: false };
        const result = this.game_instance.repairInn(0, innIndex);
        if (result.success) this.updateAllUI();
        return result;
    }

    // === CHARACTER ABILITY METHODS ===

    // Peasant: free cultivate (once per turn)
    cultivateLandFree(landIndex) {
        if (!this.characterSelected) return { success: false };
        const player = this.game_instance.players[0];

        // Check if player has free cultivate ability and hasn't used it
        if (!player.hasFreeCultivatePerTurn() || player.usedFreeCultivate) {
            return { success: false, reason: 'Free cultivate not available' };
        }

        // Use free cultivate (passes true for isFree parameter)
        if (player.cultivateLand(landIndex, true)) {
            player.usedFreeCultivate = true;
            this.game_instance.emit('playerUpdated', 0);
            this.game_instance.emit('stateChanged');
            this.updateAllUI();
            return { success: true };
        }
        return { success: false, reason: 'Invalid land index' };
    }

    // Master Builder: free repair (once per turn)
    repairInnFree(innIndex) {
        if (!this.characterSelected) return { success: false };
        const player = this.game_instance.players[0];

        // Check if player has free repair ability and hasn't used it
        if (!player.hasFreeRepairPerTurn() || player.usedFreeRepair) {
            return { success: false, reason: 'Free repair not available' };
        }

        // Use free repair (passes true for isFree parameter)
        if (player.repairInn(innIndex, true)) {
            player.usedFreeRepair = true;
            this.game_instance.emit('playerUpdated', 0);
            this.game_instance.emit('stateChanged');
            this.updateAllUI();
            return { success: true };
        }
        return { success: false, reason: 'Invalid inn index' };
    }

    // Artisan: buy treasure (4 coins)
    buyTreasure() {
        if (!this.characterSelected) return { success: false };
        const player = this.game_instance.players[0];
        const game = this.game_instance;

        // Check if player is Artisan and hasn't used ability
        if (!player.isArtisan() || player.usedArtisanTreasureAbility) {
            return { success: false, reason: 'Cannot buy treasure' };
        }

        // Check if player has enough coins
        if (player.coins < 4) {
            return { success: false, reason: 'Not enough coins' };
        }

        // Check if treasure deck has cards
        if (!game.treasureDeck || game.treasureDeck.length === 0) {
            return { success: false, reason: 'No treasures available' };
        }

        // Buy treasure
        player.removeCoins(4);
        const treasure = game.treasureDeck.pop();
        player.addTreasure(treasure);
        player.usedArtisanTreasureAbility = true;

        game.emit('playerUpdated', 0);
        game.emit('stateChanged');
        this.updateAllUI();
        return { success: true, treasure };
    }

    // Artisan: sell treasure (get 4 coins)
    sellTreasure(treasureIndex) {
        if (!this.characterSelected) return { success: false };
        const player = this.game_instance.players[0];
        const game = this.game_instance;

        // Check if player is Artisan and hasn't used ability
        if (!player.isArtisan() || player.usedArtisanTreasureAbility) {
            return { success: false, reason: 'Cannot sell treasure' };
        }

        // Check if treasure index is valid
        if (treasureIndex < 0 || treasureIndex >= player.treasures.length) {
            return { success: false, reason: 'Invalid treasure index' };
        }

        // Sell treasure
        const treasure = player.removeTreasure(treasureIndex);
        if (treasure) {
            player.addCoins(4);
            player.usedArtisanTreasureAbility = true;

            // Return treasure to deck
            game.treasureDeck.unshift(treasure);

            game.updateDiscovererEmblem();
            game.emit('playerUpdated', 0);
            game.emit('stateChanged');
            this.updateAllUI();
            return { success: true };
        }
        return { success: false, reason: 'Failed to remove treasure' };
    }

    // Show all player treasures (can sell wealth ones)
    showTreasureModal(player) {
        if (!player.treasures || player.treasures.length === 0) return;

        const { width, height } = this.cameras.main;
        const L = this.layout;
        const allTreasures = player.treasures.map((t, i) => ({ treasure: t, index: i }));

        const modalHeight = Math.min(120 + allTreasures.length * 65, height * 0.75);

        this.modalManager.show({
            title: 'Tesoros',
            width: Math.min(450, width * 0.9),
            height: modalHeight,
            content: (container, cx, cy, w, h) => {
                const startY = cy - (allTreasures.length * 30);

                allTreasures.forEach((item, i) => {
                    const yPos = startY + i * 60;
                    const treasure = item.treasure;
                    const imageKey = getTreasureImageKey(treasure);

                    // Treasure image
                    const img = this.add.image(cx - w / 2 + 45, yPos, imageKey);
                    img.setDisplaySize(50, 50);
                    container.add(img);

                    // Treasure description
                    let description = '';
                    if (treasure.type === 'wealth') {
                        description = `Riqueza (${treasure.coinValue || 3} monedas)`;
                    } else if (treasure.type === 'common') {
                        description = 'Tesoro Común (1 VP)';
                    } else if (treasure.type === 'rare') {
                        description = 'Tesoro Raro (2 VP)';
                    }

                    const text = this.add.text(cx - w / 2 + 80, yPos, description, {
                        fontFamily: 'Georgia, serif',
                        fontSize: L.fontSizeMedium + 'px',
                        color: '#e6c870'
                    }).setOrigin(0, 0.5);
                    container.add(text);

                    // Sell button only for wealth treasures - enlarged
                    if (treasure.type === 'wealth') {
                        const btn = this.add.rectangle(cx + w / 2 - 55, yPos, 90, 40, 0x8b3545)
                            .setStrokeStyle(2, 0xe6c870)
                            .setInteractive({ useHandCursor: true });

                        btn.on('pointerover', () => btn.setFillStyle(0xa04555));
                        btn.on('pointerout', () => btn.setFillStyle(0x8b3545));
                        btn.on('pointerdown', () => {
                            this.sellWealthTreasure(player, item.index);
                            this.modalManager.close();
                        });
                        container.add(btn);

                        const btnText = this.add.text(cx + w / 2 - 55, yPos, 'Vender', {
                            fontFamily: 'Georgia, serif',
                            fontSize: L.fontSizeMedium + 'px',
                            color: '#ffffff'
                        }).setOrigin(0.5);
                        container.add(btnText);
                    }
                });
            },
            buttons: [
                { text: 'Cerrar', primary: true, large: true, onClick: () => {} }
            ]
        });
    }

    // Sell wealth treasure for coins (any player)
    showWealthExchangeModal(player) {
        const wealthTreasures = player.treasures
            .map((t, i) => ({ treasure: t, index: i }))
            .filter(item => item.treasure.type === 'wealth');

        if (wealthTreasures.length === 0) return;

        const { width, height } = this.cameras.main;
        const L = this.layout;

        this.modalManager.show({
            title: 'Vender Riqueza',
            width: Math.min(400, width * 0.8),
            height: Math.min(300, height * 0.6),
            content: (container, cx, cy, w, h) => {
                const startY = cy - (wealthTreasures.length * 20);

                wealthTreasures.forEach((item, i) => {
                    const coinValue = item.treasure.coinValue || 3;
                    const yPos = startY + i * 45;

                    // Treasure description
                    const text = this.make.text({
                        x: cx - 50,
                        y: yPos,
                        text: `Riqueza: ${coinValue} monedas`,
                        style: {
                            fontFamily: 'Cinzel, Georgia, serif',
                            fontSize: L.fontSizeSmall + 'px',
                            color: '#e6c870'
                        },
                        add: false
                    }).setOrigin(0, 0.5);
                    container.add(text);

                    // Sell button
                    const btn = this.make.rectangle({
                        x: cx + 80,
                        y: yPos,
                        width: 70,
                        height: 28,
                        fillColor: 0x8b3545,
                        add: false
                    }).setStrokeStyle(2, 0xe6c870)
                      .setInteractive({ useHandCursor: true });

                    btn.on('pointerover', () => btn.setFillStyle(0xa04555));
                    btn.on('pointerout', () => btn.setFillStyle(0x8b3545));
                    btn.on('pointerdown', () => {
                        this.sellWealthTreasure(player, item.index);
                        this.modalManager.close();
                    });
                    container.add(btn);

                    const btnText = this.make.text({
                        x: cx + 80,
                        y: yPos,
                        text: 'Vender',
                        style: {
                            fontFamily: 'Cinzel, Georgia, serif',
                            fontSize: L.fontSizeSmall + 'px',
                            color: '#ffffff'
                        },
                        add: false
                    }).setOrigin(0.5);
                    container.add(btnText);
                });
            },
            buttons: [
                { text: 'Cerrar', primary: false, onClick: () => {} }
            ]
        });
    }

    sellWealthTreasure(player, treasureIndex) {
        const treasure = player.treasures[treasureIndex];
        if (treasure && treasure.type === 'wealth') {
            const coinValue = treasure.coinValue || 3;
            player.removeTreasure(treasureIndex);
            player.addCoins(coinValue);
            this.game_instance.treasureDeck.unshift(treasure);
            this.game_instance.updateDiscovererEmblem();
            this.game_instance.emit('playerUpdated', 0);
            this.game_instance.emit('stateChanged');
            this.updateAllUI();
            return { success: true, coins: coinValue };
        }
        return { success: false };
    }

    // Mercenary: cause mutiny in a guild (costs 1 coin)
    causeMutiny(guildNumber) {
        if (!this.characterSelected) return { success: false };
        const player = this.game_instance.players[0];
        const game = this.game_instance;

        // Check if player is Mercenary and hasn't used ability
        if (!player.isMercenary() || player.usedMutinyAbility) {
            return { success: false, reason: 'Cannot cause mutiny' };
        }

        // Check if player has enough coins
        if (player.coins < 1) {
            return { success: false, reason: 'Not enough coins' };
        }

        // Find the guild
        const guild = game.activeGuilds.find(g => g.number === guildNumber);
        if (!guild) {
            return { success: false, reason: 'Guild not found' };
        }

        // Check if player has investment in this guild
        const hasInvestment = guild.investments.some(inv => inv.playerId === player.id);
        if (!hasInvestment) {
            return { success: false, reason: 'No investment in this guild' };
        }

        // Execute mutiny
        player.removeCoins(1);

        // Apply proper mutiny effect (removes last investment from players with 2+ investments)
        game.eventHandler.applyMutiny(guild);

        player.usedMutinyAbility = true;

        game.emit('guildUpdated');
        game.emit('playerUpdated', 0);
        game.emit('stateChanged');
        this.updateAllUI();
        return { success: true };
    }

    // === GAME MENU ===

    showGameMenu() {
        // Pause game
        this.game_instance.pause();

        this.modalManager.showGameMenu({
            onHelp: () => {
                this.resumeGame();
                this.modalManager.alert('Ayuda', 'La ayuda estará disponible próximamente.');
            },
            onSettings: () => {
                this.modalManager.showSettings({
                    onBack: () => this.showGameMenu()
                });
            },
            onBackToMenu: () => {
                this.modalManager.confirm(
                    'Volver al menú',
                    'Se perderá el progreso de la partida. ¿Continuar?',
                    () => {
                        this.resumeGame();
                        this.scene.start('MenuScene');
                    },
                    () => {
                        this.showGameMenu();
                    }
                );
            },
            onContinue: () => {
                this.resumeGame();
            }
        });
    }

    resumeGame() {
        this.game_instance.resume();
    }

    // === GOVERNOR ABILITY: CHOOSE BETWEEN 2 EVENTS ===

    showGovernorEventChoice(data) {
        const { event1, event2, playerId, isHuman } = data;

        if (isHuman) {
            // Human player: show modal with both events
            this.showGovernorEventChoiceModal(event1, event2);
        } else {
            // AI player: automatically choose based on heuristic
            const chosenIndex = this.aiChooseEvent(event1, event2);
            this.time.delayedCall(1500, () => {
                this.game_instance.resolveGovernorChoice(chosenIndex);
            });
        }
    }

    showGovernorEventChoiceModal(event1, event2) {
        const { height } = this.cameras.main;
        const L = this.layout;

        this.modalManager.show({
            title: 'Gobernador: Elige un evento',
            dismissible: false,
            showClose: false,
            width: L.board.hudAreaWidth * 0.95,
            height: height * 0.75,
            content: (container, cx, cy, w, h) => {
                // Two event cards side by side
                const cardWidth = w * 0.42;
                const cardHeight = h * 0.7;
                const spacing = w * 0.04;

                // Event 1 (left)
                const event1X = cx - cardWidth / 2 - spacing / 2;
                const event1Y = cy - 10;
                const img1 = this.createEventCardForChoice(event1, event1X, event1Y, cardWidth, cardHeight, container);

                img1.setInteractive({ useHandCursor: true });
                img1.on('pointerover', () => {
                    img1.setTint(0xccccff);
                });
                img1.on('pointerout', () => {
                    img1.clearTint();
                });
                img1.on('pointerdown', () => {
                    this.modalManager.close();
                    this.game_instance.resolveGovernorChoice(0);
                });

                // Event 2 (right)
                const event2X = cx + cardWidth / 2 + spacing / 2;
                const event2Y = cy - 10;
                const img2 = this.createEventCardForChoice(event2, event2X, event2Y, cardWidth, cardHeight, container);

                img2.setInteractive({ useHandCursor: true });
                img2.on('pointerover', () => {
                    img2.setTint(0xccccff);
                });
                img2.on('pointerout', () => {
                    img2.clearTint();
                });
                img2.on('pointerdown', () => {
                    this.modalManager.close();
                    this.game_instance.resolveGovernorChoice(1);
                });

                // Labels under cards
                const labelStyle = {
                    fontFamily: 'Georgia, serif',
                    fontSize: L.fontSizeSmall + 'px',
                    color: '#e6c870',
                    align: 'center',
                    wordWrap: { width: cardWidth }
                };

                const label1 = this.make.text({
                    x: event1X,
                    y: event1Y + cardHeight / 2 + 10,
                    text: event1.nameES || event1.name || 'Evento 1',
                    style: labelStyle,
                    add: false
                }).setOrigin(0.5, 0);
                container.add(label1);

                const label2 = this.make.text({
                    x: event2X,
                    y: event2Y + cardHeight / 2 + 10,
                    text: event2.nameES || event2.name || 'Evento 2',
                    style: labelStyle,
                    add: false
                }).setOrigin(0.5, 0);
                container.add(label2);
            }
        });
    }

    createEventCardForChoice(event, x, y, width, height, container) {
        // Get the image key for this event
        const imageKey = this.eventDisplay.getEventImageKey(event);

        const img = this.make.image({
            x: x,
            y: y,
            key: imageKey,
            add: false
        });

        // Scale to fit within dimensions while maintaining aspect ratio
        const scaleX = width / img.width;
        const scaleY = height / img.height;
        const scale = Math.min(scaleX, scaleY);
        img.setScale(scale);

        container.add(img);
        return img;
    }

    aiChooseEvent(event1, event2) {
        // AI heuristic for choosing events
        // Priority: guild foundations > positive actions > neutral > negative > temporary
        const getPriority = (event) => {
            if (event.type === EVENT_TYPES.GUILD_FOUNDATION) return 100;

            if (event.type === EVENT_TYPES.ACTION) {
                // Positive events for AI
                if (event.id === 'good_harvest' || event.id === 'prosperity') return 80;
                if (event.id === 'expedition') return 70;
                // Negative events
                if (event.id === 'bad_harvest' || event.id === 'expropriation') return 30;
                if (event.id === 'invasion' || event.id === 'tax_collection') return 25;
                if (event.id === 'mutiny' || event.id === 'bankruptcy') return 20;
            }

            if (event.type === EVENT_TYPES.TEMPORARY) return 10;

            return 50; // Default for unknown
        };

        const p1 = getPriority(event1);
        const p2 = getPriority(event2);

        return p1 >= p2 ? 0 : 1;
    }
}
