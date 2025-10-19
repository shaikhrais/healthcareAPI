const express = require('express');

const router = express.Router();

router.get('/TASK-12.3', (req, res) => {
  res.json({
    taskId: 'TASK-12.3',
    title: 'BI Integration',
    description: 'Tableau/Power BI endpoints.',
  });
});

module.exports = router;
