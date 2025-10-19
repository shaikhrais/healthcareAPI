const express = require('express');

const router = express.Router();

router.get('/TASK-9.18', (req, res) => {
  res.json({
    taskId: 'TASK-9.18',
    title: 'Charge capture workflows',
    description: 'Implements: Charge capture workflows.',
  });
});

module.exports = router;
