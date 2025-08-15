const fs = require('fs');
const path = require('path');

// Create missing client reference manifest files
function createMissingManifests() {
  const manifestDir = path.join(__dirname, '..', '.next', 'server', 'app', '(main)');
  const manifestFile = path.join(manifestDir, 'page_client-reference-manifest.js');
  
  // Create directory if it doesn't exist
  if (!fs.existsSync(manifestDir)) {
    fs.mkdirSync(manifestDir, { recursive: true });
  }
  
  // Create empty manifest file if it doesn't exist
  if (!fs.existsSync(manifestFile)) {
    fs.writeFileSync(manifestFile, 'module.exports = {};\n');
    console.log('Created missing client reference manifest:', manifestFile);
  }
}

// Only run if .next directory exists (during build)
if (fs.existsSync(path.join(__dirname, '..', '.next'))) {
  createMissingManifests();
}