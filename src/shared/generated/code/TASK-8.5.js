const express = require('express');

const router = express.Router();

router.get('/TASK-8.5', (req, res) => {
  res.json({
    taskId: 'TASK-8.5',
    title: 'Clinical Report Generator',
    description: 'Branded PDFs from data.',
  });
});

module.exports = router;
