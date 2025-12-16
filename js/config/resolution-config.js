// Resolution presets for the game (16:9 aspect ratio)
const RESOLUTION_PRESETS = {
    low: {
        width: 640,
        height: 360,
        label: '640x360 (Bajo)',
        description: 'Para dispositivos de baja potencia'
    },
    mediumLow: {
        width: 854,
        height: 480,
        label: '854x480 (Medio-Bajo)',
        description: 'Para dispositivos de potencia media-baja'
    },
    reference: {
        width: 1280,
        height: 720,
        label: '1280x720 (HD)',
        description: 'Resolución de referencia - Recomendada'
    },
    high: {
        width: 1920,
        height: 1080,
        label: '1920x1080 (Full HD)',
        description: 'Para dispositivos de alta potencia'
    }
};

// Auto-detect the best resolution based on screen size
function detectBestResolution() {
    const screenWidth = window.screen.width * (window.devicePixelRatio || 1);
    const screenHeight = window.screen.height * (window.devicePixelRatio || 1);
    const maxDimension = Math.max(screenWidth, screenHeight);

    // Select resolution based on available screen real estate
    if (maxDimension >= 1920) {
        return 'high';
    } else if (maxDimension >= 1280) {
        return 'reference';
    } else if (maxDimension >= 854) {
        return 'mediumLow';
    }
    return 'low';
}

// Get current resolution preset
function getCurrentResolution() {
    const saved = localStorage.getItem('gremios-resolution');
    return saved || detectBestResolution();
}

// Get resolution preset by key
function getResolutionPreset(key) {
    return RESOLUTION_PRESETS[key] || RESOLUTION_PRESETS.reference;
}

// Save resolution preference
function saveResolution(key) {
    localStorage.setItem('gremios-resolution', key);
}

// Check if restart is needed after resolution change
function needsRestartForResolution(newResolution) {
    const current = getCurrentResolution();
    return current !== newResolution;
}
