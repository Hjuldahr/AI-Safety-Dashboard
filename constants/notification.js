export const NOTIFICATION_TYPES = Object.freeze({
  Generic: "generic", 
  Alert: "alert", 
  Demo: "demo", 
  User: "user",
  Server: "server"
});

export const SHUTDOWN_MESSAGE = {
    message: "The Server is now shutting down",
    category: NOTIFICATION_TYPES.Server,
    dismissible: false,
    timeout: null,
    colour: "shutdown"
}