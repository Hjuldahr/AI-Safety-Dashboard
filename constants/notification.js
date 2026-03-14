export const NOTIFICATION_TYPES = Object.freeze({
  Generic: "Generic", 
  Alert: "Alert", 
  Demo: "Demo", 
  Server: "Server", 
  Unknown: "Unknown"
});
export const TRIM_COLOURS = {
    "Critical": "var(--color-critical)",
    "High": "var(--color-high)",
    "Medium": "var(--color-medium)",
    "Info": "var(--color-info)",
    "Shutdown": "#cc0202",
    "Paused": "#f45b69",
    "Resumed": "#2ca58d"
};
export const BACKGROUND_COLOURS = {
    "Critical": "var(--color-critical-light)",
    "High": "var(--color-high-light)",
    "Medium": "var(--color-medium-light)",
    "Info": "var(--color-info-light)",
    "Shutdown": "#fcdada",
    "Paused": "#ffe5e8",
    "Resumed": "#d1f3eb"
};
export const SHUTDOWN_MESSAGE = {
    message: "The Server is now shutting down",
    category: NOTIFICATION_TYPES.Server,
    dismissible: false,
    timeout: null,
    trim: TRIM_COLOURS.Shutdown,
    background: BACKGROUND_COLOURS.Shutdown
}