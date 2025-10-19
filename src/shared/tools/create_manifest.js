const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const inputFile = path.join(root, 'generated_all.json');
const outJson = path.join(root, 'generated-manifest.json');
const outCsv = path.join(root, 'generated-manifest.csv');

function safeId(t) {
  return t.taskId || t._id || String(t._id);
}

const raw = fs.readFileSync(inputFile, 'utf8');
let tasks = [];
try {
  tasks = JSON.parse(raw);
} catch (e) {
  console.error('Failed to parse generated_all.json', e);
  process.exit(2);
}

const manifest = tasks.map((t) => {
  const id = safeId(t);
  return {
    taskId: id,
    title: t.title || '',
    moduleId: t.moduleId || '',
    moduleName: t.moduleName || '',
    status: t.status || '',
    storyPoints: t.storyPoints == null ? '' : t.storyPoints,
    endpoint: `/api/generated-code/${id}`,
    backendPath: `backend/generated-code/${id}.js`,
    testPath: `backend/tests/generated-code/${id}.test.js`,
    frontendPath: `src/generated_from_desc/${id}.js`,
    tech: t.tech || '',
    tags: Array.isArray(t.tags) ? t.tags.join('|') : t.tags || '',
    acceptanceCriteria: t.acceptanceCriteria || '',
  };
});

fs.writeFileSync(outJson, JSON.stringify(manifest, null, 2), 'utf8');

// CSV
const header = [
  'taskId',
  'title',
  'moduleId',
  'moduleName',
  'status',
  'storyPoints',
  'endpoint',
  'backendPath',
  'testPath',
  'frontendPath',
  'tech',
  'tags',
  'acceptanceCriteria',
];
const escapeCsv = (s) => '"' + String(s || '').replace(/"/g, '""') + '"';
const rows = [header.join(',')].concat(
  manifest.map((m) => header.map((h) => escapeCsv(m[h])).join(','))
);
fs.writeFileSync(outCsv, rows.join('\n'), 'utf8');

console.log('Wrote', outJson, 'and', outCsv);
