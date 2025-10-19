const express = require('express');

const router = express.Router();

router.get('/TASK-9.4', (req, res) => {
  res.json({ taskId: 'TASK-9.4', title: 'Payment Plans', description: 'Scheduled installments.' });
});

module.exports = router;
