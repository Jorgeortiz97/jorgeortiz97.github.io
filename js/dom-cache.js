// dom-cache.js - Centralized DOM element caching

const DOMCache = {
    _cache: {},

    get(id) {
        if (!this._cache[id]) {
            this._cache[id] = document.getElementById(id);
        }
        return this._cache[id];
    },

    query(selector, parent = document) {
        return parent.querySelector(selector);
    },

    queryAll(selector, parent = document) {
        return parent.querySelectorAll(selector);
    },

    clear(id) {
        if (id) {
            delete this._cache[id];
        } else {
            this._cache = {};
        }
    },

    refresh(id) {
        this._cache[id] = document.getElementById(id);
        return this._cache[id];
    },

    // Common game elements - preload frequently accessed elements
    preloadCommonElements() {
        const commonIds = [
            'game-container',
            'user-pane',
            'board-pane',
            'opponents-pane',
            'buttons-pane',
            'guilds-grid-portrait',
            'current-event-card',
            'previous-event-card',
            'expedition-card',
            'dice-area',
            'die1',
            'die2',
            'dice-sum',
            'opponent-1',
            'opponent-2',
            'loading-screen-modal',
            'main-menu-modal',
            'character-modal',
            'guild-modal',
            'game-over-modal',
            'event-modal',
            'help-modal'
        ];

        commonIds.forEach(id => this.get(id));
    }
};

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { DOMCache };
}
