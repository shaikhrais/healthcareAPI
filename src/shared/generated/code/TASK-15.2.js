const express = require('express');

const router = express.Router();

router.get('/TASK-15.2', (req, res) => {
  res.json({
    taskId: 'TASK-15.2',
    title: 'Lab Integrations',
    description: 'LifeLabs/Dynacare orders/results.',
  });
});

module.exports = router;
