import {expect, test} from 'bun:test'
import {createHash} from 'node:crypto'

const {sha256} = await import('#src/sha256.ts')
const toHex = (bytes: Uint8Array) => bytes.toHex()
test('matches the SHA-256 test vectors from FIPS 180-4', () => {
  const textEncoder = new TextEncoder
  expect(toHex(sha256(textEncoder.encode('')))).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855')
  expect(toHex(sha256(textEncoder.encode('abc')))).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad')
  expect(toHex(sha256(textEncoder.encode('abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq')))).toBe('248d6a61d20638b8e5c026930c3e6039a33ce45964ff2167f6ecedd419db06c1')
})
test('matches node:crypto around every padding and block boundary', () => {
  let state = 0x12_34_56_78
  const nextByte = () => {
    state = Math.imul(state, 1_103_515_245) + 12_345 >>> 0
    return state >>> 24
  }
  for (const length of [0, 1, 2, 3, 31, 32, 55, 56, 57, 63, 64, 65, 119, 120, 127, 128, 129, 255, 256, 1000, 4097]) {
    const data = Uint8Array.from({length}, nextByte)
    const copy = new Uint8Array(data)
    expect(toHex(sha256(data))).toBe(createHash('sha256').update(data).digest('hex'))
    expect(data).toEqual(copy)
  }
})
