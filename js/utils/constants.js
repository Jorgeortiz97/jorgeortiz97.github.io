// Game constants

const GAME_CONSTANTS = {
    // Investment costs
    INVESTMENT_COST: 2,

    // Inn costs
    INN_COST: 6,
    INN_REPAIR_COST: 4,

    // Artisan ability costs
    ARTISAN_TREASURE_COST: 4,

    // Investment limits
    MAX_INVESTMENTS_PER_TURN: 2,
    MAX_INVESTMENTS_MERCHANT: 3,
    MAX_GUILD_INVESTMENTS: 4,
    MAX_EXPEDITION_INVESTMENTS: 4,

    // Victory conditions
    WINNING_VP: 10,

    // Expedition success range (inclusive)
    EXPEDITION_SUCCESS_MIN: 6,
    EXPEDITION_SUCCESS_MAX: 8,

    // Deck management
    INITIAL_DISCARD_COUNT: 3,
    MIN_CARDS_AFTER_DISCARD: 3,

    // UI timing (milliseconds)
    DOUBLE_TAP_DELAY: 300,
    DICE_ROLL_DURATION: 1500,
    EVENT_DISPLAY_DURATION: 2000,
    PHASE_TRANSITION_DELAY: 800,
    AI_ACTION_BASE_DELAY: 500,
    AI_ACTION_STEP_DELAY: 600
};

// UI text in Spanish
const UI_TEXT = {
    menu: {
        play: 'Jugar',
        settings: 'Configuración',
        credits: 'Créditos',
        tutorial: 'Tutorial',
        classic: 'Partida Clásica',
        back: 'Atrás',
        newGame: 'Nueva Partida'
    },
    difficulty: {
        title: 'Selecciona Dificultad',
        easy: 'Fácil',
        medium: 'Media',
        hard: 'Difícil'
    },
    game: {
        endTurn: 'TERMINAR TURNO',
        buyLand: 'Comprar Tierra',
        cultivate: 'Cultivar',
        buildInn: 'Construir Posada',
        repairInn: 'Reparar Posada',
        treasures: 'Tesoros',
        vp: 'VP',
        coins: 'monedas',
        reserve: 'Reserva'
    },
    gameOver: {
        title: 'Partida Terminada',
        winner: 'Ganador',
        yourScore: 'Tu puntuación'
    },
    character: {
        selectTitle: 'Selecciona tu Personaje'
    },
    resolution: {
        title: 'Resolución',
        current: 'Actual',
        restart: 'Reiniciar para aplicar'
    },
    loading: {
        text: 'Cargando...',
        progress: 'Cargando recursos'
    }
};

// ===========================================
// BOARD LAYOUT - Based on original CSS
// Board image is 1200x1311 (portrait)
// ===========================================

const BOARD = {
    // Original board dimensions (for aspect ratio)
    width: 1200,
    height: 1311,
    aspectRatio: 1200 / 1311,  // ~0.915 (portrait/taller than wide)

    // Card dimensions as percentage of board
    card: {
        width: 16.08,
        height: 20.52
    },

    // Top area card dimensions (event deck, discard, expedition - same as guild cards)
    topCard: {
        width: 16.08,
        height: 20.52
    },

    // Guild card positions (percentage of board) - from original CSS
    guilds: {
        // Top row (Y: 27.23%)
        2:  { x: 2.50,  y: 27.23 },
        3:  { x: 22.17, y: 27.23 },
        4:  { x: 41.83, y: 27.23 },
        5:  { x: 61.67, y: 27.23 },
        8:  { x: 81.42, y: 27.23 },  // Tavern (swapped with Farm)
        // Bottom row (Y: 77.27%)
        12: { x: 2.50,  y: 77.27 },
        11: { x: 22.17, y: 77.27 },
        10: { x: 41.83, y: 77.27 },
        9:  { x: 61.67, y: 77.27 },
        6:  { x: 81.42, y: 77.27 }   // Farm (swapped with Tavern)
    },

    // Blocking event positions (middle row, Y: 52.25%)
    blockingEvents: {
        0: { x: 2.50,  y: 52.25 },
        1: { x: 22.17, y: 52.25 },
        2: { x: 41.83, y: 52.25 },
        3: { x: 61.67, y: 52.25 },
        4: { x: 81.42, y: 52.25 }
    },

    // Top area elements (percentage of board) - original CSS values (top-left position)
    topArea: {
        currentEvent:  { x: 20.33, y: 2.21 },
        previousEvent: { x: 41.92, y: 2.21 },
        expedition:    { x: 63.58, y: 2.21 },
        diceArea:      { x: 83.33, y: 8.39, width: 12.5, height: 11.44 }
    },

    // Investment slot positions within cards (percentage of card)
    investmentSlots: [
        { x: 16.55, y: 43.06 },  // Top-left
        { x: 53.67, y: 43.06 },  // Top-right
        { x: 16.55, y: 66.70 },  // Bottom-left
        { x: 53.67, y: 66.70 }   // Bottom-right
    ],

    // Investment slot size (percentage of card width)
    slotSize: 30.04
};

