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
            roundPixels: false,
            powerPreference: 'high-performance',
            failIfMajorPerformanceCaveat: false
        },
        callbacks: {
            postBoot: function(game) {
                // Handle WebGL context loss (common on mobile when app is backgrounded)
                game.canvas.addEventListener('webglcontextlost', (e) => {
                    e.preventDefault();
                    console.log('WebGL context lost');
                });
                game.canvas.addEventListener('webglcontextrestored', () => {
                    console.log('WebGL context restored');
                    // Restart the current scene to rebuild all display objects
                    const activeScene = game.scene.getScenes(true)[0];
                    if (activeScene) {
                        activeScene.scene.restart();
                    }
                });
            }
        }
    };
}
