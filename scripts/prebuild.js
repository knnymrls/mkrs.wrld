#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔧 Running prebuild script...');

// Ensure .next directory exists before build
const nextDir = path.join(process.cwd(), '.next');
if (!fs.existsSync(nextDir)) {
  fs.mkdirSync(nextDir, { recursive: true });
  console.log('📁 Created .next directory');
}

// Clean any old build artifacts that might cause issues
const artifactsToClean = [
  '.next/server/app/(main)/page_client-reference-manifest.js',
  '.next/server/app/page_client-reference-manifest.js',
  '.next/server/app/(main)/_client-reference-manifest.js'
];

artifactsToClean.forEach(artifact => {
  const fullPath = path.join(process.cwd(), artifact);
  if (fs.existsSync(fullPath)) {
    try {
      fs.unlinkSync(fullPath);
      console.log(`🗑️  Cleaned old artifact: ${artifact}`);
    } catch (error) {
      console.log(`⚠️  Could not clean ${artifact}:`, error.message);
    }
  }
});

console.log('✅ Prebuild script completed');