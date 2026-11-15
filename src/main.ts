import {createHash} from 'node:crypto'

export type PwaIdOptions = {
  id?: string | URL
  start_url?: string | URL
}

const isAbsoluteUrl = (value: string) => /^[a-zA-Z][a-zA-Z\d+.-]*:/.test(value)

const normalizeInput = (value: string | URL) => {
  if (value instanceof URL) {
    return value.href
  }
  const trimmed = value.trim()
  if (!trimmed) {
    throw new TypeError('PWA ID input may not be empty')
  }
  if (isAbsoluteUrl(trimmed)) {
    return new URL(trimmed).href
  }
  return new URL(`https://${trimmed}`).href
}

const resolveStartUrl = (value: string | URL, base: string) => {
  if (value instanceof URL) {
    return value.href
  }
  const trimmed = value.trim()
  if (!trimmed) {
    return base
  }
  if (isAbsoluteUrl(trimmed)) {
    return new URL(trimmed).href
  }
  return new URL(trimmed, base).href
}

const resolveManifestIdPath = (value: string | URL, startUrl: string) => {
  if (value instanceof URL) {
    return value.href
  }
  const trimmed = value.trim()
  if (!trimmed) {
    return startUrl
  }
  if (isAbsoluteUrl(trimmed)) {
    return new URL(trimmed).href
  }
  return new URL(trimmed, new URL(startUrl).origin).href
}

const createPwaIdFromManifestId = (manifestId: string) => {
  const withoutHash = manifestId.replace(/#.*$/, '')
  const firstHash = createHash('sha256').update(withoutHash).digest()
  const secondHash = createHash('sha256').update(firstHash).digest()
  const first16Bytes = secondHash.subarray(0, 16)
  const hex = first16Bytes.toString('hex')
  return [...hex].map(character => {
    return String.fromCharCode(97 + Number.parseInt(character, 16))
  }).join('')
}

export const getPwaId = (input: string | URL, options: PwaIdOptions = {}) => {
  const baseUrl = normalizeInput(input)
  const startUrl = resolveStartUrl(options.start_url ?? baseUrl, baseUrl)
  const manifestId = options.id ? resolveManifestIdPath(options.id, startUrl) : startUrl
  return createPwaIdFromManifestId(manifestId)
}

export default getPwaId
