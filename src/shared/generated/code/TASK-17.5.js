const express = require('express');

const router = express.Router();

router.get('/TASK-17.5', (req, res) => {
  res.json({ taskId: 'TASK-17.5', title: 'Security Testing', description: 'OWASP ZAP + Snyk.' });
});

module.exports = router;
