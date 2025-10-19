const express = require('express');

const router = express.Router();

router.get('/TASK-14.3', (req, res) => {
  res.json({
    taskId: 'TASK-14.3',
    title: 'Telehealth Calls',
    description: 'Video with waiting room.',
  });
});

module.exports = router;
