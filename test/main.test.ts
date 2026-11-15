import type {PwaManifest} from '#src/main.ts'

import {describe, expect, test} from 'bun:test'

import getPwaId from '#src/main.ts'

describe('issue examples', () => {
  test.each([
    ['pro.x.com', 'alfckbjcdinlldfagnmeabfnenmajchc'],
    ['slop.gallery', 'jinebmjifepcaalpaokcfopcpkdfolnk'],
    ['https://slop.gallery', 'jinebmjifepcaalpaokcfopcpkdfolnk'],
    ['https://slop.gallery/', 'jinebmjifepcaalpaokcfopcpkdfolnk'],
    ['http://slop.gallery', 'fjmddjdfcegneikdobjlpochlfacipfc'],
    ['http://slop.gallery/', 'fjmddjdfcegneikdobjlpochlfacipfc'],
    ['example.com/app', 'kjjibnhbmhbfpepapmpinclgfdpahbil'],
    ['example.com', 'ocjeedicdelkkoefdcgeopgiagdjbcng'],
  ])('%s', (url, expected) => {
    expect(getPwaId(url)).toBe(expected)
  })
  test.each<PwaManifest>([
    {id: 'app'},
    {
      id: '/app',
      start_url: '/app/index.html',
    },
  ])('manifest %j', manifest => {
    expect(getPwaId('example.com', manifest)).toBe('kjjibnhbmhbfpepapmpinclgfdpahbil')
  })
})
describe('Chromium reference fixtures', () => {
  // Independent fixtures from Chromium’s WebAppHelpers tests:
  // https://github.com/chromium/chromium/blob/main/chrome/browser/web_applications/web_app_helpers_unittest.cc
  test.each([
    ['https://www.chromestatus.com/features', 'fedbieoalmbobgfjapopkghdmhgncnaa'],
    ['https://events.google.com/io2016/?utm_source=web_app_manifest', 'mjgafbdfajpigcjmkgmeokfbodbcfijl'],
    ['https://example.com/subapp', 'ghmpeckcpimfdekfodogbnnpmkppngmo'],
  ])('%s', (url, expected) => {
    expect(getPwaId(url)).toBe(expected)
  })
  test('manifest ID fixture', () => {
    expect(getPwaId('https://example.com/subapp', {id: 'manifest.webmanifest'})).toBe('fekpfidpgacknlbhejgeblllclomiekk')
  })
})
describe('URL normalization', () => {
  test.each([
    'HTTPS://SLOP.GALLERY:443',
    'https:slop.gallery',
    '  slop.gallery  ',
    '//slop.gallery',
    'slop.gallery/#section',
    'https://slop.gallery/a/../',
  ])('%s normalizes to the HTTPS root', input => {
    expect(getPwaId(input)).toBe('jinebmjifepcaalpaokcfopcpkdfolnk')
  })
  test.each([
    ['example.com:8443/app', 'https://example.com:8443/app'],
    ['localhost:3000/app', 'https://localhost:3000/app'],
    ['[::1]:3000/app', 'https://[::1]:3000/app'],
    ['https://bücher.example/😀', 'https://xn--bcher-kva.example/%F0%9F%98%80'],
    ['http://example.com:80/app', 'http://example.com/app'],
  ])('%s matches %s', (input, canonical) => {
    expect(getPwaId(input)).toBe(getPwaId(canonical))
  })
  test('does not mutate a URL input', () => {
    const url = new URL('https://example.com/app#section')
    expect(getPwaId(url)).toBe('kjjibnhbmhbfpepapmpinclgfdpahbil')
    expect(url.href).toBe('https://example.com/app#section')
  })
  test.each([
    ['https://example.com/app', 'https://example.com/app/'],
    ['https://example.com/app', 'https://example.com/App'],
    ['https://example.com/app', 'https://example.com/app?x=1'],
    ['https://example.com/app?x=1&y=2', 'https://example.com/app?y=2&x=1'],
    ['https://example.com/app', 'https://example.com:8443/app'],
    ['https://example.com/a/b', 'https://example.com/a%2Fb'],
    ['https://example.com/j', 'https://example.com/%6A'],
  ])('%s and %s remain distinct', (first, second) => {
    expect(getPwaId(first)).not.toBe(getPwaId(second))
  })
  test.each(['', '  ', '/app', 'https://', 'https://[broken', 'example.com:99999', 'not a host', 'ftp://example.com', 'ftp:example.com', 'file:///app', 'mailto:test@example.com', 'data:text/plain,hello'])('rejects %j', input => {
    expect(() => getPwaId(input)).toThrow(TypeError)
  })
  test('rejects a URL object with an unsupported scheme', () => {
    expect(() => getPwaId(new URL('file:///app'))).toThrow(TypeError)
  })
  test.each([undefined, null, 123, {}, true])('rejects non-URL input %j', input => {
    expect(() => getPwaId(input as string)).toThrow(TypeError)
  })
})
describe('manifest resolution', () => {
  test.each(['app', '/app', './app', 'https://example.com/app', '//example.com/app', '/app#section'])('resolves id %j against the origin, not the start path', id => {
    expect(getPwaId('example.com/nested/document', {
      id,
      start_url: '/other/start.html',
    })).toBe('kjjibnhbmhbfpepapmpinclgfdpahbil')
  })
  test('uses only the origin as the id base, without credentials', () => {
    expect(getPwaId('https://user:pass@example.com/nested', {id: '/app'})).toBe('kjjibnhbmhbfpepapmpinclgfdpahbil')
  })
  test('can resolve id even when a same-origin start_url is not hierarchical', () => {
    expect(getPwaId('example.com', {
      id: '/app',
      start_url: 'blob:https://example.com/uuid',
    })).toBe('kjjibnhbmhbfpepapmpinclgfdpahbil')
  })
  test('uses start_url when id is absent', () => {
    expect(getPwaId('example.com', {start_url: '/app#section'})).toBe('kjjibnhbmhbfpepapmpinclgfdpahbil')
  })
  test('resolves relative start_url against the supplied URL', () => {
    expect(getPwaId('example.com/nested/document', {start_url: '../app'})).toBe('kjjibnhbmhbfpepapmpinclgfdpahbil')
    expect(getPwaId('example.com/nested/document', {start_url: 'app'})).toBe(getPwaId('example.com/nested/app'))
  })
  test('does not normalize a bare hostname in a manifest member', () => {
    expect(getPwaId('example.com', {start_url: 'other.example'})).toBe(getPwaId('example.com/other.example'))
    expect(getPwaId('example.com', {id: 'other.example'})).toBe(getPwaId('example.com/other.example'))
  })
  test.each(['', 'https://other.example/app', '//other.example/app', 'http://example.com/app', 'https://example.com:8443/app', 'https://[broken', 'data:text/plain,hello'])('falls back for unusable id %j', id => {
    expect(getPwaId('example.com', {
      id,
      start_url: '/app',
    })).toBe('kjjibnhbmhbfpepapmpinclgfdpahbil')
  })
  test.each(['https://other.example/app', '//other.example/app', 'http://example.com/app', 'https://example.com:8443/app', 'https://[broken', 'javascript:alert(1)'])('falls back for unusable start_url %j', startUrl => {
    expect(getPwaId('example.com/app', {start_url: startUrl})).toBe('kjjibnhbmhbfpepapmpinclgfdpahbil')
  })
  test('can still use id after rejecting start_url', () => {
    expect(getPwaId('example.com', {
      id: '/app',
      start_url: 'https://other.example/',
    })).toBe('kjjibnhbmhbfpepapmpinclgfdpahbil')
  })
  test.each([{value: null}, {value: 1}, {value: false}, {value: []}, {value: {}}])('ignores non-string manifest values %j', ({value}) => {
    const manifest = {
      id: value,
      start_url: value,
    } as unknown as PwaManifest
    expect(getPwaId('example.com/app', manifest)).toBe('kjjibnhbmhbfpepapmpinclgfdpahbil')
  })
  test('retains queries and strips fragments in the effective ID', () => {
    expect(getPwaId('example.com', {id: '/app?x=1#section'})).toBe(getPwaId('example.com/app?x=1'))
    expect(getPwaId('example.com', {start_url: '/app?x=1#section'})).toBe(getPwaId('example.com/app?x=1'))
  })
  test('treats a whitespace-only id as a relative URL, not as an empty id', () => {
    expect(getPwaId('example.com/app', {id: ' '})).toBe('ocjeedicdelkkoefdcgeopgiagdjbcng')
  })
  test('allows unrelated members and does not mutate the manifest', () => {
    const manifest = Object.freeze({
      id: '/app#section',
      start_url: '/elsewhere',
      name: 'My app',
      scope: '/',
    })
    expect(getPwaId('example.com', manifest)).toBe('kjjibnhbmhbfpepapmpinclgfdpahbil')
    expect(manifest.id).toBe('/app#section')
    expect(getPwaId('example.com/app', {})).toBe('kjjibnhbmhbfpepapmpinclgfdpahbil')
  })
  test('accepts external manifest interfaces and inline extra members', () => {
    interface ExternalManifest {
      id?: string
      name: string
      start_url?: string
    }
    const manifest: ExternalManifest = {
      id: '/app',
      name: 'My app',
    }
    expect(getPwaId('example.com', manifest)).toBe('kjjibnhbmhbfpepapmpinclgfdpahbil')
    expect(getPwaId('example.com', {
      id: '/app',
      name: 'My app',
    })).toBe('kjjibnhbmhbfpepapmpinclgfdpahbil')
    expect(getPwaId('example.com', {name: 'My app'})).toBe('ocjeedicdelkkoefdcgeopgiagdjbcng')
  })
  test('returns a 32-character ID in the extension alphabet', () => {
    expect(getPwaId('example.com')).toMatch(/^[a-p]{32}$/u)
  })
})
