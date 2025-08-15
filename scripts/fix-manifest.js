#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔧 Running manifest fix script...');

// Paths that might need the manifest file
const manifestPaths = [
  '.next/server/app/(main)/page_client-reference-manifest.js',
  '.next/server/app/page_client-reference-manifest.js',
  '.next/server/app/(main)/_client-reference-manifest.js'
];

// Create proper manifest content with clientModules structure
const manifestContent = `module.exports = {
  clientModules: {},
  ssrModuleMapping: {},
  edgeSSRModuleMapping: {},
  entryCSSFiles: {}
};`;

let created = false;

manifestPaths.forEach(manifestPath => {
  const fullPath = path.join(process.cwd(), manifestPath);
  const dir = path.dirname(fullPath);
  
  try {
    // Create directory if it doesn't exist
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`📁 Created directory: ${dir}`);
    }
    
    // Create manifest file if it doesn't exist
    if (!fs.existsSync(fullPath)) {
      fs.writeFileSync(fullPath, manifestContent);
      console.log(`✅ Created manifest file: ${manifestPath}`);
      created = true;
    } else {
      console.log(`⏭️  Manifest already exists: ${manifestPath}`);
    }
  } catch (error) {
    console.log(`⚠️  Could not create ${manifestPath}:`, error.message);
  }
});

if (!created) {
  console.log('ℹ️  No manifest files needed to be created');
}

console.log('✅ Manifest fix script completed');