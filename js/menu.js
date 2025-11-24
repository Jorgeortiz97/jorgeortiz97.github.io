/**
 * MenuController - Manages the menu system and game initialization flow
 */
class MenuController {
    constructor() {
        this.currentScreen = 'loading';
        this.assetsLoaded = false;
        this.videoEnded = false;
        this.canSkip = false;
        this.selectedDifficulty = null;
        this.transitionSpeed = 'normal';
        this.loadingStartTime = Date.now();
        this.minLoadingTime = 3000; // Minimum 3 seconds on loading screen

        // Add menu-active class to body
        document.body.classList.add('menu-active');

        // Get references to all modals
        this.loadingModal = document.getElementById('loading-screen-modal');
        this.mainMenuModal = document.getElementById('main-menu-modal');
        this.playMenuModal = document.getElementById('play-menu-modal');
        this.settingsModal = document.getElementById('settings-modal');
        this.creditsModal = document.getElementById('credits-modal');
        this.difficultyModal = document.getElementById('difficulty-modal');

        // Get references to UI elements
        this.introVideo = document.getElementById('intro-video');
        this.loadingProgress = document.getElementById('loading-progress');
        this.loadingText = document.getElementById('loading-text');
        this.skipButton = document.getElementById('skip-loading-btn');
        this.gameTitle = document.querySelector('.game-title');
        this.loadingBarContainer = document.querySelector('.loading-bar-container');
        this.transitionSpeedDisplay = document.getElementById('transition-speed-display');
        this.transitionSpeedOptions = document.getElementById('transition-speed-options');

        // Load saved settings
        this.loadSettings();

        // Initialize event listeners
        this.initEventListeners();

        // Start asset preloading
        this.preloadAssets();
    }

