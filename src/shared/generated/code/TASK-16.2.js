const express = require('express');

const router = express.Router();

router.get('/TASK-16.2', (req, res) => {
  res.json({ taskId: 'TASK-16.2', title: 'Webhooks', description: 'Event delivery with retries.' });
});

module.exports = router;
