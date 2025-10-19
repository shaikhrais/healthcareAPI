const express = require('express');

const router = express.Router();

router.get('/TASK-7.19', (req, res) => {
  res.json({
    taskId: 'TASK-7.19',
    title: 'Clinical pathways',
    description: 'Implements: Clinical pathways.',
  });
});

module.exports = router;
