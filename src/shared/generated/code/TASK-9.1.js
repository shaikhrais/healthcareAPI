const express = require('express');

const router = express.Router();

router.get('/TASK-9.1', (req, res) => {
  res.json({
    taskId: 'TASK-9.1',
    title: 'Invoice Generation',
    description: 'Line items, taxes, discounts.',
  });
});

module.exports = router;
