# pwa-id

Compute the app ID that Chromium assigns to a progressive web app.

The result is the deterministic 32-character ID consisting of the letters `a`–`p` that Chromium derives from a web app’s manifest identity. Computation is synchronous, works offline and uses no runtime dependencies – the only platform APIs involved are `URL` and `TextEncoder`, so the same code runs in current browsers, Bun and Node.js.

## Installation

```sh
bun add pwa-id
```

## Usage

```ts
import getPwaId from 'pwa-id'

// 'alfckbjcdinlldfagnmeabfnenmajchc'
const id = getPwaId('pro.x.com')
```

A missing scheme defaults to `https`. An explicit `http` origin is a different identity:

```ts
import getPwaId from 'pwa-id'

// 'jinebmjifepcaalpaokcfopcpkdfolnk'
const id = getPwaId('slop.gallery')

// 'jinebmjifepcaalpaokcfopcpkdfolnk'
const id2 = getPwaId('https://slop.gallery')

// 'jinebmjifepcaalpaokcfopcpkdfolnk'
const id3 = getPwaId('https://slop.gallery/')

// 'fjmddjdfcegneikdobjlpochlfacipfc'
const id4 = getPwaId('http://slop.gallery')

// 'fjmddjdfcegneikdobjlpochlfacipfc'
const id5 = getPwaId('http://slop.gallery/')
```

Without a manifest `id`, the identity is the effective `start_url`, which defaults to the given URL:

```ts
import getPwaId from 'pwa-id'

// 'kjjibnhbmhbfpepapmpinclgfdpahbil'
const id = getPwaId('example.com/app')

// 'kjjibnhbmhbfpepapmpinclgfdpahbil'
const id2 = getPwaId('example.com', {
  id: 'app',
})

// 'kjjibnhbmhbfpepapmpinclgfdpahbil'
const id3 = getPwaId('example.com', {
  id: '/app',
  start_url: '/app/index.html'
})
```

## API

### `getPwaId(input, manifest?)`

Returns the Chromium PWA app ID as a string. The function is available as the default export and as the named export `getPwaId`.

`input` is the app’s document URL and fallback start URL, as a string or `URL` object. It must use `http` or `https`, but the scheme may be omitted for a bare host such as `example.com`, `example.com/app` or `example.com:8080/app`. Scheme-relative URLs such as `//example.com` also default to `https`. Invalid input and non-HTTP schemes throw a `TypeError`.

No page or manifest is fetched. Without a `manifest` argument, the result is the ID for an app whose identity is exactly the given input URL. If a site’s actual manifest uses another `start_url` or `id`, that manifest has to be passed as the second argument.

`manifest` optionally contains the identity-relevant members of a Web App Manifest: `id` and `start_url`, plus `startUrl` as an alias that is only used when `start_url` is absent or empty. All other members are ignored, so a complete parsed manifest object can be passed directly:

```ts
const manifest = await Bun.file('manifest.webmanifest').json()
const id = getPwaId('example.com', manifest)
```

> [!NOTE]
> The example above reads the manifest with Bun for brevity. The library itself is platform-neutral and does not use any Bun APIs.

### How the identity is resolved

Identity resolution follows the Web App Manifest processing model, adapted to an API that receives no separate document and manifest URLs:

1. The effective `start_url` starts out as `input`. A given `start_url` is resolved against `input` and is only accepted if it parses and stays on the same origin.
2. The manifest identity defaults to that effective start URL.
3. A given manifest `id` is resolved against the start URL’s origin – not against its path – and is only accepted if it parses and stays on the same origin. This is why `app`, `./app`, `../app` and `/app` are all the same identity.
4. The fragment of the identity is removed. Its query string is kept, so `/app?x=y` and `/app` identify different apps.

Empty, invalid and cross-origin `id` and `start_url` values are therefore ignored, just as a browser ignores them while processing a manifest. Because a browser resolves `start_url` against the manifest URL while defaulting it to the document URL, and this function receives only one URL, `input` serves both purposes. This makes relative `start_url` values sensitive to the input’s trailing slash: with the input `https://example.com/app`, the `start_url` `index.html` resolves to `https://example.com/index.html`, while the input `https://example.com/app/` resolves it to `https://example.com/app/index.html`. Passing an absolute or root-relative `start_url` avoids any ambiguity.

URLs are normalized with the platform’s WHATWG `URL` parser. This lowercases the scheme and host, removes default ports, punycodes internationalized host names and percent-encodes paths such as `/café` to `/caf%C3%A9`.

### How the ID is calculated

Chromium derives the ID from the serialized manifest identity by hashing it twice – a historical artifact of reusing the extension ID generator:

1. Hash the identity URL’s UTF-8 bytes with SHA-256.
2. Hash the raw 32 bytes of that digest with SHA-256 again.
3. Hex-encode the first 16 bytes of the second digest.
4. Map every hex digit from `0`–`f` to `a`–`p`.

This matches `GenerateAppIdFromManifestId` in Chromium’s `web_app` helpers and is covered by Chromium’s own app ID test vectors in this package’s test suite.
