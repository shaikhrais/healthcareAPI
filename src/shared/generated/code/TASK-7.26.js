const express = require('express');

const router = express.Router();

router.get('/TASK-7.26', (req, res) => {
  res.json({
    taskId: 'TASK-7.26',
    title: 'Social history',
    description: 'Implements: Social history.',
  });
});

module.exports = router;
