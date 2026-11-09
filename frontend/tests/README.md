# Navigation browser tests

From `frontend/`:

```sh
npm ci
npx playwright install chromium
npm run build
npm run test:e2e
```

Tests start the production app on port 3006 and run headlessly. To use an installed Microsoft Edge instead of downloading Chromium, set `PLAYWRIGHT_CHANNEL=msedge` (`$env:PLAYWRIGHT_CHANNEL = 'msedge'` in PowerShell).

The suite covers the five participant routes, active states, history, keyboard access, mobile dismissal and focus, resizing, narrow screens, and the existing home/auth header. Participant pages contain headings only; their content belongs to separate stories.
