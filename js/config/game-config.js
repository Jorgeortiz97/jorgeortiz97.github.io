// Phaser game configuration

function createGameConfig(resolution) {
    const preset = getResolutionPreset(resolution);

    return {
        type: Phaser.AUTO,
        width: preset.width,
        height: preset.height,
        parent: 'game-container',
        backgroundColor: '#1a1510',
        scale: {
            mode: Phaser.Scale.FIT,
            autoCenter: Phaser.Scale.CENTER_BOTH
        },
        scene: [
            BootScene,
            MenuScene,
            GameScene,
            GameOverScene
        ],
        render: {
            pixelArt: false,
            antialias: true,
            roundPixels: false
        }
    };
}
