// PlayerHUD - Displays player information using player_hud.png background

class PlayerHUD extends Phaser.GameObjects.Container {
    constructor(scene, x, y, player, isHuman = false, hudWidth, hudHeight, layout, playerIndex = 0, hiddenCharacter = false) {
        super(scene, x, y);

        this.player = player;
        this.isHuman = isHuman;
        this.isActive = false;
        this.hudWidth = hudWidth;
        this.hudHeight = hudHeight;
        this.layout = layout;
        this.playerIndex = playerIndex;
        this.scene = scene;
        this.hiddenCharacter = hiddenCharacter;

        // Font sizes
        const fontMd = layout.fontSizeMedium;
        const fontSm = layout.fontSizeSmall;

        // HUD background image - FILL the allocated space (maintains 1150:600 proportions)
        this.bgImage = scene.add.image(0, 0, 'player_hud')
            .setDisplaySize(hudWidth, hudHeight);
        this.add(this.bgImage);

        // === PORTRAIT AREA (left side, inside frame) ===
        // User-provided exact coordinates from player_hud.png (1150x600):
        // Top-left: (55, 44), Size: 360x502
        // Center: (235, 295) = (20.43%, 49.17%)
        // Size as %: 31.30% x 83.67%
        const portraitX = -hudWidth / 2 + hudWidth * 0.2043;  // Center X at 20.43%
        const portraitY = -hudHeight / 2 + hudHeight * 0.4917; // Center Y at 49.17% (slightly above center)
        const portraitW = hudWidth * 0.3130;                   // 31.30% of HUD width
        const portraitH = hudHeight * 0.8367;                  // 83.67% of HUD height

        // Character image - scale to FILL frame while maintaining proportions
        // If hidden (hard mode opponent), show "?" placeholder instead
        if (this.hiddenCharacter) {
            // Dark background rectangle
            this.characterImage = scene.add.rectangle(portraitX, portraitY, portraitW, portraitH, 0x1a1510);
            this.add(this.characterImage);

            // Large "?" text centered in portrait area
            const fontSize = Math.floor(portraitH * 0.5);
            this.hiddenPlaceholder = scene.add.text(portraitX, portraitY, '?', {
                fontFamily: 'Georgia, serif',
                fontSize: fontSize + 'px',
                color: '#e6c870',
                fontStyle: 'bold'
            }).setOrigin(0.5);
            this.add(this.hiddenPlaceholder);
            // No click handler - clicking does nothing
        } else if (player.character) {
            this.characterImage = scene.add.image(portraitX, portraitY, player.character.id);
            this.fitImageToArea(this.characterImage, portraitW, portraitH);
            this.add(this.characterImage);

            // Add click handler for ALL player characters
            this.characterImage.setInteractive({ useHandCursor: true });
            this.characterImage.on('pointerdown', () => {
                const game = this.scene.game_instance;
                const scene = this.scene;

                // Allow clicks during character selection OR investment phase
                // Block during other phases (event animations, dice rolling, etc.)
                const duringSelection = !scene.characterSelected;
                const duringInvestment = game && game.phase === 'investment';

                if (!duringSelection && !duringInvestment) {
                    return;
                }

                // During selection, only show info modal (no abilities)
                if (duringSelection && !this.isHuman) {
                    this.showCharacterModal();
                    return;
                }

                // Normal gameplay logic
                if (this.isHuman) {
                    // Artisan goes directly to treasure modal
                    if (this.player.character && this.player.character.id === 'artisan') {
                        this.showArtisanTreasureAbilityModal();
                    } else {
                        this.showCharacterAbilitiesMenu();
                    }
                } else {
                    this.showCharacterModal();
                }
            });
        } else {
            this.characterImage = scene.add.rectangle(portraitX, portraitY, portraitW, portraitH, 0x1a1510);
            this.add(this.characterImage);
        }

        // === INFO AREA (ribbon) ===
        // Ribbon: ~40% to ~95% horizontally, center Y at -20% from HUD center
        const ribbonStartX = -hudWidth / 2 + hudWidth * 0.41;
        const ribbonEndX = hudWidth / 2 - hudWidth * 0.05;
        const infoY = -hudHeight * 0.20;
        const iconSize = fontSm * 0.85;
        const gap = 3; // Small gap between elements

        // Layout: Name | Coin+Value | VP+Value | Badge
        // Position from left to right with tight spacing

        // Name
        this.nameText = scene.add.text(ribbonStartX, infoY, player.name || 'Jugador', {
            fontFamily: 'Georgia, serif',
            fontSize: fontSm + 'px',
            color: '#1a1510',
            fontStyle: 'bold'
        }).setOrigin(0, 0.5);
        this.add(this.nameText);

        // Coins (icon + text) - positioned after name with dynamic spacing
        const coinType = getCoinTypeFromPlayerId(player.id);
        const coinX = ribbonStartX + hudWidth * 0.12;

        this.coinIcon = scene.add.image(coinX, infoY, coinType);
        this.fitImageToArea(this.coinIcon, iconSize, iconSize);
        this.coinIcon.setOrigin(0, 0.5);
        this.add(this.coinIcon);

        this.coinsText = scene.add.text(coinX + iconSize + gap, infoY, '3', {
            fontFamily: 'Arial, sans-serif',
            fontSize: fontSm + 'px',
            color: '#1a1510',
            fontStyle: 'bold'
        }).setOrigin(0, 0.5);
        this.add(this.coinsText);

        // VP (icon + text) - positioned after coins
        const vpX = coinX + hudWidth * 0.10;

        this.vpIcon = scene.add.image(vpX, infoY, 'vp_icon');
        this.fitImageToArea(this.vpIcon, iconSize, iconSize);
        this.vpIcon.setOrigin(0, 0.5);
        this.add(this.vpIcon);

        this.vpText = scene.add.text(vpX + iconSize + gap, infoY, '0', {
            fontFamily: 'Arial, sans-serif',
            fontSize: fontSm + 'px',
            color: '#8b3545',
            fontStyle: 'bold'
        }).setOrigin(0, 0.5);
        this.add(this.vpText);

        // Treasure leader badge - inline after VP (hidden by default)
        const badgeSize = iconSize;
        const badgeX = vpX + hudWidth * 0.08;
        this.treasureBadge = scene.add.image(badgeX, infoY, 'badge');
        this.fitImageToArea(this.treasureBadge, badgeSize, badgeSize);
        this.treasureBadge.setOrigin(0, 0.5);
        this.treasureBadge.setVisible(false);
        this.add(this.treasureBadge);

        // === RESOURCE SLOTS (5 slots in bottom tray) ===
        this.createResourceSlots(scene, hudWidth, hudHeight);

        scene.add.existing(this);
    }

