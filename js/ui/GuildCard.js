// GuildCard - Displays a guild card with investment slots

class GuildCard extends Phaser.GameObjects.Container {
    constructor(scene, x, y, guild, players, cardWidth, cardHeight, layout) {
        super(scene, x, y);

        this.guild = guild;
        this.players = players;
        this.cardWidth = cardWidth;
        this.cardHeight = cardHeight;
        this.layout = layout;

        // Guild image - fills the card area (board already has placeholder frames)
        this.guildImage = scene.add.image(0, 0, 'guild_' + guild.number)
            .setDisplaySize(cardWidth, cardHeight);
        this.add(this.guildImage);

        // Blocked overlay - added early so it appears BEHIND coins
        this.blockedOverlay = scene.add.rectangle(0, 0, cardWidth, cardHeight, 0x8b3545, 0.4)
            .setVisible(false);
        this.add(this.blockedOverlay);

        // Investment slots (2x2 grid at bottom of card)
        // Pre-calculated CENTER positions (CSS top-left + half slot dimensions)
        // Original CSS: left=16.55%/53.67%, top=43.06%/66.70%, slot=30.04%x21.53%
        // Center = top-left + (15.02%, 10.765%)
        this.investmentSlots = [];
        this.coinImages = [];

        const slotSize = Math.floor(cardWidth * 0.28);

        const SLOT_POSITIONS = [
            { x: 31.57, y: 53.825 },  // Top-left center
            { x: 68.69, y: 53.825 },  // Top-right center
            { x: 31.57, y: 77.465 },  // Bottom-left center
            { x: 68.69, y: 77.465 }   // Bottom-right center
        ];

        for (let i = 0; i < 4; i++) {
            const pos = SLOT_POSITIONS[i];
            // Convert percentage to position relative to card center (0,0)
            const slotX = (pos.x / 100 - 0.5) * cardWidth;
            const slotY = (pos.y / 100 - 0.5) * cardHeight;

            // Track slot position (no visual placeholder - card image has built-in placeholders)
            this.investmentSlots.push({ x: slotX, y: slotY });

            // Coin image
            const coinImg = scene.add.image(slotX, slotY, 'gold')
                .setDisplaySize(slotSize * 0.95, slotSize * 0.95)
                .setVisible(false);
            this.coinImages.push(coinImg);
            this.add(coinImg);
        }

        // Max investor indicator - SAME SIZE as invested coins, at TOP-LEFT corner
        const coinDisplaySize = slotSize * 0.95;
        this.maxIndicator = scene.add.image(-cardWidth * 0.35, -cardHeight * 0.35, 'gold')
            .setDisplaySize(coinDisplaySize, coinDisplaySize)
            .setVisible(false);
        this.add(this.maxIndicator);

        // Make interactive
        this.setSize(cardWidth, cardHeight);
        this.setInteractive({ useHandCursor: true });
        this.setupInteraction(scene);

        // Update visual state
        this.updateInvestments();

        // Add to scene
        scene.add.existing(this);
    }

    setupInteraction(scene) {
        let lastTapTime = 0;

        this.on('pointerdown', () => {
            const now = Date.now();
            if (now - lastTapTime < GAME_CONSTANTS.DOUBLE_TAP_DELAY) {
                this.onDoubleTap(scene);
            }
            lastTapTime = now;
        });

        this.on('pointerover', () => {
            // Allow hover even on blocked guilds (can still invest)
            scene.tweens.add({
                targets: this,
                scaleX: 1.03,
                scaleY: 1.03,
                duration: 80
            });
        });

        this.on('pointerout', () => {
            scene.tweens.add({
                targets: this,
                scaleX: 1,
                scaleY: 1,
                duration: 80
            });
        });
    }

    onDoubleTap(scene) {
        // Blocking only affects resource generation, not investments
        const result = scene.investInGuild(this.guild.number);

        if (result && result.success) {
            scene.tweens.add({
                targets: this.guildImage,
                alpha: 0.6,
                yoyo: true,
                duration: 100
            });
        }
    }

    updateInvestments() {
        const guild = this.guild;

        // Update slots with player coins
        guild.investments.forEach((inv, i) => {
            if (i < 4 && this.coinImages[i]) {
                const player = this.players.find(p => p.id === inv.playerId);
                if (player) {
                    const coinType = getCoinTypeFromPlayerId(player.id);
                    this.coinImages[i].setTexture(coinType);
                    this.coinImages[i].setVisible(true);
                }
            }
        });

        // Clear empty slots
        for (let i = guild.investments.length; i < 4; i++) {
            if (this.coinImages[i]) {
                this.coinImages[i].setVisible(false);
            }
        }

        // Update max investor indicator - use coin image with correct texture
        if (guild.maxInvestor !== null) {
            const coinType = getCoinTypeFromPlayerId(guild.maxInvestor);
            this.maxIndicator.setTexture(coinType);
            this.maxIndicator.setVisible(true);
        } else {
            this.maxIndicator.setVisible(false);
        }

        // Update blocked state
        this.blockedOverlay.setVisible(guild.blocked);
    }

    update(guild, players) {
        this.guild = guild;
        this.players = players;
        this.updateInvestments();
    }

    destroy() {
        super.destroy();
    }
}
