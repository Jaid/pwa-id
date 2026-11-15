# pwa-id

Calculate Chromium PWA app IDs from URLs and web app manifests.

## Usage

```TypeScript
import getPwaId from 'pwa-id'

// 'alfckbjcdinlldfagnmeabfnenmajchc'
const id = getPwaId('pro.x.com')

// 'jinebmjifepcaalpaokcfopcpkdfolnk'
const httpsId = getPwaId('https://slop.gallery')

// 'fjmddjdfcegneikdobjlpochlfacipfc'
const httpId = getPwaId('http://slop.gallery')

// 'kjjibnhbmhbfpepapmpinclgfdpahbil'
const appId = getPwaId('example.com', {
  id: '/app',
  start_url: '/app/index.html',
})
```

## API

### `getPwaId(url, manifest?)`

- `url` (`URL | string`): Site, page or manifest base URL. Defaults to `https://` when no scheme is provided.
- `manifest` (`Manifest`, optional): Web app manifest fields (`id` and `start_url`).
  - `start_url` is resolved against `url` and must share its origin.
  - `id` is resolved against the origin of the effective `start_url` and must share its origin.
  - Fragments are stripped from the resolved manifest ID URL, while query strings are preserved.

Returns the 32-character lowercase `a`–`p` Chromium PWA app ID.
