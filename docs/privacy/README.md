# GitHub Pages for Privacy Policy

Chrome Web Store **requires** a public Privacy Policy URL when the product
handles user data (local preferences, Paper history, optional Global Learning).
Without a working URL, submission / privacy review can be blocked.

This repository includes:

- `PRIVACY.md` (canonical markdown)
- `docs/privacy/index.html` (simple HTML page for Pages)

## Enable Pages (user action)

1. GitHub → repository **Settings** → **Pages**
2. Source: **Deploy from a branch**
3. Branch: `main` (after packaging docs are merged)
4. Folder: `/docs`
5. Save

Expected URL after publish:

`https://gajua.github.io/fly-earn-better-than-you/privacy/`

Temporary fallback (prefer Pages HTML for Store):

`https://github.com/gajua/fly-earn-better-than-you/blob/main/PRIVACY.md`

Also paste the same URL into the Chrome Web Store developer account privacy
policy field and the item Privacy tab.
