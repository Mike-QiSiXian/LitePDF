import { app } from 'electron'
import path from 'node:path'

export function getFoxitLibDir() {
  if (!app.isPackaged) {
    return path.join(app.getAppPath(), 'public', 'foxit-lib')
  }
  return path.join(process.resourcesPath, 'foxit-lib')
}

export function getUserDataFile(name: string) {
  return path.join(app.getPath('userData'), name)
}
