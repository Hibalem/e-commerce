const express = require('express');
const mysql = require('mysql2/promise');
const promClient = require('prom-client');
const app = express();

// Prometheus metrics
const register = new promClient.Registry();
promClient.collectDefaultMetrics({ register });
const httpRequestsTotal = new promClient.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route'],
  registers: [register]
});

app.use(express.json());

// DB connection
const db = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: 'mydb',
});

// Init DB table
db.execute(`CREATE TABLE IF NOT EXISTS users (id INT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(255), email VARCHAR(255) UNIQUE)`);

app.post('/users', async (req, res) => {
  httpRequestsTotal.inc({ method: 'POST', route: '/users' });
  const { name, email } = req.body;
  await db.execute('INSERT INTO users (name, email) VALUES (?, ?)', [name, email]);
  res.status(201).json({ message: 'User created' });
});

app.get('/users', async (req, res) => {
  httpRequestsTotal.inc({ method: 'GET', route: '/users' });
  const [rows] = await db.execute('SELECT * FROM users');
  res.json(rows);
});

app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

app.listen(3000, () => console.log('User Service running on port 3000'));