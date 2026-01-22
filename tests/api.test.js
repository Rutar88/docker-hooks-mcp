const request = require('supertest');

const API_URL = process.env.API_URL || 'http://localhost:3000';

describe('Todos API', () => {
  let createdTodoId;

  test('POST /todos creates a todo', async () => {
    const res = await request(API_URL)
      .post('/todos')
      .send({ title: 'test' });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id');
    expect(res.body.title).toBe('test');
    createdTodoId = res.body.id;
  });

  test('GET /todos returns array', async () => {
    const res = await request(API_URL)
      .get('/todos');

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test('DELETE /todos/:id removes todo', async () => {
    const res = await request(API_URL)
      .delete(`/todos/${createdTodoId}`);

    expect(res.status).toBe(204);
  });
});
