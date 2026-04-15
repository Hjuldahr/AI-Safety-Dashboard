# Themes

The AI Safety Dashboard ships with a fully CSS-variable–based theme system. Users can pick a colour palette and a light/dark mode at any time from their Profile page, and the preference is persisted to the database so it survives refreshes and new sessions.

---

## How the Theme System Works

### 1. CSS Variables (Design Tokens)

Every visual property — colours, shadows, borders — is expressed as a CSS custom property (variable) rather than a hard‑coded value. The **Default** theme defines the complete set of variables on `:root` (light mode) and overrides them under `body.dark-mode`. All other themes narrow-override only the variables that differ from Default.

```
public/css/themes/
├── colors-default.css   ← :root + body.dark-mode  (full variable set)
├── colors-contrast.css  ← body.theme-contrast + body.theme-contrast.dark-mode
├── colors-cosmic.css
├── colors-ocean.css
├── colors-sakura.css
├── colors-sunset.css
└── colors-viridian.css
```

> [!NOTE]
> `colors-default.css` is always loaded as a static `<link>` tag. The second `<link id="theme-colors">` tag is swapped at runtime by `themeManager.js` to load the active colour palette. This means Default is the implicit fallback — a non-Default theme only needs to override the tokens it changes.

### 2. Stylesheet Injection (Anti-FOUC)

To avoid a flash of unstyled content, the server renders user preferences into `<head>` via `views/components/header.ejs`. An inline script runs synchronously **before** first paint to add the correct body classes and set the `href` of the two dynamic `<link>` tags.

```
<link rel="stylesheet" href="css/themes/colors-default.css">   ← static, always present
<link rel="stylesheet" id="theme-colors" href="">              ← swapped per theme
<link rel="stylesheet" id="theme-layout" href="css/layouts/default.css"> ← layout variant
```

### 3. Body Classes

The `<body>` element receives two mutually exclusive class sets:

| Concern       | Classes applied                                        |
|---------------|--------------------------------------------------------|
| Colour mode   | *(none)* = light, `dark-mode` = dark                   |
| Palette       | *(none)* = Default, `theme-<name>` = everything else   |

Examples: `<body class="theme-cosmic dark-mode">`, `<body class="theme-ocean">`, `<body class="">`.

### 4. Runtime Management (`themeManager.js`)

`public/js/themeManager.js` is loaded at the bottom of `header.ejs` and handles all client-side logic:

| Responsibility | Detail |
|---|---|
| Reading prefs | Reads `window.USER_PREFERENCES` (injected by the server) |
| Applying prefs | `applyTheme(name)` swaps body classes + stylesheet href |
| Light/Dark toggle | Three-state cycle: `light → dark → auto` |
| Persistence | `POST /api/profile/preferences` when the user is authenticated |
| System-colour sync | Listens to `prefers-color-scheme: dark` and re-applies when mode is `auto` |

### 5. Server-Side Persistence

When the user changes a theme, `themeManager.js` calls:

```
POST /api/profile/preferences
{ "preferredTheme": "cosmic", "preferredColour": "dark" }
```

`profileController.js` validates the values against an allowlist (`ALLOWED_THEMES`, `ALLOWED_COLOURS`) and writes them to the `User` document in MongoDB. On next page load the server injects the saved values into `window.USER_PREFERENCES`.

---

## Available Themes

| Theme name | `<select>` label | CSS file | Description |
|---|---|---|---|
| `default` | Default | `colors-default.css` (static) | Indigo/violet primary, neutral greys |
| `ocean` | Ocean | `colors-ocean.css` | Cyan/teal palette, airy blues |
| `sunset` | Sunset | `colors-sunset.css` | Warm amber/orange tones |
| `viridian` | Viridian | `colors-viridian.css` | Green/emerald palette |
| `sakura` | Sakura | `colors-sakura.css` | Soft pink/rose accents |
| `cosmic` | Cosmic | `colors-cosmic.css` | Deep purple/violet, space-inspired |
| `contrast` | High-Contrast | `colors-contrast.css` | High-contrast ratios for accessibility |
| `compact` | Compact-Design | *(no colour override)* | Uses `layouts/compact.css` for a denser layout |

