import { render, screen, cleanup, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import OfflineIndicator from './OfflineIndicator';
import { getPendingSyncItems } from '@/lib/db/dexie';

// Mock the dexie module (getPendingSyncItems + db.syncQueue used by the component)
vi.mock('@/lib/db/dexie', () => ({
  getPendingSyncItems: vi.fn(),
  db: {
    syncQueue: {
      add: vi.fn(),
      delete: vi.fn(),
      update: vi.fn(),
    },
  },
}));

describe('OfflineIndicator', () => {
  afterEach(() => {
    vi.clearAllMocks();
    cleanup();
  });

  test('renders offline indicator when offline', async () => {
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: false,
    });

    render(<OfflineIndicator />);

    expect(screen.getByText(/🔴 Offline/i)).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  test('renders online indicator when online and no pending items', async () => {
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: true,
    });
    (getPendingSyncItems as unknown as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    render(<OfflineIndicator />);

    expect(screen.getByText(/🟢 Online/i)).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  test('renders sync button when online and has pending items', async () => {
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: true,
    });
    (getPendingSyncItems as unknown as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: 1, table_name: 'test', operation: 'insert', payload: {} },
    ]);

    render(<OfflineIndicator />);

    expect(screen.getByText(/🟢 Online/i)).toBeInTheDocument();

    const syncButton = await screen.findByRole('button', { name: /sync 1/i });
    expect(syncButton).toBeInTheDocument();

    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
      })
    ) as unknown as typeof global.fetch;

    await userEvent.click(syncButton);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalled();
    });
  });
});
