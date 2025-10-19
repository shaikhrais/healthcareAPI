const express = require('express');

const router = express.Router();

router.get('/TASK-17.3', (req, res) => {
  res.json({ taskId: 'TASK-17.3', title: 'E2E Testing', description: 'Cypress + visual.' });
});

module.exports = router;
