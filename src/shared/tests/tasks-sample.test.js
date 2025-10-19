const request = require('supertest');

const app = require('../server');
/* eslint-env jest */
describe('Tasks Sample API', () => {
  it('GET /api/tasks-sample should return JSON array', async () => {
    const res = await request(app)
      .get('/api/tasks-sample')
      .expect(200)
      .expect('Content-Type', /json/);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
  });

  it('GET /api/tasks-sample/:taskId should return a single task', async () => {
    const list = (await request(app).get('/api/tasks-sample')).body;
    const id = list[0].taskId;
    const res = await request(app)
      .get(`/api/tasks-sample/${id}`)
      .expect(200)
      .expect('Content-Type', /json/);
    expect(res.body.taskId).toBe(id);
  });
});
