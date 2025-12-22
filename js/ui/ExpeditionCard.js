// ExpeditionCard - Displays expedition with investment slots

class ExpeditionCard extends Phaser.GameObjects.Container {
    constructor(scene, x, y, cardWidth, cardHeight) {
        super(scene, x, y);

        this.cardWidth = cardWidth;
        this.cardHeight = cardHeight;

        // Expedition image - fills the card area
        this.cardImage = scene.add.image(0, 0, 'expedition_card')
            .setDisplaySize(cardWidth, cardHeight);
        this.add(this.cardImage);

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

        // Make interactive
        this.setSize(cardWidth, cardHeight);
        this.setInteractive({ useHandCursor: true });
        this.setupInteraction(scene);

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
        scene.investInExpedition();
        // No animation for human player - animation triggered via event for AI only
    }

    // Public method to trigger investment effect (for AI players only)
    showInvestmentEffect(scene) {
        // Kill any existing tweens on this object to avoid conflicts
        scene.tweens.killTweensOf(this);
        scene.tweens.killTweensOf(this.cardImage);

        // Smooth, fluid pulse effect (respects animation speed)
        const effectDuration = getAnimationDuration(180);
        scene.tweens.add({
            targets: this,
            scaleX: 1.15,
            scaleY: 1.15,
            duration: effectDuration,
            ease: 'Sine.easeOut',
            yoyo: true,
            onComplete: () => {
                this.setScale(1);
            }
        });

        // Subtle alpha pulse
        scene.tweens.add({
            targets: this.cardImage,
            alpha: 0.7,
            duration: effectDuration,
            ease: 'Sine.easeInOut',
            yoyo: true
        });
    }

    update(expedition) {
        if (!expedition) return;

        // Update slots with player coins
        expedition.investments.forEach((inv, i) => {
            if (i < 4 && this.coinImages[i]) {
                const coinType = getCoinTypeFromPlayerId(inv.playerId);
                this.coinImages[i].setTexture(coinType);
                this.coinImages[i].setVisible(true);
            }
        });

        // Clear empty slots
        for (let i = expedition.investments.length; i < 4; i++) {
            if (this.coinImages[i]) {
                this.coinImages[i].setVisible(false);
            }
        }
    }
}
