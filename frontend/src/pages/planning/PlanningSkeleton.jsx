import Skeleton, { SkeletonTheme } from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';

export default function PlanningSkeleton({ variant = 'timeline', labelWidth = 200, headerHeight = 54 }) {
  const isCustomer = variant === 'customer';
  const isProgress = variant === 'progress';

  return (
    <div
      role="status"
      aria-label={isCustomer ? 'Läser kundöversikten' : 'Läser tidslinjen'}
      className={`planning-loading-skeleton ${isProgress ? '' : 'h-full overflow-hidden bg-white'}`}
    >
      <span className="sr-only">{isCustomer ? 'Läser kundöversikten...' : 'Läser tidslinjen...'}</span>
      <SkeletonTheme baseColor="#e8ecf5" highlightColor="#f7f9fd" borderRadius={3} duration={1.5}>
        <div aria-hidden="true">
          {isProgress ? (
            <Skeleton height={3} containerClassName="block leading-none" />
          ) : (
            <>
              <div
                className="grid border-b border-gray-200"
                style={{ gridTemplateColumns: `${labelWidth}px minmax(0, 1fr)`, height: headerHeight }}
              >
                <div className="flex items-center bg-[#d4defc] px-4">
                  <Skeleton width={84} height={10} />
                </div>
                <div className={`flex items-center ${isCustomer ? 'px-4' : 'justify-around'}`}>
                  {Array.from({ length: isCustomer ? 1 : 12 }, (_, index) => (
                    <Skeleton key={index} width={isCustomer ? 160 : 22} height={10} />
                  ))}
                </div>
              </div>
              {Array.from({ length: isCustomer ? 5 : 14 }, (_, index) => (
                <div
                  key={index}
                  className="grid border-b border-gray-200"
                  style={{ gridTemplateColumns: `${labelWidth}px minmax(0, 1fr)`, minHeight: isCustomer ? 98 : 43 }}
                >
                  <div className="flex flex-col justify-center gap-1 bg-[#d4defc] px-4 py-2">
                    <Skeleton width={`${65 + index % 3 * 10}%`} height={11} containerClassName="block leading-[0]" />
                    <Skeleton width="40%" height={8} containerClassName="block leading-[0]" />
                  </div>
                  {isCustomer ? (
                    <div className="flex flex-wrap gap-2 px-3 py-1.5">
                      {Array.from({ length: [3, 1, 4, 2, 1][index] }, (_, card) => (
                        <div key={card} className="w-54 space-y-1 rounded-sm border border-gray-200 border-l-4 border-l-slate-200 px-3 py-2.5 shadow-sm">
                          <div className="flex items-center justify-between">
                            <Skeleton width={120} height={11} containerClassName="block leading-[0]" />
                            <Skeleton width={16} height={11} containerClassName="block leading-[0]" />
                          </div>
                          <Skeleton width={52} height={8} containerClassName="block leading-[0]" />
                          <Skeleton width={95} height={10} containerClassName="block leading-[0]" />
                          <Skeleton width={170} height={8} containerClassName="block leading-[0]" />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div
                      className="flex items-center px-3"
                      style={{ backgroundImage: 'repeating-linear-gradient(to right, transparent 0, transparent calc(8.333% - 1px), #eef0f5 calc(8.333% - 1px), #eef0f5 8.333%)' }}
                    >
                      <div style={{ marginLeft: `${index % 5 * 12}%`, width: `${18 + index % 3 * 8}%` }}>
                        <Skeleton height={24} containerClassName="block leading-none" />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </>
          )}
        </div>
      </SkeletonTheme>
    </div>
  );
}
