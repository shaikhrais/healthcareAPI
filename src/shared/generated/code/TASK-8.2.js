const express = require('express');

const router = express.Router();

router.get('/TASK-8.2', (req, res) => {
  res.json({
    taskId: 'TASK-8.2',
    title: 'Co-Signing Workflow',
    description: 'Student/supervisor workflow.',
  });
});

module.exports = router;
