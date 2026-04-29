#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

function copyHtmlFiles() {
  const srcDir = path.join(__dirname, "..", "src", "nodes");
  const distDir = path.join(__dirname, "..", "dist", "nodes");

  console.log("🔧 Copying HTML files for Escribiente nodes...");

  if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir, { recursive: true });
    console.log("📁 Created directory:", distDir);
  }

  const htmlFiles = fs.readdirSync(srcDir).filter((file) => file.endsWith(".html"));

  if (htmlFiles.length === 0) {
    console.log("⚠️ No HTML files found in", srcDir);
    return;
  }

  htmlFiles.forEach((file) => {
    const srcFile = path.join(srcDir, file);
    const distFile = path.join(distDir, file);
    fs.copyFileSync(srcFile, distFile);
    console.log("✅ Copied:", file);
  });

  console.log(`🎉 Successfully copied ${htmlFiles.length} HTML files to dist/nodes/`);
}

function main() {
  console.log("🚀 AlephScript Escribiente - PostBuild HTML Copy");
  copyHtmlFiles();
  console.log("✨ Build process completed!");
}

if (require.main === module) {
  main();
}

module.exports = { copyHtmlFiles };
