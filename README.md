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


## Installers and releases

Push a version tag to run `.github/workflows/release.yml`:

```sh
git tag v1.0.0
git push origin v1.0.0
```

Tags must be valid npm versions, optionally prefixed with `v` (for example, `v1.0.1` or `v1.1.0-beta.1`). The tag determines the installer version. The workflow runs tests and builds:

- macOS: `.dmg` installers for Intel (x64) and Apple Silicon (arm64).
- Windows: an x64 `.exe` installer with an installation directory picker.
- Fedora: an x64 `.rpm` package, built on an Ubuntu runner with RPM tooling.

After all builds succeed, the workflow creates a GitHub release and attaches the installers. Prerelease version tags produce prereleases. Installers are also available as workflow artifacts for 14 days. It uses the repository's built-in `GITHUB_TOKEN`; no additional secrets are needed.

Windows builds are unsigned; macOS builds use ad hoc signing and are not notarized, so the operating system may require approval to open/install them. Signing certificates and notarization credentials are needed for trusted public distribution.

To build an installer locally for your current OS:

```sh
npm run dist
```

Packaging targets and included application files are configured in `electron-builder.json`, using [electron-builder configuration](https://www.electron.build/configuration/).

On Fedora, local RPM packaging also requires `rpm-build` and `libxcrypt-compat` (`sudo dnf install rpm-build libxcrypt-compat`). CI installs the equivalent tools on its Ubuntu runner.
