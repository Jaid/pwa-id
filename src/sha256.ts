const roundConstants = new Uint32Array([
  0x42_8A_2F_98,
  0x71_37_44_91,
  0xB5_C0_FB_CF,
  0xE9_B5_DB_A5,
  0x39_56_C2_5B,
  0x59_F1_11_F1,
  0x92_3F_82_A4,
  0xAB_1C_5E_D5,
  0xD8_07_AA_98,
  0x12_83_5B_01,
  0x24_31_85_BE,
  0x55_0C_7D_C3,
  0x72_BE_5D_74,
  0x80_DE_B1_FE,
  0x9B_DC_06_A7,
  0xC1_9B_F1_74,
  0xE4_9B_69_C1,
  0xEF_BE_47_86,
  0x0F_C1_9D_C6,
  0x24_0C_A1_CC,
  0x2D_E9_2C_6F,
  0x4A_74_84_AA,
  0x5C_B0_A9_DC,
  0x76_F9_88_DA,
  0x98_3E_51_52,
  0xA8_31_C6_6D,
  0xB0_03_27_C8,
  0xBF_59_7F_C7,
  0xC6_E0_0B_F3,
  0xD5_A7_91_47,
  0x06_CA_63_51,
  0x14_29_29_67,
  0x27_B7_0A_85,
  0x2E_1B_21_38,
  0x4D_2C_6D_FC,
  0x53_38_0D_13,
  0x65_0A_73_54,
  0x76_6A_0A_BB,
  0x81_C2_C9_2E,
  0x92_72_2C_85,
  0xA2_BF_E8_A1,
  0xA8_1A_66_4B,
  0xC2_4B_8B_70,
  0xC7_6C_51_A3,
  0xD1_92_E8_19,
  0xD6_99_06_24,
  0xF4_0E_35_85,
  0x10_6A_A0_70,
  0x19_A4_C1_16,
  0x1E_37_6C_08,
  0x27_48_77_4C,
  0x34_B0_BC_B5,
  0x39_1C_0C_B3,
  0x4E_D8_AA_4A,
  0x5B_9C_CA_4F,
  0x68_2E_6F_F3,
  0x74_8F_82_EE,
  0x78_A5_63_6F,
  0x84_C8_78_14,
  0x8C_C7_02_08,
  0x90_BE_FF_FA,
  0xA4_50_6C_EB,
  0xBE_F9_A3_F7,
  0xC6_71_78_F2,
])
const rotateRight = (value: number, bits: number) => value >>> bits | value << 32 - bits

// SHA-256 (FIPS 180-4) over raw bytes. Implemented in pure TypeScript so that
// callers get a synchronous result in browsers, Bun, Node.js and other
// standards-based runtimes alike, where the only built-in Web Crypto digest
// operation is asynchronous.
export const sha256 = (data: Uint8Array): Uint8Array => {
  const paddedLength = Math.ceil((data.length + 9) / 64) * 64
  const padded = new Uint8Array(paddedLength)
  padded.set(data)
  padded[data.length] = 0x80
  const paddedView = new DataView(padded.buffer)
  paddedView.setBigUint64(paddedLength - 8, BigInt(data.length) * 8n)
  let h0 = 0x6A_09_E6_67
  let h1 = 0xBB_67_AE_85
  let h2 = 0x3C_6E_F3_72
  let h3 = 0xA5_4F_F5_3A
  let h4 = 0x51_0E_52_7F
  let h5 = 0x9B_05_68_8C
  let h6 = 0x1F_83_D9_AB
  let h7 = 0x5B_E0_CD_19
  const words = new Uint32Array(64)
  for (let offset = 0; offset < paddedLength; offset += 64) {
    for (let index = 0; index < 16; index++) {
      words[index] = paddedView.getUint32(offset + index * 4)
    }
    for (let index = 16; index < 64; index++) {
      const word15 = words[index - 15]
      const word2 = words[index - 2]
      const s0 = rotateRight(word15, 7) ^ rotateRight(word15, 18) ^ word15 >>> 3
      const s1 = rotateRight(word2, 17) ^ rotateRight(word2, 19) ^ word2 >>> 10
      words[index] = words[index - 16] + s0 + words[index - 7] + s1
    }
    let a = h0
    let b = h1
    let c = h2
    let d = h3
    let e = h4
    let f = h5
    let g = h6
    let h = h7
    for (let index = 0; index < 64; index++) {
      const s1 = rotateRight(e, 6) ^ rotateRight(e, 11) ^ rotateRight(e, 25)
      const ch = e & f ^ ~e & g
      const temp1 = h + s1 + ch + roundConstants[index] + words[index] >>> 0
      const s0 = rotateRight(a, 2) ^ rotateRight(a, 13) ^ rotateRight(a, 22)
      const maj = a & b ^ a & c ^ b & c
      const temp2 = s0 + maj >>> 0
      h = g
      g = f
      f = e
      e = d + temp1 >>> 0
      d = c
      c = b
      b = a
      a = temp1 + temp2 >>> 0
    }
    h0 = h0 + a >>> 0
    h1 = h1 + b >>> 0
    h2 = h2 + c >>> 0
    h3 = h3 + d >>> 0
    h4 = h4 + e >>> 0
    h5 = h5 + f >>> 0
    h6 = h6 + g >>> 0
    h7 = h7 + h >>> 0
  }
  const digest = new Uint8Array(32)
  const digestView = new DataView(digest.buffer)
  const state = [h0, h1, h2, h3, h4, h5, h6, h7]
  for (const [index, word] of state.entries()) {
    digestView.setUint32(index * 4, word)
  }
  return digest
}
