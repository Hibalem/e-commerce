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
db.execute(`CREATE TABLE IF NOT EXISTS products (id INT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(255), price DECIMAL(10,2))`);

app.post('/products', async (req, res) => {
  httpRequestsTotal.inc({ method: 'POST', route: '/products' });
  const { name, price } = req.body;
  await db.execute('INSERT INTO products (name, price) VALUES (?, ?)', [name, price]);
  res.status(201).json({ message: 'Product created' });
});

app.get('/products', async (req, res) => {
  httpRequestsTotal.inc({ method: 'GET', route: '/products' });
  const [rows] = await db.execute('SELECT * FROM products');
  res.json(rows);
});

app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

app.listen(3001, () => console.log('Product Service running on port 3001'));