const express = require('express');

const router = express.Router();

router.get('/TASK-9.2', (req, res) => {
  res.json({
    taskId: 'TASK-9.2',
    title: 'Payment Processing',
    description: 'Stripe/Square; PCI compliance.',
  });
});

module.exports = router;