All themes support both **light** and **dark** colour modes. The `compact` theme is the exception — it only changes layout density, not colours.

---

## Where Themes Are Managed

Themes can be viewed and changed in two places in the application:

| Location | Who | What they can do |
|---|---|---|
| **Profile page** (`/profile`) | Any logged-in user | Choose their own personal colour palette and light/dark mode |
| **Management page** (`/admin/users`) → System section | Admins / Owners (`manage:users`) | Set the default theme applied to all new user accounts |

---

## Changing Your Theme (Profile Page)

1. Log in and go to **Profile** (`/profile`).
2. Under the **Theme** section, use the **Select Colour** drop-down to choose `☀ Light`, `☾ Dark`, or `◐ Auto` (follows the OS setting).
3. Use the **Select Theme** drop-down to choose a colour palette.
4. Both settings are applied immediately and saved automatically — no save button is needed.

The dark-mode toggle button (`☽` icon) in the site header cycles through the same three colour modes as a quick shortcut.

## Setting the System-Wide Default Theme (Management Page)

Admins and owners can set which theme new user accounts start with:

1. Go to **Management** (`/admin/users`) — requires the `manage:users` permission.
2. Expand the **System** section.
3. Under **Default Theme for New Users**, select a theme from the drop-down.
4. Click **Save Default Theme**.

The setting is stored in the `SystemSetting` collection under the key `default_theme`. It only affects accounts created *after* the change; existing users keep their current theme.

> [!NOTE]
> Individual users can always override the default by changing their own theme on the Profile page.

---

## Adding a New Theme

Follow these steps to register a new theme called `forest` (replace with your name):

### Step 1 — Create the CSS file

Create `public/css/themes/colors-forest.css`. Only override variables that differ from Default; every unset token falls through to `colors-default.css`.

```css
/* ==========================================================================
   COLORS — FOREST THEME
   body.theme-forest light + dark-mode overrides
   ========================================================================== */

/* ---------- Forest theme (light) ---------- */
body.theme-forest {
  --primary-color: #166534;
  --primary-hover: #14532d;
  --primary-light: #dcfce7;
  --green-color: #22c55e;
  --body-bg: #f0fdf4;
  --card-bg: #ffffff;
  --panel-header-bg: #dcfce7;
  --text-dark: #14532d;
  --text-light: #4d7c5b;
  --border-color: #bbf7d0;

  /* … add any other tokens you want to override … */

  --focus-ring: rgba(22, 101, 52, 0.3);
  --focus-ring-light: rgba(22, 101, 52, 0.12);

  --header-text-color: #14532d;
  --header-bg-color: #dcfce7;
  --nav-bg-color: #f0fdf4;
  --nav-link-color: #166534;
  --nav-link-hover-bg: #dcfce7;
  --nav-link-active-bg: #166534;
  --nav-border-color: #bbf7d0;
}

/* ---------- Forest theme (dark) ---------- */
body.theme-forest.dark-mode {
  --body-bg: #052e16;
  --card-bg: #14532d;
  --text-dark: #dcfce7;
  --text-light: #86efac;
  --border-color: #166534;
  --primary-color: #4ade80;
  --primary-light: #14532d;
  --header-bg-color: #14532d;
  --nav-bg-color: #052e16;
  --nav-link-color: #86efac;
  --nav-link-hover-bg: #166534;
  --nav-border-color: #166534;
}
```

### Step 2 — Register the file in `themeManager.js`

Open `public/js/themeManager.js` and add `forest` to **both** the `THEMES` array and the `COLOR_FILES` map:

