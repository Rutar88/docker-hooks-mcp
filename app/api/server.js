const express = require('express');
const { Pool } = require('pg');

const app = express();
app.use(express.json());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS todos (
      id SERIAL PRIMARY KEY,
      title VARCHAR(255) NOT NULL
    )
  `);
}

app.post('/todos', async (req, res) => {
  const { title } = req.body;
  const result = await pool.query(
    'INSERT INTO todos (title) VALUES ($1) RETURNING *',
    [title]
  );
  res.status(201).json(result.rows[0]);
});

app.get('/todos', async (req, res) => {
  const result = await pool.query('SELECT * FROM todos');
  res.status(200).json(result.rows);
});

app.delete('/todos/:id', async (req, res) => {
  await pool.query('DELETE FROM todos WHERE id = $1', [req.params.id]);
  res.status(204).send();
});

const PORT = 3000;

initDb().then(() => {
  app.listen(PORT, () => {
    console.log(`API running on port ${PORT}`);
  });
});
