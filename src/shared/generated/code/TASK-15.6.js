const express = require('express');

const router = express.Router();

router.get('/TASK-15.6', (req, res) => {
  res.json({
    taskId: 'TASK-15.6',
    title: 'Payment gateways (Stripe/Apple Pay/Google Pay)',
    description: 'Implements: Payment gateways (Stripe/Apple Pay/Google Pay).',
  });
});

module.exports = router;
