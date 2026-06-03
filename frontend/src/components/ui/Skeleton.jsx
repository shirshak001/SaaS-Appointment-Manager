/* ---- Skeleton shimmer animation ---- */
const shimmerStyle = {
  background: 'linear-gradient(90deg, rgb(var(--clr-surface-overlay)) 25%, rgb(var(--clr-border)) 50%, rgb(var(--clr-surface-overlay)) 75%)',
  backgroundSize: '200% 100%',
  animation: 'skeletonShimmer 1.4s ease-in-out infinite',
  borderRadius: '0.5rem',
};

// Raw primitive
export function SkeletonBox({ width = '100%', height = '1rem', className = '', style = {} }) {
  return (
    <div
      className={className}
      style={{ width, height, ...shimmerStyle, ...style }}
    />
  );
}

// Text line
export function SkeletonLine({ width = '100%', className = '' }) {
  return <SkeletonBox width={width} height="0.75rem" className={className} style={{ borderRadius: '0.375rem' }} />;
}

// Stat card skeleton
export function SkeletonStat() {
  return (
    <div className="card p-5 space-y-4">
      <div className="flex items-start justify-between">
        <SkeletonBox width="2.25rem" height="2.25rem" style={{ borderRadius: '0.75rem' }} />
      </div>
      <div className="space-y-2">
        <SkeletonBox width="3rem" height="1.75rem" style={{ borderRadius: '0.5rem' }} />
        <SkeletonLine width="70%" />
      </div>
      <SkeletonLine width="50%" />
    </div>
  );
}

// Card skeleton
export function SkeletonCard({ lines = 3 }) {
  return (
    <div className="card p-5 space-y-3">
      <SkeletonLine width="40%" />
      <div className="space-y-2">
        {Array.from({ length: lines }).map((_, i) => (
          <SkeletonLine key={i} width={i % 2 === 0 ? '100%' : '75%'} />
        ))}
      </div>
    </div>
  );
}

// Table row skeleton
export function SkeletonTableRow({ cols = 4 }) {
  const widths = ['45%', '20%', '15%', '12%', '8%'];
  return (
    <tr>
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="table-cell">
          <SkeletonLine width={widths[i] || '80%'} />
        </td>
      ))}
    </tr>
  );
}

// Full table skeleton
export function SkeletonTable({ rows = 5, cols = 4 }) {
  return (
    <div className="card overflow-hidden">
      <div
        className="px-5 py-4"
        style={{ borderBottom: '1px solid rgb(var(--clr-border))' }}
      >
        <SkeletonLine width="30%" />
      </div>
      <table className="w-full">
        <tbody>
          {Array.from({ length: rows }).map((_, i) => (
            <SkeletonTableRow key={i} cols={cols} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Calendar skeleton
export function SkeletonCalendar() {
  return (
    <div className="card p-5 space-y-4">
      <div className="flex items-center justify-between">
        <SkeletonLine width="30%" />
        <SkeletonBox width="7rem" height="1.75rem" style={{ borderRadius: '0.5rem' }} />
      </div>
      <div className="grid grid-cols-7 gap-0.5">
        {Array.from({ length: 35 }).map((_, i) => (
          <SkeletonBox
            key={i}
            height="2.5rem"
            style={{ borderRadius: '0.5rem', opacity: i % 7 === 5 || i % 7 === 6 ? 0.4 : 1 }}
          />
        ))}
      </div>
    </div>
  );
}

// Profile skeleton
export function SkeletonProfile() {
  return (
    <div className="space-y-5">
      <div className="card p-6">
        <div className="flex items-center gap-5">
          <SkeletonBox width="4rem" height="4rem" style={{ borderRadius: '50%' }} />
          <div className="flex-1 space-y-2">
            <SkeletonLine width="40%" />
            <SkeletonLine width="30%" />
          </div>
        </div>
        <div className="grid grid-cols-4 gap-4 mt-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <SkeletonLine width="60%" />
              <SkeletonBox width="2.5rem" height="1.5rem" style={{ borderRadius: '0.375rem' }} />
            </div>
          ))}
        </div>
      </div>
      <SkeletonTable rows={4} cols={3} />
    </div>
  );
}
