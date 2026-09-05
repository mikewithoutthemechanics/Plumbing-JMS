import { describe, it, expect, vi } from 'vitest';
import { POST } from './route';

// Mock fetch globally
global.fetch = vi.fn();

describe('/api/auth/magic-link route', () => {
  it('returns 400 for missing email', async () => {
    const req = new Request('http://localhost:3000/api/auth/magic-link', {
      method: 'POST',
      body: JSON.stringify({}),
    });
    const res = await POST(req as any);
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'Email is required' });
  });

  it('returns 400 for non-string email', async () => {
    const req = new Request('http://localhost:3000/api/auth/magic-link', {
      method: 'POST',
      body: JSON.stringify({ email: 123 }),
    });
    const res = await POST(req as any);
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'Email is required' });
  });

  it('returns 200 on successful magic link send', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      json: () => Promise.resolve({}),
    });

    const req = new Request('http://localhost:3000/api/auth/magic-link', {
      method: 'POST',
      body: JSON.stringify({ email: 'user@example.com' }),
    });
    const res = await POST(req as any);

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true, message: 'Magic link sent' });
  });

  it('returns 400 on Supabase error response', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      json: () => Promise.resolve({ error: { message: 'Invalid email' } }),
    });

    const req = new Request('http://localhost:3000/api/auth/magic-link', {
      method: 'POST',
      body: JSON.stringify({ email: 'bad-email' }),
    });
    const res = await POST(req as any);

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'Invalid email' });
  });

  it('returns 400 on network error', async () => {
    (global.fetch as any).mockRejectedValueOnce(new Error('Network down'));

    const req = new Request('http://localhost:3000/api/auth/magic-link', {
      method: 'POST',
      body: JSON.stringify({ email: 'user@example.com' }),
    });
    const res = await POST(req as any);

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'Invalid request' });
  });
});
