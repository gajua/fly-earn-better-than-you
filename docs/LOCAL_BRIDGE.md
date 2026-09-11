# Local extension bridge

The Chrome extension is a sensor-only boundary between the local demo and a
paired Tauri process. It does not place orders, invoke page actions, inject an
overlay, or implement a broker. Its only initial page access is:

```text
http://127.0.0.1:5173/*
```

The content script reads the existing `data-demo-broker` attributes and the
visible rectangles of its `data-fly-target` descendants. It never reads page
text, form values, password or OTP fields, cookies, browser storage,
authentication state, account credentials, website session tokens, or order
requests. It never calls `click()`, dispatches an event, submits a form, or
calls a trading API.

## Per-launch pairing

On every Chrome launch:

1. Tauri binds an ephemeral HTTP listener to `127.0.0.1` on a random unprivileged
   port.
2. Tauri generates a cryptographically random, one-launch token. Use at least
   256 bits of entropy encoded as base64url without padding (normally 43
   characters).
3. Tauri shows the port and token to the user.
4. The user opens the extension popup or options page and explicitly enters
   those values.
5. The extension derives `http://127.0.0.1:<port>` itself. It does not accept a
   hostname or arbitrary URL.

The extension stores the port, derived bridge origin, extension origin, token,
and pairing time only in `chrome.storage.session`. Access is restricted to
trusted extension contexts, so the demo content script cannot read it. Session
storage is memory-backed and cleared when the browser exits, when the extension
is reloaded, or when the user selects **Unpair**. Do not copy these values into
`storage.local`, logs, query strings, crash reports, or analytics.

The token is a local bridge capability, not a brokerage or website session
token. The extension must never ingest brokerage authentication material.

## HTTP contract

The service worker validates both the sender and the complete JSON shape before
sending:

```text
POST http://127.0.0.1:<port>/v1/environment
Authorization: Bearer <one-launch-token>
Content-Type: application/json
X-Fly-Extension-Origin: chrome-extension://<extension-id>
```

The body contains only:

- `kind: "market-environment"`
- `source: "demo"`
- an ISO capture timestamp
- a serializable, broker-neutral `MarketEnvironment`

Tauri should cap request-body size, compare the bearer token in constant time,
require the configured extension origin, accept only `POST` and `OPTIONS` on
this route, and return a small status response. Configure CORS for the exact
`chrome-extension://<extension-id>` origin, `POST`, and the three request
headers above. Never use `*` with the authorization header.

No host permission is requested for arbitrary websites or all loopback ports.
The bridge therefore needs the exact CORS response; the extension does not
bypass CORS with a broad `http://127.0.0.1/*` permission. The demo permission is
fixed to port 5173.

## Threat model

Protected assets are the one-launch token, accepted sensor snapshots, and the
guarantee that sensing cannot become order automation.

- **Remote websites:** cannot run the content script because the manifest
  grants only the exact loopback demo origin.
- **Other loopback processes:** cannot choose the destination; pairing derives
  an IPv4 loopback origin from a validated port. The random token authenticates
  the intended Tauri listener.
- **A compromised demo page:** can change its own explicit market attributes
  and therefore spoof sensor data, but cannot access the pairing token or make
  the extension click. Treat all snapshots as untrusted observations.
- **Malicious extensions or local malware:** are outside the browser isolation
  guarantee. A process able to inspect Chrome or Tauri memory can steal the
  capability.
- **DNS rebinding and hostname ambiguity:** are avoided by accepting only the
  literal `127.0.0.1`; `localhost`, IPv6, LAN addresses, and remote hosts are
  rejected.
- **Replay:** remains possible during one pairing session. Tauri may add a
  monotonic nonce if replay resistance becomes necessary. The short-lived token
  bounds replay across launches.

Tauri must bind only to `127.0.0.1`, not `0.0.0.0`, and should fail closed on
origin, token, content type, route, method, or schema mismatch.

## Coordinate limitation

`getBoundingClientRect()` reports CSS-pixel coordinates relative to the web
page viewport. These are not physical screen coordinates. They omit browser
chrome, window position, display scale, page zoom transforms outside the
reported rectangle, and multi-monitor offsets. Consequently, a separate Tauri
window cannot reliably place a screen overlay from these rectangles alone.
This milestone should use them only as viewport-relative observations.

## Future: Native Messaging

Chrome Native Messaging is the preferred future transport when installation
and host-manifest management are available. It removes the loopback HTTP/CORS
surface and provides extension-to-native process framing. It does not remove
the need for strict payload validation, explicit user pairing/consent,
sensor-only behavior, or the ban on brokerage credentials and order actions.
