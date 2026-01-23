# Usage
## Available `/cms/current_motd.json` config flags
- message (str, required): The text displayed in the banner.
- linkText (str): The text shown for the redirect link. Defaults to `"Read More"`.
- linkUrl (url-str): The destination URL (e.g., `/cms/test_log.html`). If omitted, the link is hidden.
- bground (css-colour-str): The banner background colour. Defaults to the CSS value in `public/css/motd.css`.
- lock (bool): If true, the dismiss button is hidden, preventing manual dismissal. Defaults to `false`.
- timeout (positive-int): Number of seconds the banner should display before auto-expiring. When the timeout expires, the banner is hidden and the dismissal state is saved.
## Notes
- If lock is `true` and timeout is set, the banner is forced to stay visible until the timer expires.
- If a user dismisses the banner or it expires, it will not show again on reload until a new message is pushed/pulled or the browser’s local storage is reset.
- Local HTML files (e.g., `test_log.html`) must be placed under `/public` or `/cms` so they can be served by the web server.