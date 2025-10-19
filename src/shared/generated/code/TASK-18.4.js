const express = require('express');

const router = express.Router();

router.get('/TASK-18.4', (req, res) => {
  res.json({ taskId: 'TASK-18.4', title: 'Compliance Audit', description: 'HIPAA/PIPEDA final.' });
});

module.exports = router;
