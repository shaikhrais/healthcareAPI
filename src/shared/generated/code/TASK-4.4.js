const express = require('express');

const router = express.Router();

router.get('/TASK-4.4', (req, res) => {
  res.json({
    taskId: 'TASK-4.4',
    title: 'Patient Merge',
    description: 'Merge duplicates w/ conflict resolution.',
  });
});

module.exports = router;
