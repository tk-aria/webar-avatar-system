import { test, expect } from '@playwright/test';

test.describe('WebAR Avatar System', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('正常系: ページが読み込まれる', async ({ page }) => {
    await expect(page).toHaveTitle(/WebAR Avatar/);
  });

  test('正常系: 召喚ボタンが表示される', async ({ page }) => {
    const summonButton = page.locator('#ar-button');
    await expect(summonButton).toBeVisible();
    await expect(summonButton).toContainText('アバターを召喚');
  });

  test('正常系: ステータス表示が存在する', async ({ page }) => {
    const status = page.locator('#status');
    await expect(status).toBeVisible();
  });

  test('正常系: チャットコンテナが存在する', async ({ page }) => {
    const chatContainer = page.locator('#chat-container');
    await expect(chatContainer).toBeAttached();
  });

  test('正常系: チャット入力欄が存在する', async ({ page }) => {
    const chatInput = page.locator('#chat-input');
    await expect(chatInput).toBeAttached();
  });

  test('正常系: 送信ボタンが存在する', async ({ page }) => {
    const sendButton = page.locator('#send-button');
    await expect(sendButton).toBeAttached();
    await expect(sendButton).toContainText('送信');
  });

  test('正常系: ローディング表示が存在する', async ({ page }) => {
    const loading = page.locator('#loading');
    await expect(loading).toBeAttached();
  });

  test('正常系: Three.jsスクリプトが読み込まれる', async ({ page }) => {
    // メインスクリプトのロードを確認
    const scriptLoaded = await page.evaluate(() => {
      return document.querySelector('script[type="module"]') !== null;
    });
    expect(scriptLoaded).toBe(true);
  });

  test('異常系: 存在しないページで404的な挙動', async ({ page }) => {
    // SPAなのでindex.htmlにフォールバック
    const response = await page.goto('/nonexistent-page');
    // 200を返す（SPAフォールバック）
    expect(response.status()).toBe(200);
  });
});

test.describe('API Tests', () => {
  test('正常系: ヘルスチェックAPIが応答する', async ({ request }) => {
    const response = await request.get('/api/health');
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data.status).toBe('ok');
    expect(data.character).toBeDefined();
  });

  test('正常系: チャットAPIが応答する', async ({ request }) => {
    const response = await request.post('/api/chat', {
      data: {
        messages: [{ role: 'user', content: 'こんにちは' }]
      }
    });
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data.message).toBeDefined();
  });

  test('異常系: messagesが未定義の場合400エラー', async ({ request }) => {
    const response = await request.post('/api/chat', {
      data: {}
    });
    expect(response.status()).toBe(400);

    const data = await response.json();
    expect(data.error).toBe('messages is required');
  });

  test('異常系: messagesが配列でない場合400エラー', async ({ request }) => {
    const response = await request.post('/api/chat', {
      data: { messages: 'not an array' }
    });
    expect(response.status()).toBe(400);

    const data = await response.json();
    expect(data.error).toBe('messages is required');
  });

  test('正常系: VRMモデルファイルがアクセス可能', async ({ request }) => {
    const response = await request.get('/models/AvatarSample_A.vrm');
    expect(response.ok()).toBeTruthy();

    const contentType = response.headers()['content-type'];
    // VRMファイルが正しく配信されている
    expect(response.status()).toBe(200);
  });

  test('正常系: 静的ファイルが正しく配信される', async ({ request }) => {
    const response = await request.get('/');
    expect(response.ok()).toBeTruthy();

    const html = await response.text();
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('WebAR Avatar');
  });
});

test.describe('WebGL/Avatar Tests (with GPU)', () => {
  // GPU/WebGLが必要なテストは専用のconfigで実行
  test.skip(({ browserName }) => true, 'WebGL tests require GPU - run manually with headed browser');

  test('正常系: VRMモデルがロードされる', async ({ page }) => {
    await page.goto('/');

    // VRMロード完了を待機
    await page.waitForFunction(() => {
      const status = document.getElementById('status');
      return status && status.textContent.includes('準備完了');
    }, { timeout: 15000 });

    const status = page.locator('#status');
    await expect(status).toContainText('準備完了');
  });

  test('正常系: 召喚ボタンクリックでアバターが表示される', async ({ page }) => {
    await page.goto('/');

    // ロード完了を待機
    await page.waitForFunction(() => {
      const button = document.getElementById('ar-button');
      return button && !button.disabled;
    }, { timeout: 15000 });

    // 召喚ボタンをクリック
    await page.locator('#ar-button').click();

    // チャットコンテナが表示される
    const chatContainer = page.locator('#chat-container');
    await expect(chatContainer).toHaveClass(/active/, { timeout: 5000 });
  });
});
