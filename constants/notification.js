export const NOTIFICATION_TYPES = Object.freeze({
  Generic: "Generic", 
  Alert: "Alert", 
  Demo: "Demo", 
  Server: "Server", 
  Unknown: "Unknown"
});
export const TRIM_COLOURS = {
    "Medium": "#f59e0b",
    "High": "#f59e0b",
    "Critical": "#dc2626",
    "Info": "#3b82f6"
};
export const BACKGROUND_COLOURS = {
    "Medium": "#fef3c7",
    "High": "#fef3c7",
    "Critical": "#fee2e2",
    "Info": "#dbeafe"
};
export const SHUTDOWN_MESSAGE = {
    message: "The Server is now shutting down",
    category: NOTIFICATION_TYPES.Server,
    dismissible: false,
    timeout: null,
    trim: "#CC0202",
    background: "#cccaca"
}