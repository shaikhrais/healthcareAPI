const path = require('path');
const fs = require('fs');
const express = require('express');

const router = express.Router();
const GENERATED_DIR = path.resolve(__dirname, '..', 'generated-data');

router.get('/', (req, res) => {
  if (!fs.existsSync(GENERATED_DIR)) return res.json([]);
  const files = fs.readdirSync(GENERATED_DIR).filter((f) => f.endsWith('.json'));
  const list = files.map((f) => {
    const content = JSON.parse(fs.readFileSync(path.join(GENERATED_DIR, f), 'utf8'));
    return { id: f.replace('.json', ''), title: content.title || content.taskId };
  });
  res.json(list);
});

router.get('/:id', (req, res) => {
  const file = path.join(GENERATED_DIR, `${req.params.id}.json`);
  if (!fs.existsSync(file)) return res.status(404).json({ error: 'Not found' });
  const content = JSON.parse(fs.readFileSync(file, 'utf8'));
  res.json(content);
});

module.exports = router;
