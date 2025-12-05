// Main entry point for Gremios game

// Global references for debugging
window.gameInstance = null;
window.uiInstance = null;
window.menuInstance = null;

// Game timer
let gameStartTime = null;
let gameTimerInterval = null;

// Track if auto-fullscreen has been attempted
let autoFullscreenAttempted = false;

// Store the PWA install prompt event (for Android)
let deferredInstallPrompt = null;

// Capture the beforeinstallprompt event for Android PWA installation
window.addEventListener('beforeinstallprompt', (e) => {
    // Prevent the mini-infobar from appearing
    e.preventDefault();
    // Store the event for later use
    deferredInstallPrompt = e;
    console.log('PWA install prompt captured and deferred');
    // Update install button visibility if splash is shown
    updateInstallButtonVisibility();
});

// Track when PWA is installed
window.addEventListener('appinstalled', () => {
    console.log('PWA was installed');
    deferredInstallPrompt = null;
    // Hide the install section if splash is visible
    const installSection = document.querySelector('.splash-install-section');
    if (installSection) {
        installSection.style.display = 'none';
    }
});

// Minimum resolution requirements (width x height)
// Adjusted for mobile landscape gaming (iPhone and Android phones)
const MIN_RESOLUTION = {
    width: 480,
    height: 270
};

// Recommended minimum for portrait mode
const MIN_PORTRAIT_WIDTH = 400;

// ============================================
// MOBILE & ORIENTATION DETECTION
// ============================================

// Detect if device is mobile
function isMobileDevice() {
    return (
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
        (window.matchMedia && window.matchMedia('(max-width: 768px)').matches) ||
        ('ontouchstart' in window)
    );
}

// Detect if device is iOS (iPhone, iPad, iPod)
function isIOS() {
    return /iPhone|iPad|iPod/i.test(navigator.userAgent) ||
           (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1); // iPad on iOS 13+
}

// Check if app is running in standalone mode (added to home screen)
function isStandalone() {
    return window.navigator.standalone === true || // iOS
           window.matchMedia('(display-mode: standalone)').matches; // Android/Other
}

// ============================================
// MOBILE SPLASH SCREEN
// ============================================

// Show the mobile start splash screen
function showMobileSplash() {
    const modal = document.getElementById('mobile-start-modal');
    if (modal) {
        modal.classList.remove('hidden');
    }
}

// Hide the mobile start splash screen
function hideMobileSplash() {
    const modal = document.getElementById('mobile-start-modal');
    if (modal) {
        modal.classList.add('hidden');
    }
}

// Update install button visibility based on platform
function updateInstallButtonVisibility() {
    const installBtn = document.getElementById('splash-install-btn');
    if (installBtn) {
        // Show install button only if we have a deferred prompt (Android) and not in standalone
        if (deferredInstallPrompt && !isStandalone()) {
            installBtn.style.display = 'inline-block';
        } else {
            installBtn.style.display = 'none';
        }
    }
}

// Trigger the native PWA install prompt (Android)
async function triggerPWAInstall() {
    if (!deferredInstallPrompt) {
        console.log('No install prompt available');
        return;
    }

    // Show the install prompt
    deferredInstallPrompt.prompt();

    // Wait for the user's response
    const { outcome } = await deferredInstallPrompt.userChoice;
    console.log(`PWA install prompt outcome: ${outcome}`);

    // Clear the deferred prompt
    deferredInstallPrompt = null;
}

// Determine if we should show the mobile splash screen
function shouldShowMobileSplash() {
    // Only show on mobile devices
    if (!isMobileDevice()) {
        return false;
    }

    // Don't show if already installed (standalone mode)
    if (isStandalone()) {
        return false;
    }

    return true;
}

// Setup body classes for CSS targeting
function setupBodyClasses() {
    // iOS device class
    if (isIOS()) {
        document.body.classList.add('ios-device');
    }

    // Standalone mode class
    if (isStandalone()) {
        document.body.classList.add('standalone-mode');
    }
}

// Check if device is in portrait orientation
function isPortrait() {
    return window.matchMedia('(orientation: portrait)').matches;
}

// Show landscape prompt modal
function showLandscapePrompt() {
    const modal = document.getElementById('landscape-prompt-modal');
    if (modal) {
        modal.classList.remove('hidden');
    }
}

// Hide landscape prompt modal
function hideLandscapePrompt() {
    const modal = document.getElementById('landscape-prompt-modal');
    if (modal) {
        modal.classList.add('hidden');
    }
}

