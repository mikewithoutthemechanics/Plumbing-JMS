import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockFrom = vi.fn(() => ({
  select: vi.fn(() => ({
    eq: vi.fn(() => ({
      limit: vi.fn(() => Promise.resolve({ data: [], error: null })),
      single: vi.fn(),
    })),
  })),
  update: vi.fn(() => ({
    eq: vi.fn(() => Promise.resolve({ error: null })),
  })),
}));

const mockSupabase = {
  from: mockFrom,
};

vi.mock('@/lib/supabase/server', () => ({
  getSupabaseAdminClient: vi.fn(() => mockSupabase),
}));

vi.mock('../notifications/email', () => ({
  sendJobAssignedEmail: vi.fn(),
  sendEnquiryEmail: vi.fn(),
}));

vi.mock('../notifications/push', () => ({
  sendPushToMultiple: vi.fn(),
}));

import { processJobAssignedNotifications, processQuoteEnquiryNotifications } from '../notifications/service';
import { sendJobAssignedEmail, sendEnquiryEmail } from '../notifications/email';
import { sendPushToMultiple } from '../notifications/push';

describe('notifications/service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.NEXT_PUBLIC_APP_URL;
  });

  describe('processJobAssignedNotifications', () => {
    it('returns error when NEXT_PUBLIC_APP_URL is not set', async () => {
      const result = await processJobAssignedNotifications();
      expect(result.processed).toBe(0);
      expect(result.failed).toBe(0);
      expect(result.errors).toEqual(['NEXT_PUBLIC_APP_URL is not configured']);
    });

    it('returns empty when no pending notifications', async () => {
      process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000';
      mockFrom.mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            limit: vi.fn(() => Promise.resolve({ data: [], error: null })),
          })),
        })),
      });

      const result = await processJobAssignedNotifications();
      expect(result.processed).toBe(0);
      expect(result.failed).toBe(0);
    });

    it('processes pending notifications', async () => {
      process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000';
      const mockNotifications = [
        {
          id: '1',
          technician_id: 'tech-1',
          customer_name: 'John',
          job_number: 'JOB-001',
          job_card_id: 'job-1',
        },
      ];

      let callIndex = 0;
      mockFrom.mockImplementation(() => {
        const idx = callIndex++;
        if (idx === 0) {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                limit: vi.fn(() => Promise.resolve({ data: mockNotifications, error: null })),
              })),
            })),
          };
        }
        if (idx === 1) {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn(() => Promise.resolve({ data: { full_name: 'Tech', email: 'tech@test.com' }, error: null })),
              })),
            })),
          };
        }
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(() => Promise.resolve({ data: [], error: null })),
            })),
          })),
          update: vi.fn(() => ({
            eq: vi.fn(() => Promise.resolve({ error: null })),
          })),
        };
      });

      const result = await processJobAssignedNotifications();
      expect(result.processed).toBe(1);
      expect(result.failed).toBe(0);
      expect(sendJobAssignedEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          technicianName: 'Tech',
          customerName: 'John',
          jobNumber: 'JOB-001',
        })
      );
    });

    it('handles fetch error', async () => {
      process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000';
      mockFrom.mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            limit: vi.fn(() => Promise.resolve({ data: null, error: { message: 'db error' } })),
          })),
        })),
      });

      const result = await processJobAssignedNotifications();
      expect(result.errors).toContain('Failed to fetch pending notifications: db error');
    });
  });

  describe('processQuoteEnquiryNotifications', () => {
    it('returns error when NEXT_PUBLIC_APP_URL is not set', async () => {
      const result = await processQuoteEnquiryNotifications();
      expect(result.processed).toBe(0);
      expect(result.errors).toEqual(['NEXT_PUBLIC_APP_URL is not configured']);
    });

    it('processes pending quote enquiries', async () => {
      process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000';
      const mockNotifications = [
        {
          id: '1',
          customer_name: 'Alice',
          customer_email: 'alice@test.com',
          customer_phone: '123',
          description: 'Need quote',
          quote_id: 'quote-1',
        },
      ];

      let callIndex = 0;
      mockFrom.mockImplementation(() => {
        const idx = callIndex++;
        if (idx === 0) {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                limit: vi.fn(() => Promise.resolve({ data: mockNotifications, error: null })),
              })),
            })),
          };
        }
        return {
          update: vi.fn(() => ({
            eq: vi.fn(() => Promise.resolve({ error: null })),
          })),
        };
      });

      const result = await processQuoteEnquiryNotifications();
      expect(result.processed).toBe(1);
      expect(sendEnquiryEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          customerName: 'Alice',
          description: 'Need quote',
        })
      );
    });
  });
});
