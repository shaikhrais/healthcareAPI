const express = require('express');

const router = express.Router();

router.get('/TASK-10.4', (req, res) => {
  res.json({
    taskId: 'TASK-10.4',
    title: 'Revenue Cycle Dashboard',
    description: 'KPIs, payer mix.',
  });
});

module.exports = router;
