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
        this.minLoadingTime = 1000; // Minimum 1 second at 100% before video starts

        // Store video event handlers so we can remove them later
        this.videoEndedHandler = null;
        this.videoErrorHandler = null;

        // Check for quickstart URL parameter
        this.quickstartDifficulty = this.checkQuickstartParameter();

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

        // Check if quickstart mode is active
        if (this.quickstartDifficulty) {
            this.quickstartGame();
        } else {
            // Normal flow: Check orientation before starting
            this.checkInitialOrientation();
        }
    }

    /**
     * Check initial orientation and handle mobile splash screen
     */
    checkInitialOrientation() {
        // Stricter mobile detection - only user agent, not touch capability
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
                        (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1); // iPad
        const isPortraitMode = window.matchMedia('(orientation: portrait)').matches;
        const isStandaloneMode = window.navigator.standalone === true ||
                                  window.matchMedia('(display-mode: standalone)').matches;

        // Check if we should show mobile splash screen
        // Disabled for testing - enable on real mobile devices
        const showSplash = false; // TODO: Re-enable with proper detection
        if (showSplash && isMobile && !isStandaloneMode) {
            // Show splash screen first, hide loading modal
            this.loadingModal.classList.add('hidden');
            const splashModal = document.getElementById('mobile-start-modal');
            if (splashModal) {
                splashModal.classList.remove('hidden');
            }

            // Set up handler for when splash is dismissed (via start button in main.js)
            const checkSplashDismissed = () => {
                const splashHidden = splashModal && splashModal.classList.contains('hidden');
                if (splashHidden) {
                    // Splash was dismissed, now handle orientation
                    this.handleOrientationAndStartLoading();
                    // Remove the observer
                    clearInterval(splashCheck);
                }
            };

            // Check periodically if splash is hidden (dismissed by user tap)
            const splashCheck = setInterval(checkSplashDismissed, 100);

            return; // Don't proceed with loading yet
        }

        // For standalone mode or desktop, handle orientation normally
        if (isMobile && isPortraitMode) {
            this.handlePortraitModeWait();
        } else {
            // Not mobile or already in landscape, start normally
            this.preloadAssets();
        }
    }

    /**
     * Handle waiting for landscape mode before starting
     */
    handleOrientationAndStartLoading() {
        const isPortraitMode = window.matchMedia('(orientation: portrait)').matches;

        if (isPortraitMode) {
            this.handlePortraitModeWait();
        } else {
            // Already in landscape, start loading
            this.loadingModal.classList.remove('hidden');
            this.preloadAssets();
        }
    }

    /**
     * Wait for user to rotate to landscape mode
     */
    handlePortraitModeWait() {
        // Hide loading modal and show landscape prompt
        this.loadingModal.classList.add('hidden');
        const landscapeModal = document.getElementById('landscape-prompt-modal');
        if (landscapeModal) {
            landscapeModal.classList.remove('hidden');
        }

        // Wait for orientation change to landscape before starting
        const orientationHandler = () => {
            const stillPortrait = window.matchMedia('(orientation: portrait)').matches;
            if (!stillPortrait) {
                // Now in landscape, show loading and start preloading
                this.loadingModal.classList.remove('hidden');
                if (landscapeModal) {
                    landscapeModal.classList.add('hidden');
                }
                this.preloadAssets();
                // Remove listeners as we only need this once
                window.removeEventListener('orientationchange', orientationHandler);
                window.removeEventListener('resize', orientationHandler);
            }
        };

        window.addEventListener('orientationchange', orientationHandler);
        window.addEventListener('resize', orientationHandler);
    }

    /**
     * Check for quickstart URL parameter (?quickstart=easy|medium|hard)
     * @returns {string|null} The difficulty level or null if not present
     */
    checkQuickstartParameter() {
        const urlParams = new URLSearchParams(window.location.search);
        const quickstart = urlParams.get('quickstart');

        // Validate difficulty level
        if (quickstart && ['easy', 'medium', 'hard'].includes(quickstart.toLowerCase())) {
            return quickstart.toLowerCase();
        }

        return null;
    }

    /**
     * Quickstart mode: Skip all menus and start game directly
     */
    quickstartGame() {
        console.log(`Quickstart mode: Starting game with ${this.quickstartDifficulty} difficulty`);

        // Set global flag for quickstart mode
        window.quickstartMode = true;

        // Hide all modals immediately
        this.hideAllModals();

        // Remove menu-active class to show game board
        document.body.classList.remove('menu-active');

        // Start the game directly with the specified difficulty
        // We need to wait a short moment for the DOM to be fully ready
        setTimeout(() => {
            if (window.startGameWithDifficulty) {
                window.startGameWithDifficulty(this.quickstartDifficulty);
            } else {
                console.error('startGameWithDifficulty function not found');
            }
        }, 100);
    }

    /**
     * Initialize all event listeners for menu interactions
     */
    initEventListeners() {
        // Skip button
        this.skipButton.addEventListener('click', () => this.skipLoading());

        // Only set up video event listeners if NOT in quickstart mode
        if (!this.quickstartDifficulty) {
            // Store handlers so we can remove them later
            this.videoEndedHandler = () => {
                this.videoEnded = true;
                this.removeVideoEventListeners();
                this.checkLoadingComplete();
            };

            this.videoErrorHandler = () => {
                console.warn('Video failed to load, continuing without video');
                this.videoEnded = true;
                this.removeVideoEventListeners();
                this.checkLoadingComplete();
            };

            // Video ended event
            this.introVideo.addEventListener('ended', this.videoEndedHandler);

            // Video error handling
            this.introVideo.addEventListener('error', this.videoErrorHandler);
        }

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
        // Ensure loading modal is visible
        if (this.loadingModal) {
            this.loadingModal.classList.remove('hidden');
        }

        // Use shared asset configuration (with fallback)
        let imagesToLoad;
        try {
            imagesToLoad = (typeof getPreloadImages === 'function')
                ? getPreloadImages()
                : this.getFallbackImages();
        } catch (e) {
            console.error('Error getting image list:', e);
            imagesToLoad = this.getFallbackImages();
        }

        console.log('Preloading', imagesToLoad.length, 'images');

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

            // Wait minimum time (2 seconds) before starting video
            setTimeout(() => {
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

                // Start video playback after the delay
                if (this.introVideo && this.introVideo.paused) {
                    this.introVideo.play().catch(err => {
                        console.warn('Video autoplay failed:', err);
                        // If autoplay fails, mark video as ended to allow progression
                        this.videoEnded = true;
                        this.checkLoadingComplete();
                    });
                }
            }, this.minLoadingTime);

            // Show skip button
            this.skipButton.classList.remove('hidden');
        } catch (error) {
            console.error('Error loading assets:', error);
            this.assetsLoaded = true;

            // Wait minimum time even on error before starting video
            setTimeout(() => {
                if (this.introVideo && this.introVideo.paused) {
                    this.introVideo.play().catch(err => {
                        console.warn('Video autoplay failed:', err);
                        this.videoEnded = true;
                        this.checkLoadingComplete();
                    });
                }
            }, this.minLoadingTime);
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
     * Fallback image list if assets.js is not loaded
     */
    getFallbackImages() {
        return [
            'resources/other/gold.png',
            'resources/other/Land.png',
            'resources/other/Cultivated_Land.png',
            'resources/other/Treasure.png',
            'resources/other/Treasure_1VP.png',
            'resources/other/Treasure_2VP.png',
            'resources/other/Inn.png',
            'resources/other/Destroyed_Inn.png',
            'resources/other/Wealth_3coins.png',
            'resources/other/Wealth_4coins.png',
            'resources/other/Event_Back.png',
            'resources/other/Badge.png',
            'resources/other/bronze.png',
            'resources/other/silver.png',
            'resources/characters/Archbishop.png',
            'resources/characters/Artisan.png',
            'resources/characters/Governor.png',
            'resources/characters/Healer.png',
            'resources/characters/Innkeeper.png',
            'resources/characters/Master_Builder.png',
            'resources/characters/Mercenary.png',
            'resources/characters/Merchant.png',
            'resources/characters/Peasant.png',
            'resources/characters/Pirate.png',
            'resources/characters/Shopkeeper.png',
            'resources/characters/Stowaway.png',
            'resources/guilds/Blacksmith.png',
            'resources/guilds/Church.png',
            'resources/guilds/Farm.png',
            'resources/guilds/Jewelers.png',
            'resources/guilds/Market.png',
            'resources/guilds/Monastery.png',
            'resources/guilds/Port.png',
            'resources/guilds/Quarry.png',
            'resources/guilds/Sawmill.png',
            'resources/guilds/Tavern.png',
            'resources/guilds/Expedition.png',
            'resources/action_events/bad_harvest.png',
            'resources/action_events/bankruptcy.png',
            'resources/action_events/expedition.png',
            'resources/action_events/expropriation.png',
            'resources/action_events/good_harvest.png',
            'resources/action_events/invasion.png',
            'resources/action_events/mutiny.png',
            'resources/action_events/prosperity.png',
            'resources/action_events/tax_collection.png',
            'resources/blocking_events/Famine.png',
            'resources/blocking_events/MineCollapse.png',
            'resources/blocking_events/Plague.png',
            'resources/blocking_events/ResourcesOutage.png',
            'resources/blocking_events/TradeBlock.png'
        ];
    }

    /**
     * Check if loading is complete (assets loaded AND video ended)
     */
    checkLoadingComplete() {
        // Don't show menu if in quickstart mode
        if (this.quickstartDifficulty) {
            return;
        }

        if (this.assetsLoaded && this.videoEnded) {
            // Both assets and video are done, transition to main menu
            this.showMainMenu();
        }
    }

    /**
     * Remove video event listeners to prevent them from triggering during gameplay
     */
    removeVideoEventListeners() {
        if (this.videoEndedHandler) {
            this.introVideo.removeEventListener('ended', this.videoEndedHandler);
            this.videoEndedHandler = null;
        }
        if (this.videoErrorHandler) {
            this.introVideo.removeEventListener('error', this.videoErrorHandler);
            this.videoErrorHandler = null;
        }
    }

    /**
     * Skip loading screen (only available when assets are loaded)
     */
    skipLoading() {
        if (this.canSkip) {
            this.videoEnded = true;

            // Stop the video and remove event listeners to prevent future triggers
            this.introVideo.pause();
            this.introVideo.currentTime = 0; // Reset to beginning
            this.removeVideoEventListeners();

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

        // CRITICAL: Remove video event listeners to prevent menu popup during gameplay
        this.removeVideoEventListeners();

        // Initialize the game (this will be called from main.js)
        if (window.startGameWithDifficulty) {
            window.startGameWithDifficulty(difficulty);
        }
    }

    /**
     * Hide all menu modals (including loading screen)
     */
    hideAllModals() {
        this.loadingModal.classList.add('hidden');
        this.mainMenuModal.classList.add('hidden');
        this.playMenuModal.classList.add('hidden');
        this.settingsModal.classList.add('hidden');
        this.creditsModal.classList.add('hidden');
    }

    /**
     * Hide menu modals but keep the loading screen visible
     * Used during orientation changes when video is still playing
     */
    hideMenuModalsOnly() {
        this.mainMenuModal.classList.add('hidden');
        this.playMenuModal.classList.add('hidden');
        this.settingsModal.classList.add('hidden');
        this.creditsModal.classList.add('hidden');
    }

    /**
     * Restore the loading screen visibility
     * Used when returning to landscape during video playback
     */
    showLoadingScreen() {
        this.loadingModal.classList.remove('hidden');
    }

    /**
     * Restore the current menu screen visibility after orientation change
     * Used when returning to landscape from portrait mode
     */
    restoreCurrentScreen() {
        switch (this.currentScreen) {
            case 'loading':
                this.loadingModal.classList.remove('hidden');
                break;
            case 'main-menu':
                this.mainMenuModal.classList.remove('hidden');
                break;
            case 'play-menu':
                this.playMenuModal.classList.remove('hidden');
                break;
            case 'settings':
                this.settingsModal.classList.remove('hidden');
                break;
            case 'credits':
                this.creditsModal.classList.remove('hidden');
                break;
            case 'difficulty':
                if (this.difficultyModal) {
                    this.difficultyModal.classList.remove('hidden');
                }
                break;
        }
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