    /**
     * Initialize all event listeners for menu interactions
     */
    initEventListeners() {
        // Skip button
        this.skipButton.addEventListener('click', () => this.skipLoading());

        // Video ended event
        this.introVideo.addEventListener('ended', () => {
            this.videoEnded = true;
            this.checkLoadingComplete();
        });

        // Video error handling
        this.introVideo.addEventListener('error', () => {
            console.warn('Video failed to load, continuing without video');
            this.videoEnded = true;
            this.checkLoadingComplete();
        });

        // Menu button clicks (using event delegation)
        document.addEventListener('click', (e) => {
            const target = e.target;
            if (target.hasAttribute('data-menu-action')) {
                const action = target.getAttribute('data-menu-action');
                this.handleMenuAction(action);
            }
        });

        // Difficulty selection
        const difficultyButtons = document.querySelectorAll('.difficulty-option');
        difficultyButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const difficulty = e.currentTarget.getAttribute('data-difficulty');
                if (difficulty) {
                    this.startGame(difficulty);
                }
            });
        });

        // Custom select for transition speed
        if (this.transitionSpeedDisplay) {
            this.transitionSpeedDisplay.addEventListener('click', () => {
                this.transitionSpeedOptions.classList.toggle('hidden');
            });
        }

        // Handle custom select options
        if (this.transitionSpeedOptions) {
            const options = this.transitionSpeedOptions.querySelectorAll('.custom-option');
            options.forEach(option => {
                option.addEventListener('click', (e) => {
                    const value = e.target.getAttribute('data-value');
                    const text = e.target.textContent;

                    // Update selected state
                    options.forEach(opt => opt.classList.remove('selected'));
                    e.target.classList.add('selected');

                    // Update display
                    this.transitionSpeedDisplay.textContent = text;

                    // Hide options
                    this.transitionSpeedOptions.classList.add('hidden');

                    // Save and apply
                    this.transitionSpeed = value;
                    this.saveSettings();
                    this.applyTransitionSpeed();
                });
            });
        }

        // Close custom select when clicking outside
        document.addEventListener('click', (e) => {
            if (this.transitionSpeedOptions &&
                !this.transitionSpeedDisplay.contains(e.target) &&
                !this.transitionSpeedOptions.contains(e.target)) {
                this.transitionSpeedOptions.classList.add('hidden');
            }
        });
    }

    /**
     * Handle menu navigation actions
     */
    handleMenuAction(action) {
        switch (action) {
            case 'play':
                this.showPlayMenu();
                break;
            case 'settings':
                this.showSettings();
                break;
            case 'credits':
                this.showCredits();
                break;
            case 'tutorial':
                this.showTutorial();
                break;
            case 'classic':
                this.showDifficultySelection();
                break;
            case 'back-to-main':
                this.showMainMenu();
                break;
            case 'back-to-play':
                this.showPlayMenu();
                break;
        }
    }

    /**
     * Preload all game assets
     */
    async preloadAssets() {
        const imagesToLoad = [
            // Core game images
            'resources/other/gold.png',
            'resources/other/Land.png',
            'resources/other/Cultivated_Land.png',
            'resources/other/Treasure.png',
            'resources/other/Inn.png',
            'resources/other/Destroyed_Inn.png',

            // Characters (all 12)
            'resources/characters/Archbishop.png',
            'resources/characters/Artisan.png',
            'resources/characters/Captain.png',
            'resources/characters/Governor.png',
            'resources/characters/Hermit.png',
            'resources/characters/Investor.png',
            'resources/characters/Merchant.png',
            'resources/characters/Nomad.png',
            'resources/characters/Sage.png',
            'resources/characters/Scout.png',
            'resources/characters/Smuggler.png',
            'resources/characters/Treasurer.png',

            // Guild cards
            'resources/guilds/Architects.png',
            'resources/guilds/Cartographers.png',
            'resources/guilds/Explorers.png',
            'resources/guilds/Farmers.png',
            'resources/guilds/Innkeepers.png',
            'resources/guilds/Merchants.png',
            'resources/guilds/Miners.png',
            'resources/guilds/Navigators.png',
            'resources/guilds/Settlers.png',
            'resources/guilds/Traders.png',
            'resources/guilds/Vanguard.png',

            // Event cards
            'resources/action_events/Bandits.png',
            'resources/action_events/Earthquake.png',
            'resources/action_events/Famine.png',
            'resources/action_events/Gold_Rush.png',
            'resources/action_events/Great_Discovery.png',
            'resources/action_events/Mudslide.png',
            'resources/action_events/Pirate_Attack.png',
            'resources/action_events/Sabotage.png',
            'resources/action_events/Storm.png',

            // Blocking events
            'resources/blocking_events/Drought.png',
            'resources/blocking_events/Fog.png',
            'resources/blocking_events/Heavy_Rain.png',
            'resources/blocking_events/Pest.png',
            'resources/blocking_events/Unrest.png'
        ];

        const totalAssets = imagesToLoad.length;
        let loadedAssets = 0;

        const loadImage = (src) => {
            return new Promise((resolve, reject) => {
                const img = new Image();
                img.onload = () => {
                    loadedAssets++;
                    const progress = Math.round((loadedAssets / totalAssets) * 100);
                    this.updateLoadingProgress(progress);
                    resolve();
                };
                img.onerror = () => {
                    console.warn(`Failed to load image: ${src}`);
                    loadedAssets++;
                    const progress = Math.round((loadedAssets / totalAssets) * 100);
                    this.updateLoadingProgress(progress);
                    resolve(); // Resolve anyway to continue loading
                };
                img.src = src;
            });
        };

        try {
            await Promise.all(imagesToLoad.map(src => loadImage(src)));
            this.assetsLoaded = true;
            this.canSkip = true;

            // Hide the progress bar, loading text, and title
            if (this.loadingBarContainer) {
                this.loadingBarContainer.style.opacity = '0';
                setTimeout(() => {
                    this.loadingBarContainer.style.display = 'none';
                }, 300);
            }
            if (this.gameTitle) {
                this.gameTitle.style.opacity = '0';
                setTimeout(() => {
                    this.gameTitle.style.display = 'none';
                }, 300);
            }

            // Show skip button
            this.skipButton.classList.remove('hidden');
            this.checkLoadingComplete();
        } catch (error) {
            console.error('Error loading assets:', error);
            this.assetsLoaded = true;
            this.checkLoadingComplete();
        }
    }

    /**
     * Update loading progress bar and text
     */
    updateLoadingProgress(percentage) {
        this.loadingProgress.style.width = `${percentage}%`;
        this.loadingText.textContent = `Cargando recursos... ${percentage}%`;

        // Show skip button when assets are loaded
        if (percentage === 100) {
            this.canSkip = true;
            this.skipButton.classList.remove('hidden');
        }
    }

    /**
     * Check if loading is complete (assets loaded AND video ended AND minimum time elapsed)
     */
    checkLoadingComplete() {
        if (this.assetsLoaded && this.videoEnded) {
            const elapsedTime = Date.now() - this.loadingStartTime;
            const remainingTime = Math.max(0, this.minLoadingTime - elapsedTime);

            // Wait for minimum loading time before transitioning
            setTimeout(() => {
                this.showMainMenu();
            }, remainingTime + 500);
        }
    }

    /**
     * Skip loading screen (only available when assets are loaded)
     */
    skipLoading() {
        if (this.canSkip) {
            this.videoEnded = true;
            this.introVideo.pause();
            this.checkLoadingComplete();
        }
    }

    /**
     * Show main menu
     */
    showMainMenu() {
        this.hideAllModals();
        this.mainMenuModal.classList.remove('hidden');
        this.currentScreen = 'main-menu';
    }

    /**
     * Show play menu
     */
    showPlayMenu() {
        this.hideAllModals();
        this.playMenuModal.classList.remove('hidden');
        this.currentScreen = 'play-menu';
    }

    /**
     * Show settings menu
     */
    showSettings() {
        this.hideAllModals();
        this.settingsModal.classList.remove('hidden');
        this.currentScreen = 'settings';
    }

    /**
     * Show credits
     */
    showCredits() {
        this.hideAllModals();
        this.creditsModal.classList.remove('hidden');
        this.currentScreen = 'credits';
    }

    /**
     * Show tutorial (placeholder for future implementation)
     */
    showTutorial() {
        alert('Tutorial próximamente! Por ahora, selecciona Partida Clásica para aprender jugando.');
        // Return to play menu
        this.showPlayMenu();
    }

    /**
     * Show difficulty selection
     */
    showDifficultySelection() {
        this.hideAllModals();
        this.difficultyModal.classList.remove('hidden');
        this.currentScreen = 'difficulty';
    }

    /**
     * Start the game with selected difficulty
     */
    startGame(difficulty) {
        this.selectedDifficulty = difficulty;
        this.difficultyModal.classList.add('hidden');

        // Remove menu-active class to show game board
        document.body.classList.remove('menu-active');

        // Initialize the game (this will be called from main.js)
        if (window.startGameWithDifficulty) {
            window.startGameWithDifficulty(difficulty);
        }
    }

    /**
     * Hide all menu modals
     */
    hideAllModals() {
        this.loadingModal.classList.add('hidden');
        this.mainMenuModal.classList.add('hidden');
        this.playMenuModal.classList.add('hidden');
        this.settingsModal.classList.add('hidden');
        this.creditsModal.classList.add('hidden');
    }

    /**
     * Load settings from localStorage
     */
    loadSettings() {
        const savedSpeed = localStorage.getItem('gremios-transition-speed');
        if (savedSpeed) {
            this.transitionSpeed = savedSpeed;

            // Update custom select display
            if (this.transitionSpeedDisplay && this.transitionSpeedOptions) {
                const options = this.transitionSpeedOptions.querySelectorAll('.custom-option');
                options.forEach(option => {
                    if (option.getAttribute('data-value') === savedSpeed) {
                        option.classList.add('selected');
                        this.transitionSpeedDisplay.textContent = option.textContent;
                    } else {
                        option.classList.remove('selected');
                    }
                });
            }
        }
        this.applyTransitionSpeed();
    }

    /**
     * Save settings to localStorage
     */
    saveSettings() {
        localStorage.setItem('gremios-transition-speed', this.transitionSpeed);
    }

    /**
     * Apply transition speed to document
     */
    applyTransitionSpeed() {
        const root = document.documentElement;
        switch (this.transitionSpeed) {
            case 'fast':
                root.style.setProperty('--transition-duration', '0.15s');
                root.style.setProperty('--animation-duration', '0.3s');
                break;
            case 'slow':
                root.style.setProperty('--transition-duration', '0.5s');
                root.style.setProperty('--animation-duration', '1s');
                break;
            default: // normal
                root.style.setProperty('--transition-duration', '0.3s');
                root.style.setProperty('--animation-duration', '0.6s');
                break;
        }
    }
}

// Export for use in main.js
window.MenuController = MenuController;
