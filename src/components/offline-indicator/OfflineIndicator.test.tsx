import { render, screen, await cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import OfflineIndicator from './OfflineIndicator'
import { getPendingSyncItems } from '@/lib/db/dexie'
import { setIsOnline } from '@/lib/db/dexie' // This is not real, but we'll mock the functions we need

// Mock the getPendingSyncItems function
jest.mock('@/lib/db/dexie', () => ({
  ...jest.requireActual('@/lib/db/dexie'),
  getPendingSyncItems: jest.fn(),
}))

describe('OfflineIndicator', () => {
  afterEach(() => {
    jest.clearAllMocks()
    cleanup()
  })

  test('renders offline indicator when offline', async () => {
    // Mock navigator.onLine to return false
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: false,
    })

    render(<OfflineIndicator />)

    // Expect the offline text to be visible
    expect(screen.getByText(/🔴 Offline/i)).toBeInTheDocument()
    // Expect no sync button when offline and no pending items
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  test('renders online indicator when online and no pending items', async () => {
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: true,
    })
    // Mock getPendingSyncItems to return an empty array
    ;(getPendingSyncItems as jest.Mock).mockResolvedValue([])

    render(<OfflineIndicator />)

    // Expect the online text to be visible
    expect(screen.getByText(/🟢 Online/i)).toBeInTheDocument()
    // Expect no sync button when no pending items
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  test('renders sync button when online and has pending items', async () => {
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: true,
    })
    // Mock getPendingSyncItems to return an array with one item
    ;(getPendingSyncItems as jest.Mock).mockResolvedValue([{ id: 1, table_name: 'test', operation: 'insert', payload: {} }])

    render(<OfflineIndicator />)

    // Expect the online text to be visible
    expect(screen.getByText(/🟢 Online/i)).toBeInTheDocument()
    // Expect the sync button to be visible
    const syncButton = screen.getByRole('button', { name: /sync 1/i })
    expect(syncButton).toBeInTheDocument()

    // Mock the fetch API for the sync action
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
      })
    ) as jest.Mock

    // Click the sync button
    await userEvent.click(syncButton)

    // Expect fetch to have been called
    expect(fetch).toHaveBeenCalled()
  })
}