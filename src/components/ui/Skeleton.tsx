'use client';

export function SkeletonCard() {
  return (
    <div className="card p-5 animate-pulse">
      <div className="skeleton-text w-3/4 mb-4" />
      <div className="skeleton-text w-1/2 mb-2" />
      <div className="skeleton-text w-2/3" />
    </div>
  );
}

export function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div className="card overflow-hidden animate-pulse">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            {[...Array(6)].map((_, i) => (
              <th key={i} className="px-6 py-3">
                <div className="skeleton-text w-20" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {[...Array(rows)].map((_, i) => (
            <tr key={i}>
              {[...Array(6)].map((_, j) => (
                <td key={j} className="px-6 py-4">
                  <div className="skeleton-text w-24" />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function SkeletonGrid({ count = 6 }: { count?: number }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {[...Array(count)].map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}

export function SkeletonText({ lines = 3 }: { lines?: number }) {
  return (
    <>
      {[...Array(lines)].map((_, i) => (
        <div key={i} className="skeleton-text" />
      ))}
    </>
  );
}
