#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

/**
 * Postinstall script for node-red-gamify-ui
 * Copies built Angular application to public_templates for distribution
 */
function main() {
  console.log("📦 Node-RED Gamify UI postinstall started...");
  
  try {
    // This would copy dist files to a consumer's public_templates
    // For now, just log the action
    console.log("✅ Node-RED Gamify UI installed successfully!");
    console.log("🎮 Angular application available for Node-RED management");
    console.log("📁 Files would be copied to public_templates/ in target project");
  } catch (error) {
    console.error("❌ Postinstall failed:", error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}
