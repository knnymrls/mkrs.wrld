#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔧 Running manifest fix script...');
console.log('Current working directory:', process.cwd());
console.log('Build environment:', process.env.VERCEL ? 'Vercel' : 'Local');

// Find all directories that might need manifest files
function findAppDirectories() {
  const dirs = [];
  const baseDir = path.join(process.cwd(), '.next/server/app');
  
  if (fs.existsSync(baseDir)) {
    // Get all subdirectories
    const items = fs.readdirSync(baseDir, { withFileTypes: true });
    items.forEach(item => {
      if (item.isDirectory() && item.name.startsWith('(')) {
        dirs.push(path.join(baseDir, item.name));
      }
    });
    dirs.push(baseDir); // Also include the base app directory
  }
  
  return dirs;
}

// Create proper manifest content for Next.js 15
// This creates a minimal but valid manifest structure
const manifestContent = `globalThis.__RSC_MANIFEST=(globalThis.__RSC_MANIFEST||{});globalThis.__RSC_MANIFEST["/page"]={"moduleLoading":{"prefix":"/_next/"},"ssrModuleMapping":{},"edgeSSRModuleMapping":{},"clientModules":{},"entryCSSFiles":{},"rscModuleMapping":{},"edgeRscModuleMapping":{}};`;

let created = false;

// Find all app directories
const appDirs = findAppDirectories();
console.log('Found app directories:', appDirs);

// Create manifest files in each directory
appDirs.forEach(dir => {
  const manifestFiles = [
    'page_client-reference-manifest.js',
    '_client-reference-manifest.js'
  ];
  
  manifestFiles.forEach(filename => {
    const fullPath = path.join(dir, filename);
    
    try {
      if (!fs.existsSync(fullPath)) {
        fs.writeFileSync(fullPath, manifestContent);
        console.log(`✅ Created manifest file: ${fullPath}`);
        created = true;
      } else {
        console.log(`⏭️  Manifest already exists: ${fullPath}`);
      }
    } catch (error) {
      console.log(`⚠️  Could not create ${fullPath}:`, error.message);
    }
  });
});

// Also check for specific paths that might be needed
const specificPaths = [
  '.next/server/app/(main)/page_client-reference-manifest.js',
  '.next/server/app/page_client-reference-manifest.js'
];

specificPaths.forEach(manifestPath => {
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
    }
  } catch (error) {
    console.log(`⚠️  Could not create ${manifestPath}:`, error.message);
  }
});

if (!created) {
  console.log('ℹ️  No manifest files needed to be created');
}

// List the contents of .next/server/app for debugging
try {
  console.log('\n📂 Contents of .next/server/app:');
  execSync('ls -la .next/server/app/', { stdio: 'inherit' });
  if (fs.existsSync('.next/server/app/(main)')) {
    console.log('\n📂 Contents of .next/server/app/(main):');
    execSync('ls -la .next/server/app/\(main\)/', { stdio: 'inherit' });
  }
} catch (error) {
  console.log('Could not list directory contents');
}

console.log('✅ Manifest fix script completed');