import {sha256} from './sha256.ts'

/**
 * The parts of a Web App Manifest that determine a PWA’s identity.
 *
 * Extra manifest members are ignored, so a complete parsed manifest object
 * can be passed as-is.
 */
export type PwaIdManifest = {
  id?: URL | string | null
  start_url?: URL | string | null
  startUrl?: URL | string | null
}

/** Alias for {@link PwaIdManifest}. */
export type PwaIdOptions = PwaIdManifest

const textEncoder = new TextEncoder
const isHttpUrl = (url: URL) => url.protocol === 'http:' || url.protocol === 'https:'
const parseInputUrl = (input: unknown): URL => {
  if (input instanceof URL) {
    if (!isHttpUrl(input) || !input.hostname) {
      throw new TypeError(`Expected an http or https URL, got “${input.href}”.`)
    }
    return new URL(input.href)
  }
  if (typeof input !== 'string') {
    throw new TypeError('Expected a URL string or URL object.')
  }
  const value = input.trim()
  if (!value) {
    throw new TypeError('Expected a non-empty URL string or URL object.')
  }
  let candidate: string
  if (/^\/\/[^/\\]/.test(value)) {
    candidate = `https:${value}`
  } else if (/^[./\\]/.test(value)) {
    throw new TypeError(`Expected a URL or host, got “${input}”.`)
  } else if (/^https?:/i.test(value)) {
    candidate = value
  } else {
    // A bare “host:port” looks like a scheme to the URL parser
    // (“example.com:8080” would have the protocol “example.com:”), so only
    // treat a colon as a scheme separator when what follows it cannot be
    // a port.
    const schemeMatch = /^([a-z][\d+\-.a-z]*):(.*)$/is.exec(value)
    if (schemeMatch) {
      const scheme = schemeMatch[1]
      const rest = schemeMatch[2]
      const hasPort = /^\d+(?:$|[#/?])/.test(rest)
      const hasEmptyPort = (rest === '' || /^[#/?]/.test(rest)) && (scheme.includes('.') || scheme.toLowerCase() === 'localhost')
      if (rest.startsWith('//') || !hasPort && !hasEmptyPort) {
        throw new TypeError(`Expected an http or https URL, got the protocol “${scheme.toLowerCase()}:”.`)
      }
    }
    candidate = `https://${value}`
  }
  let url: URL
  try {
    url = new URL(candidate)
  } catch (error) {
    throw new TypeError(`Invalid URL: “${input}”.`, {cause: error})
  }
  if (!isHttpUrl(url) || !url.hostname) {
    throw new TypeError(`Expected an http or https URL, got “${input}”.`)
  }
  return url
}
const pickManifestValue = (...values: Array<unknown>): URL | string | undefined => values.find((value): value is URL | string => value instanceof URL || typeof value === 'string' && value !== '')
// Resolves a manifest member exactly like a browser would reject it:
// unparsable and cross-origin values are ignored instead of being hashed.
const resolveSameOriginUrl = (value: URL | string | undefined, base: URL | string, origin: string): URL | undefined => {
  if (value === undefined) {
    return undefined
  }
  let url: URL
  try {
    url = new URL(value, base)
  } catch {
    return undefined
  }
  if (!isHttpUrl(url) || url.origin !== origin) {
    return undefined
  }
  return url
}

/**
 * Computes the Chromium PWA app ID for a URL and an optional Web App Manifest.
 *
 * The result is the 32 character long ID, using only the letters `a` to `p`,
 * that Chromium derives from the manifest identity. It is deterministic and
 * computed synchronously, without any network access.
 *
 * `input` is the app’s document URL and fallback start URL. It also serves as the base
 * that a relative `start_url` is resolved against, because this function has
 * no separate manifest URL. Bare hosts such as `example.com` and
 * scheme-relative URLs default to `https`, while an explicit `http` origin
 * intentionally produces a different ID.
 *
 * `manifest` may carry the manifest members `id` and `start_url` (or its
 * `startUrl` alias). Following the Web App Manifest processing model, the
 * identity defaults to the effective `start_url`, a given `id` is resolved
 * against the start URL’s origin, fragments are removed, query strings are
 * kept and invalid or cross-origin `id`/`start_url` values are ignored.
 *
 * @example
 * ```ts
 * getPwaId('pro.x.com')
 * // 'alfckbjcdinlldfagnmeabfnenmajchc'
 *
 * getPwaId('example.com', {id: '/app', start_url: '/app/index.html'})
 * // 'kjjibnhbmhbfpepapmpinclgfdpahbil'
 * ```
 */
export const getPwaId = <Manifest extends PwaIdManifest>(input: URL | string, manifest?: Manifest | null): string => { // eslint-disable-line typescript/no-unnecessary-type-parameters -- preserves extra manifest members and accepts manifest interface types
  const manifestValue: unknown = manifest
  if (manifestValue !== undefined && manifestValue !== null && (typeof manifestValue !== 'object' || Array.isArray(manifestValue))) {
    throw new TypeError('Expected the manifest to be an object.')
  }
  const manifestObject = (manifestValue ?? {}) as PwaIdManifest
  const inputUrl = parseInputUrl(input)
  const startUrlInput = pickManifestValue(manifestObject.start_url, manifestObject.startUrl)
  const startUrl = resolveSameOriginUrl(startUrlInput, inputUrl, inputUrl.origin) ?? inputUrl
  const idInput = pickManifestValue(manifestObject.id)
  const manifestIdUrl = resolveSameOriginUrl(idInput, startUrl.origin, startUrl.origin) ?? new URL(startUrl.href)
  manifestIdUrl.hash = ''
  // Chromium’s app ID generation hashes the manifest identity twice. The
  // first SHA-256 digest is fed into the extension-style ID generator as raw
  // bytes, which hashes it with SHA-256 again. The first 16 bytes of the
  // second digest are hex encoded and each hex digit is mapped to `a`–`p`.
  // See GenerateAppIdFromManifestId in Chromium’s web_app/app_id_helpers:
  // https://source.chromium.org/chromium/chromium/src/+/main:chrome/browser/web_applications/app_id_helpers.cc
  const digest = sha256(sha256(textEncoder.encode(manifestIdUrl.href)))
  let pwaId = ''
  for (const byte of digest.subarray(0, 16)) {
    pwaId += String.fromCodePoint(97 + (byte >> 4), 97 + (byte & 0x0F))
  }
  return pwaId
}

export default getPwaId
