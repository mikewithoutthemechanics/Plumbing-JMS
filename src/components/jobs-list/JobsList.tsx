import { useJobs } from '@/lib/hooks/useJobs';
import { useState } from 'react';

// Helper components (inline SVGs, replacing the removed lucide-react dependency)
type IconProps = { className?: string };

function Trash2({ className }: IconProps) {
  return (
    <svg className={className || 'h-5 w-5'} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 6h18" />
      <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
      <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
      <line x1="10" x2="10" y1="11" y2="17" />
      <line x1="14" x2="14" y1="11" y2="17" />
    </svg>
  );
}

function Edit3({ className }: IconProps) {
  return (
    <svg className={className || 'h-5 w-5'} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20h9" />
      <path d="M16.376 3.622a1 1 0 0 1 3.002 3.002L7.368 18.635a2 2 0 0 1-.855.506l-2.872.838a.5.5 0 0 1-.62-.62l.838-2.872a2 2 0 0 1 .506-.854z" />
    </svg>
  );
}

function CheckCircle({ className }: IconProps) {
  return (
    <svg className={className || 'h-5 w-5'} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M21.801 10A10 10 0 1 1 17 3.335" />
      <path d="m9 11 3 3L22 4" />
    </svg>
  );
}

function Clock({ className }: IconProps) {
  return (
    <svg className={className || 'h-5 w-5'} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

function User({ className }: IconProps) {
  return (
    <svg className={className || 'h-5 w-5'} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function MapPin({ className }: IconProps) {
  return (
    <svg className={className || 'h-5 w-5'} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

function DollarSign({ className }: IconProps) {
  return (
    <svg className={className || 'h-5 w-5'} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" x2="12" y1="2" y2="22" />
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  );
}

function Folder({ className }: IconProps) {
  return (
    <svg className={className || 'h-5 w-5'} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z" />
    </svg>
  );
}

// Helper component for plus icon
function Plus({ className }: IconProps) {
  return (
    <svg className={className || 'h-5 w-5'} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  );
}

// Helper component for user plus icon
function UserPlus() {
  return (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  );
}

// Helper component for package icon
function Package() {
  return (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7h18M3 7v9a2 2 0 002 2h10a2 2 0 002-2V7M3 7l9 6 9-6M3 7l9-6 9 6" />
    </svg>
  );
}

// Helper component for bar chart icon
function BarChart3() {
  return (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3v18h18"/>
    </svg>
  );
}

// Helper component for calendar icon
function Calendar() {
  return (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 4h10M5 7a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-10a2 2 0 00-2-2H5zm3 4v1h4v-1H8zM5 17a2 2 0 002 2h10a2 2 0 002-2V9a2 2 0 00-2-2H7a2 2 0 00-2 2v10z" />
    </svg>
  );
}

// Helper component for sliders icon
function Sliders() {
  return (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16" />
    </svg>
  );
}

// Helper component for chevron down
function ChevronDown({ className }: IconProps) {
  return (
    <svg className={className || 'h-4 w-4'} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  );
}

// Helper component for eye icon (for view details)
function Eye({ className }: IconProps) {
  return (
    <svg className={className || 'h-4 w-4'} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M1 12s4-8 11-8 11 8 1 8" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4a4 4 0 110 8 4 4 0 010-8z" />
    </svg>
  );
}

// Helper component for circle help (fallback icon)
function CircleHelp() {
  return (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

// Helper component for search icon
function Search({ className }: IconProps) {
  return (
    <svg className={className || 'h-5 w-5'} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35m0 0A7.5 7.5 0 105.636 3.636m12.726 12.728a4.5 4.5 0 11-6.364-6.364" />
    </svg>
  );
}

type JobsListProps = { filters?: [string, string, unknown][] };
export default function JobsList({ filters = [] }: JobsListProps) {
  const { data: jobs, isLoading, error } = useJobs(filters);
  const [selectedJobs, setSelectedJobs] = useState<string[]>([]);
  const [showBulkActions, setShowBulkActions] = useState(false);

  // Status configuration with colors and icons
  const statusConfig = {
    pending: { color: 'amber', icon: Clock, label: 'Pending' },
    assigned: { color: 'blue', icon: User, label: 'Assigned' },
    in_progress: { color: 'emerald', icon: CheckCircle, label: 'In Progress' },
    completed: { color: 'green', icon: CheckCircle, label: 'Completed' },
    invoiced: { color: 'indigo', icon: DollarSign, label: 'Invoiced' },
  };

  if (isLoading) return <div className="p-4 animate-pulse">Loading jobs...</div>;
  if (error) return <div className="p-4 bg-red-50 border-l-4 border-red-500 text-red-700 p-4">Error loading jobs: {(error as Error).message}</div>;
  if (!jobs || jobs.length === 0) return (
    <div className="text-center py-12">
      <div className="flex flex-col items-center mb-6">
        <Folder className="h-12 w-12 text-gray-400 mb-3" />
        <p className="text-lg font-medium text-gray-600">No jobs found</p>
        <p className="text-sm text-gray-500">Your job list is empty. Create a new job to get started.</p>
      </div>
      <a href="/dashboard/jobs/new" className="btn btn-primary btn-px-6 btn-py-3">
        Create First Job
      </a>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header with actions and filters */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4">
        <div className="flex flex-col md:flex-row md:items-center md:space-x-4 mb-4 md:mb-0">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Jobs ({jobs.length})
          </h1>
          {selectedJobs.length > 0 && (
            <span className="ml-4 inline-flex items-center px-3 py-1 text-xs font-medium bg-primary-50 text-primary-600 rounded-full">
              {selectedJobs.length} selected
            </span>
          )}
        </div>
        <div className="flex items-center space-x-3">
          {/* Bulk actions */}
          {selectedJobs.length > 0 && (
            <div className="relative">
              <button
                onClick={() => setShowBulkActions(!showBulkActions)}
                className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 dark:hover:text-gray-100"
              >
                <div className="h-6 w-6 flex items-center justify-center bg-gray-100 dark:bg-gray-700 rounded-md">
                  {selectedJobs.length}
                </div>
                <span className="hidden md:inline">Actions</span>
                <ChevronDown className="h-4 w-4 text-gray-500" />
              </button>
              {showBulkActions && (
                <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg z-20">
                  <div className="px-4 py-2">
                    <p className="text-xs font-medium text-gray-500 mb-2">Bulk actions</p>
                    <div className="space-y-1">
                      <button
                        onClick={() => {
                          /* Handle bulk delete */
                          setSelectedJobs([]);
                          setShowBulkActions(false);
                        }}
                        className="w-full text-left text-sm font-medium text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete selected
                      </button>
                      <button
                        onClick={() => {
                          /* Handle bulk update status */
                          setSelectedJobs([]);
                          setShowBulkActions(false);
                        }}
                        className="w-full text-left text-sm font-medium text-blue-600 hover:bg-blue-50"
                      >
                        <CheckCircle className="mr-2 h-4 w-4" />
                        Update status
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
          {/* Create new button */}
          <a href="/dashboard/jobs/new" className="btn btn-primary btn-px-4 btn-py-2 md:btn-px-6 md:btn-py-3">
            <Plus className="mr-2 h-4 w-4" />
            New Job
          </a>
        </div>
      </div>

      {/* Search and filter bar */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div className="flex-1 min-w-0">
          <div className="relative">
            <input
              type="text"
              placeholder="Search by job number, customer, or description..."
              className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-300 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200"
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          </div>
        </div>
        <div className="flex-1 md:w-auto min-w-0">
          <select
            className="w-full pl-3 pr-10 py-3 rounded-lg border border-gray-300 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 bg-no-repeat bg-right-2.5 center"
          >
            <option value="">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="assigned">Assigned</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="invoiced">Invoiced</option>
          </select>
        </div>
        <div className="flex-1 md:w-auto min-w-0">
          <select
            className="w-full pl-3 pr-10 py-3 rounded-lg border border-gray-300 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 bg-no-repeat bg-right-2.5 center"
          >
            <option value="">All Assignments</option>
            <option value="assigned_to_me">Assigned to Me</option>
            <option value="unassigned">Unassigned</option>
          </select>
        </div>
      </div>

      {/* Jobs list */}
      <div className="divide-y divide-gray-200 dark:border-gray-700">
        {jobs.map((job) => {
          const statusInfo = statusConfig[job.status as keyof typeof statusConfig] ||
            { color: 'gray', icon: CircleHelp, label: job.status };

          return (
            <div
              key={job.id}
className={`job-card cursor-pointer select-none transition-colors duration-200
                         hover:bg-gray-50 dark:hover:bg-gray-800
                         ${selectedJobs.includes(job.id) ? 'bg-primary-50 border-l-4 border-primary-500' : ''}
                         p-4 flex items-start`}
              onClick={() => {
                // Handle row selection (toggle on click, but allow navigation on double-click or secondary action)
                // In a real implementation, we'd distinguish between select and navigate
              }}
            >
              {/* Selection checkbox */}
              <div className="flex-shrink-0 mt-1">
                <input
                  type="checkbox"
                  checked={selectedJobs.includes(job.id)}
                  onChange={() => {
                    if (selectedJobs.includes(job.id)) {
                      setSelectedJobs(selectedJobs.filter(id => id !== job.id));
                    } else {
                      setSelectedJobs([...selectedJobs, job.id]);
                    }
                  }}
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                />
              </div>

              {/* Main content */}
              <div className="flex-1 ml-4 space-y-2">
                <div className="flex flex-wrap items-start gap-4">
                  {/* Left column - Job info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center mb-1">
                      <h3 className="flex-1 font-semibold text-gray-900 dark:text-gray-100 truncate">
                        #{job.job_number}
                      </h3>
                      <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                                     bg-${statusInfo.color}-100 text-${statusInfo.color}-800`}>
                        {statusInfo.label}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 line-clamp-2">
                      {job.description}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-4 text-xs text-gray-500">
                      <div className="flex items-center">
                        <MapPin className="h-3 w-3 mr-1" />
                        <span>{job.customer?.name || 'No customer'}</span>
                      </div>
                      <div className="flex items-center">
                        <User className="h-3 w-3 mr-1" />
                        <span>{job.assigned_to_profile?.full_name || 'Unassigned'}</span>
                      </div>
                      {job.admin_hourly_rate !== null && (
                        <div className="flex items-center">
                          <DollarSign className="h-3 w-3 mr-1" />
                          <span>${job.admin_hourly_rate}/hr</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right column - Actions and metadata */}
                  <div className="flex-shrink-0 text-right space-x-3">
                    <div className="flex flex-col space-y-2">
                      <div className="flex items-center">
                        <Clock className="h-3 w-3 mr-1 text-gray-400" />
                        <span className="text-xs text-gray-500">
                          {/* Would format the date properly in a real implementation */}
                          Created: {new Date(job.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      {job.updated_at && (
                        <div className="flex items-center">
                          <Clock className="h-3 w-3 mr-1 text-gray-400" />
                          <span className="text-xs text-gray-500">
                            Updated: {new Date(job.updated_at).toLocaleDateString()}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="mt-2 flex space-x-2">
                      <button
                        onClick={() => {/* Handle view details */}}
                        className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
                        title="View details"
                      >
                        <Eye className="h-4 w-4 text-gray-500 hover:text-gray-900 dark:hover:text-gray-100" />
                      </button>
                      <button
                        onClick={() => {/* Handle edit */}}
                        className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
                        title="Edit job"
                      >
                        <Edit3 className="h-4 w-4 text-gray-500 hover:text-gray-900 dark:hover:text-gray-100" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Empty state when filtering results in no jobs */}
      {!jobs.length && !(isLoading || error) && (
        <div className="text-center py-12">
          <div className="flex flex-col items-center mb-6">
            <Search className="h-10 w-10 text-gray-400 mb-3" />
            <p className="text-lg font-medium text-gray-600">No jobs match your filters</p>
            <p className="text-sm text-gray-500">Try adjusting your search or filter criteria</p>
          </div>
          <a href="/dashboard/jobs" className="btn btn-outline btn-px-4 btn-py-2">
            Clear Filters
          </a>
        </div>
      )}
    </div>
  );
}