const fs = require('fs');
const path = require('path');

const genDir = path.join(__dirname, '..', 'generated-code');
const files = fs.existsSync(genDir) ? fs.readdirSync(genDir).filter((f) => f.endsWith('.js')) : [];
let failed = 0;
files.forEach((f) => {
  const full = path.join(genDir, f);
  try {
    require(full);
  } catch (e) {
    console.error('Failed to require', f, e && e.message);
    failed += 1;
  }
});
console.log('Loaded', files.length, 'files. Failed:', failed);
