const fs = require('fs');
const path = require('path');

const backendRoot = path.join(__dirname, '..');
const frontendRoot = path.join(__dirname, '..', '..', 'expo-jane');
const tasksFile = path.join(backendRoot, 'generated_all.json');

const backendOut = path.join(backendRoot, 'generated-code');
const backendTestOut = path.join(backendRoot, 'tests', 'generated-code');
// place frontend files in the existing generated_from_desc directory so the app can reuse them
const frontendOut = path.join(frontendRoot, 'src', 'generated_from_desc');

// CLI options: --all to generate for every task, --force to overwrite existing files
const argv = process.argv.slice(2);
const optAll = argv.includes('--all');
const optForce = argv.includes('--force');

if (!fs.existsSync(tasksFile)) {
  console.error('tasks file missing:', tasksFile);
  process.exit(2);
}
const tasks = JSON.parse(fs.readFileSync(tasksFile, 'utf8'));

function ensureDir(p) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}
ensureDir(backendOut);
ensureDir(backendTestOut);
ensureDir(frontendOut);

function sanitizeId(id) {
  return String(id).replace(/[^a-zA-Z0-9_.-]/g, '');
}

const uiKeywords = ['component', 'page', 'screen', 'ui', 'view', 'preview', 'form', 'dashboard'];

const created = [];

for (const t of tasks) {
  const id = sanitizeId(t.taskId || t._id);
  const title = t.title || '';
  const desc = t.description || '';
  const tags = Array.isArray(t.tags) ? t.tags.join(' ') : '';
  const combined = (title + ' ' + desc + ' ' + tags).toLowerCase();
  const needsUi = uiKeywords.some((k) => combined.includes(k));
  if (!optAll && !needsUi) continue; // skip unless --all

  // Backend stub
  const backendPath = path.join(backendOut, `${id}.js`);
  const backendCode = `const express = require('express');\nconst router = express.Router();\n\nrouter.get('/${id}', (req, res) => {\n  res.json({ taskId: '${id}', title: ${JSON.stringify(title)}, description: ${JSON.stringify(desc)} });\n});\n\nmodule.exports = router;\n`;
  if (!fs.existsSync(backendPath) || optForce) fs.writeFileSync(backendPath, backendCode, 'utf8');

  // Test
  const testPath = path.join(backendTestOut, `${id}.test.js`);
  const testCode = `const express = require('express');\nconst request = require('supertest');\nconst router = require('../../generated-code/${id}');\n\ndescribe('${id} generated route', ()=>{\n  let app;\n  beforeAll(()=>{ app = express(); app.use('/api/generated-code', router); });\n  test('GET /api/generated-code/${id} returns 200', async ()=>{\n    const res = await request(app).get('/api/generated-code/${id}');\n    expect(res.status).toBe(200);\n    expect(res.body.taskId).toBe('${id}');\n  });\n});\n`;
  if (!fs.existsSync(testPath) || optForce) fs.writeFileSync(testPath, testCode, 'utf8');

  // Frontend component (React Native)
  const frontendPath = path.join(frontendOut, `${id}.js`);
  const componentName = id.replace(/[^a-zA-Z0-9]/g, '_');
  const frontendCode = `import React from 'react';\nimport { View, Text, ScrollView } from 'react-native';\n\nexport const meta = { taskId: '${id}', title: ${JSON.stringify(title)} };\n\nexport default function ${componentName}(){\n  return (\n    <ScrollView style={{flex:1,padding:16}}>\n      <Text style={{fontSize:20,fontWeight:'700'}}>{meta.title}</Text>\n      <Text style={{marginTop:8,color:'#666'}}>Task ID: {meta.taskId}</Text>\n      <Text style={{marginTop:12}}>${JSON.stringify(desc)}</Text>\n    </ScrollView>\n  );\n}\n`;
  if (!fs.existsSync(frontendPath) || optForce)
    fs.writeFileSync(frontendPath, frontendCode, 'utf8');

  created.push({
    taskId: id,
    backendPath,
    testPath,
    frontendPath,
  });
}

console.log('Created items:', created.length);
console.log(created.slice(0, 10));
