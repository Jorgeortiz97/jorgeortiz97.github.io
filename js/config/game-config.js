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
                // Simple visibility handling - reload page when returning from background
                let wasHidden = false;

                document.addEventListener('visibilitychange', () => {
                    if (document.hidden) {
                        wasHidden = true;
                    } else if (wasHidden) {
                        // Page was hidden and is now visible - reload to recover
                        window.location.reload();
                    }
                });

                // Backup for iOS Safari
                window.addEventListener('pageshow', (event) => {
                    if (event.persisted) {
                        window.location.reload();
                    }
                });
            }
        }
    };
}