    fitImageToArea(image, maxWidth, maxHeight) {
        const scaleX = maxWidth / image.width;
        const scaleY = maxHeight / image.height;
        const scale = Math.min(scaleX, scaleY);
        image.setScale(scale);
    }

    createResourceSlots(scene, hudWidth, hudHeight) {
        const L = this.layout;

        const slotPositionsX = [0.445, 0.545, 0.645, 0.745, 0.846];
        const slotCenterY = hudHeight * 0.194;
        const slotWidth = hudWidth * 0.0727;
        const slotHeight = hudHeight * 0.2104;

        // Store for repositioning count texts when active
        this.slotCenterY = slotCenterY;
        this.slotHeight = slotHeight;

        // 5 resources: land, cultivated land, inn, destroyed inn, treasure
        const resources = [
            { key: 'land', prop: 'lands' },
            { key: 'cultivated_land', prop: 'cultivatedLands' },
            { key: 'inn', prop: 'inns' },
            { key: 'destroyed_inn', prop: 'destroyedInns' },
            { key: 'treasure', prop: 'treasures' }
        ];

        this.resourceTexts = {};
        this.resourceIcons = {};
        this.resourceOverlays = {};

        resources.forEach((res, i) => {
            // X position from HUD center
            const slotX = -hudWidth / 2 + hudWidth * slotPositionsX[i];

            // Resource icon - use exact size from measurements
            const icon = scene.add.image(slotX, slotCenterY, res.key);
            icon.setDisplaySize(slotWidth, slotHeight);
            this.add(icon);
            this.resourceIcons[res.prop] = icon;

            // Disabled overlay rectangle (hidden by default)
            const overlay = scene.add.rectangle(slotX, slotCenterY, slotWidth, slotHeight, 0x000000, 0.5);
            overlay.setVisible(false);
            this.add(overlay);
            this.resourceOverlays[res.prop] = overlay;

            // Make resource icons interactive for human player
            if (this.isHuman) {
                icon.setInteractive({ useHandCursor: true });
                icon.on('pointerdown', () => this.onResourceClick(res.prop));
            }

            // Count text BELOW the HUD (outside the scroll area)
            // Position relative to HUD bottom edge, not to the slot
            const countGap = 3;
            const countY = hudHeight / 2 + countGap;
            const countText = scene.add.text(slotX, countY, '0', {
                fontFamily: 'Arial, sans-serif',
                fontSize: L.fontSizeSmall + 'px',
                color: '#e6c870',
                fontStyle: 'bold'
            }).setOrigin(0.5);
            this.add(countText);
            this.resourceTexts[res.prop] = countText;
        });
    }

    update(player, game) {
        // Safety check - ensure scene is still valid
        if (!this.scene || !this.scene.sys) {
            return;
        }

        this.player = player;

        // Update character image
        if (player.character && this.characterImage) {
            const portraitX = -this.hudWidth / 2 + this.hudWidth * 0.2043;
            const portraitY = -this.hudHeight / 2 + this.hudHeight * 0.4917;
            const portraitW = this.hudWidth * 0.3130;
            const portraitH = this.hudHeight * 0.8367;

            if (this.characterImage.type === 'Rectangle') {
                this.characterImage.destroy();
                this.characterImage = this.scene.add.image(portraitX, portraitY, player.character.id);
                this.fitImageToArea(this.characterImage, portraitW, portraitH);
                this.add(this.characterImage);
                this.sendToBack(this.characterImage);

                // Add click handler for character modal/abilities
                this.characterImage.setInteractive({ useHandCursor: true });
                this.characterImage.on('pointerdown', () => {
                    // Block clicks during non-investment phases
                    const game = this.scene.game_instance;
                    if (game && game.phase !== 'investment') {
                        return;
                    }

                    if (this.isHuman) {
                        // Artisan goes directly to treasure modal
                        if (this.player.character && this.player.character.id === 'artisan') {
                            this.showArtisanTreasureAbilityModal();
                        } else {
                            this.showCharacterAbilitiesMenu();
                        }
                    } else {
                        this.showCharacterModal();
                    }
                });
            } else {
                this.characterImage.setTexture(player.character.id);
                this.fitImageToArea(this.characterImage, portraitW, portraitH);
            }
        }

        // Update name
        this.nameText.setText(player.name || 'Jugador');

        // Update VP
        const vp = (player.getVictoryPoints && game) ? player.getVictoryPoints(game) : 0;
        this.vpText.setText(vp.toString());

        // Update treasure leader badge
        if (this.treasureBadge && game && game.players) {
            const myTreasures = player.treasures ? player.treasures.length : 0;
            const isLeader = myTreasures >= 2 && game.players.every(p => {
                const otherTreasures = p.treasures ? p.treasures.length : 0;
                return p.id === player.id || otherTreasures < myTreasures;
            });
            this.treasureBadge.setVisible(isLeader);
        }

        // Update coins
        if (this.coinsText) {
            this.coinsText.setText(player.coins.toString());
        }

        // Update resources
        if (this.resourceTexts.lands) {
            const uncultivated = player.lands ? player.lands.filter(l => !l.cultivated).length : 0;
            this.resourceTexts.lands.setText(uncultivated.toString());
        }
        if (this.resourceTexts.cultivatedLands) {
            const cultivated = player.lands ? player.lands.filter(l => l.cultivated).length : 0;
            this.resourceTexts.cultivatedLands.setText(cultivated.toString());
        }
        if (this.resourceTexts.inns) {
            const activeInns = player.inns ? player.inns.filter(i => !i.destroyed).length : 0;
            this.resourceTexts.inns.setText(activeInns.toString());
        }
        if (this.resourceTexts.destroyedInns) {
            const destroyedInns = player.inns ? player.inns.filter(i => i.destroyed).length : 0;
            this.resourceTexts.destroyedInns.setText(destroyedInns.toString());
        }
        if (this.resourceTexts.treasures) {
            this.resourceTexts.treasures.setText((player.treasures ? player.treasures.length : 0).toString());
        }

        // Update action states for human player
        this.updateActionStates();
    }

    setActive(active, animate = true, newY = null) {
        this.isActive = active;
        const targetScale = active ? 1.8 : 0.75;

        const tweenConfig = {
            targets: this,
            scaleX: targetScale,
            scaleY: targetScale,
            duration: 200,
            ease: 'Power2'
        };

        // Add Y position if provided
        if (newY !== null) {
            tweenConfig.y = newY;
        }

        if (animate) {
            this.scene.tweens.add(tweenConfig);
        } else {
            this.setScale(targetScale);
            if (newY !== null) {
                this.setY(newY);
            }
        }

        // Reposition resource count texts based on active state
        this.repositionResourceCounts(active);
    }

