require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { executeCode } = require('./services/executionService');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173' }));
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'iTECify API' });
});

// Code execution endpoint
// Body: { language: 'javascript' | 'python', code: string }
app.post('/api/execute', async (req, res) => {
  const { language, code } = req.body;

  if (!language || !code) {
    return res.status(400).json({ error: 'Missing required fields: language, code' });
  }

  const result = await executeCode(language, code);
  res.json(result);
});

app.listen(PORT, () => {
  console.log(`iTECify backend running on http://localhost:${PORT}`);
});
