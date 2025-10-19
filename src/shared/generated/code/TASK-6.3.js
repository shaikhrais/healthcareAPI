const express = require('express');

const router = express.Router();

router.get('/TASK-6.3', (req, res) => {
  res.json({ taskId: 'TASK-6.3', title: 'Schedule Templates', description: 'Reusable templates.' });
});

module.exports = router;
