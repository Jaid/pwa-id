import {expect, test} from 'bun:test'

import getPwaId from '#src/main.ts'

test('should compute the standard PWA ID for a bare hostname', () => {
  expect(getPwaId('pro.x.com')).toBe('alfckbjcdinlldfagnmeabfnenmajchc')
})

test('should normalize a URL and ignore trailing slashes', () => {
  expect(getPwaId('slop.gallery')).toBe('jinebmjifepcaalpaokcfopcpkdfolnk')
  expect(getPwaId('https://slop.gallery')).toBe('jinebmjifepcaalpaokcfopcpkdfolnk')
  expect(getPwaId('https://slop.gallery/')).toBe('jinebmjifepcaalpaokcfopcpkdfolnk')
  expect(getPwaId('http://slop.gallery')).toBe('fjmddjdfcegneikdobjlpochlfacipfc')
  expect(getPwaId('http://slop.gallery/')).toBe('fjmddjdfcegneikdobjlpochlfacipfc')
})

test('should support manifest id overrides and relative paths', () => {
  expect(getPwaId('example.com/app')).toBe('kjjibnhbmhbfpepapmpinclgfdpahbil')
  expect(getPwaId('example.com', {id: 'app'})).toBe('kjjibnhbmhbfpepapmpinclgfdpahbil')
  expect(getPwaId('example.com', {id: '/app', start_url: '/app/index.html'})).toBe('kjjibnhbmhbfpepapmpinclgfdpahbil')
})

test('should resolve relative id values against the origin rather than the current page', () => {
  expect(getPwaId('https://example.com/foo/bar', {id: 'app', start_url: '/foo/index.html'})).toBe('kjjibnhbmhbfpepapmpinclgfdpahbil')
})

test('should ignore the default app when id override is present', () => {
  expect(getPwaId('example.com')).toBe('ocjeedicdelkkoefdcgeopgiagdjbcng')
  expect(getPwaId('example.com', {id: '/app', start_url: '/app/index.html'})).toBe('kjjibnhbmhbfpepapmpinclgfdpahbil')
})
