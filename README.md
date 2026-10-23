# CC Tracker

A compact Electron app for sending bank transactions to your endpoint.

## Run

Requires Node.js 22 or newer.

```sh
npm install
npm start
```

The window has a fixed 380 × 600 content area. Pick a date, choose a bank from your saved list, and enter an amount and description. Open the gear button to save your HTTP/HTTPS endpoint; it persists across restarts in Electron's user data directory (`settings.json`).

**Send transaction** makes a JSON POST request:

```json
{
    "date": "2026-10-24",
    "bank": "BDO",
    "amount": 1250.5,
    "description": "Groceries"
}
```

Amounts are sent as JSON numbers. Any HTTP 2xx response counts as success. On success, the form resets: the date returns to today and bank, amount, and description clear. Errors preserve the form. Requests time out after 15 seconds and are never automatically retried; check your server before manually retrying an uncertain request. HTTP redirects are followed, including Google Apps Script response redirects. Network failures show the underlying error code. Endpoint authentication headers are not configured by this app.

## Checks

```sh
npm test
```

The app uses an isolated, sandboxed renderer and a narrow preload API following [Electron's IPC guidance](https://www.electronjs.org/docs/latest/tutorial/ipc).

Customize the bank dropdown in Settings using the Banks textarea (comma-separated names). Empty entries are ignored and duplicate names are removed. The saved list is used for both the dropdown and submission validation. Banks come only from saved settings. If no banks are saved, add them in Settings first.

