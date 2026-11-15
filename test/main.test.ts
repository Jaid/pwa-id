import {expect, test} from 'bun:test'

const {default: pwaId} = await import('#src/main.ts')
test('should run', () => {
  const result = pwaId()
  expect(result).toBe('pwa-id') // TODO Test actual functionality
})
