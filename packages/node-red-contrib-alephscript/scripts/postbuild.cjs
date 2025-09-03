#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

function copyHtmlFiles() {
  const srcDir = path.join(__dirname, "..", "src", "nodes");
  const distDir = path.join(__dirname, "..", "dist", "nodes");

  console.log("🔧 Copying HTML files for Node-RED nodes...");

  // Ensure dist/nodes directory exists
  if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir, { recursive: true });
    console.log("📁 Created directory:", distDir);
  }

  // Find all HTML files in src/nodes
  const htmlFiles = fs.readdirSync(srcDir).filter(file => file.endsWith('.html'));

  if (htmlFiles.length === 0) {
    console.log("⚠️  No HTML files found in", srcDir);
    return;
  }

  // Copy each HTML file
  htmlFiles.forEach(file => {
    const srcFile = path.join(srcDir, file);
    const distFile = path.join(distDir, file);
    
    try {
      fs.copyFileSync(srcFile, distFile);
      console.log("✅ Copied:", file);
    } catch (error) {
      console.error("❌ Error copying", file, ":", error.message);
      process.exit(1);
    }
  });

  console.log(`🎉 Successfully copied ${htmlFiles.length} HTML files to dist/nodes/`);
}

function main() {
  console.log("🚀 Node-RED AlephScript SDK - PostBuild HTML Copy");
  copyHtmlFiles();
  console.log("✨ Build process completed!");
}

if (require.main === module) {
  main();
}

module.exports = { copyHtmlFiles };
