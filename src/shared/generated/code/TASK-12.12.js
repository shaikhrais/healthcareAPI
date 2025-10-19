const express = require('express');

const router = express.Router();

router.get('/TASK-12.12', (req, res) => {
  res.json({
    taskId: 'TASK-12.12',
    title: 'Vendor performance analysis',
    description: 'Implements: Vendor performance analysis.',
  });
});

module.exports = router;