    repositionResourceCounts(active) {
        // Resource counts stay at fixed position - no repositioning needed
        // This ensures consistent appearance across all resolutions
    }

    hideResourceCounts() {
        this.resourcesHidden = true;
        // Hide coins
        if (this.coinsText) this.coinsText.setText('?');
        // Hide VP
        if (this.vpText) this.vpText.setText('?');
        // Hide all resource counts
        Object.values(this.resourceTexts).forEach(text => {
            if (text) text.setText('?');
        });
    }

    showResourceCounts() {
        this.resourcesHidden = false;
        // Refresh will restore actual values
        if (this.player && this.scene && this.scene.game_instance) {
            this.update(this.player, this.scene.game_instance);
        }
    }

    revealCharacter() {
        if (!this.hiddenCharacter) return;

        const scene = this.scene;
        const player = this.player;

        // Remove "?" placeholder
        if (this.hiddenPlaceholder) {
            this.hiddenPlaceholder.destroy();
            this.hiddenPlaceholder = null;
        }

        // Remove dark rectangle
        if (this.characterImage) {
            this.characterImage.destroy();
            this.characterImage = null;
        }

        // Create actual character image (same as constructor logic)
        const portraitX = -this.hudWidth / 2 + this.hudWidth * 0.2043;
        const portraitY = -this.hudHeight / 2 + this.hudHeight * 0.4917;
        const portraitW = this.hudWidth * 0.3130;
        const portraitH = this.hudHeight * 0.8367;

        if (player.character) {
            this.characterImage = scene.add.image(portraitX, portraitY, player.character.id);
            this.fitImageToArea(this.characterImage, portraitW, portraitH);
            this.add(this.characterImage);
            this.sendToBack(this.characterImage);

            // Add click handler
            this.characterImage.setInteractive({ useHandCursor: true });
            this.characterImage.on('pointerdown', () => {
                const game = this.scene.game_instance;
                if (game && game.phase !== 'investment') {
                    return;
                }
                this.showCharacterModal();
            });
        }

        this.hiddenCharacter = false;
    }

    showCharacterModal() {
        const scene = this.scene;
        const { height } = scene.cameras.main;
        const L = scene.layout;
        const hudAreaWidth = L.board.hudAreaWidth;
        const character = this.player.character;

        scene.modalManager.show({
            showClose: false,
            width: hudAreaWidth * 0.98,
            height: height * 0.95,
            // Position modal in HUD area (left side)
            centerX: hudAreaWidth / 2,
            overlayX: hudAreaWidth / 2,
            overlayWidth: hudAreaWidth,
            fullScreenDismiss: true,
            content: (container, cx, cy, w, h) => {
                // Character image - large to read descriptions
                const img = scene.make.image({ x: cx, y: cy, key: character.id, add: false });
                const maxSize = Math.min(w * 0.95, h * 0.9);
                const scale = maxSize / Math.max(img.width, img.height);
                img.setScale(scale);
                container.add(img);
            }
            // No buttons - info display only
        });
    }

    // === RESOURCE ACTION METHODS ===

    onResourceClick(resourceProp) {
        const game = this.scene.game_instance;
        if (!game || game.phase !== 'investment' || game.currentPlayerIndex !== 0) return;

        switch (resourceProp) {
            case 'lands':
                this.handleBuyLand();          // Buy land (2 coins)
                break;
            case 'cultivatedLands':
                this.handleCultivateLand();    // Cultivate land (1 coin or free)
                break;
            case 'inns':
                this.handleBuildInn();         // Build inn (6 coins, prefer uncultivated)
                break;
            case 'destroyedInns':
                this.handleRepairInn();        // Repair inn (1 coin or free)
                break;
            case 'treasures':
                this.handleSellWealth();       // Open wealth exchange modal
                break;
        }
    }

    handleBuyLand() {
        // Simply buy land (2 coins)
        if (this.player.coins >= 2) {
            const result = this.scene.buyLand();
            this.showActionFeedback('lands', result && result.success);
        }
    }

    handleCultivateLand() {
        const player = this.player;
        const uncultivatedIndex = player.lands.findIndex(land => !land.cultivated);

        if (uncultivatedIndex === -1) return;

        // Check for free cultivation (Peasant ability)
        const isFree = player.hasFreeCultivatePerTurn() && !player.usedFreeCultivate;

        if (isFree) {
            const result = this.scene.cultivateLandFree(uncultivatedIndex);
            this.showActionFeedback('cultivatedLands', result && result.success);
        } else if (player.coins >= 1) {
            const result = this.scene.cultivateLand(uncultivatedIndex);
            this.showActionFeedback('cultivatedLands', result && result.success);
        }
    }

    handleBuildInn() {
        const player = this.player;
        const innCost = player.getInnCost();

        if (player.coins < innCost || player.lands.length === 0) {
            this.showActionFeedback('inns', false);
            return;
        }

        // Prefer uncultivated land, fall back to cultivated
        let landIndex = player.lands.findIndex(land => !land.cultivated);
        if (landIndex === -1) {
            landIndex = player.lands.findIndex(land => land.cultivated);
        }

        if (landIndex !== -1) {
            const result = this.scene.buildInn(landIndex);
            this.showActionFeedback('inns', result && result.success);
        }
    }

    handleRepairInn() {
        const player = this.player;
        const destroyedIndices = player.getDestroyedInnIndices();

        if (destroyedIndices.length === 0) {
            this.showActionFeedback('destroyedInns', false);
            return;
        }

        // Check for free repair (Master Builder)
        const isFreeRepair = player.hasFreeRepairPerTurn() && !player.usedFreeRepair;

        if (destroyedIndices.length === 1) {
            let result;
            if (isFreeRepair) {
                result = this.scene.repairInnFree(destroyedIndices[0]);
            } else {
                result = this.scene.repairInn(destroyedIndices[0]);
            }
            this.showActionFeedback('destroyedInns', result && result.success);
        } else {
            // Show selection modal for multiple options
            this.showInnSelectionModal('repairInn', destroyedIndices, isFreeRepair);
        }
    }

    handleSellWealth() {
        const player = this.player;

        // Check if player has any treasures
        if (!player.treasures || player.treasures.length === 0) return;

        // Show treasure modal (shows all treasures, can sell wealth ones)
        this.scene.showTreasureModal(player);
    }

    showActionFeedback(resourceProp, success) {
        // No visual feedback for human player resource actions
        // Effects are only shown for AI actions
    }

    // === DISABLED STATE WITH OVERLAY ===

    setResourceDisabled(resourceProp, disabled) {
        const icon = this.resourceIcons[resourceProp];
        const overlay = this.resourceOverlays[resourceProp];
        if (!icon) return;

        if (disabled) {
            // Show dark overlay on top of icon
            if (overlay) overlay.setVisible(true);
            icon.setAlpha(0.7);
            if (icon.input) {
                icon.input.enabled = false;
            }
        } else {
            // Hide overlay
            if (overlay) overlay.setVisible(false);
            icon.setAlpha(1);
            if (icon.input) {
                icon.input.enabled = true;
            }
        }
    }

