const express = require('express');

const router = express.Router();

router.get('/TASK-18.5', (req, res) => {
  res.json({
    taskId: 'TASK-18.5',
    title: 'Security Hardening',
    description: 'Firewall/WAF/DDoS/IDS.',
  });
});

module.exports = router;
