import { vi, type MockedFunction } from 'vitest';

// Use vi.importActual to avoid triggering module resolution at import time
// which can conflict with vi.mock hoisting in consumer test files.
let _getSupabaseServerClient: MockedFunction<typeof import('@/lib/supabase/server').getSupabaseServerClient>;

export type MockSupabaseClient = {
  auth: { getUser: ReturnType<typeof vi.fn> };
  from: ReturnType<typeof vi.fn>;
};

export type QueryBuilder = {
  select: ReturnType<typeof vi.fn>;
  eq: ReturnType<typeof vi.fn>;
  single: ReturnType<typeof vi.fn>;
  maybeSingle: ReturnType<typeof vi.fn>;
  insert: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
  in: ReturnType<typeof vi.fn>;
  gt: ReturnType<typeof vi.fn>;
  gte: ReturnType<typeof vi.fn>;
  lte: ReturnType<typeof vi.fn>;
  order: ReturnType<typeof vi.fn>;
  limit: ReturnType<typeof vi.fn>;
  onConflict: ReturnType<typeof vi.fn>;
  head: ReturnType<typeof vi.fn>;
  count: ReturnType<typeof vi.fn>;
};

export function createQueryBuilder(): QueryBuilder {
  const builder: QueryBuilder = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    gt: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    onConflict: vi.fn().mockReturnThis(),
    head: vi.fn().mockReturnThis(),
    count: vi.fn().mockResolvedValue({ count: 0, error: null }),
  };
  return builder;
}

export function createMockSupabase(): MockSupabaseClient {
  const builder = createQueryBuilder();

  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
    },
    from: vi.fn(() => builder),
  };
}

export async function setupSupabaseMock() {
  const mockSupabase = createMockSupabase();
  if (!_getSupabaseServerClient) {
    const mod = await vi.importActual<typeof import('@/lib/supabase/server')>('@/lib/supabase/server');
    _getSupabaseServerClient = mod.getSupabaseServerClient as MockedFunction<typeof mod.getSupabaseServerClient>;
  }
  _getSupabaseServerClient.mockResolvedValue(mockSupabase as unknown as Awaited<ReturnType<typeof _getSupabaseServerClient>>);
  return mockSupabase;
}

export function mockHelper(name: string, impl?: unknown) {
  vi.mock(name, () => ({
    __esModule: true,
    default: impl ?? vi.fn(),
    ...(typeof impl === 'object' && impl !== null ? impl : {}),
  }));
}
