// ModalManager - Handles modal dialogs

class ModalManager {
    constructor(scene) {
        this.scene = scene;
        this.activeModal = null;
        this.modalContainer = null;
    }

    show(config) {
        const { width, height } = this.scene.cameras.main;

        // Close any existing modal
        this.close();

        // Create container
        this.modalContainer = this.scene.add.container(0, 0);
        this.modalContainer.setDepth(1000);

        // Custom center position (defaults to screen center)
        const cx = config.centerX !== undefined ? config.centerX : width / 2;
        const cy = config.centerY !== undefined ? config.centerY : height / 2;

        // Full-screen dismiss overlay (transparent, for clicking outside visible overlay)
        if (config.fullScreenDismiss && config.dismissible !== false) {
            const fullOverlay = this.scene.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0)
                .setInteractive();
            fullOverlay.on('pointerdown', () => this.close());
            this.modalContainer.add(fullOverlay);
        }

        // Overlay - covers full screen or custom area
        const overlayWidth = config.overlayWidth || width;
        const overlayX = config.overlayX !== undefined ? config.overlayX : width / 2;
        const overlay = this.scene.add.rectangle(overlayX, height / 2, overlayWidth, height, 0x000000, 0.8)
            .setInteractive();
        this.modalContainer.add(overlay);

        // Close on overlay click if dismissible
        if (config.dismissible !== false) {
            overlay.on('pointerdown', () => this.close());
        }

        // Modal box
        const boxWidth = config.width || width * 0.8;
        const boxHeight = config.height || height * 0.6;

        const box = this.scene.add.rectangle(cx, cy, boxWidth, boxHeight, 0x2a2015)
            .setStrokeStyle(3, 0xe6c870);
        this.modalContainer.add(box);

        // Title
        if (config.title) {
            const titleFontSize = Math.floor(height * 0.04);
            const titleOffset = boxHeight * 0.08;
            const title = this.scene.add.text(cx, cy - boxHeight / 2 + titleOffset, config.title, {
                fontFamily: 'Cinzel, Georgia, serif',
                fontSize: titleFontSize + 'px',
                color: '#e6c870'
            }).setOrigin(0.5);
            this.modalContainer.add(title);
        }

        // Content (custom render function)
        if (config.content) {
            config.content(this.modalContainer, cx, cy, boxWidth, boxHeight);
        }

        // Close button
        if (config.showClose !== false) {
            const closeFontSize = Math.floor(height * 0.035);
            const closeBtn = this.scene.add.text(
                cx + boxWidth / 2 - boxWidth * 0.05,
                cy - boxHeight / 2 + boxHeight * 0.05,
                'X',
                {
                    fontSize: closeFontSize + 'px',
                    color: '#888888'
                }
            ).setOrigin(0.5).setInteractive({ useHandCursor: true });

            closeBtn.on('pointerover', () => closeBtn.setColor('#e6c870'));
            closeBtn.on('pointerout', () => closeBtn.setColor('#888888'));
            closeBtn.on('pointerdown', () => this.close());

            this.modalContainer.add(closeBtn);
        }

        // Buttons
        if (config.buttons) {
            const { width: screenWidth, height: screenHeight } = this.scene.cameras.main;
            const buttonOffset = config.buttonOffset || 0;
            const buttonY = cy + boxHeight / 2 - boxHeight * 0.15 + buttonOffset;
            const hasLargeButtons = config.buttons.some(b => b.large);
            // Responsive button spacing based on screen width
            const buttonSpacing = hasLargeButtons ? Math.floor(screenWidth * 0.18) : Math.floor(screenWidth * 0.12);
            const startX = cx - ((config.buttons.length - 1) * buttonSpacing) / 2;

            config.buttons.forEach((btnConfig, index) => {
                const btnX = startX + index * buttonSpacing;
                const isLarge = btnConfig.large;
                // Responsive button sizes based on screen dimensions
                const btnWidth = isLarge ? Math.floor(screenWidth * 0.18) : Math.floor(screenWidth * 0.10);
                const btnHeight = isLarge ? Math.floor(screenHeight * 0.10) : Math.floor(screenHeight * 0.065);
                // Use responsive font sizes
                const fontSize = isLarge ? Math.floor(screenHeight * 0.035) + 'px' : Math.floor(screenHeight * 0.025) + 'px';

                const btn = this.scene.add.rectangle(btnX, buttonY, btnWidth, btnHeight,
                    btnConfig.primary ? 0x8b3545 : 0x333333)
                    .setStrokeStyle(2, btnConfig.primary ? 0xe6c870 : 0x666666)
                    .setInteractive({ useHandCursor: true });

                const btnText = this.scene.add.text(btnX, buttonY, btnConfig.text, {
                    fontFamily: 'Georgia, serif',
                    fontSize: fontSize,
                    color: btnConfig.primary ? '#ffffff' : '#888888'
                }).setOrigin(0.5);

                btn.on('pointerover', () => {
                    btn.setFillStyle(btnConfig.primary ? 0xa04555 : 0x444444);
                });
                btn.on('pointerout', () => {
                    btn.setFillStyle(btnConfig.primary ? 0x8b3545 : 0x333333);
                });
                btn.on('pointerdown', () => {
                    if (btnConfig.onClick) btnConfig.onClick();
                    if (btnConfig.closeOnClick !== false) this.close();
                });

                this.modalContainer.add([btn, btnText]);
            });
        }

