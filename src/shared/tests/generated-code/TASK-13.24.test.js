const express = require('express');
const request = require('supertest');

const router = require('../../generated-code/TASK-13.24');
/* eslint-env jest */
describe('TASK-13.24 generated route', () => {
  let app;
  beforeAll(() => {
    app = express();
    app.use('/api/generated-code', router);
  });
  test('GET /api/generated-code/TASK-13.24 returns 200', async () => {
    const res = await request(app).get('/api/generated-code/TASK-13.24');
    expect(res.status).toBe(200);
    expect(res.body.taskId).toBe('TASK-13.24');
  });
});
