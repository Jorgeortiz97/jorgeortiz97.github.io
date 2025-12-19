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

        // Responsive font sizes
        const titleSize = Math.floor(height * 0.10);
        const subtitleSize = Math.floor(height * 0.05);
        const textSize = Math.floor(height * 0.04);
        const smallTextSize = Math.floor(height * 0.035);

        // Fade in
        this.cameras.main.fadeIn(300);

        // Background
        this.add.rectangle(width / 2, height / 2, width, height, 0x1a1510);

        // Title
        const isHumanWinner = winner && winner.id === 0;
        const titleText = isHumanWinner ? '¡Victoria!' : 'Partida Terminada';
        const titleColor = isHumanWinner ? '#e6c870' : '#b8b0a0';

        this.add.text(width / 2, height * 0.12, titleText, {
            fontFamily: 'Cinzel, Georgia, serif',
            fontSize: titleSize + 'px',
            color: titleColor,
            fontStyle: 'bold'
        }).setOrigin(0.5);

        // Winner announcement
        if (winner) {
            this.add.text(width / 2, height * 0.22, `Ganador: ${winner.name}`, {
                fontFamily: 'Georgia, serif',
                fontSize: subtitleSize + 'px',
                color: '#e6c870'
            }).setOrigin(0.5);

            // Winner character image
            if (winner.character) {
                const charImg = this.add.image(width / 2, height * 0.40, winner.character.id);
                // Constrain both dimensions to prevent overflow
                const maxHeight = height * 0.22;
                const maxWidth = width * 0.35;
                const scaleByHeight = maxHeight / charImg.height;
                const scaleByWidth = maxWidth / charImg.width;
                const imgScale = Math.min(scaleByHeight, scaleByWidth);
                charImg.setScale(imgScale);
            }
        }

        // Final scores header
        this.add.text(width / 2, height * 0.62, 'Puntuaciones Finales', {
            fontFamily: 'Georgia, serif',
            fontSize: textSize + 'px',
            color: '#b8b0a0',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        // Player scores
        if (players) {
            // Sort by VP descending
            const sortedPlayers = [...players].sort((a, b) => {
                const vpA = a.getVictoryPoints ? a.getVictoryPoints() : 0;
                const vpB = b.getVictoryPoints ? b.getVictoryPoints() : 0;
                return vpB - vpA;
            });

            const rowSpacing = height * 0.055;
            sortedPlayers.forEach((player, index) => {
                const y = height * 0.69 + index * rowSpacing;
                const vp = player.getVictoryPoints ? player.getVictoryPoints() : 0;
                const isWinner = winner && player.id === winner.id;
                const color = isWinner ? '#e6c870' : '#888888';

                this.add.text(width * 0.35, y, player.name, {
                    fontFamily: 'Arial, sans-serif',
                    fontSize: smallTextSize + 'px',
                    color: color
                }).setOrigin(0, 0.5);

                this.add.text(width * 0.65, y, `${vp} VP`, {
                    fontFamily: 'Arial, sans-serif',
                    fontSize: smallTextSize + 'px',
                    color: color,
                    fontStyle: 'bold'
                }).setOrigin(1, 0.5);
            });
        }

        // Back to menu button
        const btnWidth = Math.floor(width * 0.25);
        const btnHeight = Math.floor(height * 0.07);
        const btnY = height * 0.92;
        const btn = this.add.rectangle(width / 2, btnY, btnWidth, btnHeight, 0x8b3545)
            .setStrokeStyle(2, 0xe6c870)
            .setInteractive({ useHandCursor: true });

        this.add.text(width / 2, btnY, 'Volver al Menú', {
            fontFamily: 'Georgia, serif',
            fontSize: smallTextSize + 'px',
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
