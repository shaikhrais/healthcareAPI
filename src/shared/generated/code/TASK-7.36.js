const express = require('express');

const router = express.Router();

router.get('/TASK-7.36', (req, res) => {
  res.json({
    taskId: 'TASK-7.36',
    title: 'Note quality checklist',
    description: 'Implements: Note quality checklist.',
  });
});

module.exports = router;
