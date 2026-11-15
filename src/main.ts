import {createHash} from 'node:crypto'

/** The manifest members that affect a Chromium PWA’s identity. Other members are ignored. */
export interface PwaManifest {
  id?: string
  start_url?: string
}

const normalizeUrl = (input: URL | string): URL => {
  let url: URL
  if (input instanceof URL) {
    url = new URL(input.href)
  } else {
    if (typeof input !== 'string') {
      throw new TypeError('Expected a URL string or URL object.')
    }
    const value = input.trim()
    if (!value || value.startsWith('/') && !value.startsWith('//')) {
      throw new TypeError('Expected an HTTP(S) URL or a hostname.')
    }
    // A bare host with a numeric port is not an explicit URL scheme.
    const hasScheme = /^[a-z][\d+\-.a-z]*:/iu.test(value) && !/^[^#/:?]+:\d+(?:[#/?]|$)/u.test(value)
    url = new URL(hasScheme ? value : (value.startsWith('//') ? `https:${value}` : `https://${value}`))
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    throw new TypeError('Only HTTP(S) URLs are supported.')
  }
  return url
}
const resolveManifestUrl = (value: unknown, baseUrl: URL): URL | undefined => {
  if (typeof value !== 'string') {
    return undefined
  }
  const resolved = URL.parse(value, baseUrl.href)
  return resolved?.origin === baseUrl.origin ? resolved : undefined
}
/**
 * Computes a Chromium PWA’s 32-character app ID without fetching the site or its manifest.
 * Scheme-less URLs default to HTTPS. Relative start_url values use the input URL as their base; relative id values use the start URL’s origin. Invalid or cross-origin manifest members are ignored.
 */
// eslint-disable-next-line typescript/no-unnecessary-type-parameters -- Inference allows extra members in both inline literals and external manifest interfaces.
const getPwaId = <Manifest extends object = PwaManifest>(input: URL | string, manifest?: Manifest & PwaManifest): string => {
  const url = normalizeUrl(input)
  const startUrl = resolveManifestUrl(manifest?.start_url, url) ?? url
  const manifestId = manifest?.id === '' ? undefined : resolveManifestUrl(manifest?.id, new URL(startUrl.origin))
  const identity = manifestId ?? startUrl
  identity.hash = ''
  // Chromium hashes twice for historical compatibility, using the raw first digest rather than hex.
  const firstHash = createHash('sha256').update(identity.href).digest()
  const hash = createHash('sha256').update(firstHash).digest()
  let id = ''
  for (const byte of hash.subarray(0, 16)) {
    // The extension ID alphabet maps hexadecimal digits 0–f to a–p.
    id += String.fromCodePoint(97 + (byte >> 4), 97 + (byte & 15))
  }
  return id
}

export default getPwaId