        this.activeModal = config;

        // Callback after show
        if (config.onShow) {
            config.onShow();
        }
    }

    close() {
        if (this.modalContainer) {
            // Callback before close
            if (this.activeModal && this.activeModal.onClose) {
                this.activeModal.onClose();
            }

            this.modalContainer.destroy(true);
            this.modalContainer = null;
            this.activeModal = null;
        }
    }

    // Convenience method for confirmation dialogs
    confirm(title, message, onConfirm, onCancel) {
        const { width, height } = this.scene.cameras.main;
        const fontSize = Math.floor(height * 0.04);
        const modalWidth = Math.floor(width * 0.65);
        const modalHeight = Math.floor(height * 0.35);

        this.show({
            title: title,
            showClose: false,
            content: (container, cx, cy, w, h) => {
                const text = this.scene.add.text(cx, cy - 10, message, {
                    fontFamily: 'Georgia, serif',
                    fontSize: fontSize + 'px',
                    color: '#b8b0a0',
                    align: 'center',
                    wordWrap: { width: w - 60 }
                }).setOrigin(0.5);
                container.add(text);
            },
            buttons: [
                { text: 'Si', primary: true, onClick: onConfirm, large: true },
                { text: 'No', primary: false, onClick: onCancel, large: true }
            ],
            width: modalWidth,
            height: modalHeight
        });
    }

    // Convenience method for alerts
    alert(title, message, onClose) {
        const { width, height } = this.scene.cameras.main;
        const fontSize = Math.floor(height * 0.04);
        const modalWidth = Math.floor(width * 0.65);
        const modalHeight = Math.floor(height * 0.32);

        this.show({
            title: title,
            showClose: false,
            content: (container, cx, cy, w, h) => {
                const text = this.scene.add.text(cx, cy - 10, message, {
                    fontFamily: 'Georgia, serif',
                    fontSize: fontSize + 'px',
                    color: '#b8b0a0',
                    align: 'center',
                    wordWrap: { width: w - 60 }
                }).setOrigin(0.5);
                container.add(text);
            },
            buttons: [
                { text: 'Ok', primary: true, onClick: onClose, large: true }
            ],
            width: modalWidth,
            height: modalHeight
        });
    }

    // Game menu modal
    showGameMenu(callbacks) {
        const { width, height } = this.scene.cameras.main;

        // Use same proportions as main menu buttons
        const buttonWidth = Math.floor(height * 0.35);
        const buttonHeight = Math.floor(height * 0.08);
        const fontSize = Math.floor(height * 0.035);
        const spacing = Math.floor(height * 0.02);

        // Modal size to fit 5 buttons
        const modalWidth = buttonWidth + 60;
        const modalHeight = (buttonHeight + spacing) * 5 + 80;

        const isFs = this.scene.scale.isFullscreen;

        this.show({
            title: '',
            showClose: false,
            dismissible: false,
            width: modalWidth,
            height: modalHeight,
            content: (container, cx, cy, w, h) => {
                const startY = cy - (buttonHeight + spacing) * 2;

                const menuItems = [
                    { text: 'Ayuda', callback: callbacks.onHelp },
                    { text: 'Ajustes', callback: callbacks.onSettings, noClose: true },
                    { text: isFs ? 'Modo Ventana' : 'Pantalla Completa',
                      callback: () => toggleFullscreen(this.scene) },
                    { text: 'Volver al menú', callback: callbacks.onBackToMenu, noClose: true },
                    { text: 'Continuar', callback: callbacks.onContinue, primary: true }
                ];

                menuItems.forEach((item, index) => {
                    const yPos = startY + index * (buttonHeight + spacing);
                    const isPrimary = item.primary || false;

                    const btn = this.scene.add.rectangle(
                        cx, yPos, buttonWidth, buttonHeight,
                        isPrimary ? 0x8b3545 : 0x333333
                    ).setStrokeStyle(2, isPrimary ? 0xe6c870 : 0x666666)
                     .setInteractive({ useHandCursor: true });

                    const btnText = this.scene.add.text(cx, yPos, item.text, {
                        fontFamily: 'Georgia, serif',
                        fontSize: fontSize + 'px',
                        color: isPrimary ? '#ffffff' : '#b8b0a0'
                    }).setOrigin(0.5);

                    btn.on('pointerover', () => {
                        btn.setFillStyle(isPrimary ? 0xa04555 : 0x444444);
                    });
                    btn.on('pointerout', () => {
                        btn.setFillStyle(isPrimary ? 0x8b3545 : 0x333333);
                    });
                    btn.on('pointerdown', () => {
                        if (item.callback) item.callback();
                        if (!item.noClose) this.close();
                    });

                    container.add([btn, btnText]);
                });
            }
        });
    }

    // Settings modal (in-game)
    showSettings(callbacks) {
        const { width, height } = this.scene.cameras.main;

        const labelFontSize = Math.floor(height * 0.03);
        const valueFontSize = Math.floor(height * 0.028);
        const rowHeight = Math.floor(height * 0.06);
        const rowSpacing = Math.floor(height * 0.08);
        const valueBoxWidth = Math.floor(width * 0.22);
        const valueBoxHeight = Math.floor(height * 0.05);

        const modalWidth = Math.floor(width * 0.6);
        const modalHeight = Math.floor(height * 0.65);

        let fullscreenText = null;
        let fullscreenBtn = null;
        let animSpeedText = null;

        const isFs = this.scene.scale.isFullscreen;

        const updateFullscreenButton = (isFullscreen) => {
            if (fullscreenText && fullscreenBtn) {
                fullscreenBtn.setFillStyle(isFullscreen ? 0x4a6520 : 0x2a2015);
                fullscreenBtn.setStrokeStyle(1, isFullscreen ? 0x88cc44 : 0x444444);
                fullscreenText.setText(isFullscreen ? 'Activado' : 'Desactivado');
                fullscreenText.setColor(isFullscreen ? '#88cc44' : '#888888');
            }
        };

        // Listen for fullscreen changes
        const onEnterFs = () => updateFullscreenButton(true);
        const onLeaveFs = () => updateFullscreenButton(false);
        this.scene.scale.on('enterfullscreen', onEnterFs);
        this.scene.scale.on('leavefullscreen', onLeaveFs);

        this.show({
            title: 'Ajustes',
            showClose: false,
            dismissible: false,
            width: modalWidth,
            height: modalHeight,
            content: (container, cx, cy, w, h) => {
                const leftX = cx - w * 0.35;
                const rightX = cx + w * 0.2;
                const startY = cy - h * 0.25;

                // Row 1: Fullscreen toggle
                const fsLabel = this.scene.add.text(leftX, startY, 'Pantalla Completa:', {
                    fontFamily: 'Georgia, serif',
                    fontSize: labelFontSize + 'px',
                    color: '#b8b0a0'
                }).setOrigin(0, 0.5);

                fullscreenBtn = this.scene.add.rectangle(rightX, startY, valueBoxWidth, valueBoxHeight,
                    isFs ? 0x4a6520 : 0x2a2015)
                    .setStrokeStyle(1, isFs ? 0x88cc44 : 0x444444)
                    .setInteractive({ useHandCursor: true });

                fullscreenText = this.scene.add.text(rightX, startY, isFs ? 'Activado' : 'Desactivado', {
                    fontFamily: 'Georgia, serif',
                    fontSize: valueFontSize + 'px',
                    color: isFs ? '#88cc44' : '#888888'
                }).setOrigin(0.5);

                fullscreenBtn.on('pointerdown', () => {
                    toggleFullscreen(this.scene);
                });

                container.add([fsLabel, fullscreenBtn, fullscreenText]);

                // Row 2: Animation speed
                const animY = startY + rowSpacing;
                const animLabel = this.scene.add.text(leftX, animY, 'Animaciones:', {
                    fontFamily: 'Georgia, serif',
                    fontSize: labelFontSize + 'px',
                    color: '#b8b0a0'
                }).setOrigin(0, 0.5);

                const animBtn = this.scene.add.rectangle(rightX, animY, valueBoxWidth, valueBoxHeight, 0x2a2015)
                    .setStrokeStyle(1, 0x444444)
                    .setInteractive({ useHandCursor: true });

                animSpeedText = this.scene.add.text(rightX, animY, getAnimationSpeedLabel(), {
                    fontFamily: 'Georgia, serif',
                    fontSize: valueFontSize + 'px',
                    color: '#e6c870'
                }).setOrigin(0.5);

                animBtn.on('pointerdown', () => {
                    cycleAnimationSpeed();
                    animSpeedText.setText(getAnimationSpeedLabel());
                });

                container.add([animLabel, animBtn, animSpeedText]);

                // Row 3: Music toggle
                const musicY = animY + rowSpacing;
                const isMusicOn = isMusicEnabled();

                const musicLabel = this.scene.add.text(leftX, musicY, 'Música:', {
                    fontFamily: 'Georgia, serif',
                    fontSize: labelFontSize + 'px',
                    color: '#b8b0a0'
                }).setOrigin(0, 0.5);

                const musicBtn = this.scene.add.rectangle(rightX, musicY, valueBoxWidth, valueBoxHeight,
                    isMusicOn ? 0x4a6520 : 0x2a2015)
                    .setStrokeStyle(1, isMusicOn ? 0x88cc44 : 0x444444)
                    .setInteractive({ useHandCursor: true });

                const musicText = this.scene.add.text(rightX, musicY, getMusicLabel(), {
                    fontFamily: 'Georgia, serif',
                    fontSize: valueFontSize + 'px',
                    color: isMusicOn ? '#88cc44' : '#888888'
                }).setOrigin(0.5);

                musicBtn.on('pointerdown', () => {
                    const newEnabled = toggleMusic();
                    musicBtn.setFillStyle(newEnabled ? 0x4a6520 : 0x2a2015);
                    musicBtn.setStrokeStyle(1, newEnabled ? 0x88cc44 : 0x444444);
                    musicText.setText(getMusicLabel());
                    musicText.setColor(newEnabled ? '#88cc44' : '#888888');

                    // Start or stop music
                    if (this.scene.game.musicManager) {
                        if (newEnabled) {
                            this.scene.game.musicManager.restart();
                        } else {
                            this.scene.game.musicManager.stop();
                        }
                    }
                });

                container.add([musicLabel, musicBtn, musicText]);

                // Row 4: Sound effects (disabled)
                const sfxY = musicY + rowSpacing;
                const sfxLabel = this.scene.add.text(leftX, sfxY, 'Efectos:', {
                    fontFamily: 'Georgia, serif',
                    fontSize: labelFontSize + 'px',
                    color: '#666666'
                }).setOrigin(0, 0.5);

                const sfxBtn = this.scene.add.rectangle(rightX, sfxY, valueBoxWidth, valueBoxHeight, 0x1a1a1a)
                    .setStrokeStyle(1, 0x333333);

                const sfxText = this.scene.add.text(rightX, sfxY, 'Próximamente', {
                    fontFamily: 'Georgia, serif',
                    fontSize: valueFontSize + 'px',
                    color: '#555555'
                }).setOrigin(0.5);

                container.add([sfxLabel, sfxBtn, sfxText]);

                // Back button
                const backY = cy + h * 0.35;
                const backBtnWidth = Math.floor(height * 0.25);
                const backBtnHeight = Math.floor(height * 0.06);

                const backBtn = this.scene.add.rectangle(cx, backY, backBtnWidth, backBtnHeight, 0x8b3545)
                    .setStrokeStyle(2, 0xe6c870)
                    .setInteractive({ useHandCursor: true });

                const backText = this.scene.add.text(cx, backY, 'Volver', {
                    fontFamily: 'Georgia, serif',
                    fontSize: Math.floor(height * 0.032) + 'px',
                    color: '#ffffff'
                }).setOrigin(0.5);

                backBtn.on('pointerover', () => backBtn.setFillStyle(0xa04555));
                backBtn.on('pointerout', () => backBtn.setFillStyle(0x8b3545));
                backBtn.on('pointerdown', () => {
                    this.close();
                    if (callbacks.onBack) callbacks.onBack();
                });

                container.add([backBtn, backText]);
            },
            onClose: () => {
                this.scene.scale.off('enterfullscreen', onEnterFs);
                this.scene.scale.off('leavefullscreen', onLeaveFs);
            }
        });
    }
}
