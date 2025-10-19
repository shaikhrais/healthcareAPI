const express = require('express');

const router = express.Router();

router.get('/TASK-5.9', (req, res) => {
  res.json({
    taskId: 'TASK-5.9',
    title: 'Online booking portal',
    description: 'Implements: Online booking portal.',
  });
});

module.exports = router;
