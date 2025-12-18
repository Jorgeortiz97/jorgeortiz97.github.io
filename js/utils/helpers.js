// Utility helper functions

// Fullscreen utilities
const FULLSCREEN_KEY = 'gremios-fullscreen';

// Animation speed utilities
const ANIMATION_SPEED_KEY = 'gremios-animation-speed';
const ANIMATION_SPEEDS = {
    normal: { label: 'Normal', multiplier: 1.0 },
    fast: { label: 'Rápido', multiplier: 0.5 },
    instant: { label: 'Instantáneo', multiplier: 0.1 }
};
const ANIMATION_SPEED_ORDER = ['normal', 'fast', 'instant'];

function getAnimationSpeed() {
    const saved = localStorage.getItem(ANIMATION_SPEED_KEY);
    return saved && ANIMATION_SPEEDS[saved] ? saved : 'normal';
}

function saveAnimationSpeed(speed) {
    if (ANIMATION_SPEEDS[speed]) {
        localStorage.setItem(ANIMATION_SPEED_KEY, speed);
    }
}

function getAnimationMultiplier() {
    return ANIMATION_SPEEDS[getAnimationSpeed()].multiplier;
}

function getAnimationDuration(baseDuration) {
    return Math.max(baseDuration * getAnimationMultiplier(), 50);
}

function cycleAnimationSpeed() {
    const current = getAnimationSpeed();
    const currentIndex = ANIMATION_SPEED_ORDER.indexOf(current);
    const nextIndex = (currentIndex + 1) % ANIMATION_SPEED_ORDER.length;
    const nextSpeed = ANIMATION_SPEED_ORDER[nextIndex];
    saveAnimationSpeed(nextSpeed);
    return nextSpeed;
}

function getAnimationSpeedLabel() {
    return ANIMATION_SPEEDS[getAnimationSpeed()].label;
}

function isFullscreenSupported() {
    return document.fullscreenEnabled || document.webkitFullscreenEnabled;
}

function isMobileDevice() {
    return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) ||
           ('ontouchstart' in window && window.innerWidth < 1024);
}

function getFullscreenPreference() {
    const saved = localStorage.getItem(FULLSCREEN_KEY);
    return saved === null ? null : saved === 'true';
}

function saveFullscreenPreference(enabled) {
    localStorage.setItem(FULLSCREEN_KEY, enabled.toString());
}

function enterFullscreen(scene) {
    if (scene.scale.isFullscreen) return;
    scene.scale.startFullscreen();
    saveFullscreenPreference(true);

    // Try to lock orientation to landscape on mobile devices
    if (screen.orientation && screen.orientation.lock) {
        screen.orientation.lock('landscape').catch(() => {
            // Orientation lock not supported or failed - ignore silently
        });
    }
}

function exitFullscreen(scene) {
    if (!scene.scale.isFullscreen) return;
    scene.scale.stopFullscreen();
    saveFullscreenPreference(false);

    // Unlock orientation when exiting fullscreen
    if (screen.orientation && screen.orientation.unlock) {
        try {
            screen.orientation.unlock();
        } catch (e) {
            // Unlock not supported or failed - ignore silently
        }
    }
}

function toggleFullscreen(scene) {
    if (scene.scale.isFullscreen) {
        exitFullscreen(scene);
    } else {
        enterFullscreen(scene);
    }
}

// Shuffle an array using Fisher-Yates algorithm
function shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

// Roll a single die (1-6)
function rollDie() {
    return Math.floor(Math.random() * 6) + 1;
}

// Roll two dice and return result
function rollDice() {
    const die1 = rollDie();
    const die2 = rollDie();
    return {
        die1,
        die2,
        sum: die1 + die2
    };
}

// Deep clone an object
function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
}

// Simple event emitter mixin for non-Phaser classes
class SimpleEventEmitter {
    constructor() {
        this._events = {};
    }

    on(event, callback) {
        if (!this._events[event]) {
            this._events[event] = [];
        }
        this._events[event].push(callback);
        return this;
    }

    off(event, callback) {
        if (this._events[event]) {
            this._events[event] = this._events[event].filter(cb => cb !== callback);
        }
        return this;
    }

    emit(event, ...args) {
        if (this._events[event]) {
            this._events[event].forEach(callback => callback(...args));
        }
        return this;
    }

    once(event, callback) {
        const onceWrapper = (...args) => {
            callback(...args);
            this.off(event, onceWrapper);
        };
        return this.on(event, onceWrapper);
    }

    removeAllListeners() {
        this._events = {};
        return this;
    }
}
