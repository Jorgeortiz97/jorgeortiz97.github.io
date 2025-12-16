// GameOverScene - Victory/defeat screen

class GameOverScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameOverScene' });
    }

    create() {
        const { width, height } = this.cameras.main;

        // Get results from registry
        const winner = this.registry.get('winner');
        const players = this.registry.get('players');

        // Fade in
        this.cameras.main.fadeIn(300);

        // Background
        this.add.rectangle(width / 2, height / 2, width, height, 0x1a1510);

        // Title
        const isHumanWinner = winner && winner.id === 0;
        const titleText = isHumanWinner ? 'Victoria!' : 'Partida Terminada';
        const titleColor = isHumanWinner ? '#e6c870' : '#b8b0a0';

        this.add.text(width / 2, height * 0.15, titleText, {
            fontFamily: 'Georgia, serif',
            fontSize: Math.floor(height * 0.08) + 'px',
            color: titleColor,
            fontStyle: 'bold'
        }).setOrigin(0.5);

        // Winner announcement
        if (winner) {
            this.add.text(width / 2, height * 0.25, `Ganador: ${winner.name}`, {
                fontFamily: 'Arial, sans-serif',
                fontSize: '24px',
                color: '#e6c870'
            }).setOrigin(0.5);

            // Winner character
            if (winner.character) {
                this.add.image(width / 2, height * 0.45, winner.character.id)
                    .setDisplaySize(150, 200);
            }
        }

        // Final scores
        this.add.text(width / 2, height * 0.65, 'Puntuaciones Finales', {
            fontFamily: 'Arial, sans-serif',
            fontSize: '20px',
            color: '#b8b0a0'
        }).setOrigin(0.5);

        // Player scores
        if (players) {
            // Sort by VP descending
            const sortedPlayers = [...players].sort((a, b) => {
                const vpA = a.getVictoryPoints ? a.getVictoryPoints() : 0;
                const vpB = b.getVictoryPoints ? b.getVictoryPoints() : 0;
                return vpB - vpA;
            });

            sortedPlayers.forEach((player, index) => {
                const y = height * 0.72 + index * 35;
                const vp = player.getVictoryPoints ? player.getVictoryPoints() : 0;
                const isWinner = winner && player.id === winner.id;

                this.add.text(width * 0.35, y, player.name, {
                    fontFamily: 'Arial, sans-serif',
                    fontSize: '18px',
                    color: isWinner ? '#e6c870' : '#888888'
                }).setOrigin(0, 0.5);

                this.add.text(width * 0.65, y, `${vp} VP`, {
                    fontFamily: 'Arial, sans-serif',
                    fontSize: '18px',
                    color: isWinner ? '#e6c870' : '#888888'
                }).setOrigin(1, 0.5);
            });
        }

        // New game button
        const btnY = height * 0.9;
        const btn = this.add.rectangle(width / 2, btnY, 180, 45, 0x8b3545)
            .setStrokeStyle(2, 0xe6c870)
            .setInteractive({ useHandCursor: true });

        this.add.text(width / 2, btnY, 'Nueva Partida', {
            fontFamily: 'Arial, sans-serif',
            fontSize: '18px',
            color: '#ffffff'
        }).setOrigin(0.5);

        btn.on('pointerover', () => btn.setFillStyle(0xa04555));
        btn.on('pointerout', () => btn.setFillStyle(0x8b3545));
        btn.on('pointerdown', () => {
            this.cameras.main.fadeOut(300);
            this.cameras.main.once('camerafadeoutcomplete', () => {
                this.scene.start('MenuScene');
            });
        });
    }
}
