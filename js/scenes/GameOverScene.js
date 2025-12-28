// GameOverScene - Victory/defeat screen with all players and resources

class GameOverScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameOverScene' });
    }

    create() {
        const { width, height } = this.cameras.main;

        // Get results from registry
        const winner = this.registry.get('winner');
        const players = this.registry.get('players');
        const game = this.registry.get('game');

        // Responsive sizes
        const titleSize = Math.floor(height * 0.07);
        const subtitleSize = Math.floor(height * 0.04);
        const nameSize = Math.floor(height * 0.045);
        const textSize = Math.floor(height * 0.038);
        const iconSize = Math.floor(height * 0.05);

        // Fade in
        this.cameras.main.fadeIn(300);

        // Background
        this.add.rectangle(width / 2, height / 2, width, height, 0x1a1510);

        // Title
        const isHumanWinner = winner && winner.id === 0;
        const titleText = isHumanWinner ? 'ERES EL VENCEDOR' : 'PARTIDA TERMINADA';
        const titleColor = isHumanWinner ? '#e6c870' : '#b8b0a0';

        this.add.text(width / 2, height * 0.05, titleText, {
            fontFamily: 'Cinzel, Georgia, serif',
            fontSize: titleSize + 'px',
            color: titleColor,
            fontStyle: 'bold'
        }).setOrigin(0.5);

        // Subtitle with winner name
        if (winner) {
            this.add.text(width / 2, height * 0.11, `Ganador: ${winner.name}`, {
                fontFamily: 'Georgia, serif',
                fontSize: subtitleSize + 'px',
                color: '#e6c870'
            }).setOrigin(0.5);
        }

        // Player entries
        if (players) {
            // Sort by VP descending
            const sortedPlayers = [...players].sort((a, b) => {
                const vpA = a.getVictoryPoints ? a.getVictoryPoints(game) : 0;
                const vpB = b.getVictoryPoints ? b.getVictoryPoints(game) : 0;
                return vpB - vpA;
            });

            const entryStartY = height * 0.18;
            const entrySpacing = height * 0.26;
            const entryHeight = height * 0.22;

            sortedPlayers.forEach((player, index) => {
                const entryY = entryStartY + index * entrySpacing;
                const isWinner = winner && player.id === winner.id;

                this.createPlayerEntry(
                    player,
                    entryY,
                    entryHeight,
                    index,
                    isWinner,
                    game,
                    { nameSize, textSize, iconSize }
                );
            });
        }

        // Back to menu button
        const btnWidth = Math.floor(width * 0.28);
        const btnHeight = Math.floor(height * 0.07);
        const btnY = height * 0.94;
        const btn = this.add.rectangle(width / 2, btnY, btnWidth, btnHeight, 0x8b3545)
            .setStrokeStyle(2, 0xe6c870)
            .setInteractive({ useHandCursor: true });

        this.add.text(width / 2, btnY, 'MENÚ', {
            fontFamily: 'Georgia, serif',
            fontSize: textSize + 'px',
            color: '#ffffff',
            fontStyle: 'bold'
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

    createPlayerEntry(player, y, entryHeight, rank, isWinner, game, sizes) {
        const { width, height } = this.cameras.main;
        const { nameSize, textSize, iconSize } = sizes;

        // Entry container dimensions
        const entryWidth = width * 0.92;
        const entryX = width / 2;
        const entryCenterY = y + entryHeight / 2;

        // Background panel
        const panelColor = isWinner ? 0x2a2518 : 0x1f1a12;
        const borderColor = isWinner ? 0xe6c870 : 0x555555;
        const panel = this.add.rectangle(entryX, entryCenterY, entryWidth, entryHeight, panelColor)
            .setStrokeStyle(isWinner ? 3 : 2, borderColor);

        // Winner glow effect
        if (isWinner && panel.preFX) {
            panel.preFX.addGlow(0xe6c870, 0.5, 0, false, 0.1, 8);
        }

        // Portrait area (left side)
        const portraitX = width * 0.12;
        const portraitMaxWidth = width * 0.14;
        const portraitMaxHeight = entryHeight * 0.85;

        if (player.character) {
            const charImg = this.add.image(portraitX, entryCenterY, player.character.id);
            this.fitImageToArea(charImg, portraitMaxWidth, portraitMaxHeight);
        }

        // Rank indicator
        const rankX = width * 0.04;
        const rankColors = ['#e6c870', '#c0c0c0', '#cd7f32']; // Gold, Silver, Bronze
        this.add.text(rankX, entryCenterY, `${rank + 1}º`, {
            fontFamily: 'Cinzel, Georgia, serif',
            fontSize: nameSize + 'px',
            color: rankColors[rank] || '#888888',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        // Player name and character name (center-left area)
        const nameX = width * 0.24;
        const textColor = isWinner ? '#e6c870' : '#b8b0a0';

        this.add.text(nameX, entryCenterY - entryHeight * 0.18, player.name, {
            fontFamily: 'Georgia, serif',
            fontSize: nameSize + 'px',
            color: textColor,
            fontStyle: 'bold'
        }).setOrigin(0, 0.5);

        if (player.character) {
            this.add.text(nameX, entryCenterY + entryHeight * 0.08, player.character.nameES, {
                fontFamily: 'Georgia, serif',
                fontSize: textSize + 'px',
                color: isWinner ? '#b8a060' : '#888888',
                fontStyle: 'italic'
            }).setOrigin(0, 0.5);
        }

        // Resources area (right side)
        const resourceStartX = width * 0.52;
        const resourceSpacing = width * 0.115;
        const resourceY = entryCenterY;

        // Get player stats
        const vp = player.getVictoryPoints ? player.getVictoryPoints(game) : 0;
        const coins = player.coins || 0;
        const totalLands = player.lands ? player.lands.length : 0;
        const activeInns = player.inns ? player.inns.filter(i => !i.destroyed).length : 0;
        const treasures = player.treasures ? player.treasures.length : 0;

        // Resource entries: VP, Coins, Lands, Inns, Treasures
        const resources = [
            { icon: 'vp_icon', value: vp, color: '#8b3545' },
            { icon: this.getCoinIcon(player.id), value: coins, color: '#e6c870' },
            { icon: 'land', value: totalLands, color: '#7aa64f' },
            { icon: 'inn', value: activeInns, color: '#8b5a3c' },
            { icon: 'treasure', value: treasures, color: '#a8abad' }
        ];

        resources.forEach((res, i) => {
            const resX = resourceStartX + i * resourceSpacing;

            // Icon
            const icon = this.add.image(resX, resourceY - iconSize * 0.4, res.icon);
            this.fitImageToArea(icon, iconSize, iconSize);

            // Value
            this.add.text(resX, resourceY + iconSize * 0.5, res.value.toString(), {
                fontFamily: 'Arial, sans-serif',
                fontSize: textSize + 'px',
                color: isWinner ? res.color : '#888888',
                fontStyle: 'bold'
            }).setOrigin(0.5);
        });
    }

    fitImageToArea(image, maxWidth, maxHeight) {
        const scaleX = maxWidth / image.width;
        const scaleY = maxHeight / image.height;
        const scale = Math.min(scaleX, scaleY);
        image.setScale(scale);
    }

    getCoinIcon(playerId) {
        const coinTypes = ['gold_coin', 'silver_coin', 'copper_coin'];
        return coinTypes[playerId] || 'gold_coin';
    }
}
