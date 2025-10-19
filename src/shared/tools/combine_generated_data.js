const fs = require('fs');
const path = require('path');

const GENERATED_DIR = path.resolve(__dirname, '..', 'generated-data');
const OUT_FILE = path.resolve(__dirname, '..', 'generated_all.json');

function main() {
  if (!fs.existsSync(GENERATED_DIR)) {
    console.error('generated-data directory not found:', GENERATED_DIR);
    process.exit(1);
  }

  const files = fs.readdirSync(GENERATED_DIR).filter((f) => f.endsWith('.json'));
  const arr = files
    .map((f) => {
      const content = fs.readFileSync(path.join(GENERATED_DIR, f), 'utf8');
      try {
        return JSON.parse(content);
      } catch (err) {
        console.warn('Skipping invalid JSON', f);
        return null;
      }
    })
    .filter(Boolean);

  fs.writeFileSync(OUT_FILE, JSON.stringify(arr, null, 2), 'utf8');
  console.log('Wrote', OUT_FILE, 'with', arr.length, 'items');
}

if (require.main === module) main();

module.exports = { main };
