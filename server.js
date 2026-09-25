import 'dotenv/config';
import express from 'express';
import mysql from 'mysql2/promise';
import nodemailer from 'nodemailer';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const requiredEnvironment = ['DB_HOST', 'DB_PORT', 'DB_NAME', 'DB_USER', 'DB_PASSWORD'];
const missingEnvironment = requiredEnvironment.filter((key) => !process.env[key]);
if (missingEnvironment.length > 0) {
  console.warn(`Missing database environment variables: ${missingEnvironment.join(', ')}`);
}

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 3306),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  waitForConnections: true,
  connectionLimit: 5,
  queueLimit: 0
});

const app = express();
const port = Number(process.env.PORT || 5000);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

app.use(express.json());

app.get('/api/health', (_request, response) => {
  response.json({ success: true, message: 'Backend is working' });
});

app.get('/api/db-test', async (_request, response) => {
  try {
    const [rows] = await pool.query('SELECT 1 AS test');
    response.json({ success: true, message: 'Database connection succeeded', result: rows[0] });
  } catch (error) {
    console.error('Database test failed:', error.message);
    response.status(500).json({
      success: false,
      message: 'Database connection failed',
      error: error.code || 'DATABASE_ERROR'
    });
  }
});

app.post('/api/email-test', async (request, response) => {
  const requiredEmailEnvironment = ['SMTP_HOST', 'SMTP_USER', 'SMTP_PASSWORD'];
  const missingEmailEnvironment = requiredEmailEnvironment.filter((key) => !process.env[key]);
  if (missingEmailEnvironment.length > 0) {
    response.status(500).json({ success: false, message: `Email configuration is incomplete. Missing: ${missingEmailEnvironment.join(', ')}` });
    return;
  }

  const from = typeof request.body?.from === 'string' ? request.body.from.trim() : '';
  const to = typeof request.body?.to === 'string' ? request.body.to.trim() : '';
  const subject = typeof request.body?.subject === 'string' ? request.body.subject.trim() : '';
  if (!from || !to || !subject || subject.length > 200) {
    response.status(400).json({ success: false, message: 'From, to, and subject are required; subject must be 200 characters or fewer' });
    return;
  }

  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: String(process.env.SMTP_SECURE).toLowerCase() === 'true',
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD }
    });
    await transporter.sendMail({
      from,
      to,
      subject,
      text: 'Nodemailer is working from the GoDaddy test app.'
    });
    response.json({ success: true, message: 'Test email sent successfully' });
  } catch (error) {
    console.error('Email test failed:', error.message);
    response.status(500).json({ success: false, message: 'Email test failed', error: error.code || 'EMAIL_ERROR' });
  }
});

app.get('/api/users', async (_request, response) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, name, created_at FROM test_users ORDER BY id DESC'
    );
    response.json({ success: true, users: rows });
  } catch (error) {
    console.error('Reading users failed:', error.message);
    response.status(500).json({ success: false, message: 'Could not read users', error: error.code || 'DATABASE_ERROR' });
  }
});

app.post('/api/users', async (request, response) => {
  const name = typeof request.body?.name === 'string' ? request.body.name.trim() : '';
  if (!name || name.length > 100) {
    response.status(400).json({ success: false, message: 'Name is required and must be 100 characters or fewer' });
    return;
  }

  try {
    const [result] = await pool.execute('INSERT INTO test_users (name) VALUES (?)', [name]);
    const [rows] = await pool.execute(
      'SELECT id, name, created_at FROM test_users WHERE id = ?',
      [result.insertId]
    );
    response.status(201).json({ success: true, user: rows[0] });
  } catch (error) {
    console.error('Creating user failed:', error.message);
    response.status(500).json({ success: false, message: 'Could not create user', error: error.code || 'DATABASE_ERROR' });
  }
});

app.use('/api', (_request, response) => {
  response.status(404).json({ success: false, message: 'API route not found' });
});

const clientDist = path.join(__dirname, 'client', 'dist');
app.use(express.static(clientDist));
app.get('*', (_request, response) => {
  response.sendFile(path.join(clientDist, 'index.html'), (error) => {
    if (error && !response.headersSent) {
      response.status(404).json({ success: false, message: 'Frontend build not found' });
    }
  });
});

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
