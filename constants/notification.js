export const NOTIFICATION_TYPES = Object.freeze({
  Generic: "Generic", 
  Alert: "Alert", 
  Demo: "Demo", 
  Server: "Server", 
  Unknown: "Unknown"
});
export const TRIM_COLOURS = {
    "Critical": "#dc2626",
    "High": "#f97316",
    "Medium": "#f59e0b",
    "Info": "#3b82f6",
    "Shutdown": "#cc0202",
    "Paused": "#f45b69",
    "Resumed": "#2ca58d"
};
export const BACKGROUND_COLOURS = {
    "Critical": "#fee2e2",
    "High": "#ffedd5",
    "Medium": "#fef3c7",
    "Info": "#dbeafe",
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