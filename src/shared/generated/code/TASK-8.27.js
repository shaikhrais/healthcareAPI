const express = require('express');

const router = express.Router();

router.get('/TASK-8.27', (req, res) => {
  res.json({
    taskId: 'TASK-8.27',
    title: 'Clinical content library',
    description: 'Implements: Clinical content library.',
  });
});

module.exports = router;
