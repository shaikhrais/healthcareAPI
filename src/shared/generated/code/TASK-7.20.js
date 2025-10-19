const express = require('express');

const router = express.Router();

router.get('/TASK-7.20', (req, res) => {
  res.json({ taskId: 'TASK-7.20', title: 'Care plans', description: 'Implements: Care plans.' });
});

module.exports = router;
