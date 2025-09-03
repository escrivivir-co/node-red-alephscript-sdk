const fs = require('fs');
const path = require('path');

// Ensure dist/nodes directory exists
const distNodesDir = path.join(__dirname, 'dist', 'nodes');
if (!fs.existsSync(distNodesDir)) {
  fs.mkdirSync(distNodesDir, { recursive: true });
}

// Copy HTML files from src/nodes to dist/nodes
const srcNodesDir = path.join(__dirname, 'src', 'nodes');
const htmlFiles = fs.readdirSync(srcNodesDir).filter(file => file.endsWith('.html'));

htmlFiles.forEach(file => {
  const srcPath = path.join(srcNodesDir, file);
  const destPath = path.join(distNodesDir, file);
  fs.copyFileSync(srcPath, destPath);
  console.log(`Copied ${file} to dist/nodes/`);
});

console.log(`✅ Copied ${htmlFiles.length} HTML files to dist/nodes/`);
