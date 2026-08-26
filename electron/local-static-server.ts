import fs from 'node:fs'
import http from 'node:http'
import path from 'node:path'

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.wasm': 'application/wasm',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
}

function mimeFor(filePath: string) {
  return MIME[path.extname(filePath).toLowerCase()] || 'application/octet-stream'
}

function safeJoin(base: string, rel: string) {
  const normalized = path.normalize(path.join(base, rel))
  const root = path.normalize(base)
  if (!normalized.startsWith(root)) return null
  return normalized
}

export type LocalStaticServer = {
  origin: string
  close: () => Promise<void>
}

/** 安装版通过 127.0.0.1 提供 dist 与 foxit-lib，避免 file:// / 自定义协议在 Worker 中不可用 */
export async function startLocalStaticServer(options: {
  distDir: string
  foxitLibDir: string
}): Promise<LocalStaticServer> {
  const { distDir, foxitLibDir } = options

  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      try {
        const url = new URL(req.url || '/', 'http://127.0.0.1')
        let pathname = decodeURIComponent(url.pathname)
        if (pathname === '/') pathname = '/index.html'

        let filePath: string | null
        if (pathname.startsWith('/foxit-lib/') || pathname === '/foxit-lib') {
          const rel = pathname.replace(/^\/foxit-lib\/?/, '')
          filePath = safeJoin(foxitLibDir, rel || 'index.html')
        } else {
          filePath = safeJoin(distDir, pathname.replace(/^\/+/, ''))
        }

        if (!filePath || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
          res.writeHead(404)
          res.end()
          return
        }

        res.writeHead(200, {
          'Content-Type': mimeFor(filePath),
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'no-cache',
        })
        fs.createReadStream(filePath).pipe(res)
      } catch {
        res.writeHead(500)
        res.end()
      }
    })

    server.listen(0, '127.0.0.1', () => {
      const addr = server.address()
      const port = typeof addr === 'object' && addr ? addr.port : 0
      if (!port) {
        reject(new Error('本地静态服务未能绑定端口'))
        return
      }
      resolve({
        origin: `http://127.0.0.1:${port}`,
        close: () =>
          new Promise((res, rej) => {
            server.close((err) => (err ? rej(err) : res()))
          }),
      })
    })
    server.on('error', reject)
  })
}
