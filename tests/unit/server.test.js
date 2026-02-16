import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import express from 'express';

describe('Server API', () => {
  let server;
  let baseUrl;

  beforeAll(async () => {
    const app = express();
    app.use(express.json());

    // Mock /api/health endpoint
    app.get('/api/health', (req, res) => {
      res.json({ status: 'ok', character: 'TestAvatar' });
    });

    // Mock /api/chat endpoint - 正常系
    app.post('/api/chat', (req, res) => {
      const { messages } = req.body;

      if (!messages || !Array.isArray(messages)) {
        return res.status(400).json({ error: 'messages is required' });
      }

      if (messages.length === 0) {
        return res.status(400).json({ error: 'messages cannot be empty' });
      }

      // Demo mode response
      res.json({
        message: 'こんにちは！テストアバターだよ！'
      });
    });

    await new Promise((resolve) => {
      server = app.listen(0, () => {
        const address = server.address();
        baseUrl = `http://localhost:${address.port}`;
        resolve();
      });
    });
  });

  afterAll(() => {
    if (server) {
      server.close();
    }
  });

  describe('GET /api/health', () => {
    it('正常系: ヘルスチェックが成功する', async () => {
      const response = await fetch(`${baseUrl}/api/health`);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.status).toBe('ok');
      expect(data.character).toBeDefined();
    });
  });

  describe('POST /api/chat', () => {
    it('正常系: 有効なメッセージで応答を返す', async () => {
      const response = await fetch(`${baseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: 'こんにちは' }]
        })
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toBeDefined();
      expect(typeof data.message).toBe('string');
    });

    it('異常系: messagesが未定義の場合400エラー', async () => {
      const response = await fetch(`${baseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('messages is required');
    });

    it('異常系: messagesが配列でない場合400エラー', async () => {
      const response = await fetch(`${baseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: 'not an array' })
      });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('messages is required');
    });

    it('異常系: messagesが空配列の場合400エラー', async () => {
      const response = await fetch(`${baseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [] })
      });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('messages cannot be empty');
    });
  });
});
