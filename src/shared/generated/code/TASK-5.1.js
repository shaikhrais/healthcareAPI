const express = require('express');

const router = express.Router();

router.get('/TASK-5.1', (req, res) => {
  res.json({
    taskId: 'TASK-5.1',
    title: 'Calendar View Component',
    description: 'Day/week/month; drag-drop; colors.',
  });
});

module.exports = router;
