const fs = require('fs');
const { execSync } = require('child_process');

// Read the dependencies from the text file
const data = fs.readFileSync('dependencies.txt', 'utf8');
const dependencies = JSON.parse(data).dependencies;

// Install each dependency
for (const [dependency, version] of Object.entries(dependencies)) {
    console.log(`Installing ${dependency}@${version}...`);
    execSync(`npm install ${dependency}@${version}`);
}