import {createHash} from 'node:crypto'

export type Manifest = {
  [key: string]: unknown
  id?: string | null
  start_url?: string | null
}

const schemePattern = /^[a-z][\d+\-.a-z]*:\/\//i
const parseUrl = (input: URL | string): URL => {
  if (input instanceof URL) {
    return new URL(input.href)
  }
  const trimmed = input.trim()
  if (!trimmed) {
    throw new TypeError('URL must not be empty')
  }
  if (schemePattern.test(trimmed)) {
    return new URL(trimmed)
  }
  if (trimmed.startsWith('//')) {
    return new URL(`https:${trimmed}`)
  }
  return new URL(`https://${trimmed}`)
}
const getOrigin = (url: URL): string => {
  if (url.origin !== 'null') {
    return url.origin
  }
  return `${url.protocol}//${url.host}`
}
const resolveManifestIdUrl = (documentUrl: URL, manifest?: Manifest): URL => {
  const documentOrigin = getOrigin(documentUrl)
  let startUrl = documentUrl
  if (typeof manifest?.start_url === 'string') {
    const startUrlInput = manifest.start_url.trim()
    if (startUrlInput) {
      try {
        const resolvedStartUrl = new URL(startUrlInput, documentUrl)
        if (getOrigin(resolvedStartUrl) === documentOrigin) {
          startUrl = resolvedStartUrl
        }
      } catch {}
    }
  }
  let manifestIdUrl = new URL(startUrl.href)
  if (typeof manifest?.id === 'string') {
    const idInput = manifest.id.trim()
    if (idInput) {
      try {
        const startUrlOrigin = getOrigin(startUrl)
        const resolvedIdUrl = new URL(idInput, startUrlOrigin)
        if (getOrigin(resolvedIdUrl) === startUrlOrigin) {
          manifestIdUrl = resolvedIdUrl
        }
      } catch {}
    }
  }
  manifestIdUrl.hash = ''
  return manifestIdUrl
}
const hashManifestId = (manifestId: string): string => {
  const innerHash = createHash('sha256').update(manifestId, 'utf8').digest()
  const outerHash = createHash('sha256').update(innerHash).digest()
  let id = ''
  for (const byte of outerHash.subarray(0, 16)) {
    id += String.fromCodePoint(0x61 + (byte >> 4), 0x61 + (byte & 0xF))
  }
  return id
}

export const getPwaId = (url: URL | string, manifest?: Manifest): string => {
  const documentUrl = parseUrl(url)
  const manifestIdUrl = resolveManifestIdUrl(documentUrl, manifest)
  return hashManifestId(manifestIdUrl.href)
}

export default getPwaId
