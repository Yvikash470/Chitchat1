const fs = require('node:fs');
const path = require('node:path');
const parser = require('@babel/parser');

const root = path.resolve(__dirname, '..');
const failures = [];
const pass = (message) => console.log(`PASS ${message}`);
const fail = (message) => failures.push(message);

function readJson(relativePath) {
  try {
    return JSON.parse(fs.readFileSync(path.join(root, relativePath), 'utf8'));
  } catch (error) {
    fail(`${relativePath} is missing or invalid JSON: ${error.message}`);
    return null;
  }
}

const pkg = readJson('package.json');
const app = readJson('app.json');
const eas = readJson('eas.json');
readJson('firebase.json');

if (pkg) {
  for (const name of ['expo', 'react', 'react-native', 'firebase', '@babel/parser']) {
    const version = pkg.dependencies?.[name] || pkg.devDependencies?.[name];
    if (!version) fail(`Required dependency is missing from package.json: ${name}`);
    else pass(`Dependency declared: ${name}@${version}`);
  }
}

if (app) {
  const expo = app.expo;
  if (!expo?.name || !expo?.slug) fail('app.json must define expo.name and expo.slug');
  const requiredAssets = [expo?.icon, expo?.android?.adaptiveIcon?.foregroundImage];
  for (const asset of requiredAssets) {
    if (typeof asset !== 'string') {
      fail('app.json must define the app icon and Android adaptive foreground image');
      continue;
    }
    const absolute = path.resolve(root, asset);
    if (!absolute.startsWith(root + path.sep) || !fs.existsSync(absolute)) {
      fail(`Configured Expo asset does not exist: ${asset}`);
    } else {
      const bytes = fs.readFileSync(absolute);
      if (bytes.length < 24 || bytes.toString('hex', 0, 8) !== '89504e470d0a1a0a') {
        fail(`Configured asset is not a valid PNG: ${asset}`);
      } else {
        const width = bytes.readUInt32BE(16);
        const height = bytes.readUInt32BE(20);
        if (width < 1 || height < 1) fail(`Invalid image dimensions: ${asset}`);
        else pass(`Expo asset exists and is a PNG (${width}x${height}): ${asset}`);
      }
    }
  }
  if (!expo?.extra?.eas?.projectId) fail('app.json is missing expo.extra.eas.projectId; link the project with EAS before cloud builds');
  else pass(`EAS project ID is configured: ${expo.extra.eas.projectId}`);
}

if (eas && !eas.build?.preview?.android?.buildType) {
  fail('eas.json must configure the preview Android build type as apk');
} else if (eas) {
  pass('EAS preview APK profile is configured');
}

try {
  const source = fs.readFileSync(path.join(root, 'App.js'), 'utf8');
  parser.parse(source, {
    sourceType: 'module',
    plugins: ['jsx', 'optionalChaining', 'nullishCoalescingOperator', 'classProperties'],
  });
  pass('App.js parses successfully (JavaScript/JSX syntax)');
} catch (error) {
  fail(`App.js syntax error: ${error.message}`);
}

for (const relative of ['.github/workflows/android-apk.yml', 'firestore.rules', 'storage.rules']) {
  if (!fs.existsSync(path.join(root, relative))) fail(`Required project file is missing: ${relative}`);
  else pass(`Required file exists: ${relative}`);
}

if (failures.length) {
  console.error('\nProject preflight failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log('\nProject preflight passed. This checks source/configuration only; it does not replace an EAS cloud build or device test.');
