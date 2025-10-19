const express = require('express');

const router = express.Router();

router.get('/TASK-9.14', (req, res) => {
  res.json({
    taskId: 'TASK-9.14',
    title: 'Discount rules & coupons',
    description: 'Implements: Discount rules & coupons.',
  });
});

module.exports = router;
