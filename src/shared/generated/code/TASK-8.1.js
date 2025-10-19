const express = require('express');

const router = express.Router();

router.get('/TASK-8.1', (req, res) => {
  res.json({
    taskId: 'TASK-8.1',
    title: 'Addendums & Amendments',
    description: 'Corrections with immutable original.',
  });
});

module.exports = router;
