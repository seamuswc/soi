const fs = require('fs');
const path = require('path');
const readline = require('readline');

const envPath = path.resolve(__dirname, '.env');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function readEnvFile() {
  if (!fs.existsSync(envPath)) {
    return {};
  }
  const envContent = fs.readFileSync(envPath, 'utf8');
  const envVars = {};
  envContent.split('\n').forEach(line => {
    const trimmedLine = line.trim();
    if (trimmedLine && !trimmedLine.startsWith('#')) {
      const [key, value] = trimmedLine.split('=');
      if (key && value) {
        envVars[key.trim()] = value.trim().replace(/^"|"$/g, ''); // Remove quotes
      }
    }
  });
  return envVars;
}

function writeEnvFile(envVars) {
  const newEnvContent = Object.entries(envVars)
    .map(([key, value]) => `${key}="${value}"`)
    .join('\n');
  fs.writeFileSync(envPath, newEnvContent, 'utf8');
}

async function updateLineAccount() {
  let envVars = readEnvFile();

  console.log('\n📱 Current LINE account:');
  console.log(`  ${envVars.LINE_ACCOUNT || 'Not set'}`);
  console.log('\n');

  rl.question('Enter LINE account (e.g., @username or LINE ID): ', (account) => {
    envVars.LINE_ACCOUNT = account.trim();
    writeEnvFile(envVars);
    console.log('\n✅ LINE account updated successfully!');
    console.log(`New LINE account: ${account.trim()}`);
    rl.close();
  });
}

updateLineAccount();