// ===========================================
// HUD LAYOUT
// ===========================================

const HUD_LAYOUT = {
    widthPercent: 0.18,  // HUD takes 18% of screen width
    playerHeight: 0.30,  // Each player HUD is 30% of screen height
    margin: 0.02,        // 2% margin between elements
    padding: 0.01        // 1% padding inside elements
};

// ===========================================
// Calculate board bounds that maintain aspect ratio
// ===========================================

function calculateBoardBounds(screenWidth, screenHeight, hudWidth) {
    const availableHeight = screenHeight;

    // Calculate board size maintaining aspect ratio
    // Fit by height (board fills full height)
    let boardHeight = availableHeight;
    let boardWidth = boardHeight * BOARD.aspectRatio;

    // Board is positioned at the RIGHT side of the screen
    const boardX = screenWidth - boardWidth;
    const boardY = 0;

    // HUD area is the space to the left of the board
    const hudAreaWidth = boardX;

    return {
        x: boardX,
        y: boardY,
        width: boardWidth,
        height: boardHeight,
        centerX: boardX + boardWidth / 2,
        centerY: boardY + boardHeight / 2,
        hudAreaWidth: hudAreaWidth
    };
}

// ===========================================
// Convert board-relative position to screen pixels
// ===========================================

function boardToScreen(boardBounds, xPercent, yPercent) {
    return {
        x: boardBounds.x + (boardBounds.width * xPercent / 100),
        y: boardBounds.y + (boardBounds.height * yPercent / 100)
    };
}

// ===========================================
// Get scaled layout for a given screen size
// ===========================================

