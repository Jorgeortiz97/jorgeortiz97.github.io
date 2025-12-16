// BootScene - Handles asset preloading with intro animation

class BootScene extends Phaser.Scene {
    constructor() {
        super({ key: 'BootScene' });
        this.introShown = false;
    }

    preload() {
        // First, load brand images immediately (they're small)
        this.load.setPath(ASSET_PATHS.basePath);
        Object.entries(ASSET_PATHS.brand).forEach(([key, path]) => {
            this.load.image(key, path);
        });
    }

    create() {
        // Show intro animation first
        this.showIntroAnimation();
    }

    showIntroAnimation() {
        const { width, height } = this.cameras.main;
        const centerX = width / 2;
        const centerY = height / 2;

        // Black background
        this.introBg = this.add.rectangle(centerX, centerY, width, height, 0x000000);

        // Elenport logo
        this.elenportLogo = this.add.image(centerX, centerY, 'elenport')
            .setOrigin(0.5)
            .setAlpha(0);

        // Scale logo to fit nicely (about 50% of screen width)
        const logoScale = (width * 0.5) / this.elenportLogo.width;
        this.elenportLogo.setScale(logoScale);

        // Fade in the logo
        this.tweens.add({
            targets: this.elenportLogo,
            alpha: 1,
            duration: 500,
            ease: 'Power2',
            onComplete: () => {
                // Hold for a moment, then fade out
                this.time.delayedCall(800, () => {
                    this.tweens.add({
                        targets: this.elenportLogo,
                        alpha: 0,
                        duration: 500,
                        ease: 'Power2',
                        onComplete: () => {
                            this.transitionToLoading();
                        }
                    });
                });
            }
        });
    }

    transitionToLoading() {
        // Clean up intro elements
        this.elenportLogo.destroy();

        const { width, height } = this.cameras.main;
        const centerX = width / 2;
        const centerY = height / 2;

        // Create dark vellum overlay that fades in
        const vellumOverlay = this.add.rectangle(centerX, centerY, width, height, COLORS.darkVellum)
            .setAlpha(0);

        this.tweens.add({
            targets: vellumOverlay,
            alpha: 1,
            duration: 500,
            ease: 'Power2',
            onComplete: () => {
                this.introBg.destroy();
                this.startMainLoading();
            }
        });
    }

    startMainLoading() {
        // Create loading UI
        this.createLoadingUI();

        // Load all remaining assets
        this.load.setPath(ASSET_PATHS.basePath);

        // Load all character images
        Object.entries(ASSET_PATHS.characters).forEach(([key, path]) => {
            this.load.image(key, path);
        });

        // Load all guild images
        Object.entries(ASSET_PATHS.guilds).forEach(([key, path]) => {
            this.load.image(key, path);
        });

        // Load action event images
        Object.entries(ASSET_PATHS.actionEvents).forEach(([key, path]) => {
            this.load.image(key, path);
        });

        // Load blocking event images
        Object.entries(ASSET_PATHS.blockingEvents).forEach(([key, path]) => {
            this.load.image(key, path);
        });

        // Load UI images
        Object.entries(ASSET_PATHS.ui).forEach(([key, path]) => {
            this.load.image(key, path);
        });

        // Load backgrounds
        Object.entries(ASSET_PATHS.backgrounds).forEach(([key, path]) => {
            this.load.image(key, path);
        });

        // Track loading progress
        this.load.on('progress', (value) => {
            this.updateProgress(value);
        });

        this.load.on('complete', () => {
            this.loadingComplete();
        });

        // Start loading
        this.load.start();
    }

    createLoadingUI() {
        const { width, height } = this.cameras.main;
        const centerX = width / 2;
        const centerY = height / 2;

        // Title image (gremios logo) - centered vertically with loading bar below
        this.titleImage = this.add.image(centerX, centerY - height * 0.08, 'gremios')
            .setOrigin(0.5);

        // Scale logo to fit nicely
        const titleScale = (width * 0.4) / this.titleImage.width;
        this.titleImage.setScale(titleScale);

        // Loading bar background
        const barWidth = width * 0.6;
        const barHeight = Math.floor(height * 0.03);
        const barX = centerX - barWidth / 2;
        const barY = centerY + height * 0.08;

        this.loadingBarBg = this.add.rectangle(
            centerX, barY + barHeight / 2,
            barWidth, barHeight,
            0x333333
        ).setOrigin(0.5);

        // Loading bar progress
        this.loadingBar = this.add.rectangle(
            barX, barY,
            0, barHeight,
            COLORS.antiqueGold
        ).setOrigin(0, 0);

        // Store bar dimensions for progress updates
        this.barWidth = barWidth;
        this.barX = barX;

        // Loading text
        this.loadingText = this.add.text(centerX, barY + height * 0.08, 'Cargando recursos... 0%', {
            fontFamily: 'Georgia, serif',
            fontSize: Math.floor(height * 0.03) + 'px',
            color: '#b8b0a0'
        }).setOrigin(0.5);
    }

    updateProgress(value) {
        // Update loading bar width
        this.loadingBar.width = this.barWidth * value;

        // Update text
        const percent = Math.floor(value * 100);
        this.loadingText.setText(`Cargando recursos... ${percent}%`);
    }

    loadingComplete() {
        this.loadingText.setText('Cargando completado!');

        // Small delay before transitioning to menu
        this.time.delayedCall(500, () => {
            this.scene.start('MenuScene');
        });
    }
}
