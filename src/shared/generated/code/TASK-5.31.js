const express = require('express');

const router = express.Router();

router.get('/TASK-5.31', (req, res) => {
  res.json({
    taskId: 'TASK-5.31',
    title: 'External calendar ICS export',
    description: 'Implements: External calendar ICS export.',
  });
});

module.exports = router;
