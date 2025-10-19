const express = require('express');

const router = express.Router();

router.get('/TASK-5.23', (req, res) => {
  res.json({
    taskId: 'TASK-5.23',
    title: 'Bulk operations',
    description: 'Implements: Bulk operations.',
  });
});

module.exports = router;
