import {expect, test} from 'bun:test'
import {createHash} from 'node:crypto'

const {default: getPwaId, getPwaId: getPwaIdNamed} = await import('#src/main.ts')
const referencePwaId = (manifestId: string) => {
  const firstDigest = createHash('sha256').update(manifestId).digest()
  const secondDigest = createHash('sha256').update(firstDigest).digest()
  let result = ''
  for (const byte of secondDigest.subarray(0, 16)) {
    result += String.fromCodePoint(97 + (byte >> 4), 97 + (byte & 0x0F))
  }
  return result
}
test('computes the IDs from the issue for bare domains and explicit schemes', () => {
  expect(getPwaId('pro.x.com')).toBe('alfckbjcdinlldfagnmeabfnenmajchc')
  expect(getPwaId('slop.gallery')).toBe('jinebmjifepcaalpaokcfopcpkdfolnk')
  expect(getPwaId('https://slop.gallery')).toBe('jinebmjifepcaalpaokcfopcpkdfolnk')
  expect(getPwaId('https://slop.gallery/')).toBe('jinebmjifepcaalpaokcfopcpkdfolnk')
  expect(getPwaId('http://slop.gallery')).toBe('fjmddjdfcegneikdobjlpochlfacipfc')
  expect(getPwaId('http://slop.gallery/')).toBe('fjmddjdfcegneikdobjlpochlfacipfc')
})
test('computes the IDs from the issue for paths, id and start_url', () => {
  expect(getPwaId('example.com/app')).toBe('kjjibnhbmhbfpepapmpinclgfdpahbil')
  expect(getPwaId('example.com', {id: 'app'})).toBe('kjjibnhbmhbfpepapmpinclgfdpahbil')
  expect(getPwaId('example.com', {
    id: '/app',
    start_url: '/app/index.html',
  })).toBe('kjjibnhbmhbfpepapmpinclgfdpahbil')
  expect(getPwaId('example.com')).toBe('ocjeedicdelkkoefdcgeopgiagdjbcng')
  expect(getPwaId('example.com', {
    id: '/app',
    start_url: '/app/index.html',
  })).toBe('kjjibnhbmhbfpepapmpinclgfdpahbil')
})
test('matches the app ID test vectors of Chromium', () => {
  expect(getPwaId('https://www.chromestatus.com/features')).toBe('fedbieoalmbobgfjapopkghdmhgncnaa')
  expect(getPwaId('https://events.google.com/io2016/?utm_source=web_app_manifest')).toBe('mjgafbdfajpigcjmkgmeokfbodbcfijl')
  expect(getPwaId('https://example.com/subapp')).toBe('ghmpeckcpimfdekfodogbnnpmkppngmo')
  expect(getPwaId('https://example.com/subapp', {id: 'manifest.webmanifest'})).toBe('fekpfidpgacknlbhejgeblllclomiekk')
})
test('exposes the same function as default and named export', () => {
  expect(getPwaIdNamed).toBe(getPwaId)
})
test('returns a deterministic 32 character ID in the range a-p', () => {
  const id = getPwaId('example.com/some/app?source=test')
  expect(id).toMatch(/^[a-p]{32}$/)
  expect(getPwaId('example.com/some/app?source=test')).toBe(id)
})
test('normalizes the input URL', () => {
  const expected = getPwaId('https://example.com/app')
  expect(getPwaId('EXAMPLE.COM/app')).toBe(expected)
  expect(getPwaId('HTTPS://EXAMPLE.COM/app')).toBe(expected)
  expect(getPwaId('//example.com/app')).toBe(expected)
  expect(getPwaId('https://example.com:443/app')).toBe(expected)
  expect(getPwaId('  https://example.com/app  ')).toBe(expected)
  expect(getPwaId('http://example.com:80/app')).toBe(getPwaId('http://example.com/app'))
  expect(getPwaId('example.com:8080/app')).toBe(getPwaId('https://example.com:8080/app'))
  expect(getPwaId('localhost:5173/app')).toBe(getPwaId('https://localhost:5173/app'))
  expect(getPwaId('[::1]:8080/app')).toBe(getPwaId('https://[::1]:8080/app'))
  expect(getPwaId('127.0.0.1:3000')).toBe(getPwaId('https://127.0.0.1:3000/'))
})
test('accepts URL objects without mutating them', () => {
  const input = new URL('https://example.com/app#fragment')
  const id = new URL('https://example.com/identity#fragment')
  const startUrl = new URL('https://example.com/app/index.html')
  expect(getPwaId(input)).toBe(getPwaId('https://example.com/app'))
  expect(getPwaId(input, {
    id,
    start_url: startUrl,
  })).toBe(getPwaId('https://example.com/identity'))
  expect(input.href).toBe('https://example.com/app#fragment')
  expect(id.href).toBe('https://example.com/identity#fragment')
  expect(startUrl.href).toBe('https://example.com/app/index.html')
})
test('removes fragments, but keeps query strings', () => {
  expect(getPwaId('example.com/app#here')).toBe(getPwaId('example.com/app'))
  expect(getPwaId('example.com', {id: '/app#here'})).toBe(getPwaId('example.com/app'))
  expect(getPwaId('example.com', {start_url: '/app#here'})).toBe(getPwaId('example.com/app'))
  expect(getPwaId('example.com/app?x=y#here')).toBe(getPwaId('example.com/app?x=y'))
  expect(getPwaId('example.com/app?x=y')).not.toBe(getPwaId('example.com/app'))
  expect(getPwaId('example.com', {id: '/app?x=y'})).toBe(getPwaId('example.com/app?x=y'))
})
test('resolves the manifest id against the origin of the start URL', () => {
  const expected = getPwaId('https://example.com/foo')
  const startUrl = 'https://example.com/my-app/start'
  for (const id of ['foo', '/foo', './foo', '../foo', 'https://example.com/foo']) {
    expect(getPwaId(startUrl, {id})).toBe(expected)
  }
  expect(getPwaId('example.com', {id: '/'})).toBe(getPwaId('example.com'))
  expect(getPwaId(startUrl, {id: 'foo?x=y'})).toBe(getPwaId('https://example.com/foo?x=y'))
})
test('percent-encodes and punycodes non-ASCII input', () => {
  expect(getPwaId('example.com', {id: '😀'})).toBe(getPwaId('https://example.com/%F0%9F%98%80'))
  expect(getPwaId('example.com', {id: '/café'})).toBe(getPwaId('https://example.com/caf%C3%A9'))
  expect(getPwaId('https://café.example.com/foo')).toBe(getPwaId('https://xn--caf-dma.example.com/foo'))
  expect(getPwaId('example.com', {id: 'a b'})).toBe(getPwaId('https://example.com/a%20b'))
  expect(getPwaId('example.com', {id: 'a/b'})).not.toBe(getPwaId('example.com', {id: 'a%2Fb'}))
})
test('uses start_url as the default identity', () => {
  expect(getPwaId('example.com', {start_url: '/app/index.html'})).toBe(getPwaId('https://example.com/app/index.html'))
  expect(getPwaId('example.com', {startUrl: '/app/index.html'})).toBe(getPwaId('https://example.com/app/index.html'))
  expect(getPwaId('https://example.com/app/', {start_url: 'index.html'})).toBe(getPwaId('https://example.com/app/index.html'))
  expect(getPwaId('https://example.com/app', {start_url: 'index.html'})).toBe(getPwaId('https://example.com/index.html'))
  expect(getPwaId('example.com', {
    start_url: '/canonical',
    startUrl: '/alias',
  })).toBe(getPwaId('https://example.com/canonical'))
})
test('ignores empty, invalid and cross-origin manifest members', () => {
  const expected = getPwaId('https://example.com/start')
  expect(getPwaId('https://example.com/start', {id: ''})).toBe(expected)
  expect(getPwaId('https://example.com/start', {id: 'https://anothersite.com/foo'})).toBe(expected)
  expect(getPwaId('https://example.com/start', {id: 'http://example.com/foo'})).toBe(expected)
  expect(getPwaId('https://example.com/start', {id: 'https://example.com:99999/foo'})).toBe(expected)
  expect(getPwaId('https://example.com/start', {start_url: ''})).toBe(expected)
  expect(getPwaId('https://example.com/start', {start_url: 'https://anothersite.com/foo'})).toBe(expected)
  expect(getPwaId('https://example.com/start', {start_url: 'https://example.com:99999/foo'})).toBe(expected)
})
test('combines accepted and rejected manifest members like a browser', () => {
  const documentUrl = 'https://example.com/document'
  expect(getPwaId(documentUrl, {
    id: 'https://anothersite.com/identity',
    start_url: '/launch',
  })).toBe(getPwaId('https://example.com/launch'))
  expect(getPwaId(documentUrl, {
    id: '/identity',
    start_url: 'https://anothersite.com/launch',
  })).toBe(getPwaId('https://example.com/identity'))
  expect(getPwaId(documentUrl, {
    id: 'https://anothersite.com/identity',
    start_url: 'https://anothersite.com/launch',
  })).toBe(getPwaId(documentUrl))
  expect(getPwaId(documentUrl, {id: '//example.com/identity'})).toBe(getPwaId('https://example.com/identity'))
  expect(getPwaId(documentUrl, {id: '//anothersite.com/identity'})).toBe(getPwaId(documentUrl))
  expect(getPwaId(documentUrl, {id: '#fragment'})).toBe(getPwaId('https://example.com'))
  expect(getPwaId(documentUrl, {id: ' '})).toBe(getPwaId('https://example.com'))
  expect(getPwaId(documentUrl, {id: '?x=1'})).toBe(getPwaId('https://example.com/?x=1'))
  expect(getPwaId(documentUrl, {start_url: '?x=1'})).toBe(getPwaId('https://example.com/document?x=1'))
})
test('ignores unrelated manifest members and a missing manifest', () => {
  interface CompleteManifest {
    display: string
    id: string
    name: string
    start_url: string
  }
  const completeManifest: CompleteManifest = {
    display: 'standalone',
    id: '/app',
    name: 'Example',
    start_url: '/app/index.html',
  }
  const expected = getPwaId('example.com')
  expect(getPwaId('example.com', completeManifest)).toBe(getPwaId('example.com/app'))
  expect(getPwaId('example.com', null)).toBe(expected)
  expect(getPwaId('example.com', {
    id: null,
    start_url: null,
  })).toBe(expected)
  expect(getPwaId('example.com', {})).toBe(expected)
})
test('throws for invalid input', () => {
  expect(() => getPwaId('')).toThrow(TypeError)
  expect(() => getPwaId('   ')).toThrow(TypeError)
  expect(() => getPwaId('https://')).toThrow(TypeError)
  expect(() => getPwaId('not a url')).toThrow(TypeError)
  expect(() => getPwaId('ftp://example.com/app')).toThrow(TypeError)
  expect(() => getPwaId('data:text/plain,hello')).toThrow(TypeError)
  expect(() => getPwaId('/app')).toThrow(TypeError)
  expect(() => getPwaId('/example.com/app')).toThrow(TypeError)
  expect(() => getPwaId('///example.com/app')).toThrow(TypeError)
  expect(() => getPwaId(String.raw`\\app`)).toThrow(TypeError)
  expect(() => getPwaId('./app')).toThrow(TypeError)
  expect(() => getPwaId(new URL('ftp://example.com/app'))).toThrow(TypeError)
})
test('hashes long manifest identities like the reference algorithm', () => {
  const longPath = `/app/${'segment/'.repeat(30)}index.html?source=${'x'.repeat(80)}`
  const manifestId = `https://example.com${longPath}`
  expect(getPwaId(manifestId)).toBe(referencePwaId(manifestId))
})
