const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const manifestIn = path.join(root, 'generated-manifest.json');
const annotatedOut = path.join(root, 'generated-manifest-annotated.json');
const frontendCopy = path.join(root, '..', 'src', 'generated_from_desc', 'generated-manifest.json');

function existsRel(relPath) {
  if (!relPath) return false;
  const full = path.join(root, relPath);
  try {
    return fs.existsSync(full);
  } catch (e) {
    return false;
  }
}

if (!fs.existsSync(manifestIn)) {
  console.error('Missing manifest:', manifestIn);
  process.exit(1);
}

const raw = fs.readFileSync(manifestIn, 'utf8');
const manifest = JSON.parse(raw);

const annotated = manifest.map((m) => {
  const backendExists = existsRel(m.backendPath);
  const testExists = existsRel(m.testPath);
  // frontendPath in manifest is relative to src/generated_from_desc, but from backend root it is '../' path
  const frontendRel = path.join('..', m.frontendPath);
  const frontendExists = fs.existsSync(
    path.join(root, '..', m.frontendPath.replace(/^src[\\/]/, ''))
  );
  const performed = backendExists && testExists && frontendExists;
  return { ...m, backendExists, testExists, frontendExists, performed };
});

fs.writeFileSync(annotatedOut, JSON.stringify(annotated, null, 2), 'utf8');
try {
  // ensure frontend folder exists
  const frontendDir = path.dirname(frontendCopy);
  fs.mkdirSync(frontendDir, { recursive: true });
  fs.writeFileSync(frontendCopy, JSON.stringify(annotated, null, 2), 'utf8');
  console.log('Wrote annotated manifest and copied to frontend:', annotatedOut, frontendCopy);
} catch (e) {
  console.error('Failed to copy to frontend:', e);
}
