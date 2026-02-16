import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// 静的ファイル配信（distからすべて配信、modelsも含まれる）
app.use(express.static(join(__dirname, '../dist'), {
  setHeaders: (res, path) => {
    if (path.endsWith('.vrm')) {
      res.setHeader('Content-Type', 'model/gltf-binary');
    }
  }
}));

const OPENCLAW_API_URL = process.env.OPENCLAW_API_URL || 'https://api.openai.com/v1/chat/completions';
const OPENCLAW_API_KEY = process.env.OPENCLAW_API_KEY || '';
const CHARACTER_NAME = process.env.CHARACTER_NAME || '美少女アバター';
const CHARACTER_SYSTEM_PROMPT = process.env.CHARACTER_SYSTEM_PROMPT ||
  'あなたは親切で可愛らしい美少女アシスタントです。ユーザーと楽しく会話してください。短く簡潔に返答し、絵文字を適度に使ってください。';

app.post('/api/chat', async (req, res) => {
  try {
    const { messages } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'messages is required' });
    }

    const systemMessage = {
      role: 'system',
      content: CHARACTER_SYSTEM_PROMPT
    };

    const apiMessages = [systemMessage, ...messages];

    if (!OPENCLAW_API_KEY) {
      return res.json({
        message: `こんにちは！${CHARACTER_NAME}だよ！APIキーが設定されていないので、デモモードで動いているよ。環境変数 OPENCLAW_API_KEY を設定してね！`
      });
    }

    const response = await fetch(OPENCLAW_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENCLAW_API_KEY}`
      },
      body: JSON.stringify({
        model: process.env.OPENCLAW_MODEL || 'gpt-4o-mini',
        messages: apiMessages,
        max_tokens: 200,
        temperature: 0.8
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenClaw API error:', errorText);
      return res.status(response.status).json({
        error: 'API request failed',
        details: errorText
      });
    }

    const data = await response.json();
    const assistantMessage = data.choices?.[0]?.message?.content || '...';

    res.json({ message: assistantMessage });

  } catch (error) {
    console.error('Chat API error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', character: CHARACTER_NAME });
});

app.get('*', (req, res) => {
  res.sendFile(join(__dirname, '../dist/index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
  console.log(`Character: ${CHARACTER_NAME}`);
  console.log(`OpenClaw API: ${OPENCLAW_API_KEY ? 'Configured' : 'Not configured (demo mode)'}`);
});