    updateActionStates() {
        if (!this.isHuman) return;
        if (!this.scene || !this.scene.game_instance) return;

        const game = this.scene.game_instance;
        const player = this.player;
        const isActive = game.phase === 'investment' && game.currentPlayerIndex === 0;

        // LAND icon → Buy Land (2 coins)
        const canBuyLand = isActive && player.coins >= 2;
        this.setResourceDisabled('lands', !canBuyLand);

        // CULTIVATED LAND icon → Cultivate Land (1 coin or Peasant free)
        const hasUncultivated = player.getUncultivatedLandsCount() > 0;
        const canFreeCultivate = player.hasFreeCultivatePerTurn() && !player.usedFreeCultivate;
        const canCultivate = isActive && hasUncultivated && (player.coins >= 1 || canFreeCultivate);
        this.setResourceDisabled('cultivatedLands', !canCultivate);

        // INN icon → Buy Inn (6 coins, or 5 for Master Builder)
        const hasAnyLand = player.lands.length > 0;
        const innCost = player.getInnCost();
        const canBuildInn = isActive && hasAnyLand && player.coins >= innCost;
        this.setResourceDisabled('inns', !canBuildInn);

        // DESTROYED INN icon → Repair Inn (1 coin or Master Builder free)
        const hasDestroyed = player.getDestroyedInnsCount() > 0;
        const canFreeRepair = player.hasFreeRepairPerTurn() && !player.usedFreeRepair;
        const canRepair = isActive && hasDestroyed && (player.coins >= 1 || canFreeRepair);
        this.setResourceDisabled('destroyedInns', !canRepair);

        // TREASURE icon → View/Sell treasures (any player with treasures)
        const treasureCount = player.treasures ? player.treasures.length : 0;
        const canViewTreasures = isActive && treasureCount > 0;
        this.setResourceDisabled('treasures', !canViewTreasures);
    }

    // === CHARACTER ABILITIES MENU ===

    showCharacterAbilitiesMenu() {
        const scene = this.scene;
        const game = scene.game_instance;
        const player = this.player;
        const { width, height } = scene.cameras.main;
        const L = scene.layout;
        const hudAreaWidth = L.board.hudAreaWidth;

        // Only show abilities during investment phase on human turn
        if (!game || game.phase !== 'investment' || game.currentPlayerIndex !== 0) {
            // Show info-only modal
            this.showCharacterModal();
            return;
        }

        // Mercenary: Go directly to mutiny selection mode (always show modal)
        if (player.character && player.character.canCauseMutiny) {
            this.showMercenaryMutinySelection();
            return;
        }

        // Peasant: Go directly to free cultivate action
        if (player.character && player.character.freeCultivatePerTurn) {
            if (!player.usedFreeCultivate && player.getUncultivatedLandsCount() > 0) {
                this.handleFreeCultivate();
            } else {
                this.showCharacterModal();
            }
            return;
        }

        // Master Builder: Go directly to free repair action
        if (player.character && player.character.freeRepairPerTurn) {
            if (!player.usedFreeRepair && player.getDestroyedInnsCount() > 0) {
                this.handleFreeRepair();
            } else {
                this.showCharacterModal();
            }
            return;
        }

        // For characters without special abilities, show info modal
        this.showCharacterModal();
    }

    // === MODAL IMPLEMENTATIONS ===

    showTreasureModal() {
        const scene = this.scene;
        const player = this.player;
        const { width, height } = scene.cameras.main;

        // Close ability modal if open
        if (this.abilityModal) {
            this.abilityModal.destroy();
            this.abilityModal = null;
        }

        const modalContainer = scene.add.container(0, 0);
        modalContainer.setDepth(1000);

        // Overlay
        const overlay = scene.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.85)
            .setInteractive();
        overlay.on('pointerdown', () => modalContainer.destroy());
        modalContainer.add(overlay);

        // Modal box
        const boxWidth = width * 0.5;
        const boxHeight = height * 0.4;
        const box = scene.add.rectangle(width / 2, height / 2, boxWidth, boxHeight, 0x2a2015)
            .setStrokeStyle(3, 0xe6c870);
        modalContainer.add(box);

        // Title
        const title = scene.add.text(width / 2, height / 2 - boxHeight / 2 + 30,
            'Tesoros (Artesano)', {
            fontFamily: 'Georgia, serif',
            fontSize: this.layout.fontSizeMedium + 'px',
            color: '#e6c870'
        }).setOrigin(0.5);
        modalContainer.add(title);

        // Buy button
        const treasureDeck = scene.game_instance.treasureDeck || [];
        const canBuy = player.coins >= 4 && treasureDeck.length > 0;
        const buyBtn = this.createModalButton(scene, width / 2 - 70, height / 2 + 10,
            'Comprar (4)', canBuy, () => {
                scene.buyTreasure();
                modalContainer.destroy();
            });
        modalContainer.add(buyBtn.container);

