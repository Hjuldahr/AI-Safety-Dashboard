// ==========================================
// GLOBAL STATE INITIALIZATION
// ==========================================

const { DATA_DICTIONARY, CHART_SIZES, KNOWN_MODELS, TIMEFRAME_CONFIG } = window.CONSTANTS;

// The three other files: chartDataManager.js, chartRenederer.js, chartAdmin.js all use this oject to inter-communicate.
// The three files each run in an anonymous function, so they dont break each other's name spaces.
window.DashboardApp = {
    utils: {},
    renderer: {}, // Will be filled by chartRenderer.js
    admin: {},    // Will be filled by chartAdmin.js
    data: {},     // Will be filled by chartDataManager.js

    // Shared State
    charts: {},
    actions: {},
    logs: {},
    configs: [],
    constants: {
        ...window.CONSTANTS, // Shortcut
        CACHE_MAX_POINTS: 15,
        TINY_CACHE_MAX_POINTS: 8
    }
};

const Utils = {
    CHART_COLORS: {
        coral: 'rgb(244, 91, 105)',
        blue: 'rgb(0, 122, 204)',
        teal: 'rgb(44, 165, 141)',
        amber: 'rgb(255, 179, 0)',
        purple: 'rgb(142, 68, 173)',
    },
    //updated to support HEX
    transparentize(color, opacity) {
        if (!color) return `rgba(0,0,0,${opacity})`;

        // Handle Hex (e.g. #FF0000)
        if (color.startsWith('#')) {
            let c = color.substring(1).split('');
            if (c.length === 3) c = [c[0], c[0], c[1], c[1], c[2], c[2]];
            c = '0x' + c.join('');
            return 'rgba(' + [(c >> 16) & 255, (c >> 8) & 255, c & 255].join(',') + ',' + opacity + ')';
        }
        // Handle RGB/RGBA
        return color.replace('rgb', 'rgba').replace(')', `, ${opacity})`);
    }
};

function getHashedColor(str) {
    let hash = 2;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const c = (hash & 0x00FFFFFF).toString(16).toUpperCase();
    return '#' + "00000".substring(0, 6 - c.length) + c;
}

// Reads deep paths like "breakdown.topic" or "tokensUsed"
function getValueFromPath(obj, path) {
    if (!path) return undefined;
    return path.split('.').reduce((acc, part) => acc && acc[part], obj);
}

// Export helpers so other files can use them
window.DashboardApp.utils.transparentize = Utils.transparentize;
window.DashboardApp.utils.getHashedColor = getHashedColor;
window.DashboardApp.utils.getValueFromPath = getValueFromPath;