```js
const THEMES = ['default', 'ocean', 'sunset', 'compact', 'viridian', 'sakura', 'cosmic', 'contrast', 'forest'];

const COLOR_FILES = {
  ocean:    'css/themes/colors-ocean.css',
  sunset:   'css/themes/colors-sunset.css',
  viridian: 'css/themes/colors-viridian.css',
  sakura:   'css/themes/colors-sakura.css',
  cosmic:   'css/themes/colors-cosmic.css',
  contrast: 'css/themes/colors-contrast.css',
  forest:   'css/themes/colors-forest.css',   // ← add this line
};
```

Also add `'theme-forest'` to the `document.body.classList.remove(...)` call inside `applyTheme()` so it is cleaned up when switching away:

```js
document.body.classList.remove(
  'theme-ocean',
  'theme-sunset',
  'theme-compact',
  'theme-viridian',
  'theme-sakura',
  'theme-cosmic',
  'theme-night',
  'theme-contrast',
  'theme-forest'   // ← add this line
);
```

### Step 3 — Allow the theme on the server

Two server-side files must be updated:

**`models/user.js`** — add `'forest'` to the `preferredTheme` enum:

```js
preferredTheme: {
  type: String,
  enum: ['default', 'ocean', 'sunset', 'viridian', 'sakura', 'cosmic', 'contrast', 'compact', 'forest'],
  default: 'default'
},
```

**`controllers/profileController.js`** — add `'forest'` to `ALLOWED_THEMES`:

```js
const ALLOWED_THEMES = new Set([
  'default', 'ocean', 'sunset', 'compact', 'viridian',
  'sakura', 'cosmic', 'contrast', 'forest'
]);
```

### Step 4 — Add the option to the Profile page

Open `views/profile.ejs` and add an `<option>` to the `#theme-select` dropdown:

```html
<option value="forest" <%= user.preferredTheme === 'forest' ? 'selected' : '' %>>Forest</option>
```

### Step 5 — Verify

Restart the server, go to the Profile page, and select **Forest** from the theme picker. Confirm light and dark modes both apply correctly.

---

## Modifying an Existing Theme

1. Open the relevant file in `public/css/themes/`.
2. Edit the CSS variable values.
3. Changes take effect immediately on next page load (no server restart required — it is a static asset).

> [!TIP]
> Use browser DevTools to live-preview changes: open the Sources panel, find the theme stylesheet, and edit values in place. Once satisfied, copy the final values back into the file.

> [!WARNING]
> Every theme CSS file should only override tokens; do not add new selectors with hard-coded colour values. Hard-coding colours bypasses the design-token system and will not respect light/dark mode switching.

---

## CSS Variable Reference

Below are the most important tokens defined in `colors-default.css`. Override any of these in a theme file to customise that aspect of the UI.

| Token | Purpose |
|---|---|
| `--primary-color` | Main brand/accent colour (buttons, active nav links, focus rings) |
| `--primary-hover` | Hover state of primary elements |
| `--primary-light` | Tinted background for primary-coloured containers |
| `--body-bg` | Page background |
| `--card-bg` | Card / panel background |
| `--panel-header-bg` | Section header strip background |
| `--text-dark` | Primary text colour |
| `--text-light` | Secondary / subdued text |
| `--text-muted` | Muted helper text |
| `--border-color` | Default border |
| `--border-light` | Lighter variant border |
| `--shadow` | Default box-shadow |
| `--input-bg` | Form input background |
| `--color-critical` | Critical severity indicator |
| `--color-high` | High severity indicator |
| `--color-medium` | Medium severity indicator |
| `--color-info` | Informational indicator |
| `--color-success` | Success state |
| `--color-danger` | Destructive action colour |
| `--focus-ring` | Focus outline colour (RGBA) |
| `--nav-bg-color` | Sidebar navigation background |
| `--nav-link-color` | Navigation link text |
| `--nav-link-hover-bg` | Navigation link hover background |
| `--nav-link-active-bg` | Active navigation link background |
| `--header-bg-color` | Top header bar background |
| `--header-text-color` | Top header bar text |
| `--overlay-bg` | Modal overlay background |
| `--code-bg` / `--code-text` | Code block colours |

For the full list, see [`colors-default.css`](../public/css/themes/colors-default.css).
