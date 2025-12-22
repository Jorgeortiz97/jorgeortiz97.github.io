// EventDisplay - Shows event cards with proper proportions and 3D flip animation

class EventDisplay extends Phaser.GameObjects.Container {
    constructor(scene, x, y, cardWidth, cardHeight) {
        super(scene, x, y);

        this.cardWidth = cardWidth;
        this.cardHeight = cardHeight;

        // Event deck (back of cards, slightly offset to show stack effect)
        this.deckStack = [];
        for (let i = 2; i >= 0; i--) {
            const deckCard = scene.add.image(-2 * i, -1 * i, 'event_back')
                .setDisplaySize(this.cardWidth, this.cardHeight)
                .setAlpha(0.6 - i * 0.15);
            this.deckStack.push(deckCard);
            this.add(deckCard);
        }

        // Discard position offset (to the RIGHT of deck)
        // Board positions: currentEvent x=20.33%, previousEvent x=41.92%
        // Offset is 21.59% of board width = 21.59/16.08 = 1.34x card width
        this.discardOffsetX = this.cardWidth * 1.34;

        // Current event card - positioned at discard location, hidden until revealed
        this.currentCardImage = scene.add.image(this.discardOffsetX, 0, 'event_back')
            .setDisplaySize(this.cardWidth, this.cardHeight)
            .setVisible(false);
        this.add(this.currentCardImage);

        scene.add.existing(this);
    }

    showEvent(event, callback) {
        this.currentEvent = event;
        const imageKey = this.getEventImageKey(event);

        // Show 3D flip modal
        this.showFlipModal(imageKey, callback);
    }

    showFlipModal(imageKey, callback) {
        const scene = this.scene;
        const { width, height } = scene.cameras.main;

        // Create modal container
        const modalContainer = scene.add.container(0, 0);
        modalContainer.setDepth(1000);

        // Dark overlay
        const overlay = scene.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.8);
        modalContainer.add(overlay);

        // Modal card - start with event_back, will scale to fit
        const modalCard = scene.add.image(width / 2, height / 2, 'event_back');

        // Calculate scale to fit within screen while maintaining proportions
        const maxHeight = height * 0.55;
        const maxWidth = width * 0.35;
        const scaleX = maxWidth / modalCard.width;
        const scaleY = maxHeight / modalCard.height;
        const baseScale = Math.min(scaleX, scaleY);
        modalCard.setScale(baseScale);

        modalContainer.add(modalCard);

        // Store base scale for animation
        const targetScale = baseScale;

        // 3D flip animation using scaleX (respects animation speed setting)
        const flipDuration = getAnimationDuration(300);
        const holdDuration = getAnimationDuration(GAME_CONSTANTS.EVENT_DISPLAY_DURATION * 0.6);

        scene.tweens.add({
            targets: modalCard,
            scaleX: 0,
            duration: flipDuration,
            ease: 'Sine.easeIn',
            onComplete: () => {
                // Swap texture at midpoint and recalculate scale for new image
                modalCard.setTexture(imageKey);

                // Recalculate scale for the actual event image proportions
                const newScaleX = maxWidth / modalCard.width;
                const newScaleY = maxHeight / modalCard.height;
                const newScale = Math.min(newScaleX, newScaleY);
                modalCard.setScale(0, newScale);  // scaleX=0 for flip animation

                scene.tweens.add({
                    targets: modalCard,
                    scaleX: newScale,
                    duration: flipDuration,
                    ease: 'Sine.easeOut',
                    onComplete: () => {
                        // Only show revealed card in discard pile for ACTION events
                        // Guild foundation events reveal guilds on board (not discard)
                        // Temporary/blocking events go on the blocking row (not discard)
                        if (this.currentEvent && this.currentEvent.type === 'action') {
                            this.currentCardImage.setTexture(imageKey);
                            this.currentCardImage.setDisplaySize(this.cardWidth, this.cardHeight);
                            this.currentCardImage.setVisible(true);
                        }
                        // For non-action events, don't update discard pile - leave it as is
                        // (showing previous action event or staying hidden if none drawn yet)

                        // Hold for a moment then fade out
                        scene.time.delayedCall(holdDuration, () => {
                            scene.tweens.add({
                                targets: modalContainer,
                                alpha: 0,
                                duration: flipDuration,
                                onComplete: () => {
                                    modalContainer.destroy();
                                    if (callback) callback();
                                }
                            });
                        });
                    }
                });
            }
        });
    }

    getEventImageKey(event) {
        if (!event) return 'event_back';

        if (event.type === 'guild_foundation') {
            return 'guild_' + event.guild;
        }

        if (event.type === 'action') {
            return event.id;
        }

        if (event.type === 'temporary') {
            return event.id;
        }

        return 'event_back';
    }

    clear() {
        this.currentCardImage.setTexture('event_back');
        this.currentCardImage.setDisplaySize(this.cardWidth, this.cardHeight);
        this.currentCardImage.setVisible(false);
        this.currentEvent = null;
    }
}