// Check if resolution meets minimum requirements
function checkResolution() {
    const width = window.innerWidth;
    const height = window.innerHeight;

    if (width < MIN_RESOLUTION.width || height < MIN_RESOLUTION.height) {
        return false;
    }
    return true;
}

// Show low resolution blocking modal
function showLowResolutionModal() {
    const modal = document.getElementById('low-resolution-modal');
    if (modal) {
        modal.classList.remove('hidden');
        document.body.classList.add('low-resolution-blocked');
        // Hide menu modals if they're showing (but keep loading screen during video)
        if (window.menuInstance) {
            if (window.menuInstance.currentScreen === 'loading') {
                window.menuInstance.hideMenuModalsOnly();
            } else {
                window.menuInstance.hideAllModals();
            }
        }
    } else {
        console.error('Modal element not found!');
    }
}

// Hide low resolution blocking modal
function hideLowResolutionModal() {
    const modal = document.getElementById('low-resolution-modal');
    if (modal) {
        modal.classList.add('hidden');
        document.body.classList.remove('low-resolution-blocked');
    }
}

// Check if screen resolution is adequate and show appropriate modals
function checkScreenRequirements() {
    const width = window.innerWidth;
    const height = window.innerHeight;

    // First check if resolution is sufficient
    if (!checkResolution()) {
        // In portrait mode with very low width, show landscape prompt instead
        if (isPortrait() && width < MIN_PORTRAIT_WIDTH) {
            showLandscapePrompt();
            hideLowResolutionModal();
            return false;
        } else {
            showLowResolutionModal();
            hideLandscapePrompt();
            return false;
        }
    } else {
        hideLowResolutionModal();
        // If resolution is OK, then check orientation
        checkOrientation();
        return true;
    }
}

// Check if landscape prompt should be shown
function checkOrientation() {
    const gameBoard = document.getElementById('game-board');
    const menuController = window.menuInstance;

    if (isMobileDevice()) {
        if (isPortrait()) {
            // In portrait mode - BLOCK the game completely
            showLandscapePrompt();

            // Hide menu modals in portrait mode if game hasn't started
            // Keep the loading screen visible during video playback
            if (menuController && !window.gameInstance) {
                if (menuController.currentScreen === 'loading') {
                    menuController.hideMenuModalsOnly();
                } else {
                    menuController.hideAllModals();
                }
            }

            // Hide game board if game has started
            if (gameBoard && window.gameInstance) {
                gameBoard.style.pointerEvents = 'none';
                gameBoard.style.opacity = '0.3';
            }

            autoFullscreenAttempted = false; // Reset the flag
        } else {
            // In landscape mode - allow game to proceed
            hideLandscapePrompt();

            // Restore current menu screen after returning from portrait
            if (menuController && !window.gameInstance) {
                menuController.restoreCurrentScreen();
            }

            // Restore game board if game has started
            if (gameBoard && window.gameInstance) {
                gameBoard.style.pointerEvents = 'auto';
                gameBoard.style.opacity = '1';
            }

            // Auto-enter fullscreen only once
            if (!document.fullscreenElement && !autoFullscreenAttempted) {
                autoFullscreenAttempted = true;
                enterFullscreenLandscape();
            }
        }
    } else {
        // Desktop - allow everything
        hideLandscapePrompt();
        if (gameBoard && window.gameInstance) {
            gameBoard.style.pointerEvents = 'auto';
            gameBoard.style.opacity = '1';
        }
    }
}

// Fullscreen with orientation lock (mobile-optimized)
async function enterFullscreenLandscape() {
    try {
        // Enter fullscreen first
        const elem = document.documentElement;
        if (elem.requestFullscreen) {
            await elem.requestFullscreen();
        } else if (elem.webkitRequestFullscreen) {
            await elem.webkitRequestFullscreen();
        } else if (elem.mozRequestFullScreen) {
            await elem.mozRequestFullScreen();
        } else if (elem.msRequestFullscreen) {
            await elem.msRequestFullscreen();
        }

        // Try to lock orientation to landscape (if supported)
        if (screen.orientation && screen.orientation.lock) {
            try {
                await screen.orientation.lock('landscape');
            } catch (err) {
                console.warn('Orientation lock not supported or failed:', err.message);
            }
        }

        // Don't hide the landscape prompt here - let checkOrientation() handle it
        // based on actual device orientation after fullscreen completes
        setTimeout(() => checkOrientation(), 300);
    } catch (err) {
        // Fullscreen failed - this is OK, we just need landscape mode
        // The orientation check will handle blocking portrait mode
        console.log('Fullscreen not available or denied. Please rotate to landscape mode.');
        // Recheck orientation after a brief delay
        setTimeout(() => checkOrientation(), 300);
    }
}

