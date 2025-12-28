// MenuScene - Main menu, settings, character selection

class MenuScene extends Phaser.Scene {
    constructor() {
        super({ key: 'MenuScene' });
        this.currentScreen = 'main';
        this.selectedDifficulty = 'medium';
    }

    create() {
        const { width, height } = this.cameras.main;

        // Add panoramic background with panning animation
        const imageRatio = 1500 / 444;
        const bgHeight = height;
        const bgWidth = height * imageRatio;

        this.background = this.add.image(bgWidth / 2, height / 2, 'panoramic')
            .setDisplaySize(bgWidth, bgHeight);

        // Add panning animation (ping-pong effect)
        this.tweens.add({
            targets: this.background,
            x: width - bgWidth / 2,
            duration: 15000,
            ease: 'Sine.easeInOut',
            yoyo: true,
            repeat: -1
        });

        // Add dark overlay for readability
        this.overlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.6);

        // Check fullscreen preference
        const pref = getFullscreenPreference();

        if (pref === null) {
            // First visit - show prompt (or auto-enter on mobile)
            if (isMobileDevice()) {
                this.showMainMenu();
                // Mobile: enter fullscreen on first tap
                this.input.once('pointerdown', () => enterFullscreen(this));
            } else {
                this.showFullscreenPrompt();
            }
        } else if (pref === true) {
            // User previously chose fullscreen - enter on first interaction
            this.showMainMenu();
            this.input.once('pointerdown', () => enterFullscreen(this));
        } else {
            this.showMainMenu();
        }

        // Mobile visibility handling - pause/resume scene when app is minimized
        // Note: Global handler in game-config.js handles render recovery
        this.visibilityHandler = () => {
            if (document.hidden) {
                this.scene.pause();
            } else {
                this.scene.resume();
            }
        };
        document.addEventListener('visibilitychange', this.visibilityHandler);

