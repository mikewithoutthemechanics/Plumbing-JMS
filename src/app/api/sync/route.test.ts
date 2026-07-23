import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { POST } from './route'
import { NextRequest, NextResponse } from 'next/server'

// Mock next/server
vi.mock('next/server', () => ({
  NextRequest: {
    json: vi.fn(),
  },
  NextResponse: {
    json: vi.fn((body, options) => ({ body, ...options })),
  },
}))

// Mock supabase client
vi.mock('@/lib/supabase/server', () => ({
  getSupabaseServerClient: vi.fn(),
}))

describe('/api/sync route', () => {
  let mockSupabase: any
  let mockRequest: any

  beforeEach(() => {
    mockSupabase = {
      auth: {
        getUser: vi.fn()
      },
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
    }

    mockRequest = {
      json: vi.fn(),
      headers: {
        get: vi.fn()
      }
    }

    // Reset all mocks
    vi.clearAllMocks()
  })

  it('returns 401 when user is not authenticated', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } })

    const req = new NextRequest('http://localhost:3000/api/sync', { method: 'POST' })
    const res = await POST(req)

    expect(res).toHaveProperty('status', 401)
    expect(res.body.error).toBe('Unauthorized')
  })

  it('returns 403 when user role is not owner or technician', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-id' } } })
    mockSupabase.from().select().single().mockResolvedValue({ data: { role: 'visitor' } })

    const req = new NextRequest('http://localhost:3000/api/sync', { method: 'POST' })
    const res = await POST(req)

    expect(res).toHaveProperty('status', 403)
    expect(res.body.error).toBe('Forbidden')
  })

  it('handles quote submission for owners', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-id' } } })
    mockSupabase.from().select().single().mockResolvedValue({ data: { role: 'owner' } })
    mockRequest.json.mockResolvedValue({
      quote: {
        customer_name: 'John Doe',
        customer_email: 'john@example.com',
        customer_phone: '1234567890',
        description: 'Fix leaky faucet'
      }
    })
    mockSupabase.from().insert().select().single().mockResolvedValue({
      data: { id: 'quote-id', customer_name: 'John Doe' },
      error: null
    })

    const req = new NextRequest('http://localhost:3000/api/sync', { method: 'POST' })
    req.json = mockRequest.json
    // @ts-ignore - mocking headers
    req.headers = mockRequest.headers

    const res = await POST(req)

    expect(res).toHaveProperty('status', 201)
    expect(res.body.quote).toEqual({ id: 'quote-id', customer_name: 'John Doe' })
  })

  it('handles sync operation for valid data', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-id' } } })
    mockSupabase.from().select().single().mockResolvedValue({ data: { role: 'owner' } })
    mockRequest.json.mockResolvedValue({
      table_name: 'customers',
      operation: 'INSERT',
      payload: { name: 'Jane Doe', email: 'jane@example.com' },
      id: 'sync-id'
    })
    mockSupabase.from().insert().select().mockResolvedValue({
      data: [{ id: 'customer-id', name: 'Jane Doe', email: 'jane@example.com' }],
      error: null
    })
    mockSupabase.from().delete.mockResolvedValue({ error: null })

    const req = new NextRequest('http://localhost:3000/api/sync', { method: 'POST' })
    req.json = mockRequest.json
    // @ts-ignore - mocking headers
    req.headers = mockRequest.headers
    mockRequest.headers.get.mockReturnValue('127.0.0.1')

    const res = await POST(req)

    expect(res).toHaveProperty('status', 200)
    expect(res.body.success).toBe(true)
  })
})