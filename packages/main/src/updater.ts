import log, { ElectronLog } from 'electron-log'
import http, { AxiosRequestConfig } from 'axios'
import { gte, gt, valid } from 'semver'
import { app, dialog } from 'electron'
import { finished as StreamFinished } from 'node:stream'
import { promisify } from 'node:util'
import path, { resolve } from 'node:path'
import { createWriteStream, readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import Sudo from 'sudo-prompt'
import { spawn } from 'node:child_process'
const isWin32 = process.platform === 'win32'
const isMacOS = process.platform === 'darwin'
type Options = {
    url: string
}

export interface ServerConfig {
    asar: string
    version: string
    minHotUpdateVersion: string
    log: string
    md5: string
}

export class Updater {
    options: Options
    log: ElectronLog
    config: ServerConfig | null
    constructor(options: Options) {
        this.log = log
        this.log.transports.file.format = `[{y}-{m}-{d} {h}:{i}:{s}.{ms}] [updater:{level}] {text}`
        this.log.transports.console.format = `[{y}-{m}-{d} {h}:{i}:{s}.{ms}] [updater:{level}] {text}`
        this.options = options
        this.config = null
    }
    async checkForUpdates() {
        const currentAppVersion = app.getVersion()
        try {
            const { data: config } = await http.get<ServerConfig>(
                this.options.url,
                {
                    headers: {
                        'cache-control': 'no-store',
                    },
                }
            )
            const { version, minHotUpdateVersion } = config
            if (!valid(version)) {
                throw {
                    message: 'invalid config',
                }
            }
            if (gte(currentAppVersion, version)) {
                return
            }
            if (gt(minHotUpdateVersion, currentAppVersion)) {
                // Todo
                // fullUpdate
                return
            }
            this.config = config
            return config
        } catch (e) {
            this.log.error(e)
        }
    }
    async download(
        onDownloadProgress: AxiosRequestConfig['onDownloadProgress']
    ) {
        if (!this.config) {
            return
        }
        const finished = promisify(StreamFinished)
        try {
            const response = await http.get(this.config.asar, {
                responseType: 'stream',
                onDownloadProgress(progressEvent) {
                    onDownloadProgress && onDownloadProgress(progressEvent)
                },
            })
            const downloads = app.getPath('downloads')
            const filePath = path.resolve(downloads, `app.zip`)
            const writer = createWriteStream(filePath)
            response.data.pipe(writer)
            await finished(writer)
            return filePath
        } catch (e) {
            this.log.error('download error')
            this.log.error(e)
        }
    }
    private async hotUpdateOnWin32(filePath?: string) {
        if (!this.config || !filePath) {
            return
        }
        try {
            const md5 = createHash('md5')
                .update(readFileSync(filePath))
                .digest('hex')
            if (md5 === this.config.md5) {
                Sudo.exec(
                    `"${path.join(process.resourcesPath, 'update.exe')}" "${
                        process.resourcesPath
                    }" "${filePath}" "${app.getName()}.exe" "${app.getPath(
                        'exe'
                    )}"`,
                    (err, stdout) => {
                        if (err) {
                            this.log.error(err)
                            return
                        }
                        this.log.log(stdout)
                    }
                )
                return true
            } else {
                throw {
                    message: '更新文件内容已损坏，请尝试重新下载',
                    code: -1,
                }
            }
        } catch (e) {
            this.log.error(e)
        }
    }
    private async hotUpdateOnMacOS(filePath?: string) {
        if (!this.config || !filePath) {
            return
        }
        try {
            const md5 = createHash('md5')
                .update(readFileSync(filePath))
                .digest('hex')
            if (md5 === this.config.md5) {
                const child = spawn(`mv`, [
                    filePath,
                    resolve(process.resourcesPath, 'app.asar'),
                ])
                child.unref()
                child.on('close', (code) => {
                    this.log.log('child process exit ' + code)
                    dialog.showMessageBox({
                        message: '更新成功',
                    })
                    app.exit(0)
                    app.relaunch()
                })
                child.on('error', (err) => {
                    this.log.error(err)
                })
            } else {
                throw {
                    message: '更新文件内容已损坏，请尝试重新下载',
                    code: -1,
                }
            }
        } catch (e) {
            this.log.error('error ')
            this.log.error(e)
        }
    }
    async hotUpdate(filePath?: string) {
        if (isWin32) {
            return await this.hotUpdateOnWin32(filePath)
        }
        if (isMacOS) {
            return await this.hotUpdateOnMacOS(filePath)
        }
    }
}
