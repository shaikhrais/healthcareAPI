const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const manifestFile = path.join(root, 'generated-manifest.json');
const genDir = path.join(root, 'generated-code');

if (!fs.existsSync(manifestFile)) {
  console.error('Manifest not found:', manifestFile);
  process.exit(1);
}

const manifest = JSON.parse(fs.readFileSync(manifestFile, 'utf8'));

let created = 0;
manifest.forEach((m) => {
  const id = m.taskId;
  const backendRel = m.backendPath || `backend/generated-code/${id}.js`;
  const backendFull = path.join(root, backendRel);
  if (!fs.existsSync(backendFull)) {
    // create minimal route file
    const code = `const express = require('express');\nconst router = express.Router();\n\nrouter.get('/${id}', (req, res) => {\n  res.json({ taskId: '${id}', title: ${JSON.stringify(m.title || '')}, description: ${JSON.stringify(m.description || '')} });\n});\n\nmodule.exports = router;\n`;
    fs.mkdirSync(path.dirname(backendFull), { recursive: true });
    fs.writeFileSync(backendFull, code, 'utf8');
    created += 1;
  }
});

console.log('Verification complete. Created missing backend files:', created);
