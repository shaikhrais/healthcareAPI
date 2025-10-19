const express = require('express');

const router = express.Router();

router.get('/TASK-11.1', (req, res) => {
  res.json({ taskId: 'TASK-11.1', title: 'Executive Dashboard', description: 'Top-level KPIs.' });
});

module.exports = router;
