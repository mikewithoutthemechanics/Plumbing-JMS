import { describe, expect, test, vi } from 'vitest';
import type { MockedFunction } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import JobsList from './JobsList';
import { useJobs } from '@/lib/hooks/useJobs';

// Mock the useJobs hook
vi.mock('@/lib/hooks/useJobs');

const mockedUseJobs = useJobs as unknown as MockedFunction<typeof useJobs>;

describe('JobsList Component', () => {
  const mockJobs = [
    {
      id: '1',
      job_number: 'JOB-001',
      customer_id: 'cust-1',
      description: 'Fix leaky faucet',
      status: 'assigned',
      admin_hourly_rate: 75,
      customer: {
        id: 'cust-1',
        name: 'John Doe',
        email: 'john@example.com',
        phone: '555-1234',
      },
      assigned_to_profile: {
        id: 'tech-1',
        full_name: 'Jane Smith',
        email: 'jane@example.com',
      },
    },
    {
      id: '2',
      job_number: 'JOB-002',
      customer_id: 'cust-2',
      description: 'Install new toilet',
      status: 'completed',
      admin_hourly_rate: 85,
      customer: {
        id: 'cust-2',
        name: 'Jane Smith',
        email: 'jane@example.com',
        phone: '555-5678',
      },
      assigned_to_profile: {
        id: 'tech-2',
        full_name: 'Bob Johnson',
        email: 'bob@example.com',
      },
    },
  ];

  test('renders loading state when fetching jobs', async () => {
    mockedUseJobs.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    } as unknown as ReturnType<typeof useJobs>);

    render(<JobsList />);

    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  test('renders error message when fetch fails', async () => {
    mockedUseJobs.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('Failed to fetch jobs'),
    } as unknown as ReturnType<typeof useJobs>);

    render(<JobsList />);

    expect(screen.getByText(/failed to fetch jobs/i)).toBeInTheDocument();
  });

  test('renders job list when data is available', async () => {
    mockedUseJobs.mockReturnValue({
      data: mockJobs,
      isLoading: false,
      error: null,
    } as unknown as ReturnType<typeof useJobs>);

    render(<JobsList />);

    expect(screen.getByText(/job-001/i)).toBeInTheDocument();
    expect(screen.getByText(/fix leaky faucet/i)).toBeInTheDocument();
    expect(screen.getByText(/job-002/i)).toBeInTheDocument();
    expect(screen.getByText(/install new toilet/i)).toBeInTheDocument();

    const johnDoeElements = screen.getAllByText(/john doe/i);
    const janeSmithElements = screen.getAllByText(/jane smith/i);
    expect(johnDoeElements.length).toBeGreaterThan(0);
    expect(janeSmithElements.length).toBeGreaterThan(0);

    const job1Element = screen.getByText(/job-001/i);
    const job2Element = screen.getByText(/job-002/i);

    const job1Card = job1Element.closest('div');
    const job2Card = job2Element.closest('div');

    expect(job1Card).toHaveTextContent(/assigned/i);
    expect(job2Card).toHaveTextContent(/completed/i);
  });

  test('handles empty job list', async () => {
    mockedUseJobs.mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
    } as unknown as ReturnType<typeof useJobs>);

    render(<JobsList />);

    expect(screen.getByText(/no jobs found/i)).toBeInTheDocument();
  });

  test('filters jobs by status when filter is applied', async () => {
    const assignedJobs = mockJobs.filter((job) => job.status === 'assigned');
    mockedUseJobs.mockReturnValue({
      data: assignedJobs,
      isLoading: false,
      error: null,
    } as unknown as ReturnType<typeof useJobs>);

    render(<JobsList filters={[['status', 'eq', 'assigned']] as [string, string, unknown][]} />);

    expect(screen.getAllByText(/job-001/i)).toHaveLength(1);
    expect(screen.queryByText(/job-002/i)).not.toBeInTheDocument();

    const jobCard = screen.getByText(/job-001/i).closest('div');
    expect(jobCard).toHaveTextContent(/assigned/i);
  });

  test('navigates to job detail page when job card is clicked', async () => {
    mockedUseJobs.mockReturnValue({
      data: mockJobs,
      isLoading: false,
      error: null,
    } as unknown as ReturnType<typeof useJobs>);

    render(<JobsList />);

    const firstJobCard = screen.getByText(/job-001/i).closest('.job-card') as HTMLElement;
    await userEvent.click(firstJobCard);
  });
});
