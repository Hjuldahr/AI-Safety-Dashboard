export const NOTIFICATION_TYPES = Object.freeze({
  Generic: "Generic", 
  Alert: "Alert", 
  Demo: "Demo", 
  Server: "Server", 
  Unknown: "Unknown"
});
export const SHUTDOWN_MESSAGE = {
    message: "The Server is now shutting down",
    category: NOTIFICATION_TYPES.Server,
    dismissible: false,
    timeout: null,
    colour: "shutdown"
}