const fs = require('fs');
const { execSync } = require('child_process');

// Read the package.json file
const packageJson = fs.readFileSync('package.json');
const packageData = JSON.parse(packageJson);

// Extract dependencies from package.json
const dependencies = packageData.dependencies;

// Install each dependency
for (const [dependency, version] of Object.entries(dependencies)) {
    console.log(`Installing ${dependency}@${version}...`);
    execSync(`npm install ${dependency}@${version}`);
}

console.log('All dependencies installed successfully.');