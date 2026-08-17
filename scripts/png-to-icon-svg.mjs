import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const dir = path.resolve(__dirname, '../src/foxit/assets/icons')

function pngToSvg(pngPath, svgPath) {
  const buf = fs.readFileSync(pngPath)
  let off = 8
  let w = 0
  let h = 0
  const idats = []
  while (off < buf.length) {
    const len = buf.readUInt32BE(off)
    const type = buf.toString('ascii', off + 4, off + 8)
    const data = buf.subarray(off + 8, off + 8 + len)
    if (type === 'IHDR') {
      w = data.readUInt32BE(0)
      h = data.readUInt32BE(4)
    }
    if (type === 'IDAT') idats.push(data)
    if (type === 'IEND') break
    off += 12 + len
  }

  const raw = zlib.inflateSync(Buffer.concat(idats))
  const bpp = 4
  const stride = w * bpp + 1
  const rects = []
  for (let y = 0; y < h; y++) {
    const row = raw.subarray(y * stride + 1, (y + 1) * stride)
    let x = 0
    while (x < w) {
      const i = x * bpp
      const on = row[i + 3] >= 128 && row[i] < 180
      if (!on) {
        x++
        continue
      }
      let x2 = x + 1
      while (x2 < w) {
        const j = x2 * bpp
        if (!(row[j + 3] >= 128 && row[j] < 180)) break
        x2++
      }
      rects.push(`<rect x="${x}" y="${y}" width="${x2 - x}" height="1"/>`)
      x = x2
    }
  }

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 ${w} ${h}" fill="#333">
${rects.join('\n')}
</svg>
`
  fs.writeFileSync(svgPath, svg)
  console.log(path.basename(svgPath), 'rects=', rects.length)
}

pngToSvg(path.join(dir, 'sidebar-expand.png'), path.join(dir, 'sidebar-expand.svg'))
pngToSvg(path.join(dir, 'sidebar-collapse.png'), path.join(dir, 'sidebar-collapse.svg'))
