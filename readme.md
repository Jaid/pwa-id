# get-pwa-id

Compute the 32-character app ID that Chromium uses for an installed PWA, given its URL and optional web app manifest members. Synchronous, dependency-free and local-only – no requests, browser automation or installation required.

## Install

```sh
bun add get-pwa-id
```

Requires a runtime with `node:crypto` and `URL.parse`, such as current Bun or Node.js ≥22.1. The package is ESM and includes JavaScript and TypeScript declarations. It is not a browser-side Web Crypto API wrapper.

## Usage

```typescript
import getPwaId from 'get-pwa-id'

getPwaId('pro.x.com') // alfckbjcdinlldfagnmeabfnenmajchc

// Scheme-less URLs default to HTTPS. A missing root slash makes no difference.
getPwaId('slop.gallery') // jinebmjifepcaalpaokcfopcpkdfolnk
getPwaId('https://slop.gallery') // jinebmjifepcaalpaokcfopcpkdfolnk
getPwaId('https://slop.gallery/') // jinebmjifepcaalpaokcfopcpkdfolnk

// HTTP and HTTPS have different identities.
getPwaId('http://slop.gallery') // fjmddjdfcegneikdobjlpochlfacipfc
getPwaId('http://slop.gallery/') // fjmddjdfcegneikdobjlpochlfacipfc

getPwaId('example.com') // ocjeedicdelkkoefdcgeopgiagdjbcng
getPwaId('example.com/app') // kjjibnhbmhbfpepapmpinclgfdpahbil
getPwaId('example.com', {id: 'app'}) // kjjibnhbmhbfpepapmpinclgfdpahbil
getPwaId('example.com', {
  id: '/app',
  start_url: '/app/index.html',
}) // kjjibnhbmhbfpepapmpinclgfdpahbil
```

## API

```typescript
import getPwaId, {type PwaManifest} from 'get-pwa-id'

const url = new URL('https://example.com')
const manifest: PwaManifest = {start_url: '/app'}
const id: string = getPwaId(url, manifest)
```

### `getPwaId(url, manifest?) → string`

- **`url: string | URL`** – the document/start URL used when the manifest does not supply a valid `start_url`. A bare hostname, hostname with a port or protocol-relative URL defaults to HTTPS. Use explicit `http://` for HTTP localhost apps. Invalid URLs and protocols other than HTTP(S) throw `TypeError`.
- **`manifest?: PwaManifest`** – an object with optional `id` and `start_url` string members. Other members are ignored. The function does not fetch a manifest or validate installability.
- **Returns** a deterministic 32-character app ID using the letters `a`–`p`. URL objects and manifest objects are not mutated.

The identity is resolved as follows:

1. Resolve `start_url` against `url`. Missing, non-string, invalid or cross-origin values fall back to `url`.
2. Resolve a nonempty `id` against the **origin** of the effective start URL, not its path. Missing, empty, non-string, invalid or cross-origin values fall back to the effective start URL. Same-origin checks include the scheme and port.
3. Remove the fragment from the identity URL. Keep the query string, path case and meaningful trailing slashes. For example, `/app` and `/app/` produce different IDs.
4. Hash the serialized URL with SHA-256, hash the raw digest again, take the first 16 bytes and encode their hexadecimal digits using `a`–`p` instead of `0`–`f`.

Only the first argument accepts bare hostnames as a convenience. Within a manifest, `id: 'app'` and `start_url: 'app'` are ordinary relative URL references.

### Matching an installed app

Pass the app’s actual manifest `id` or `start_url` if present. A homepage URL alone cannot reveal a manifest-defined identity, and redirects are not followed. The result is a Chromium app ID, not the manifest’s own `id` URL and not an identifier standardized across all browsers.

Browsers resolve relative `start_url` values against the **manifest URL**. This API has no separate manifest location and uses the first argument as the base instead. If the manifest lives in another directory or on another origin, resolve its `start_url` to an absolute URL before passing it, while keeping the document URL as the first argument:

```typescript
getPwaId('https://example.com/page', {
  start_url: new URL('./app', 'https://example.com/assets/manifest.webmanifest').href,
})
```

URLs are normalized with the runtime’s WHATWG `URL` implementation. This matches ordinary Chromium HTTP(S) URLs but does not emulate every edge case of Chromium’s internal GURL canonicalizer.

Algorithm references: [Chromium app ID helpers](https://github.com/chromium/chromium/blob/main/chrome/browser/web_applications/app_id_helpers.cc), [extension ID encoding](https://github.com/chromium/chromium/blob/main/components/crx_file/id_util.cc) and [manifest ID processing](https://www.w3.org/TR/appmanifest/#id-member).

## Development

```sh
bun install --frozen-lockfile
bun test --coverage
bun run check
bunx --bun eslint .
bun run build
```

Tests include all usage examples and independent Chromium reference fixtures. `bun run build` generates `dist/main.js` and `dist/main.d.ts`; packing or publishing also runs the build automatically.
