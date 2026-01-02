const express = require('express');
const mysql = require('mysql2/promise');
const axios = require('axios');
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
db.execute(`CREATE TABLE IF NOT EXISTS orders (id INT AUTO_INCREMENT PRIMARY KEY, user_id INT, product_id INT, quantity INT, FOREIGN KEY (user_id) REFERENCES users(id), FOREIGN KEY (product_id) REFERENCES products(id))`);

app.post('/orders', async (req, res) => {
  httpRequestsTotal.inc({ method: 'POST', route: '/orders' });
  const { userId, productId, quantity } = req.body;

  // Validate user and product via other services
  try {
    await axios.get(`http://user-service:3000/users/${userId}`);
    await axios.get(`http://product-service:3001/products/${productId}`);
  } catch (error) {
    return res.status(400).json({ error: 'Invalid user or product' });
  }

  await db.execute('INSERT INTO orders (user_id, product_id, quantity) VALUES (?, ?, ?)', [userId, productId, quantity]);
  console.log(`Order placed: User ${userId} ordered Product ${productId}`);  // Mock notification
  res.status(201).json({ message: 'Order created' });
});

app.get('/orders', async (req, res) => {
  httpRequestsTotal.inc({ method: 'GET', route: '/orders' });
  const [rows] = await db.execute('SELECT * FROM orders');
  res.json(rows);
});

app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

app.listen(3002, () => console.log('Order Service running on port 3002'));