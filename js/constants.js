// constants.js - Centralized game constants

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
    DICE_ROLL_DURATION: 2000,
    DICE_DISPLAY_DURATION: 1000,
    EVENT_MODAL_DURATION: 3500,
    RESHUFFLE_ANIMATION_DURATION: 4100,
    PHASE_TRANSITION_DELAY: 1000,
    PHASE_TRANSITION_DELAY_LONG: 1500,
    AI_ACTION_BASE_DELAY: 500,
    AI_ACTION_STEP_DELAY: 800,
    EVENT_EFFECT_DELAY: 500,

    // Log limits
    MAX_LOG_MESSAGES: 30,

    // Font adjustment
    MIN_FONT_SIZE: 6
};

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { GAME_CONSTANTS };
}
