/**
 * TODO: Rewrite this config to ESM
 * But currently electron-builder doesn't support ESM configs
 * @see https://github.com/develar/read-config-file/issues/10
 */

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
        win: {
            target: 'nsis',
        },
        nsis: {
            oneClick: false,
            perMachine: true,
            installerLanguages: 'zh_CN',
            allowToChangeInstallationDirectory: true,
        },
    }
}
