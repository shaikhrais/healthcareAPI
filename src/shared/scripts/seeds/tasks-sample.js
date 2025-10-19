const path = require('path');
const express = require('express');


const sample = require('../data/tasks_sample.json');
const router = express.Router();

// GET /api/tasks-sample
router.get('/', (req, res) => {
  res.json(sample);
});

// GET /api/tasks-sample/:taskId
router.get('/:taskId', (req, res) => {
  const t = sample.find(
    (s) => s.taskId === req.params.taskId || s.taskId === req.params.taskId.toUpperCase()
  );
  if (!t) return res.status(404).json({ error: 'Task not found' });
  res.json(t);
});

module.exports = router;
