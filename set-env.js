const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables from .env file
dotenv.config();

const targetDir = path.join(__dirname, 'src', 'environments');
const targetPath = path.join(targetDir, 'environment.ts');
const targetDevPath = path.join(targetDir, 'environment.development.ts');

// Ensure environments directory exists
if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

// Read API URL from .env or fallback to production backend
const apiUrl = process.env.NG_APP_API_URL || 'https://stockeasybackend.vercel.app/api';

// Template for environment configuration
const envConfigFile = `export const environment = {
    apiUrl: '${apiUrl}',
};
`;

console.log(`🚀 Generating environment configuration files...`);
console.log(`🔗 API URL: ${apiUrl}`);

try {
  fs.writeFileSync(targetPath, envConfigFile);
  console.log(`✅ Generated: ${targetPath}`);

  fs.writeFileSync(targetDevPath, envConfigFile);
  console.log(`✅ Generated: ${targetDevPath}`);
} catch (err) {
  console.error(`❌ Failed to write environment files:`, err.message);
  process.exit(1);
}
