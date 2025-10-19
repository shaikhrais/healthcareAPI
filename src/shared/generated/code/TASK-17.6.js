const express = require('express');

const router = express.Router();

router.get('/TASK-17.6', (req, res) => {
  res.json({ taskId: 'TASK-17.6', title: 'Accessibility Testing', description: 'WCAG 2.1 AA.' });
});

module.exports = router;
