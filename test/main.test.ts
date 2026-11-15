import {describe, expect, test} from 'bun:test'

import getPwaId, {getPwaId as namedGetPwaId} from '#src/main.ts'

describe('getPwaId', () => {
  test('matches pro.x.com example', () => {
    expect(getPwaId('pro.x.com')).toBe('alfckbjcdinlldfagnmeabfnenmajchc')
  })
  test('matches slop.gallery examples with implicit and explicit schemes', () => {
    expect(getPwaId('slop.gallery')).toBe('jinebmjifepcaalpaokcfopcpkdfolnk')
    expect(getPwaId('https://slop.gallery')).toBe('jinebmjifepcaalpaokcfopcpkdfolnk')
    expect(getPwaId('https://slop.gallery/')).toBe('jinebmjifepcaalpaokcfopcpkdfolnk')
    expect(getPwaId('http://slop.gallery')).toBe('fjmddjdfcegneikdobjlpochlfacipfc')
    expect(getPwaId('http://slop.gallery/')).toBe('fjmddjdfcegneikdobjlpochlfacipfc')
  })
  test('matches example.com and manifest id/start_url examples', () => {
    expect(getPwaId('example.com')).toBe('ocjeedicdelkkoefdcgeopgiagdjbcng')
    expect(getPwaId('example.com/app')).toBe('kjjibnhbmhbfpepapmpinclgfdpahbil')
    expect(getPwaId('example.com', {id: 'app'})).toBe('kjjibnhbmhbfpepapmpinclgfdpahbil')
    expect(getPwaId('example.com', {
      id: '/app',
      start_url: '/app/index.html',
    })).toBe('kjjibnhbmhbfpepapmpinclgfdpahbil')
  })
  test('exports both default and named function', () => {
    expect(namedGetPwaId).toBe(getPwaId)
  })
  test('accepts URL instances without mutating them', () => {
    const input = new URL('https://example.com/app#section')
    expect(getPwaId(input)).toBe('kjjibnhbmhbfpepapmpinclgfdpahbil')
    expect(input.hash).toBe('#section')
  })
  test('normalizes uppercase, default ports, protocol-relative URLs and whitespace', () => {
    expect(getPwaId('  HTTPS://EXAMPLE.COM:443  ')).toBe('ocjeedicdelkkoefdcgeopgiagdjbcng')
    expect(getPwaId('//slop.gallery')).toBe('jinebmjifepcaalpaokcfopcpkdfolnk')
    expect(getPwaId('http://slop.gallery:80/')).toBe('fjmddjdfcegneikdobjlpochlfacipfc')
  })
  test('preserves non-default ports', () => {
    expect(getPwaId('localhost:3000')).toBe(getPwaId('https://localhost:3000/'))
    expect(getPwaId('localhost:3000')).not.toBe(getPwaId('http://localhost:3000/'))
    expect(getPwaId('example.com:8443/app')).toBe(getPwaId('https://example.com:8443/app'))
  })
  test('strips fragments but keeps query strings', () => {
    expect(getPwaId('https://example.com/app#hash')).toBe('kjjibnhbmhbfpepapmpinclgfdpahbil')
    expect(getPwaId('https://example.com/app?v=1#hash')).toBe(getPwaId('https://example.com/app?v=1'))
    expect(getPwaId('https://example.com/app?v=1')).not.toBe('kjjibnhbmhbfpepapmpinclgfdpahbil')
    expect(getPwaId('example.com', {
      id: '/app?v=1#section',
      start_url: '/app/index.html',
    })).toBe(getPwaId('https://example.com/app?v=1'))
  })
  test('resolves start_url relative to document URL and id relative to start_url origin', () => {
    expect(getPwaId('example.com', {
      start_url: '/app',
    })).toBe('kjjibnhbmhbfpepapmpinclgfdpahbil')
    expect(getPwaId('example.com/sub/page.html', {
      start_url: 'app.html',
    })).toBe(getPwaId('https://example.com/sub/app.html'))
    expect(getPwaId('example.com/sub/page.html', {
      id: 'app',
      start_url: '/sub/index.html',
    })).toBe('kjjibnhbmhbfpepapmpinclgfdpahbil')
  })
  test('falls back when start_url or id are empty, non-string, invalid or cross-origin', () => {
    expect(getPwaId('example.com', {id: ''})).toBe('ocjeedicdelkkoefdcgeopgiagdjbcng')
    expect(getPwaId('example.com', {id: '   '})).toBe('ocjeedicdelkkoefdcgeopgiagdjbcng')
    expect(getPwaId('example.com', {id: null})).toBe('ocjeedicdelkkoefdcgeopgiagdjbcng')
    expect(getPwaId('example.com', {id: 'https://other.com/app'})).toBe('ocjeedicdelkkoefdcgeopgiagdjbcng')
    expect(getPwaId('example.com', {id: '//other.com/app'})).toBe('ocjeedicdelkkoefdcgeopgiagdjbcng')
    expect(getPwaId('example.com', {id: 'http://[::1'})).toBe('ocjeedicdelkkoefdcgeopgiagdjbcng')
    expect(getPwaId('example.com', {start_url: ''})).toBe('ocjeedicdelkkoefdcgeopgiagdjbcng')
    expect(getPwaId('example.com', {start_url: 'https://other.com/app'})).toBe('ocjeedicdelkkoefdcgeopgiagdjbcng')
    expect(getPwaId('example.com', {start_url: 'http://[::1'})).toBe('ocjeedicdelkkoefdcgeopgiagdjbcng')
    expect(getPwaId('example.com', {
      id: '/app',
      start_url: 'https://other.com/index.html',
    })).toBe('kjjibnhbmhbfpepapmpinclgfdpahbil')
  })
  test('accepts extra web app manifest fields', () => {
    expect(getPwaId('example.com', {
      name: 'Example App',
      short_name: 'App',
      display: 'standalone',
      id: '/app',
      start_url: '/app/index.html',
    })).toBe('kjjibnhbmhbfpepapmpinclgfdpahbil')
  })
  test('throws on empty or invalid URL input', () => {
    expect(() => getPwaId('')).toThrow()
    expect(() => getPwaId('   ')).toThrow()
    expect(() => getPwaId('https://')).toThrow()
  })
})
