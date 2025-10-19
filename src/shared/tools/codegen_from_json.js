const fs = require('fs');
const path = require('path');

const BACKEND_OUT = path.resolve(__dirname, '..', 'generated-code');
const FRONTEND_OUT = path.resolve(__dirname, '..', '..', 'src', 'generated');
const TEST_OUT = path.resolve(__dirname, '..', 'tests', 'generated-code');

function safeMkdir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function sanitizeId(id) {
  return String(id).replace(/[^a-zA-Z0-9-_\.]/g, '_');
}

function writeIfNotExists(filePath, content) {
  if (fs.existsSync(filePath)) {
    console.log('Skipping existing file', filePath);
    return false;
  }
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('Wrote', filePath);
  return true;
}

function generateForTask(task) {
  const id = sanitizeId(task.taskId || task._id || task.title);

  // Backend route stub
  safeMkdir(BACKEND_OUT);
  const backendFile = path.join(BACKEND_OUT, `${id}.js`);
  const backendContent = `const express = require('express');\nconst router = express.Router();\n\n// Generated endpoint for task: ${task.title}\nrouter.get('/${id}', (req, res) => {\n  res.json({ taskId: '${task.taskId || ''}', title: ${JSON.stringify(task.title || '')}, description: ${JSON.stringify(task.description || '')} });\n});\n\nmodule.exports = router;\n`;
  writeIfNotExists(backendFile, backendContent);

  // Frontend screen (React Native / Expo)
  safeMkdir(FRONTEND_OUT);
  const screenFile = path.join(FRONTEND_OUT, `${id}.js`);
  const screenContent = `import React from 'react';\nimport { View, ScrollView } from 'react-native';\nimport { Text, Button } from 'react-native-paper';\n\nexport default function ${id.replace(/[^a-zA-Z0-9]/g, '_')}(props) {\n  const task = ${JSON.stringify(task, null, 2)};\n  return (\n    <ScrollView style={{ padding: 16 }}>\n      <Text variant="headlineSmall">${task.title}</Text>\n      <Text style={{ marginTop: 12 }}>{task.description}</Text>\n      <View style={{ height: 16 }} />\n      <Button mode="contained" onPress={() => {}}>Mark Done</Button>\n    </ScrollView>\n  );\n}\n`;
  writeIfNotExists(screenFile, screenContent);

  // Test file (supertest) - lightweight test that the generated backend route exists when mounted at /api/generated-code
  safeMkdir(TEST_OUT);
  const testFile = path.join(TEST_OUT, `${id}.test.js`);
  const testContent = `const request = require('supertest');\nconst express = require('express');\n\nconst app = express();\napp.use('/api/generated-code', require('../../generated-code/${id}'));
\ndescribe('Generated endpoint for ${id}', () => {\n  test('GET /api/generated-code/${id} returns task json', async () => {\n    const res = await request(app).get('/api/generated-code/${id}');\n    expect(res.status).toBe(200);\n    expect(res.body).toHaveProperty('taskId');\n    expect(res.body).toHaveProperty('title');\n  });\n});\n`;
  writeIfNotExists(testFile, testContent);
}

function run(inputJsonPath, limit = Infinity) {
  const raw = fs.readFileSync(inputJsonPath, 'utf8');
  const arr = JSON.parse(raw);
  let count = 0;
  for (const task of arr) {
    if (count >= limit) break;
    generateForTask(task);
    count += 1;
  }
  console.log(`Generated ${count} task artifacts`);
}

if (require.main === module) {
  const dataPath = process.argv[2] || path.resolve(__dirname, '..', 'data', 'tasks_sample.json');
  const lim = parseInt(process.argv[3], 10) || Infinity;
  run(dataPath, lim);
}

module.exports = { run };
