# Profile

The Profile page lets each logged-in user view their account information, change their password, and choose a personal colour theme. It is available at `[Domain]/profile`.

Requires the user to be authenticated. No special role or permission is needed beyond being logged in.

---

## Account Information

Displays the logged-in user's **username** and **email address**. These fields are read-only on this page.

---

## Changing Your Password

1. Enter your **Current Password**.
2. Enter the **New Password** (minimum 8 characters).
3. Enter the new password again in **Confirm New Password**.
4. Click **Change Password**.

The server verifies the current password before accepting the change. The new password is hashed before storage — plain-text passwords are never saved.

**Validation rules:**
- New password must be at least 8 characters long.
- Current password must match the one on record.

---

## Theme Preferences

The **Theme** section lets you customise the appearance of the entire site. Changes apply immediately without a page reload and are automatically saved to your account.

### Colour Mode

Controls whether the site renders in light or dark style.

| Option | Effect |
|---|---|
| `☀ Light` | Always uses the light palette |
| `☾ Dark` | Always uses the dark palette |
| `◐ Auto` | Follows the operating system's dark-mode setting |

The **dark-mode toggle button** (the `☽` icon in the top-right header) provides a quick shortcut that cycles through the same three modes without visiting the Profile page.

### Theme (Colour Palette)

Selects the colour palette applied on top of the chosen light/dark mode.

| Option | Description |
|---|---|
| Default | Indigo/violet primary, neutral greys |
| Compact-Design | Same colours as Default plus a denser layout |
| High-Contrast | High-contrast ratios for accessibility |
| Cosmic | Deep purple/violet, space-inspired |
| Ocean | Cyan/teal palette, airy blues |
| Sakura | Soft pink/rose accents |
| Sunset | Warm amber/orange tones |
| Viridian | Green/emerald palette |

For technical details on how the theme system works or how to add a new theme, see the [Themes Reference](themes.md).

---

## API Reference

| Method | Endpoint | Permission | Description |
|---|---|---|---|
| `GET` | `/profile` | Authenticated | Render the profile page |
| `POST` | `/api/profile/preferences` | Authenticated | Save theme/colour preference |
| `POST` | `/api/profile/change-password` | Authenticated | Change account password |

### `POST /api/profile/preferences`

Updates the current user's theme or colour mode preference. Both fields are optional — you may send either or both.

```json
{
  "preferredTheme": "ocean",
  "preferredColour": "dark"
}
```

**Allowed values:**
- `preferredTheme`: `default`, `ocean`, `sunset`, `viridian`, `sakura`, `cosmic`, `contrast`, `compact`
- `preferredColour`: `light`, `dark`, `auto`

### `POST /api/profile/change-password`

```json
{
  "currentPassword": "oldpassword",
  "newPassword": "newpassword123"
}
```

Returns `403` if the current password is incorrect, `400` if the new password is less than 8 characters.

---

## Read Next
- [Themes Reference](themes.md)
- [Authentication](authentication.md)
- [Management](management.md)