        // Clean up visibility handler when scene shuts down
        this.events.on('shutdown', () => {
            document.removeEventListener('visibilitychange', this.visibilityHandler);
        });
    }

    showFullscreenPrompt() {
        const { width, height } = this.cameras.main;
        this.promptContainer = this.add.container(0, 0);

        // Dark overlay
        const promptOverlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.85);
        this.promptContainer.add(promptOverlay);

        // Title
        const title = this.add.text(width / 2, height * 0.35, 'Pantalla Completa', {
            fontFamily: 'Cinzel, Georgia, serif',
            fontSize: Math.floor(height * 0.08) + 'px',
            color: '#e6c870'
        }).setOrigin(0.5);
        this.promptContainer.add(title);

        // Recommendation text
        const text = this.add.text(width / 2, height * 0.48,
            'Se recomienda jugar en pantalla completa\npara una mejor experiencia', {
            fontFamily: 'Georgia, serif',
            fontSize: Math.floor(height * 0.035) + 'px',
            color: '#b8b0a0',
            align: 'center'
        }).setOrigin(0.5);
        this.promptContainer.add(text);

        // Button dimensions
        const btnWidth = Math.floor(height * 0.4);
        const btnHeight = Math.floor(height * 0.08);
        const fontSize = Math.floor(height * 0.035);

        // Fullscreen button (primary)
        const fsBtn = this.add.rectangle(width / 2, height * 0.62, btnWidth, btnHeight, 0x8b3545)
            .setStrokeStyle(2, 0xe6c870)
            .setInteractive({ useHandCursor: true });
        const fsBtnText = this.add.text(width / 2, height * 0.62, 'Pantalla Completa', {
            fontFamily: 'Georgia, serif',
            fontSize: fontSize + 'px',
            color: '#ffffff'
        }).setOrigin(0.5);

        fsBtn.on('pointerover', () => fsBtn.setFillStyle(0xa04555));
        fsBtn.on('pointerout', () => fsBtn.setFillStyle(0x8b3545));
        fsBtn.on('pointerdown', () => {
            enterFullscreen(this);
            this.promptContainer.destroy();
            this.showMainMenu();
        });

        this.promptContainer.add([fsBtn, fsBtnText]);

        // Continue in window button (secondary)
        const winBtn = this.add.rectangle(width / 2, height * 0.72, btnWidth, btnHeight, 0x333333)
            .setStrokeStyle(2, 0x666666)
            .setInteractive({ useHandCursor: true });
        const winBtnText = this.add.text(width / 2, height * 0.72, 'Continuar en Ventana', {
            fontFamily: 'Georgia, serif',
            fontSize: fontSize + 'px',
            color: '#b8b0a0'
        }).setOrigin(0.5);

        winBtn.on('pointerover', () => winBtn.setFillStyle(0x444444));
        winBtn.on('pointerout', () => winBtn.setFillStyle(0x333333));
        winBtn.on('pointerdown', () => {
            saveFullscreenPreference(false);
            this.promptContainer.destroy();
            this.showMainMenu();
        });

        this.promptContainer.add([winBtn, winBtnText]);
    }

    clearScreen() {
        // Remove all menu elements except background
        if (this.menuContainer) {
            this.menuContainer.destroy();
        }
    }

    showMainMenu() {
        this.clearScreen();
        this.currentScreen = 'main';

        // Start background music if enabled (and not already playing)
        if (this.game.musicManager && isMusicEnabled() && !this.game.musicManager.getIsPlaying()) {
            this.game.musicManager.start();
        }

        const { width, height } = this.cameras.main;
        this.menuContainer = this.add.container(0, 0);

        // Title image
        const title = this.add.image(width / 2, height * 0.18, 'gremios')
            .setOrigin(0.5);
        const titleScale = (width * 0.45) / title.width;
        title.setScale(titleScale);
        this.menuContainer.add(title);

        // Subtitle - positioned just below the logo
        const subtitleY = title.y + (title.displayHeight / 2) + 10;
        const subtitle = this.add.text(width / 2, subtitleY, 'Estrategia, aventuras, inversiones', {
            fontFamily: 'Cinzel, Georgia, serif',
            fontSize: Math.floor(height * 0.03) + 'px',
            color: '#b8b0a0'
        }).setOrigin(0.5);
        this.menuContainer.add(subtitle);

        // Menu buttons
        const buttonY = height * 0.45;
        const buttonSpacing = height * 0.1;

        this.createButton(width / 2, buttonY, 'Nueva Partida', () => this.showDifficultyMenu());
        this.createButton(width / 2, buttonY + buttonSpacing, 'Configuración', () => this.showSettings());
        this.createButton(width / 2, buttonY + buttonSpacing * 2, 'Créditos', () => this.showCredits());
    }

    showDifficultyMenu() {
        this.clearScreen();
        this.currentScreen = 'difficulty';

        const { width, height } = this.cameras.main;
        this.menuContainer = this.add.container(0, 0);

        // Title
        const title = this.add.text(width / 2, height * 0.2, 'Selecciona Dificultad', {
            fontFamily: 'Cinzel, Georgia, serif',
            fontSize: Math.floor(height * 0.08) + 'px',
            color: '#e6c870',
            fontStyle: 'bold'
        }).setOrigin(0.5);
        this.menuContainer.add(title);

        // Difficulty buttons
        const buttonY = height * 0.4;
        const buttonSpacing = height * 0.1;

        this.createButton(width / 2, buttonY, 'Fácil', () => this.selectDifficulty('easy'));
        this.createButton(width / 2, buttonY + buttonSpacing, 'Media', () => this.selectDifficulty('medium'));
        this.createButton(width / 2, buttonY + buttonSpacing * 2, 'Difícil', () => this.selectDifficulty('hard'));

        // Back button
        this.createButton(width / 2, height * 0.85, 'Atrás', () => this.showMainMenu(), true);
    }

    selectDifficulty(difficulty) {
        this.selectedDifficulty = difficulty;
        // Go directly to GameScene - character selection happens there
        this.startGame();
    }

    startGame() {
        // Clear any saved game when starting a new game
        GremiosGame.clearSavedGame();

        // Store difficulty in registry for GameScene
        this.registry.set('difficulty', this.selectedDifficulty);

        // Transition to game
        this.cameras.main.fadeOut(300, 0, 0, 0);
        this.cameras.main.once('camerafadeoutcomplete', () => {
            this.scene.start('GameScene');
        });
    }

    showSettings() {
        this.clearScreen();
        this.currentScreen = 'settings';

        const { width, height } = this.cameras.main;
        this.menuContainer = this.add.container(0, 0);

        const labelFontSize = Math.floor(height * 0.03);
        const optionFontSize = Math.floor(height * 0.026);
        const optionSpacing = Math.floor(height * 0.058);
        const optionHeight = Math.floor(height * 0.05);
        const rowHeight = Math.floor(height * 0.07);

        // Title
        const title = this.add.text(width / 2, height * 0.08, 'Configuración', {
            fontFamily: 'Cinzel, Georgia, serif',
            fontSize: Math.floor(height * 0.065) + 'px',
            color: '#e6c870',
            fontStyle: 'bold'
        }).setOrigin(0.5);
        this.menuContainer.add(title);

        // Resolution setting
        const resLabel = this.add.text(width * 0.25, height * 0.18, 'Resolución:', {
            fontFamily: 'Georgia, serif',
            fontSize: labelFontSize + 'px',
            color: '#b8b0a0'
        }).setOrigin(0, 0.5);
        this.menuContainer.add(resLabel);

        const currentRes = getCurrentResolution();
        const preset = getResolutionPreset(currentRes);

        const resValue = this.add.text(width * 0.75, height * 0.18, preset.label, {
            fontFamily: 'Georgia, serif',
            fontSize: labelFontSize + 'px',
            color: '#e6c870'
        }).setOrigin(1, 0.5);
        this.menuContainer.add(resValue);

        // Resolution options
        const resOptions = Object.entries(RESOLUTION_PRESETS);
        const optionStartY = height * 0.25;

        resOptions.forEach(([key, preset], index) => {
            const isSelected = key === currentRes;
            const y = optionStartY + index * optionSpacing;

            const optionBg = this.add.rectangle(width / 2, y, width * 0.55, optionHeight,
                isSelected ? 0x4a3520 : 0x2a2015)
                .setStrokeStyle(1, isSelected ? 0xe6c870 : 0x444444)
                .setInteractive({ useHandCursor: true });

            const optionText = this.add.text(width / 2, y, preset.label, {
                fontFamily: 'Georgia, serif',
                fontSize: optionFontSize + 'px',
                color: isSelected ? '#e6c870' : '#888888'
            }).setOrigin(0.5);

            this.menuContainer.add([optionBg, optionText]);

            optionBg.on('pointerdown', () => {
                if (key !== currentRes) {
                    saveResolution(key);
                    this.showRestartPrompt();
                }
            });
        });

        // Animation speed toggle
        const animY = height * 0.52;

        const animLabel = this.add.text(width * 0.25, animY, 'Animaciones:', {
            fontFamily: 'Georgia, serif',
            fontSize: labelFontSize + 'px',
            color: '#b8b0a0'
        }).setOrigin(0, 0.5);

        const animBtn = this.add.rectangle(width * 0.65, animY, width * 0.25, optionHeight, 0x2a2015)
            .setStrokeStyle(1, 0x444444)
            .setInteractive({ useHandCursor: true });

        const animBtnText = this.add.text(width * 0.65, animY, getAnimationSpeedLabel(), {
            fontFamily: 'Georgia, serif',
            fontSize: optionFontSize + 'px',
            color: '#e6c870'
        }).setOrigin(0.5);

        animBtn.on('pointerdown', () => {
            cycleAnimationSpeed();
            animBtnText.setText(getAnimationSpeedLabel());
        });

        this.menuContainer.add([animLabel, animBtn, animBtnText]);

        // Music toggle
        const musicY = height * 0.59;
        const isMusicOn = isMusicEnabled();

        const musicLabel = this.add.text(width * 0.25, musicY, 'Música:', {
            fontFamily: 'Georgia, serif',
            fontSize: labelFontSize + 'px',
            color: '#b8b0a0'
        }).setOrigin(0, 0.5);

        const musicBtn = this.add.rectangle(width * 0.65, musicY, width * 0.25, optionHeight,
            isMusicOn ? 0x4a6520 : 0x2a2015)
            .setStrokeStyle(1, isMusicOn ? 0x88cc44 : 0x444444)
            .setInteractive({ useHandCursor: true });

        const musicBtnText = this.add.text(width * 0.65, musicY, getMusicLabel(), {
            fontFamily: 'Georgia, serif',
            fontSize: optionFontSize + 'px',
            color: isMusicOn ? '#88cc44' : '#888888'
        }).setOrigin(0.5);

        musicBtn.on('pointerdown', () => {
            const newEnabled = toggleMusic();
            // Update button visual
            musicBtn.setFillStyle(newEnabled ? 0x4a6520 : 0x2a2015);
            musicBtn.setStrokeStyle(1, newEnabled ? 0x88cc44 : 0x444444);
            musicBtnText.setText(getMusicLabel());
            musicBtnText.setColor(newEnabled ? '#88cc44' : '#888888');

            // Start or stop music
            if (this.game.musicManager) {
                if (newEnabled) {
                    // Re-enabled: create new playlist and start
                    this.game.musicManager.restart();
                } else {
                    // Disabled: stop music
                    this.game.musicManager.stop();
                }
            }
        });

        this.menuContainer.add([musicLabel, musicBtn, musicBtnText]);

        // Sound effects toggle (disabled - coming soon)
        const sfxY = height * 0.66;

        const sfxLabel = this.add.text(width * 0.25, sfxY, 'Efectos:', {
            fontFamily: 'Georgia, serif',
            fontSize: labelFontSize + 'px',
            color: '#666666'
        }).setOrigin(0, 0.5);

        const sfxBtn = this.add.rectangle(width * 0.65, sfxY, width * 0.25, optionHeight, 0x1a1a1a)
            .setStrokeStyle(1, 0x333333);

        const sfxBtnText = this.add.text(width * 0.65, sfxY, 'Próximamente', {
            fontFamily: 'Georgia, serif',
            fontSize: optionFontSize + 'px',
            color: '#555555'
        }).setOrigin(0.5);

        this.menuContainer.add([sfxLabel, sfxBtn, sfxBtnText]);

        // Fullscreen toggle
        const fsY = height * 0.73;
        const isFs = this.scale.isFullscreen;

        const fsLabel = this.add.text(width * 0.25, fsY, 'Pantalla Completa:', {
            fontFamily: 'Georgia, serif',
            fontSize: labelFontSize + 'px',
            color: '#b8b0a0'
        }).setOrigin(0, 0.5);

        const fsBtn = this.add.rectangle(width * 0.65, fsY, width * 0.25, optionHeight,
            isFs ? 0x4a6520 : 0x2a2015)
            .setStrokeStyle(1, isFs ? 0x88cc44 : 0x444444)
            .setInteractive({ useHandCursor: true });

        const fsBtnText = this.add.text(width * 0.65, fsY, isFs ? 'Activado' : 'Desactivado', {
            fontFamily: 'Georgia, serif',
            fontSize: optionFontSize + 'px',
            color: isFs ? '#88cc44' : '#888888'
        }).setOrigin(0.5);

        fsBtn.on('pointerdown', () => {
            toggleFullscreen(this);
        });

        // Update button visually when fullscreen state changes
        const updateFsButton = (isFullscreen) => {
            // Check if objects still exist (may be destroyed if screen changed)
            if (!fsBtnText || !fsBtnText.scene) return;
            fsBtn.setFillStyle(isFullscreen ? 0x4a6520 : 0x2a2015);
            fsBtn.setStrokeStyle(1, isFullscreen ? 0x88cc44 : 0x444444);
            fsBtnText.setText(isFullscreen ? 'Activado' : 'Desactivado');
            fsBtnText.setColor(isFullscreen ? '#88cc44' : '#888888');
        };

        this.scale.once('enterfullscreen', () => updateFsButton(true));
        this.scale.once('leavefullscreen', () => updateFsButton(false));

        this.menuContainer.add([fsLabel, fsBtn, fsBtnText]);

        // Back button
        this.createButton(width / 2, height * 0.85, 'Atrás', () => this.showMainMenu(), true);
    }

    showRestartPrompt() {
        const { width, height } = this.cameras.main;

        // Responsive sizes
        const promptFontSize = Math.floor(height * 0.04);
        const btnFontSize = Math.floor(height * 0.035);
        const btnWidth = Math.floor(width * 0.15);
        const btnHeight = Math.floor(height * 0.08);

        // Overlay
        const overlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.8);

        // Prompt box
        const box = this.add.rectangle(width / 2, height / 2, width * 0.6, height * 0.35, 0x2a2015)
            .setStrokeStyle(2, 0xe6c870);

        const promptText = this.add.text(width / 2, height * 0.42,
            'Reiniciar para aplicar los cambios?', {
            fontFamily: 'Georgia, serif',
            fontSize: promptFontSize + 'px',
            color: '#e6c870'
        }).setOrigin(0.5);

        // Yes button
        const yesBtn = this.add.rectangle(width * 0.4, height * 0.55, btnWidth, btnHeight, 0x8b3545)
            .setStrokeStyle(2, 0xe6c870)
            .setInteractive({ useHandCursor: true });
        const yesText = this.add.text(width * 0.4, height * 0.55, 'Si', {
            fontFamily: 'Georgia, serif',
            fontSize: btnFontSize + 'px',
            color: '#ffffff'
        }).setOrigin(0.5);

        yesBtn.on('pointerover', () => yesBtn.setFillStyle(0xa04555));
        yesBtn.on('pointerout', () => yesBtn.setFillStyle(0x8b3545));
        yesBtn.on('pointerdown', () => {
            window.location.reload();
        });

        // No button
        const noBtn = this.add.rectangle(width * 0.6, height * 0.55, btnWidth, btnHeight, 0x333333)
            .setStrokeStyle(2, 0x666666)
            .setInteractive({ useHandCursor: true });
        const noText = this.add.text(width * 0.6, height * 0.55, 'No', {
            fontFamily: 'Georgia, serif',
            fontSize: btnFontSize + 'px',
            color: '#b8b0a0'
        }).setOrigin(0.5);

        noBtn.on('pointerover', () => noBtn.setFillStyle(0x444444));
        noBtn.on('pointerout', () => noBtn.setFillStyle(0x333333));
        noBtn.on('pointerdown', () => {
            overlay.destroy();
            box.destroy();
            promptText.destroy();
            yesBtn.destroy();
            yesText.destroy();
            noBtn.destroy();
            noText.destroy();
        });
    }

    showCredits() {
        this.clearScreen();
        this.currentScreen = 'credits';

        const { width, height } = this.cameras.main;
        this.menuContainer = this.add.container(0, 0);

        const creditFontSize = Math.floor(height * 0.028);
        const lineSpacing = Math.floor(height * 0.045);

        // Title
        const title = this.add.text(width / 2, height * 0.2, 'Créditos', {
            fontFamily: 'Cinzel, Georgia, serif',
            fontSize: Math.floor(height * 0.08) + 'px',
            color: '#e6c870',
            fontStyle: 'bold'
        }).setOrigin(0.5);
        this.menuContainer.add(title);

        // Gremios logo
        const gremiosLogo = this.add.image(width / 2, height * 0.35, 'gremios')
            .setOrigin(0.5);
        const logoScale = (width * 0.3) / gremiosLogo.width;
        gremiosLogo.setScale(logoScale);
        this.menuContainer.add(gremiosLogo);

        // Credits text
        const credits = [
            'Basado en el juego de mesa Gremios',
            'diseñado por Elenport',
            '',
            'Desarrollo: Jorge Ortiz'
        ];

        const creditsStartY = height * 0.48;
        credits.forEach((line, index) => {
            const text = this.add.text(width / 2, creditsStartY + index * lineSpacing, line, {
                fontFamily: 'Georgia, serif',
                fontSize: creditFontSize + 'px',
                color: '#b8b0a0'
            }).setOrigin(0.5);
            this.menuContainer.add(text);
        });

        // Back button
        this.createButton(width / 2, height * 0.85, 'Atrás', () => this.showMainMenu(), true);
    }

    createButton(x, y, text, callback, isSecondary = false) {
        const { height } = this.cameras.main;
        const btnWidth = Math.floor(height * 0.35);
        const btnHeight = Math.floor(height * 0.08);
        const fontSize = Math.floor(height * 0.035);

        const bg = this.add.rectangle(x, y, btnWidth, btnHeight,
            isSecondary ? 0x333333 : 0x8b3545)
            .setStrokeStyle(2, isSecondary ? 0x666666 : 0xe6c870)
            .setInteractive({ useHandCursor: true });

        const label = this.add.text(x, y, text, {
            fontFamily: 'Georgia, serif',
            fontSize: fontSize + 'px',
            color: isSecondary ? '#b8b0a0' : '#ffffff'
        }).setOrigin(0.5);

        this.menuContainer.add([bg, label]);

        // Hover effects
        bg.on('pointerover', () => {
            bg.setFillStyle(isSecondary ? 0x444444 : 0xa04555);
        });

        bg.on('pointerout', () => {
            bg.setFillStyle(isSecondary ? 0x333333 : 0x8b3545);
        });

        bg.on('pointerdown', callback);

        return { bg, label };
    }
}
