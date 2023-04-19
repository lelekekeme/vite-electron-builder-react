const v8 = require('v8')
const bytenode = require('bytenode')
const fs = require('fs')
const path = require('path')
const { app } = require('electron')
v8.setFlagsFromString('--no-lazy')
const distPaths = ['../packages/main/dist/']
let extNew = '.jsc'

function initByteCode() {
    for (const disPath of distPaths) {
        const rootPath = path.join(__dirname, disPath)
        const filenames = fs.readdirSync(rootPath)
        filenames.forEach((filename) => {
            let ext = path.extname(filename)
            let base = path.basename(filename, ext)
            if (ext === '.js' || ext === '.cjs') {
                let filePath = path.join(rootPath, filename)
                let fileNameOut = base + extNew
                let filePathOut = path.join(rootPath, fileNameOut)
                bytenode.compileFile({
                    filename: filePath,
                    output: filePathOut,
                    compileAsModule: true,
                })
                fs.writeFileSync(
                    filePath,
                    `
                const bytenode = require('bytenode');
                require('./${fileNameOut}');
                `
                )
                let fileNameLoader = base + '.loader.js'
                let filePathLoader = path.join(rootPath, fileNameLoader)
                if (fs.existsSync(filePathLoader)) {
                    fs.unlinkSync(filePathLoader)
                }
            }
        })
    }
}

initByteCode()
app.quit()