        // Sell button (only if has treasures)
        const canSell = player.treasures.length > 0;
        const sellBtn = this.createModalButton(scene, width / 2 + 70, height / 2 + 10,
            'Vender (4)', canSell, () => {
                // Sell first treasure
                scene.sellTreasure(0);
                modalContainer.destroy();
            });
        modalContainer.add(sellBtn.container);
    }

    showMutinyModal() {
        const scene = this.scene;
        const player = this.player;
        const game = scene.game_instance;
        const { width, height } = scene.cameras.main;

        // Close ability modal if open
        if (this.abilityModal) {
            this.abilityModal.destroy();
            this.abilityModal = null;
        }

        // Get guilds where player has investments
        const investedGuilds = game.activeGuilds.filter(guild =>
            guild.investments.some(inv => inv.playerId === player.id)
        );

        if (investedGuilds.length === 0) return;

        const modalContainer = scene.add.container(0, 0);
        modalContainer.setDepth(1000);

        // Overlay
        const overlay = scene.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.85)
            .setInteractive();
        overlay.on('pointerdown', () => modalContainer.destroy());
        modalContainer.add(overlay);

        // Title
        const title = scene.add.text(width / 2, height * 0.2,
            'Selecciona gremio para Motín', {
            fontFamily: 'Georgia, serif',
            fontSize: this.layout.fontSizeMedium + 'px',
            color: '#e6c870'
        }).setOrigin(0.5);
        modalContainer.add(title);

        // Guild buttons
        investedGuilds.forEach((guild, index) => {
            const btnY = height * 0.35 + index * 50;
            const btn = this.createModalButton(scene, width / 2, btnY,
                guild.name, true, () => {
                    scene.causeMutiny(guild.number);
                    modalContainer.destroy();
                });
            modalContainer.add(btn.container);
        });
    }

    showLandSelectionModal(action, indices) {
        const scene = this.scene;
        const { width, height } = scene.cameras.main;

        const modalContainer = scene.add.container(0, 0);
        modalContainer.setDepth(1000);

        // Overlay
        const overlay = scene.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.85)
            .setInteractive();
        overlay.on('pointerdown', () => modalContainer.destroy());
        modalContainer.add(overlay);

        // Title
        const title = scene.add.text(width / 2, height * 0.2,
            'Selecciona tierra para construir', {
            fontFamily: 'Georgia, serif',
            fontSize: this.layout.fontSizeMedium + 'px',
            color: '#e6c870'
        }).setOrigin(0.5);
        modalContainer.add(title);

        // Land buttons
        indices.forEach((landIndex, i) => {
            const btnY = height * 0.35 + i * 50;
            const btn = this.createModalButton(scene, width / 2, btnY,
                `Tierra ${landIndex + 1}`, true, () => {
                    this.scene.buildInn(landIndex);
                    modalContainer.destroy();
                });
            modalContainer.add(btn.container);
        });
    }

    showInnSelectionModal(action, indices, isFree) {
        const scene = this.scene;
        const { width, height } = scene.cameras.main;

        const modalContainer = scene.add.container(0, 0);
        modalContainer.setDepth(1000);

        // Overlay
        const overlay = scene.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.85)
            .setInteractive();
        overlay.on('pointerdown', () => modalContainer.destroy());
        modalContainer.add(overlay);

        // Title
        const title = scene.add.text(width / 2, height * 0.2,
            isFree ? 'Reparar posada gratis' : 'Selecciona posada a reparar', {
            fontFamily: 'Georgia, serif',
            fontSize: this.layout.fontSizeMedium + 'px',
            color: '#e6c870'
        }).setOrigin(0.5);
        modalContainer.add(title);

        // Inn buttons
        indices.forEach((innIndex, i) => {
            const btnY = height * 0.35 + i * 50;
            const btn = this.createModalButton(scene, width / 2, btnY,
                `Posada ${innIndex + 1}`, true, () => {
                    if (isFree) {
                        this.scene.repairInnFree(innIndex);
                    } else {
                        this.scene.repairInn(innIndex);
                    }
                    modalContainer.destroy();
                });
            modalContainer.add(btn.container);
        });
    }

    handleFreeCultivate() {
        const player = this.player;

        // Close ability modal if open
        if (this.abilityModal) {
            this.abilityModal.destroy();
            this.abilityModal = null;
        }

        const uncultivatedIndices = player.getUncultivatedLandIndices();

        if (uncultivatedIndices.length === 0) return;

        if (uncultivatedIndices.length === 1) {
            this.scene.cultivateLandFree(uncultivatedIndices[0]);
        } else {
            this.showCultivateSelectionModal(uncultivatedIndices);
        }
    }

    showCultivateSelectionModal(indices, isFree = true) {
        const scene = this.scene;
        const { width, height } = scene.cameras.main;

        const modalContainer = scene.add.container(0, 0);
        modalContainer.setDepth(1000);

        // Overlay
        const overlay = scene.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.85)
            .setInteractive();
        overlay.on('pointerdown', () => modalContainer.destroy());
        modalContainer.add(overlay);

        // Title
        const titleText = isFree ? 'Cultivar tierra gratis' : 'Cultivar tierra (1 moneda)';
        const title = scene.add.text(width / 2, height * 0.2,
            titleText, {
            fontFamily: 'Georgia, serif',
            fontSize: this.layout.fontSizeMedium + 'px',
            color: '#e6c870'
        }).setOrigin(0.5);
        modalContainer.add(title);

        // Land buttons
        indices.forEach((landIndex, i) => {
            const btnY = height * 0.35 + i * 50;
            const btn = this.createModalButton(scene, width / 2, btnY,
                `Tierra ${landIndex + 1}`, true, () => {
                    if (isFree) {
                        this.scene.cultivateLandFree(landIndex);
                    } else {
                        this.scene.cultivateLand(landIndex);
                    }
                    modalContainer.destroy();
                });
            modalContainer.add(btn.container);
        });
    }

    handleFreeRepair() {
        const player = this.player;

        // Close ability modal if open
        if (this.abilityModal) {
            this.abilityModal.destroy();
            this.abilityModal = null;
        }

        const destroyedIndices = player.getDestroyedInnIndices();

        if (destroyedIndices.length === 0) return;

        if (destroyedIndices.length === 1) {
            this.scene.repairInnFree(destroyedIndices[0]);
        } else {
            this.showInnSelectionModal('repairInn', destroyedIndices, true);
        }
    }

    createModalButton(scene, x, y, text, enabled, onClick) {
        const container = scene.add.container(x, y);
        // Increased sizes for mobile: 180x50
        const btnWidth = 180;
        const btnHeight = 50;

        const bg = scene.add.rectangle(0, 0, btnWidth, btnHeight,
            enabled ? 0x8b3545 : 0x333333)
            .setStrokeStyle(2, enabled ? 0xe6c870 : 0x555555);

        const label = scene.add.text(0, 0, text, {
            fontFamily: 'Arial, sans-serif',
            fontSize: this.layout.fontSizeMedium + 'px',
            color: enabled ? '#ffffff' : '#666666'
        }).setOrigin(0.5);

        container.add([bg, label]);

        if (enabled) {
            bg.setInteractive({ useHandCursor: true });
            bg.on('pointerdown', onClick);
            bg.on('pointerover', () => bg.setFillStyle(0xa04555));
            bg.on('pointerout', () => bg.setFillStyle(0x8b3545));
        } else if (bg.preFX) {
            bg.preFX.addColorMatrix().grayscale(1);
        }

        return { container, bg, label };
    }

    // === ARTISAN TREASURE ABILITY ===

    countTreasuresByType(player) {
        const counts = {
            'treasure_1vp': 0,
            'treasure_2vp': 0,
            'wealth_3': 0,
            'wealth_4': 0
        };

        if (!player.treasures) return counts;

        player.treasures.forEach(t => {
            if (t.type === 'common') counts['treasure_1vp']++;
            else if (t.type === 'rare') counts['treasure_2vp']++;
            else if (t.type === 'wealth') {
                if (t.coinValue === 3) counts['wealth_3']++;
                else counts['wealth_4']++;
            }
        });

        return counts;
    }

    showArtisanTreasureAbilityModal() {
        const scene = this.scene;
        const player = this.player;
        const game = scene.game_instance;
        const { width, height } = scene.cameras.main;
        const L = scene.layout;
        const hudAreaWidth = L.board.hudAreaWidth;

        // Close ability modal if open
        if (this.abilityModal) {
            this.abilityModal.destroy();
            this.abilityModal = null;
        }

        const modalContainer = scene.add.container(0, 0);
        modalContainer.setDepth(1000);

        // Full-screen overlay (covers HUD + board)
        const overlay = scene.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.85)
            .setInteractive();
        overlay.on('pointerdown', () => {
            modalContainer.destroy();
            this.artisanModal = null;
        });
        modalContainer.add(overlay);

        // === LEFT SIDE (HUD AREA): Character image and name ===
        const charImg = scene.add.image(hudAreaWidth / 2, height * 0.42, player.character.id);
        const charMaxWidth = hudAreaWidth * 0.9;
        const charMaxHeight = height * 0.75;
        const scale = Math.min(charMaxWidth / charImg.width, charMaxHeight / charImg.height);
        charImg.setScale(scale);
        modalContainer.add(charImg);

        // Character name
        const nameY = height * 0.42 + (charImg.displayHeight / 2) + 10;
        const nameText = scene.add.text(hudAreaWidth / 2, nameY, player.character.nameES, {
            fontFamily: 'Georgia, serif',
            fontSize: L.fontSizeLarge + 'px',
            color: '#e6c870',
            fontStyle: 'bold'
        }).setOrigin(0.5);
        modalContainer.add(nameText);

        // === RIGHT SIDE (BOARD AREA): Two panes ===
        const boardCenterX = hudAreaWidth + (width - hudAreaWidth) / 2;
        const paneWidth = (width - hudAreaWidth) * 0.44;
        const paneHeight = height * 0.88;
        const paneGap = 15;

        // Sell pane (left)
        const sellPaneX = boardCenterX - paneWidth / 2 - paneGap / 2;
        this.createSellTreasurePane(scene, sellPaneX, height / 2, paneWidth, paneHeight, player, modalContainer);

        // Buy pane (right)
        const buyPaneX = boardCenterX + paneWidth / 2 + paneGap / 2;
        this.createBuyTreasurePane(scene, buyPaneX, height / 2, paneWidth, paneHeight, player, game, modalContainer);

        // Close button
        const closeBtn = scene.add.text(width - 20, 15, 'X', {
            fontSize: '28px',
            color: '#888888'
        }).setOrigin(1, 0).setInteractive({ useHandCursor: true });
        closeBtn.on('pointerover', () => closeBtn.setColor('#e6c870'));
        closeBtn.on('pointerout', () => closeBtn.setColor('#888888'));
        closeBtn.on('pointerdown', () => {
            modalContainer.destroy();
            this.artisanModal = null;
        });
        modalContainer.add(closeBtn);

        // Fade in
        modalContainer.setAlpha(0);
        scene.tweens.add({
            targets: modalContainer,
            alpha: 1,
            duration: 200
        });

        this.artisanModal = modalContainer;
    }

    createSellTreasurePane(scene, x, y, paneWidth, paneHeight, player, container) {
        const L = this.layout;

        // Pane background
        const paneBg = scene.add.rectangle(x, y, paneWidth, paneHeight, 0x2a2015)
            .setStrokeStyle(2, 0xe6c870);
        container.add(paneBg);

        // Title
        const title = scene.add.text(x, y - paneHeight / 2 + 25, 'Vender Tesoro', {
            fontFamily: 'Georgia, serif',
            fontSize: L.fontSizeMedium + 'px',
            color: '#e6c870'
        }).setOrigin(0.5);
        container.add(title);

        // Count treasures by type
        const treasureCounts = this.countTreasuresByType(player);

        // Display 4 treasure types in a 2x2 grid
        const treasureTypes = [
            { key: 'treasure_1vp', label: '1 VP', type: 'common' },
            { key: 'treasure_2vp', label: '2 VP', type: 'rare' },
            { key: 'wealth_3', label: '3 Monedas', type: 'wealth', coinValue: 3 },
            { key: 'wealth_4', label: '4 Monedas', type: 'wealth', coinValue: 4 }
        ];

        const gridStartY = y - paneHeight * 0.25;
        const cellWidth = paneWidth * 0.45;
        const cellHeight = paneHeight * 0.35;

        this.sellButtons = [];

        treasureTypes.forEach((tType, index) => {
            const row = Math.floor(index / 2);
            const col = index % 2;
            const cellX = x + (col === 0 ? -cellWidth / 2 - 5 : cellWidth / 2 + 5);
            const cellY = gridStartY + row * (cellHeight + 10);

            const count = treasureCounts[tType.key] || 0;
            const canSell = count > 0 && !player.usedArtisanTreasureAbility;

            // Treasure image
            const img = scene.add.image(cellX, cellY - 15, tType.key);
            const imgScale = Math.min((cellWidth * 0.6) / img.width, (cellHeight * 0.45) / img.height);
            img.setScale(imgScale);
            container.add(img);

            // Label
            const labelText = scene.add.text(cellX, cellY + cellHeight * 0.2, tType.label, {
                fontFamily: 'Arial, sans-serif',
                fontSize: L.fontSizeSmall + 'px',
                color: '#b8b0a0'
            }).setOrigin(0.5);
            container.add(labelText);

            // Count text
            const countText = scene.add.text(cellX, cellY + cellHeight * 0.32, `x${count}`, {
                fontFamily: 'Arial, sans-serif',
                fontSize: L.fontSizeMedium + 'px',
                color: '#e6c870',
                fontStyle: 'bold'
            }).setOrigin(0.5);
            container.add(countText);

            // Sell button - increased height for mobile
            const btnY = cellY + cellHeight * 0.45;
            const btn = scene.add.rectangle(cellX, btnY, cellWidth * 0.85, 45,
                canSell ? 0x8b3545 : 0x333333)
                .setStrokeStyle(2, canSell ? 0xe6c870 : 0x555555);

            const btnLabel = scene.add.text(cellX, btnY, 'Vender (4)', {
                fontFamily: 'Arial, sans-serif',
                fontSize: L.fontSizeMedium + 'px',
                color: canSell ? '#ffffff' : '#666666'
            }).setOrigin(0.5);

            container.add([btn, btnLabel]);

            if (canSell) {
                btn.setInteractive({ useHandCursor: true });
                btn.on('pointerover', () => btn.setFillStyle(0xa04555));
                btn.on('pointerout', () => btn.setFillStyle(0x8b3545));
                btn.on('pointerdown', () => {
                    this.executeSellTreasure(tType);
                });
            }

            this.sellButtons.push({ btn, btnLabel, countText, tType });
        });
    }

    createBuyTreasurePane(scene, x, y, paneWidth, paneHeight, player, game, container) {
        const L = this.layout;

        // Pane background
        const paneBg = scene.add.rectangle(x, y, paneWidth, paneHeight, 0x2a2015)
            .setStrokeStyle(2, 0xe6c870);
        container.add(paneBg);

        // Title
        const title = scene.add.text(x, y - paneHeight / 2 + 25, 'Comprar Tesoro', {
            fontFamily: 'Georgia, serif',
            fontSize: L.fontSizeMedium + 'px',
            color: '#e6c870'
        }).setOrigin(0.5);
        container.add(title);

        // Treasure back image
        const treasureBack = scene.add.image(x, y - 30, 'treasure');
        const imgScale = Math.min((paneWidth * 0.6) / treasureBack.width, (paneHeight * 0.4) / treasureBack.height);
        treasureBack.setScale(imgScale);
        container.add(treasureBack);

        // Deck count text
        const deckCount = game.treasureDeck ? game.treasureDeck.length : 0;
        const deckText = scene.add.text(x, y + paneHeight * 0.15, `Mazo: ${deckCount} cartas`, {
            fontFamily: 'Arial, sans-serif',
            fontSize: L.fontSizeSmall + 'px',
            color: '#b8b0a0'
        }).setOrigin(0.5);
        container.add(deckText);

        // Buy button - increased size for mobile
        const canBuy = player.coins >= 4 && deckCount > 0 && !player.usedArtisanTreasureAbility;
        const btnY = y + paneHeight * 0.3;

        this.buyButton = scene.add.rectangle(x, btnY, paneWidth * 0.8, 50,
            canBuy ? 0x8b3545 : 0x333333)
            .setStrokeStyle(2, canBuy ? 0xe6c870 : 0x555555);

        this.buyButtonLabel = scene.add.text(x, btnY, 'Comprar (4 monedas)', {
            fontFamily: 'Arial, sans-serif',
            fontSize: L.fontSizeMedium + 'px',
            color: canBuy ? '#ffffff' : '#666666'
        }).setOrigin(0.5);

        container.add([this.buyButton, this.buyButtonLabel]);

        if (canBuy) {
            this.buyButton.setInteractive({ useHandCursor: true });
            this.buyButton.on('pointerover', () => this.buyButton.setFillStyle(0xa04555));
            this.buyButton.on('pointerout', () => this.buyButton.setFillStyle(0x8b3545));
            this.buyButton.on('pointerdown', () => {
                this.executeBuyTreasure();
            });
        }
    }

    executeSellTreasure(treasureType) {
        const player = this.player;

        // Find first matching treasure
        const index = player.treasures.findIndex(t => {
            if (treasureType.type === 'wealth') {
                return t.type === 'wealth' && t.coinValue === treasureType.coinValue;
            }
            return t.type === treasureType.type;
        });

        if (index === -1) return;

        // Execute sell via GameScene
        const result = this.scene.sellTreasure(index);

        if (result && result.success) {
            // Update count display
            const treasureCounts = this.countTreasuresByType(player);
            this.sellButtons.forEach(item => {
                item.countText.setText(`x${treasureCounts[item.tType.key] || 0}`);
            });

            // Disable all panes
            this.disableArtisanPanes();
        }
    }

    executeBuyTreasure() {
        const result = this.scene.buyTreasure();

        if (result && result.success) {
            // Update treasure counts
            const treasureCounts = this.countTreasuresByType(this.player);
            if (this.sellButtons) {
                this.sellButtons.forEach(item => {
                    item.countText.setText(`x${treasureCounts[item.tType.key] || 0}`);
                });
            }

            // Disable all panes
            this.disableArtisanPanes();
        }
    }

    disableArtisanPanes() {
        // Disable all sell buttons
        if (this.sellButtons) {
            this.sellButtons.forEach(item => {
                item.btn.setFillStyle(0x333333);
                item.btn.setStrokeStyle(2, 0x555555);
                item.btnLabel.setColor('#666666');
                item.btn.disableInteractive();
            });
        }

        // Disable buy button
        if (this.buyButton) {
            this.buyButton.setFillStyle(0x333333);
            this.buyButton.setStrokeStyle(2, 0x555555);
            this.buyButtonLabel.setColor('#666666');
            this.buyButton.disableInteractive();
        }
    }

    // === MERCENARY MUTINY ABILITY ===

    getValidMutinyTargets(player, game) {
        const validGuilds = [];

        game.activeGuilds.forEach(guild => {
            // Requirement 1: Mercenary has at least one investment in the guild
            const mercInvestments = guild.investments.filter(
                inv => inv.playerId === player.id
            ).length;

            if (mercInvestments === 0) return;

            // Requirement 2: At least one OTHER player has more than one investment
            const hasTarget = game.players.some(otherPlayer => {
                if (otherPlayer.id === player.id) return false;
                const otherInvestments = guild.investments.filter(
                    inv => inv.playerId === otherPlayer.id
                ).length;
                return otherInvestments > 1;
            });

            if (hasTarget) {
                validGuilds.push(guild.number);
            }
        });

        return validGuilds;
    }

    showMercenaryMutinySelection() {
        const scene = this.scene;
        const player = this.player;
        const game = scene.game_instance;
        const { width, height } = scene.cameras.main;
        const L = scene.layout;
        const hudAreaWidth = L.board.hudAreaWidth;

        // Close ability modal if open
        if (this.abilityModal) {
            this.abilityModal.destroy();
            this.abilityModal = null;
        }

        // Check ability availability
        const abilityUsed = player.usedMutinyAbility;
        const hasCoins = player.coins >= 1;
        const validGuilds = this.getValidMutinyTargets(player, game);
        const hasValidTargets = validGuilds.length > 0;
        const canUseAbility = !abilityUsed && hasCoins && hasValidTargets;

        const modalContainer = scene.add.container(0, 0);
        modalContainer.setDepth(1000);

        // Only overlay HUD area - board remains fully visible
        const hudOverlay = scene.add.rectangle(
            hudAreaWidth / 2, height / 2,
            hudAreaWidth, height,
            0x000000, 0.85
        ).setInteractive();
        hudOverlay.on('pointerdown', () => {
            this.cancelMutinySelection();
        });
        modalContainer.add(hudOverlay);

        // Instruction text ABOVE the board (in top area)
        const boardCenterX = hudAreaWidth + (width - hudAreaWidth) / 2;
        let instructionText;
        if (abilityUsed) {
            instructionText = 'Habilidad ya usada este turno';
        } else if (!hasCoins) {
            instructionText = 'No tienes suficientes monedas (1)';
        } else if (!hasValidTargets) {
            instructionText = 'No hay gremios validos para motin';
        } else {
            instructionText = 'Elige el gremio en el que deseas provocar un motin (1)';
        }
        this.mutinyInstructionText = scene.add.text(boardCenterX, 25, instructionText, {
            fontFamily: 'Georgia, serif',
            fontSize: L.fontSizeMedium + 'px',
            color: canUseAbility ? '#e6c870' : '#888888',
            align: 'center',
            backgroundColor: '#1a1510',
            padding: { x: 15, y: 8 }
        }).setOrigin(0.5, 0).setDepth(1001);
        modalContainer.add(this.mutinyInstructionText);

        // Character info in HUD area (large, like AI character modal)
        const charImg = scene.add.image(hudAreaWidth / 2, height * 0.42, player.character.id);
        const charMaxWidth = hudAreaWidth * 0.9;
        const charMaxHeight = height * 0.75;
        const scale = Math.min(charMaxWidth / charImg.width, charMaxHeight / charImg.height);
        charImg.setScale(scale);
        modalContainer.add(charImg);

        // Character name
        const nameY = height * 0.42 + (charImg.displayHeight / 2) + 10;
        const nameText = scene.add.text(hudAreaWidth / 2, nameY, player.character.nameES, {
            fontFamily: 'Georgia, serif',
            fontSize: L.fontSizeMedium + 'px',
            color: '#e6c870',
            fontStyle: 'bold'
        }).setOrigin(0.5);
        modalContainer.add(nameText);

        // Cost reminder
        const costText = scene.add.text(hudAreaWidth / 2, height * 0.75,
            'Coste: 1 moneda', {
            fontFamily: 'Arial, sans-serif',
            fontSize: L.fontSizeSmall + 'px',
            color: '#b8b0a0'
        }).setOrigin(0.5);
        modalContainer.add(costText);

        // Fade in
        modalContainer.setAlpha(0);
        scene.tweens.add({
            targets: modalContainer,
            alpha: 1,
            duration: 200
        });

        this.mutinyModal = modalContainer;

        // Apply overlays to guild cards only if ability can be used
        if (canUseAbility) {
            this.applyMutinyGuildOverlays(validGuilds);
        }
    }

    applyMutinyGuildOverlays(validGuilds) {
        const scene = this.scene;

        // Initialize overlay arrays
        this.mutinyOverlays = [];
        this.mutinyHighlights = [];
        this.originalGuildStates = [];

        // Apply overlays to each guild card
        if (scene.guildCardSprites) {
            scene.guildCardSprites.forEach(guildCard => {
                const guild = guildCard.guild;
                const isValid = validGuilds.includes(guild.number);

                // Store original state including depth
                this.originalGuildStates.push({
                    card: guildCard,
                    inputEnabled: guildCard.input ? guildCard.input.enabled : true,
                    originalDepth: guildCard.depth
                });

                if (!isValid) {
                    // Show red blocked overlay on invalid guilds
                    this.showMutinyBlockedOverlay(guildCard);
                } else {
                    // Make valid guilds clickable for mutiny
                    this.enableMutinySelection(guildCard, guild.number);
                }
            });
        }
    }

    showMutinyBlockedOverlay(guildCard) {
        const scene = this.scene;

        // Grey out invalid guilds (semi-transparent dark overlay)
        const overlay = scene.add.rectangle(
            guildCard.x, guildCard.y,
            guildCard.cardWidth, guildCard.cardHeight,
            0x000000, 0.6
        );
        overlay.setDepth(1002);

        this.mutinyOverlays.push(overlay);

        // Disable interaction on this card during mutiny selection
        guildCard.disableInteractive();
    }

    enableMutinySelection(guildCard, guildNumber) {
        const scene = this.scene;

        // Create green filled overlay on valid guilds (above guild cards)
        const greenOverlay = scene.add.rectangle(
            guildCard.x, guildCard.y,
            guildCard.cardWidth, guildCard.cardHeight,
            0x22aa44, 0.4
        );
        greenOverlay.setDepth(1002);

        this.mutinyHighlights.push(greenOverlay);

        // Store original listeners and disable them temporarily
        guildCard.removeAllListeners('pointerdown');
        guildCard.removeAllListeners('pointerover');
        guildCard.removeAllListeners('pointerout');

        // Set up mutiny-specific handlers
        guildCard.setInteractive({ useHandCursor: true });

        guildCard.on('pointerdown', () => {
            this.executeMutinyOnGuild(guildNumber);
        });

        guildCard.on('pointerover', () => {
            greenOverlay.setFillStyle(0x44cc66, 0.6);
            scene.tweens.add({
                targets: guildCard,
                scaleX: 1.05,
                scaleY: 1.05,
                duration: 80
            });
        });

        guildCard.on('pointerout', () => {
            greenOverlay.setFillStyle(0x22aa44, 0.4);
            scene.tweens.add({
                targets: guildCard,
                scaleX: 1,
                scaleY: 1,
                duration: 80
            });
        });
    }

    executeMutinyOnGuild(guildNumber) {
        const scene = this.scene;

        // Execute mutiny via GameScene
        const result = scene.causeMutiny(guildNumber);

        if (result && result.success) {
            // Clean up overlays
            this.cleanupMutinyOverlays();

            // Update instruction text
            if (this.mutinyInstructionText) {
                this.mutinyInstructionText.setText('Motín causado!\nHabilidad usada');
            }

            // Disable guild clicks - restore original but without re-enabling interaction
            this.restoreGuildCardHandlers(false);
        }
    }

    cancelMutinySelection() {
        this.cleanupMutinyOverlays();
        this.restoreGuildCardHandlers(true);

        if (this.mutinyModal) {
            this.mutinyModal.destroy();
            this.mutinyModal = null;
        }
    }

    cleanupMutinyOverlays() {
        // Remove blocked overlays
        if (this.mutinyOverlays) {
            this.mutinyOverlays.forEach(overlay => overlay.destroy());
            this.mutinyOverlays = [];
        }

        // Remove highlight effects
        if (this.mutinyHighlights) {
            this.mutinyHighlights.forEach(highlight => highlight.destroy());
            this.mutinyHighlights = [];
        }
    }

    restoreGuildCardHandlers(enableInteraction) {
        const scene = this.scene;

        if (this.originalGuildStates) {
            this.originalGuildStates.forEach(item => {
                const guildCard = item.card;

                // Restore original depth
                if (item.originalDepth !== undefined) {
                    guildCard.setDepth(item.originalDepth);
                }

                // Remove mutiny-specific listeners
                guildCard.removeAllListeners('pointerdown');
                guildCard.removeAllListeners('pointerover');
                guildCard.removeAllListeners('pointerout');

                // Re-setup original interaction
                if (enableInteraction) {
                    guildCard.setInteractive({ useHandCursor: true });
                    guildCard.setupInteraction(scene);
                }
            });
            this.originalGuildStates = [];
        }
    }
}