function getScaledLayout(width, height) {
    // HUD PROPORTIONS ARE CRITICAL: 1150x600 (ratio 1.917:1)
    // Strategy: Calculate HUD dimensions FIRST to maintain proportions,
    // then fit the board in the remaining space

    const HUD_ASPECT = 1150 / 600;  // width:height = 1.917:1
    const buttonHeight = Math.floor(height * 0.065);
    const hudMargin = Math.floor(height * 0.012);

    // Calculate max HUD height that fits 3 HUDs + button + margins
    // Layout: [margin] [HUD] [margin] [HUD] [margin] [HUD] [margin] [button] [margin]
    const availableForHuds = height - buttonHeight - hudMargin * 5;
    const maxHudHeight = Math.floor(availableForHuds / 3);

    // Calculate HUD width from height to maintain 1150:600 proportions
    const hudWidthFromHeight = Math.floor(maxHudHeight * HUD_ASPECT);

    // Also check if board-first calculation gives smaller HUD
    const boardFirstBounds = calculateBoardBounds(width, height, 0);
    const hudWidthFromBoard = boardFirstBounds.hudAreaWidth;
    const hudHeightFromBoard = Math.floor(hudWidthFromBoard / HUD_ASPECT);

    // Use whichever approach results in smaller HUD (to ensure both fit)
    let hudPlayerHeight, hudWidth;
    if (hudHeightFromBoard <= maxHudHeight) {
        // Board-first: HUD fits with proportions maintained
        hudPlayerHeight = hudHeightFromBoard;
        hudWidth = hudWidthFromBoard;
    } else {
        // Height-constrained: Calculate HUD from max height, then board gets remaining space
        hudPlayerHeight = maxHudHeight;
        hudWidth = hudWidthFromHeight;
    }

    // Recalculate board bounds with the final HUD width
    const boardWidth = Math.floor(height * BOARD.aspectRatio);
    const boardX = Math.max(hudWidth, width - boardWidth);
    const actualBoardWidth = width - boardX;

    const board = {
        x: boardX,
        y: 0,
        width: actualBoardWidth,
        height: height,
        centerX: boardX + actualBoardWidth / 2,
        centerY: height / 2,
        hudAreaWidth: boardX
    };

    // Card dimensions based on board size
    const cardWidth = Math.floor(board.width * BOARD.card.width / 100);
    const cardHeight = Math.floor(board.height * BOARD.card.height / 100);

    // Top area card dimensions (taller for event deck, discard, expedition)
    const topCardWidth = Math.floor(board.width * BOARD.topCard.width / 100);
    const topCardHeight = Math.floor(board.height * BOARD.topCard.height / 100);

    return {
        // Screen dimensions
        screenWidth: width,
        screenHeight: height,

        // HUD with EXACT 1150:600 proportions
        hudWidth: hudWidth,
        hudPlayerHeight: hudPlayerHeight,
        hudMargin: hudMargin,
        hudPadding: Math.floor(hudWidth * 0.03),

        // Board bounds (where board image is actually displayed)
        board: board,

        // Card dimensions (for guild cards)
        cardWidth: cardWidth,
        cardHeight: cardHeight,

        // Top area card dimensions (for event deck, discard, expedition)
        topCardWidth: topCardWidth,
        topCardHeight: topCardHeight,

        // Slot size
        slotSize: Math.floor(cardWidth * BOARD.slotSize / 100),

        // Fonts (scale with screen height)
        fontSizeLarge: Math.max(16, Math.floor(height * 0.033)),
        fontSizeMedium: Math.max(14, Math.floor(height * 0.026)),
        fontSizeSmall: Math.max(12, Math.floor(height * 0.022))
    };
}

// ===========================================
// Get guild card position in screen coordinates
// ===========================================

function getGuildScreenPosition(guildNumber, layout) {
    const pos = BOARD.guilds[guildNumber];
    if (!pos) return null;

    const screenPos = boardToScreen(layout.board, pos.x, pos.y);

    // Return center position (add half card dimensions)
    return {
        x: screenPos.x + layout.cardWidth / 2,
        y: screenPos.y + layout.cardHeight / 2
    };
}

// ===========================================
// Get top area element position in screen coordinates
// ===========================================

function getTopAreaPosition(elementName, layout) {
    const pos = BOARD.topArea[elementName];
    if (!pos) return null;

    const screenPos = boardToScreen(layout.board, pos.x, pos.y);

    // Use topCard dimensions for top area elements
    return {
        x: screenPos.x + layout.topCardWidth / 2,
        y: screenPos.y + layout.topCardHeight / 2
    };
}

// ===========================================
// Color palette matching the medieval theme
// ===========================================

const COLORS = {
    // Primary colors
    parchment: 0xf4e8d0,
    darkVellum: 0x1a1510,
    burgundy: 0x8b3545,
    forestMoss: 0x5a7550,
    antiqueGold: 0xe6c870,
    weatheredBronze: 0x8b5a3c,
    tarnishedSilver: 0xa8abad,
    illuminatedBlue: 0x4a7aa0,

    // Status colors
    success: 0x7aa64f,
    warning: 0xe6a020,
    danger: 0xc54545,

    // UI colors
    textDark: 0x1a1510,
    textLight: 0xffffff,
    textMuted: 0xb8b0a0,

    // Overlays
    overlayDark: 0x1a1510,
    overlayLight: 0x000000
};