// Show iOS Add to Home Screen instructions
function showIOSInstructions() {
    const modal = document.getElementById('ios-instructions-modal');
    if (modal) {
        modal.classList.remove('hidden');
    }
}

// Hide iOS Add to Home Screen instructions
function hideIOSInstructions() {
    const modal = document.getElementById('ios-instructions-modal');
    if (modal) {
        modal.classList.add('hidden');
    }
}

// Fullscreen toggle function
function toggleFullscreen() {
    // iOS doesn't support Fullscreen API - show instructions instead
    if (isIOS() && !isStandalone()) {
        showIOSInstructions();
        return;
    }

    if (!document.fullscreenElement && !document.webkitFullscreenElement && !document.mozFullScreenElement) {
        // If mobile device, use enhanced fullscreen with orientation lock
        if (isMobileDevice()) {
            enterFullscreenLandscape();
        } else {
            // Desktop: standard fullscreen
            const elem = document.documentElement;
            if (elem.requestFullscreen) {
                elem.requestFullscreen();
            } else if (elem.webkitRequestFullscreen) { // Safari
                elem.webkitRequestFullscreen();
            } else if (elem.mozRequestFullScreen) { // Firefox
                elem.mozRequestFullScreen();
            } else if (elem.msRequestFullscreen) { // IE/Edge
                elem.msRequestFullscreen();
            }
        }
    } else {
        // Exit fullscreen
        if (document.exitFullscreen) {
            document.exitFullscreen();
        } else if (document.webkitExitFullscreen) { // Safari
            document.webkitExitFullscreen();
        } else if (document.mozCancelFullScreen) { // Firefox
            document.mozCancelFullScreen();
        } else if (document.msExitFullscreen) { // IE/Edge
            document.msExitFullscreen();
        }

        // Unlock orientation when exiting fullscreen
        if (screen.orientation && screen.orientation.unlock) {
            try {
                screen.orientation.unlock();
            } catch (err) {
                console.warn('Orientation unlock failed:', err.message);
            }
        }
    }
}

// Function to start the game with selected difficulty
// Called by MenuController
function startGameWithDifficulty(difficulty) {
    // CRITICAL: Prevent game start if in portrait mode on mobile
    if (isMobileDevice() && isPortrait()) {
        console.warn('Cannot start game in portrait mode. Please rotate to landscape.');
        showLandscapePrompt();
        return;
    }

    // Show fullscreen prompt before starting the game
    showFullscreenPrompt(difficulty);
}

// Show fullscreen prompt and start game when user responds
function showFullscreenPrompt(difficulty) {
    const fullscreenModal = document.getElementById('fullscreen-prompt-modal');
    const acceptBtn = document.getElementById('fullscreen-accept-btn');
    const declineBtn = document.getElementById('fullscreen-decline-btn');

    // Show the modal
    fullscreenModal.classList.remove('hidden');

    // Handle accept - enter fullscreen and start game
    const handleAccept = async () => {
        cleanup();
        fullscreenModal.classList.add('hidden');
        await enterFullscreenLandscape();
        initializeAndStartGame(difficulty);
    };

    // Handle decline - just start game without fullscreen
    const handleDecline = () => {
        cleanup();
        fullscreenModal.classList.add('hidden');
        initializeAndStartGame(difficulty);
    };

    // Cleanup event listeners
    const cleanup = () => {
        acceptBtn.removeEventListener('click', handleAccept);
        declineBtn.removeEventListener('click', handleDecline);
    };

    // Add event listeners
    acceptBtn.addEventListener('click', handleAccept);
    declineBtn.addEventListener('click', handleDecline);
}

// Initialize and start the game (extracted from startGameWithDifficulty)
function initializeAndStartGame(difficulty) {
    // Create game instance
    const game = new GremiosGame();

    // Create UI controller
    const ui = new UIController(game);

    // Store references globally for debugging
    window.gameInstance = game;
    window.uiInstance = ui;

    // Always initialize with 3 players (1 human + 2 AI)
    const numPlayers = 3;

    // Initialize game with selected difficulty for AI players
    game.initialize(numPlayers, difficulty);

    // Show character selection for human player
    ui.showCharacterSelection();

    // Start game timer
    startGameTimer();
}

