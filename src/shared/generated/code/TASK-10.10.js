const express = require('express');

const router = express.Router();

router.get('/TASK-10.10', (req, res) => {
  res.json({
    taskId: 'TASK-10.10',
    title: 'Bulk claim submission',
    description: 'Implements: Bulk claim submission.',
  });
});

module.exports = router;
