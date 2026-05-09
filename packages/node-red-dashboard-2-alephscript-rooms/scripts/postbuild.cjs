#!/usr/bin/env node

const fs = require('fs')
const path = require('path')

function copyHtmlFiles () {
  const srcDir = path.join(__dirname, '..', 'src', 'nodes')
  const distDir = path.join(__dirname, '..', 'dist', 'nodes')

  console.log('🔧 Copying HTML files for Rooms nodes...')

  if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir, { recursive: true })
  }

  const htmlFiles = fs.readdirSync(srcDir).filter((file) => file.endsWith('.html'))
  htmlFiles.forEach((file) => {
    fs.copyFileSync(path.join(srcDir, file), path.join(distDir, file))
    console.log(`✅ Copied: ${file}`)
  })
}

if (require.main === module) {
  copyHtmlFiles()
}

module.exports = { copyHtmlFiles }