// BlockingEventDisplay - Shows active blocking/temporary events on the board

class BlockingEventDisplay {
    constructor(scene, layout) {
        this.scene = scene;
        this.layout = layout;
        this.eventSprites = [];

        // Map event IDs to their board position index
        // Board columns: 0=between(2,12), 1=between(3,11), 2=between(4,10), 3=between(5,9), 4=between(6,8)
        this.eventPositions = {
            'mine_collapse': 1,      // Affects guilds 3 and 11
            'material_shortage': 2,  // Affects guilds 4 and 10
            'trade_blockade': 3,     // Affects guilds 5 and 9
            'famine': 4,             // Affects guilds 6 and 8
            'plague': 0              // Affects all except 2 and 12 (placed between immune guilds)
        };
    }

    update(activeTemporaryEvents) {
        // Clear existing sprites
        this.clear();

        if (!activeTemporaryEvents || activeTemporaryEvents.length === 0) {
            return;
        }

        const L = this.layout;
        const board = L.board;

        // Count occurrences of each event type
        const eventCounts = {};
        for (const event of activeTemporaryEvents) {
            eventCounts[event.id] = (eventCounts[event.id] || 0) + 1;
        }

        // Calculate card dimensions for blocking events (same as guild cards)
        const cardWidth = L.cardWidth;
        const cardHeight = L.cardHeight;

        // Display each unique event type
        for (const [eventId, count] of Object.entries(eventCounts)) {
            const posIndex = this.eventPositions[eventId];
            if (posIndex === undefined) continue;

            const boardPos = BOARD.blockingEvents[posIndex];
            if (!boardPos) continue;

            // Convert board percentage to screen position
            const screenPos = boardToScreen(board, boardPos.x, boardPos.y);

            // Create event card image
            const eventCard = this.scene.add.image(
                screenPos.x + cardWidth / 2,
                screenPos.y + cardHeight / 2,
                eventId
            );
            eventCard.setDisplaySize(cardWidth, cardHeight);

            this.eventSprites.push(eventCard);

            // If count > 1, show a badge with the count
            if (count > 1) {
                const badgeX = screenPos.x + cardWidth - 8;
                const badgeY = screenPos.y + 8;
                const badgeRadius = Math.max(12, cardWidth * 0.12);

                // Badge background
                const badge = this.scene.add.circle(badgeX, badgeY, badgeRadius, 0xff0000);
                badge.setStrokeStyle(2, 0xffffff);

                // Badge text
                const badgeText = this.scene.add.text(badgeX, badgeY, count.toString(), {
                    fontFamily: 'Arial, sans-serif',
                    fontSize: Math.floor(badgeRadius * 1.2) + 'px',
                    color: '#ffffff',
                    fontStyle: 'bold'
                }).setOrigin(0.5);

                this.eventSprites.push(badge, badgeText);
            }
        }
    }

    clear() {
        for (const sprite of this.eventSprites) {
            sprite.destroy();
        }
        this.eventSprites = [];
    }

    destroy() {
        this.clear();
    }
}
