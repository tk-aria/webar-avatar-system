export class ChatManager {
  constructor(vrm, animator) {
    this.vrm = vrm;
    this.animator = animator;
    this.messages = [];
    this.isProcessing = false;

    this.messagesContainer = document.getElementById('chat-messages');
    this.input = document.getElementById('chat-input');
    this.sendButton = document.getElementById('send-button');
  }

  init() {
    this.sendButton.addEventListener('click', () => this.sendMessage());
    this.input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.sendMessage();
      }
    });
  }

  async sendMessage() {
    const text = this.input.value.trim();
    if (!text || this.isProcessing) return;

    this.input.value = '';
    this.addMessage(text, 'user');

    this.isProcessing = true;
    this.sendButton.disabled = true;
    this.sendButton.textContent = '...';

    try {
      const response = await this.callChatAPI(text);
      this.addMessage(response, 'assistant');

      if (this.animator) {
        this.animator.playTalkingAnimation();
        setTimeout(() => {
          this.animator.stopTalkingAnimation();
        }, 2000);
      }

    } catch (error) {
      console.error('Chat API error:', error);
      this.addMessage('申し訳ありません、エラーが発生しました。', 'assistant');
    } finally {
      this.isProcessing = false;
      this.sendButton.disabled = false;
      this.sendButton.textContent = '送信';
    }
  }

  async callChatAPI(userMessage) {
    this.messages.push({
      role: 'user',
      content: userMessage
    });

    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messages: this.messages
      })
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    const assistantMessage = data.message || data.choices?.[0]?.message?.content || '...';

    this.messages.push({
      role: 'assistant',
      content: assistantMessage
    });

    if (this.messages.length > 20) {
      this.messages = this.messages.slice(-20);
    }

    return assistantMessage;
  }

  addMessage(text, role) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${role}`;
    messageDiv.textContent = text;
    this.messagesContainer.appendChild(messageDiv);
    this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
  }
}
