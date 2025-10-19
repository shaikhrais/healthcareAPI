const express = require('express');

const router = express.Router();

router.get('/TASK-16.12', (req, res) => {
  res.json({
    taskId: 'TASK-16.12',
    title: 'GraphQL API option',
    description: 'Implements: GraphQL API option.',
  });
});

module.exports = router;
