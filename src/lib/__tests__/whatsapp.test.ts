import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderTemplate, sendWhatsappMessage } from '@/lib/utils/whatsapp';

describe('renderTemplate', () => {
  it('replaces placeholders with values', () => {
    expect(renderTemplate('Hello {{name}}', { name: 'John' })).toBe('Hello John');
  });

  it('replaces multiple placeholders', () => {
    expect(renderTemplate('{{name}} owes {{amount}}', { name: 'John', amount: '100' })).toBe('John owes 100');
  });

  it('leaves unknown placeholders intact', () => {
    expect(renderTemplate('Hello {{name}}', {})).toBe('Hello {{name}}');
  });

  it('handles numeric values', () => {
    expect(renderTemplate('Amount: {{amount}}', { amount: 42 })).toBe('Amount: 42');
  });

  it('returns template unchanged when no placeholders', () => {
    expect(renderTemplate('No vars here', { name: 'John' })).toBe('No vars here');
  });
});

describe('sendWhatsappMessage', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('returns failure when WhatsApp is disabled', async () => {
    const result = await sendWhatsappMessage(
      { baseUrl: 'http://wa.test', sessionName: 'main', enabled: false, reminderTemplate: 'Hi' },
      '1234567890',
      'Hello'
    );
    expect(result.success).toBe(false);
    expect(result.error).toBe('WhatsApp automation disabled');
  });

  it('returns failure when baseUrl is empty', async () => {
    const result = await sendWhatsappMessage(
      { baseUrl: '', sessionName: 'main', enabled: true, reminderTemplate: 'Hi' },
      '1234567890',
      'Hello'
    );
    expect(result.success).toBe(false);
    expect(result.error).toBe('OpenWA base URL not configured');
  });

  it('returns failure on network error', async () => {
    global.fetch = vi.fn().mockRejectedValueOnce(new Error('Network down'));

    const result = await sendWhatsappMessage(
      { baseUrl: 'http://wa.test', sessionName: 'main', enabled: true, reminderTemplate: 'Hi' },
      '1234567890',
      'Hello'
    );

    expect(result.success).toBe(false);
    expect(result.error).toBe('Network down');
  });

  it('returns failure on timeout (AbortError)', async () => {
    const abortError = new Error('Timeout');
    abortError.name = 'AbortError';
    global.fetch = vi.fn().mockRejectedValueOnce(abortError);

    const result = await sendWhatsappMessage(
      { baseUrl: 'http://wa.test', sessionName: 'main', enabled: true, reminderTemplate: 'Hi' },
      '1234567890',
      'Hello'
    );

    expect(result.success).toBe(false);
    expect(result.error).toBe('OpenWA request timed out after 10s');
  });

  it('returns failure on non-ok response', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 500,
      text: () => Promise.resolve('Server error'),
    });

    const result = await sendWhatsappMessage(
      { baseUrl: 'http://wa.test', sessionName: 'main', enabled: true, reminderTemplate: 'Hi' },
      '1234567890',
      'Hello'
    );

    expect(result.success).toBe(false);
    expect(result.error).toContain('OpenWA 500');
  });

  it('returns success on ok response', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
    });

    const result = await sendWhatsappMessage(
      { baseUrl: 'http://wa.test', sessionName: 'main', enabled: true, reminderTemplate: 'Hi' },
      '1234567890',
      'Hello'
    );

    expect(result.success).toBe(true);
  });

  it('strips non-digit characters from phone number', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({ ok: true });

    await sendWhatsappMessage(
      { baseUrl: 'http://wa.test', sessionName: 'main', enabled: true, reminderTemplate: 'Hi' },
      '+27 (12) 345-6789',
      'Hello'
    );

    expect(global.fetch).toHaveBeenCalledWith(
      'http://wa.test/api/main/sendText',
      expect.objectContaining({
        body: JSON.stringify({ chatId: '27123456789@c.us', text: 'Hello' }),
      })
    );
  });
});