// Make function globally available for MenuController
window.startGameWithDifficulty = startGameWithDifficulty;

// Help modal functions
function toggleHelpModal() {
    const helpModal = document.getElementById('help-modal');
    const isHidden = helpModal.classList.contains('hidden');

    if (isHidden) {
        openHelpModal();
    } else {
        closeHelpModal();
    }
}

function openHelpModal() {
    const helpModal = document.getElementById('help-modal');
    helpModal.classList.remove('hidden');
    updateHelpModalInfo();
}

function closeHelpModal() {
    const helpModal = document.getElementById('help-modal');
    helpModal.classList.add('hidden');
}

function updateHelpModalInfo() {
    const game = window.gameInstance;

    // Update game time
    if (gameStartTime) {
        const elapsed = Date.now() - gameStartTime;
        const minutes = Math.floor(elapsed / 60000);
        const seconds = Math.floor((elapsed % 60000) / 1000);
        document.getElementById('game-time').textContent =
            `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }

    // Update turn info
    if (game) {
        document.getElementById('current-turn').textContent = `${game.round}`;
        document.getElementById('cards-remaining').textContent = game.eventDeck ? game.eventDeck.length : '0';
    }
}

function startGameTimer() {
    gameStartTime = Date.now();

    // Update timer every second
    if (gameTimerInterval) clearInterval(gameTimerInterval);
    gameTimerInterval = setInterval(() => {
        if (document.getElementById('help-modal').classList.contains('hidden') === false) {
            updateHelpModalInfo();
        }
    }, 1000);
}

// Keyboard shortcuts handler
function setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        // Don't trigger shortcuts if typing in an input field
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
            return;
        }

        const game = window.gameInstance;
        const ui = window.uiInstance;

        if (!game || !ui) return;

        const key = e.key.toLowerCase();

        // ESC - Close modals
        if (key === 'escape') {
            closeHelpModal();
            // Close character info modal if open
            const characterInfoModal = document.getElementById('character-info-modal');
            if (characterInfoModal && !characterInfoModal.classList.contains('hidden')) {
                ui.hideCharacterInfoModal();
            }
            // Close guild modal if open
            const guildModal = document.getElementById('guild-modal');
            if (guildModal && !guildModal.classList.contains('hidden')) {
                ui.hideGuildModal();
            }
            return;
        }

        // F - Toggle fullscreen
        if (key === 'f') {
            e.preventDefault();
            toggleFullscreen();
            return;
        }

        // A, H, or ? - Toggle help modal
        if (key === 'a' || key === 'h' || key === '?') {
            e.preventDefault();
            toggleHelpModal();
            return;
        }

        // Space - End turn (only for human player during their turn)
        if (key === ' ' || key === 'spacebar') {
            const currentPlayer = game.players[game.currentPlayerIndex];
            if (!currentPlayer.isAI && game.phase === 'investment') {
                e.preventDefault();
                game.endTurn();
                ui.updateGameState();
            }
            return;
        }

        // Action shortcuts (only during human player's turn)
        const currentPlayer = game.players[game.currentPlayerIndex];
        if (currentPlayer.isAI || game.phase !== 'investment') {
            return;
        }

        // I - Invest in Guild
        if (key === 'i') {
            e.preventDefault();
            const btn = document.querySelector('[data-action="invest-guild"]');
            if (btn && !btn.disabled) btn.click();
        }

        // E - Invest in Expedition
        if (key === 'e') {
            e.preventDefault();
            const btn = document.querySelector('[data-action="invest-expedition"]');
            if (btn && !btn.disabled) btn.click();
        }

        // L - Buy Land
        if (key === 'l') {
            e.preventDefault();
            const btn = document.querySelector('[data-action="buy-land"]');
            if (btn && !btn.disabled) btn.click();
        }

        // C - Cultivate Land
        if (key === 'c') {
            e.preventDefault();
            const btn = document.querySelector('[data-action="cultivate-land"]');
            if (btn && !btn.disabled) btn.click();
        }

        // B - Build Inn
        if (key === 'b') {
            e.preventDefault();
            const btn = document.querySelector('[data-action="build-inn"]');
            if (btn && !btn.disabled) btn.click();
        }

        // R - Repair Inn
        if (key === 'r') {
            e.preventDefault();
            const btn = document.querySelector('[data-action="repair-inn"]');
            if (btn && !btn.disabled) btn.click();
        }
    });
}

// Wait for DOM to load
document.addEventListener('DOMContentLoaded', () => {

    // Register Service Worker for PWA
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('./sw.js')
                .then(registration => {
                    console.log('PWA: Service Worker registered successfully:', registration.scope);
                })
                .catch(error => {
                    console.log('PWA: Service Worker registration failed:', error);
                });
        });
    }

    // Setup body classes for CSS targeting (iOS, standalone mode)
    setupBodyClasses();

    // Setup mobile splash screen
    const splashStartBtn = document.getElementById('splash-start-btn');
    const splashInstallBtn = document.getElementById('splash-install-btn');

    if (splashStartBtn) {
        splashStartBtn.addEventListener('click', async () => {
            // Try to enter fullscreen and landscape mode
            await enterFullscreenLandscape();
            // Hide splash screen
            hideMobileSplash();
            // Continue with normal loading flow - MenuController will handle the rest
        });
    }

    if (splashInstallBtn) {
        splashInstallBtn.addEventListener('click', () => {
            triggerPWAInstall();
        });
    }

    // Update install button visibility (hide if no prompt available)
    updateInstallButtonVisibility()

    // Setup fullscreen button
    const fullscreenBtn = document.getElementById('fullscreen-btn');
    if (fullscreenBtn) {
        fullscreenBtn.addEventListener('click', toggleFullscreen);

        // Update button icon when fullscreen state changes
        const updateFullscreenIcon = () => {
            const icon = fullscreenBtn.querySelector('.fullscreen-icon');
            if (document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement) {
                icon.textContent = '⤢'; // Exit fullscreen icon (same icon works for both)
                fullscreenBtn.title = 'Salir de pantalla completa';
            } else {
                icon.textContent = '⤢'; // Fullscreen icon
                fullscreenBtn.title = 'Pantalla completa';
            }
        };

        // Listen for fullscreen changes
        document.addEventListener('fullscreenchange', updateFullscreenIcon);
        document.addEventListener('webkitfullscreenchange', updateFullscreenIcon);
        document.addEventListener('mozfullscreenchange', updateFullscreenIcon);
        document.addEventListener('MSFullscreenChange', updateFullscreenIcon);
    }

    // Setup keyboard shortcuts
    setupKeyboardShortcuts();

    // Setup help modal close buttons
    const closeHelpBtn = document.getElementById('close-help-btn');
    const closeHelpBtnBottom = document.getElementById('close-help-btn-bottom');

    if (closeHelpBtn) {
        closeHelpBtn.addEventListener('click', closeHelpModal);
    }

    if (closeHelpBtnBottom) {
        closeHelpBtnBottom.addEventListener('click', closeHelpModal);
    }

    // Setup help button
    const helpBtn = document.getElementById('help-btn');
    if (helpBtn) {
        helpBtn.addEventListener('click', toggleHelpModal);
    }

    // Setup iOS instructions modal close button
    const closeIOSInstructionsBtn = document.getElementById('close-ios-instructions-btn');
    if (closeIOSInstructionsBtn) {
        closeIOSInstructionsBtn.addEventListener('click', hideIOSInstructions);
    }

    // Update fullscreen button text for iOS users
    if (fullscreenBtn && isIOS() && !isStandalone()) {
        const btnText = fullscreenBtn.querySelector('.btn-text-large');
        if (btnText) {
            btnText.textContent = ' Modo Pantalla Completa';
        }
        fullscreenBtn.title = 'Instrucciones para pantalla completa';
    }

    // Setup landscape prompt modal button
    const enterFullscreenLandscapeBtn = document.getElementById('enter-fullscreen-landscape-btn');

    if (enterFullscreenLandscapeBtn) {
        enterFullscreenLandscapeBtn.addEventListener('click', () => {
            enterFullscreenLandscape();
        });
    }

    // Setup low resolution modal button
    const tryFullscreenLowResBtn = document.getElementById('try-fullscreen-low-res-btn');

    if (tryFullscreenLowResBtn) {
        tryFullscreenLowResBtn.addEventListener('click', async () => {
            await enterFullscreenLandscape();
            // Recheck after a short delay to see if fullscreen helped
            setTimeout(() => {
                checkScreenRequirements();
            }, 500);
        });
    }

    // Monitor orientation and resolution changes
    window.addEventListener('orientationchange', () => {
        setTimeout(checkScreenRequirements, 300); // Small delay to ensure orientation has changed
    });

    window.addEventListener('resize', () => {
        checkScreenRequirements();
    });

    // Listen for fullscreen changes to hide/show prompts
    const handleFullscreenChange = () => {
        checkScreenRequirements();
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);

    // Initial screen requirements check - run immediately and also after delay
    checkScreenRequirements();
    setTimeout(() => {
        checkScreenRequirements();
    }, 500); // Delay to let page fully load

    // Initialize MenuController
    // The loading screen will be shown automatically by the MenuController
    const menuController = new MenuController();
    window.menuInstance = menuController;
});

// ============================================
// DEBUGGING AND TESTING HELPERS
// ============================================

// Quick accessor functions
function g() {
    return window.gameInstance;
}

function ui() {
    return window.uiInstance;
}

function player() {
    return window.gameInstance?.players[0];
}

// Display all available cheats
function cheat() {
    console.log(`
🎮 GREMIOS DEBUG COMMANDS
========================

QUICK ACCESS:
  g()              → Get game instance
  ui()             → Get UI instance
  player()         → Get human player

COINS & RESOURCES:
  addCoins(n)      → Add n coins to human player
  addLands(n)      → Add n lands to human player
  addInns(n)       → Add n inns to human player

TREASURES:
  addTreasure(type, value) → Add treasure ('vp' or 'coins', then 1-4)
  addTreasures(n)  → Add n random treasures
  clearTreasures() → Remove all treasures

GUILDS:
  winGuild(num)    → Make human player max investor in guild #num
  addGuild(num)    → Add guild #num to active guilds

GAME STATE:
  skipTurn()       → End current turn
  setVP(n)         → Set human player VP (guilds only, not treasures)
  winGame()        → Set VP to 10 and end turn to trigger win

TESTING:
  cheatConsumeEvents() → Remove all but 1 event to trigger reshuffle next turn

DISPLAY:
  refresh()        → Refresh UI display
  logState()       → Log current game state
  showRealVP()     → Show actual VP including hidden treasures

IMPORTANT NOTES:
  - Victory checked IMMEDIATELY when any player reaches 10 VP
  - First player to 10 VP wins instantly
  - Use winGame() to trigger instant win
  - Use showRealVP() for detailed VP breakdown

Examples:
  addCoins(10)
  addTreasure('vp', 2)
  addTreasure('coins', 4)
  addTreasures(5)
  showRealVP()
  winGuild(6)
  setVP(8)
    `);
}

// Add coins to human player
function addCoins(amount = 10) {
    const p = player();
    if (!p) return console.error('Game not started');
    p.addCoins(amount);
    refresh();
    console.log(`✅ Added ${amount} coins. Total: ${p.coins}`);
}

// Add lands to human player
function addLands(amount = 1) {
    const p = player();
    if (!p) return console.error('Game not started');
    for (let i = 0; i < amount; i++) {
        p.lands.push(new ResourceCard('land', false));
    }
    refresh();
    console.log(`✅ Added ${amount} lands. Total: ${p.lands.length}`);
}

// Add inns to human player
function addInns(amount = 1) {
    const p = player();
    if (!p) return console.error('Game not started');
    for (let i = 0; i < amount; i++) {
        p.inns.push(new ResourceCard('inn', false, false));
    }
    refresh();
    console.log(`✅ Added ${amount} inns. Total: ${p.inns.length}`);
}

// Add treasure to human player
function addTreasure(type = 'vp', value = 1) {
    const p = player();
    const game = g();
    if (!p || !game) return console.error('Game not started');

    let treasure;
    if (type === 'vp') {
        if (value === 1) {
            treasure = { type: TREASURE_TYPES.COMMON, vp: 1 };
        } else if (value === 2) {
            treasure = { type: TREASURE_TYPES.RARE, vp: 2 };
        } else {
            return console.error('VP treasures must be 1 or 2');
        }
    } else if (type === 'coins') {
        if (value === 3 || value === 4) {
            treasure = { type: TREASURE_TYPES.WEALTH, vp: 0, coinValue: value };
        } else {
            return console.error('Coin treasures must be 3 or 4');
        }
    } else {
        return console.error('Type must be "vp" or "coins"');
    }

    p.addTreasure(treasure);
    game.updateDiscovererEmblem();
    refresh();
    const totalVP = p.getVictoryPoints(game, true);
    console.log(`✅ Added treasure: ${type === 'vp' ? value + ' VP' : value + ' coins'}`);
    console.log(`   Total VP: ${totalVP}`);

    // Check for victory
    game.checkVictory();
}

// Add multiple random treasures
function addTreasures(amount = 1) {
    const p = player();
    const game = g();
    if (!p || !game) return console.error('Game not started');

    for (let i = 0; i < amount; i++) {
        if (game.treasureDeck.length > 0) {
            const treasure = game.treasureDeck.pop();
            p.addTreasure(treasure);
        }
    }
    game.updateDiscovererEmblem();
    refresh();
    const totalVP = p.getVictoryPoints(game, true);
    console.log(`✅ Added ${amount} random treasures. Total: ${p.treasures.length}`);
    console.log(`   Total VP: ${totalVP}`);

    // Check for victory
    game.checkVictory();
}

// Clear all treasures
function clearTreasures() {
    const p = player();
    const game = g();
    if (!p || !game) return console.error('Game not started');
    p.treasures = [];
    game.updateDiscovererEmblem();
    refresh();
    console.log('✅ Cleared all treasures');
}

// Make human player max investor in a guild
function winGuild(guildNumber) {
    const game = g();
    const p = player();
    if (!game || !p) return console.error('Game not started');

    const guild = game.activeGuilds.find(g => g.number === guildNumber);
    if (!guild) return console.error(`Guild ${guildNumber} not active`);

    // Clear existing investments and make player the sole investor
    guild.investments = [
        { playerId: 0, color: p.color },
        { playerId: 0, color: p.color },
        { playerId: 0, color: p.color }
    ];
    guild.maxInvestor = 0;
    refresh();
    console.log(`✅ You are now max investor in guild ${guildNumber}`);
}

// Add a guild to active guilds
function addGuild(guildNumber) {
    const game = g();
    if (!game) return console.error('Game not started');

    if (!GUILDS[guildNumber]) {
        return console.error(`Guild ${guildNumber} does not exist`);
    }

    const exists = game.activeGuilds.find(g => g.number === guildNumber);
    if (exists) return console.error(`Guild ${guildNumber} already active`);

    game.activeGuilds.push({
        number: guildNumber,
        name: GUILDS[guildNumber].nameES,
        investments: [],
        maxInvestor: null,
        blocked: false
    });
    game.activeGuilds.sort((a, b) => a.number - b.number);
    refresh();
    console.log(`✅ Added guild ${guildNumber} (${GUILDS[guildNumber].nameES})`);
}

// Set human player VP by manipulating guilds
function setVP(targetVP) {
    const game = g();
    const p = player();
    if (!game || !p) return console.error('Game not started');

    // Clear all guild investments
    game.activeGuilds.forEach(guild => {
        guild.investments = [];
        guild.maxInvestor = null;
    });

    // Add guilds as max investor to reach target VP
    let currentVP = p.getVictoryPoints(game);
    let guildsNeeded = targetVP - currentVP;

    for (let i = 0; i < Math.min(guildsNeeded, game.activeGuilds.length); i++) {
        const guild = game.activeGuilds[i];
        guild.investments = [{ playerId: 0, color: p.color }];
        guild.maxInvestor = 0;
    }

    refresh();
    console.log(`✅ Set VP to approximately ${targetVP}. Actual: ${p.getVictoryPoints(game)}`);

    // Check for victory
    game.checkVictory();
}

// Skip current turn
function skipTurn() {
    const game = g();
    if (!game) return console.error('Game not started');
    game.endTurn();
    console.log('✅ Turn ended');
}

// Consume all events except 1 to trigger reshuffle on next turn
function cheatConsumeEvents() {
    const game = g();
    if (!game) return console.error('Game not started');

    const originalCount = game.eventDeck.length;

    // Remove all but 1 event from the deck
    while (game.eventDeck.length > 1) {
        game.eventDeck.pop();
    }

    const remaining = game.eventDeck.length;
    console.log(`✅ Consumed ${originalCount - remaining} events from deck`);
    console.log(`   Remaining in deck: ${remaining}`);
    console.log(`   Discard pile: ${game.eventDiscard.length}`);
    console.log(`   Next turn will trigger reshuffle animation!`);
}

// Win the game immediately
function winGame() {
    const p = player();
    const game = g();
    if (!p || !game) return console.error('Game not started');

    // Add enough VP treasures to reach 10 total VP
    const currentVP = p.getVictoryPoints(game, true);
    const needed = 10 - currentVP;

    if (needed <= 0) {
        console.log(`Already at ${currentVP} VP, triggering win...`);
        game.checkVictory();
        return;
    }

    // Add 2 VP treasures to reach 10
    for (let i = 0; i < Math.ceil(needed / 2); i++) {
        p.addTreasure({ type: TREASURE_TYPES.RARE, vp: 2 });
    }

    game.updateDiscovererEmblem();
    refresh();

    const finalVP = p.getVictoryPoints(game, true);
    console.log(`✅ Added ${Math.ceil(needed / 2)} treasures. Total VP: ${finalVP}`);

    // Trigger victory check immediately
    game.checkVictory();
}

// Refresh UI
function refresh() {
    const game = g();
    const uiCtrl = ui();
    if (uiCtrl && game) {
        uiCtrl.updateGameState();
    }
}

// Show real VP including treasures with detailed breakdown
function showRealVP() {
    const p = player();
    const game = g();
    if (!p || !game) return console.error('Game not started');

    const totalVP = p.getVictoryPoints(game, true);
    const treasureVP = p.treasures.reduce((sum, t) => sum + (t.vp || 0), 0);
    const emblemVP = p.hasDiscovererEmblem ? 1 : 0;
    const guildVP = totalVP - treasureVP - emblemVP;

    console.log(`
🏆 VICTORY POINTS BREAKDOWN
============================
Guild VP:                 ${guildVP} VP
Discoverer Emblem:        ${emblemVP} VP
Treasure VP:              ${treasureVP} VP
  ├─ 1 VP treasures:      ${p.treasures.filter(t => t.vp === 1).length} × 1 = ${p.treasures.filter(t => t.vp === 1).length} VP
  ├─ 2 VP treasures:      ${p.treasures.filter(t => t.vp === 2).length} × 2 = ${p.treasures.filter(t => t.vp === 2).length * 2} VP
  └─ Coin treasures:      ${p.treasures.filter(t => t.coinValue).length} × 0 = 0 VP

TOTAL VP:                 ${totalVP} VP ${totalVP >= 10 ? '🎉 WIN! (Use skipTurn() to trigger)' : ''}
    `);
}

// Log current game state
function logState() {
    const game = g();
    const p = player();
    if (!game || !p) return console.error('Game not started');

    console.log(`
📊 GAME STATE
=============
Phase: ${game.phase}
Round: ${game.round}
Current Player: ${game.players[game.currentPlayerIndex].name}

👤 HUMAN PLAYER
Coins: ${p.coins}
Reserve: ${p.reserve}
Total VP: ${p.getVictoryPoints(game, true)} VP ${p.getVictoryPoints(game, true) >= 10 ? '🎉' : ''}
Lands: ${p.lands.length} (${p.getCultivatedLandsCount()} cultivated)
Inns: ${p.inns.length} (${p.getDestroyedInnsCount()} destroyed)
Treasures: ${p.treasures.length}
  - 1 VP: ${p.treasures.filter(t => t.vp === 1).length}
  - 2 VP: ${p.treasures.filter(t => t.vp === 2).length}
  - 3 coins: ${p.treasures.filter(t => t.coinValue === 3).length}
  - 4 coins: ${p.treasures.filter(t => t.coinValue === 4).length}
Has Emblem: ${p.hasDiscovererEmblem ? '🏆 Yes (+1 VP)' : 'No'}

🏛️ ACTIVE GUILDS
${game.activeGuilds.map(guild => {
    const myInvestments = guild.investments.filter(inv => inv.playerId === 0).length;
    const maxInvestor = guild.maxInvestor === 0 ? ' ⭐ MAX' : '';
    return `  ${guild.number}. ${guild.name}: ${myInvestments} investments${maxInvestor}${guild.blocked ? ' [BLOCKED]' : ''}`;
}).join('\n')}
    `);
}

// Make functions globally available
window.g = g;
window.ui = ui;
window.player = player;
window.cheat = cheat;
window.addCoins = addCoins;
window.addLands = addLands;
window.addInns = addInns;
window.addTreasure = addTreasure;
window.addTreasures = addTreasures;
window.clearTreasures = clearTreasures;
window.winGuild = winGuild;
window.addGuild = addGuild;
window.setVP = setVP;
window.skipTurn = skipTurn;
window.winGame = winGame;
window.refresh = refresh;
window.logState = logState;
window.showRealVP = showRealVP;
