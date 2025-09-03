#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔧 Running postinstall script for manifest setup...');

// Create manifest content for Next.js 15
const manifestContent = `globalThis.__RSC_MANIFEST=(globalThis.__RSC_MANIFEST||{});globalThis.__RSC_MANIFEST["/page"]={"moduleLoading":{"prefix":"/_next/"},"ssrModuleMapping":{},"edgeSSRModuleMapping":{},"clientModules":{},"entryCSSFiles":{},"rscModuleMapping":{},"edgeRscModuleMapping":{}};`;

// Ensure directory structure exists
const ensureDir = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    return true;
  }
  return false;
};

// Create a placeholder manifest file that will be replaced during build
const placeholderPath = path.join(process.cwd(), 'scripts', 'manifest-placeholder.js');
fs.writeFileSync(placeholderPath, manifestContent);
console.log('✅ Created manifest placeholder file');

console.log('✅ Postinstall script completed');