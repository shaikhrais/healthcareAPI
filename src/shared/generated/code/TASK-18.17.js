const express = require('express');

const router = express.Router();

router.get('/TASK-18.17', (req, res) => {
  res.json({
    taskId: 'TASK-18.17',
    title: 'Beta Feedback Sweep',
    description: 'Incorporate last beta issues.',
  });
});

module.exports = router;
