const express = require('express');

const router = express.Router();

router.get('/TASK-10.25', (req, res) => {
  res.json({
    taskId: 'TASK-10.25',
    title: 'Charity care tracking',
    description: 'Implements: Charity care tracking.',
  });
});

module.exports = router;
