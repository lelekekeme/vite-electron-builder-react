const crypto = require('crypto')
const fs = require('fs')
const fsPromise = require('fs/promises')
const path = require('path')
const { promisify } = require('util')
/**
 * @type {() => import('electron-builder').Configuration}
 * @see https://www.electron.build/configuration/configuration
 */
module.exports = async function () {
    const { getVersion } = await import('./version/getVersion.mjs')
    return {
        directories: {
            output: 'dist',
            buildResources: 'buildResources',
        },
        extraResources: ['update.exe'],
        files: ['packages/**/dist/**', '!**/LICENSE'],
        extraMetadata: {
            version: getVersion(),
        },
        mac: {
            target: 'dir',
        },
        // 如果使用ia32架构，需要在windows上打包应用，需要注意electron要使用32位版本
        // pnpm add --config.arch=ia32  electron -D
        // https://github.com/bytenode/bytenode/issues/98#issuecomment-758606113
        win: {
            target: {
                target: 'nsis',
                arch: ['ia32'],
            },
            requestedExecutionLevel: 'requireAdministrator',
        },

        nsis: {
            oneClick: false,
            perMachine: true,
            installerLanguages: 'zh_CN',
            allowToChangeInstallationDirectory: true,
        },

        async afterPack(context) {
            const name =
                process.env.npm_package_productName ||
                process.env.npm_package_name
            let dir = context.appOutDir
            const platform = context.electronPlatformName
            if (platform === 'darwin') {
                dir = path.resolve(
                    dir,
                    `${name}.app`,
                    'Contents',
                    'Resources',
                    'app.asar'
                )
            }
            if (platform === 'win32') {
                dir = path.resolve(dir, 'resources', 'app.asar')
            }
            const md5 = crypto
                .createHash('md5')
                .update(fs.readFileSync(dir))
                .digest('hex')
            await fsPromise.writeFile(
                path.resolve(context.outDir, 'update-md5.txt'),
                md5
            )
            await fsPromise.cp(dir, path.resolve(context.outDir, 'app.asar'), {
                force: true,
            })
        },
    }
}
