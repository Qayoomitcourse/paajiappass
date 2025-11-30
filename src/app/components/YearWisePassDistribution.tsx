import React from 'react';
// Corrected: Removed unused 'ChartBarIcon'
import { CalendarDaysIcon } from '@heroicons/react/24/outline';

interface YearWiseStats {
  year: string;
  total: number;
  cargo: number;
  landside: number;
  expired: number;
  expiring: number;
}

// Corrected: Defined a specific type for a pass object instead of using 'any'
interface Pass {
  dateOfEntry?: string;
  dateOfExpiry?: string;
  category: 'cargo' | 'landside' | string; // Using string as a fallback
}

interface YearWisePassDistributionProps {
  passes: Pass[];
}

function YearWisePassDistribution({ passes }: YearWisePassDistributionProps) {
  // Calculate year-wise statistics
  const yearWiseStats = React.useMemo(() => {
    const statsMap = new Map<string, YearWiseStats>();
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();

    passes.forEach(pass => {
      if (!pass.dateOfEntry) return;
      
      const year = new Date(pass.dateOfEntry).getFullYear().toString();
      
      if (!statsMap.has(year)) {
        statsMap.set(year, {
          year,
          total: 0,
          cargo: 0,
          landside: 0,
          expired: 0,
          expiring: 0
        });
      }

      const stats = statsMap.get(year)!;
      stats.total++;
      
      if (pass.category === 'cargo') {
        stats.cargo++;
      } else if (pass.category === 'landside') {
        stats.landside++;
      }

      // Check expiration status
      if (pass.dateOfExpiry) {
        const expiryDate = new Date(pass.dateOfExpiry);
        if (expiryDate < today) {
          stats.expired++;
        } else if (
          expiryDate.getFullYear() === currentYear &&
          expiryDate.getMonth() === currentMonth
        ) {
          stats.expiring++;
        }
      }
    });

    // Convert to array and sort by year (newest first)
    return Array.from(statsMap.values()).sort((a, b) => 
      parseInt(b.year) - parseInt(a.year)
    );
  }, [passes]);

  if (yearWiseStats.length === 0) {
    return null;
  }

  return (
    <div className="bg-white dark:bg-slate-800/70 rounded-xl shadow-lg dark:shadow-slate-900/50 border border-slate-200 dark:border-slate-700 overflow-hidden mb-8">
      <div className="p-4 sm:p-6">
        <div className="flex items-center mb-6">
          <div className="flex items-center justify-center w-12 h-12 bg-indigo-100 dark:bg-indigo-900/50 rounded-lg mr-4">
            <CalendarDaysIcon className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <h2 className="text-2xl font-semibold text-slate-700 dark:text-slate-100">
              Year-Wise Pass Distribution
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Pass statistics organized by entry year
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {yearWiseStats.map((stats) => (
            <div
              key={stats.year}
              className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900/30 dark:to-slate-800/30 rounded-lg border border-slate-200 dark:border-slate-700/50 p-5 hover:shadow-md transition-shadow"
            >
              {/* Year Header */}
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-200 dark:border-slate-700">
                <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
                  {stats.year}
                </h3>
                <div className="text-right">
                  <p className="text-xs text-slate-500 dark:text-slate-400">Total Passes</p>
                  <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                    {stats.total}
                  </p>
                </div>
              </div>

              {/* Category Breakdown */}
              <div className="space-y-3 mb-4">
                <div className="flex items-center justify-between p-2 bg-blue-50 dark:bg-blue-900/20 rounded">
                  <div className="flex items-center">
                    <span className="text-lg mr-2">🚛</span>
                    <span className="text-sm font-medium text-blue-800 dark:text-blue-300">
                      Cargo
                    </span>
                  </div>
                  <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
                    {stats.cargo}
                  </span>
                </div>

                <div className="flex items-center justify-between p-2 bg-purple-50 dark:bg-purple-900/20 rounded">
                  <div className="flex items-center">
                    <span className="text-lg mr-2">🏢</span>
                    <span className="text-sm font-medium text-purple-800 dark:text-purple-300">
                      Landside
                    </span>
                  </div>
                  <span className="text-lg font-bold text-purple-600 dark:text-purple-400">
                    {stats.landside}
                  </span>
                </div>
              </div>

              {/* Status Indicators */}
              {(stats.expired > 0 || stats.expiring > 0) && (
                <div className="space-y-2 pt-3 border-t border-slate-200 dark:border-slate-700">
                  {stats.expired > 0 && (
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-red-600 dark:text-red-400 flex items-center">
                        <span className="mr-1">❌</span>
                        Expired
                      </span>
                      <span className="font-semibold text-red-600 dark:text-red-400">
                        {stats.expired}
                      </span>
                    </div>
                  )}
                  {stats.expiring > 0 && (
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-amber-600 dark:text-amber-400 flex items-center">
                        <span className="mr-1">⚠️</span>
                        Expiring Soon
                      </span>
                      <span className="font-semibold text-amber-600 dark:text-amber-400">
                        {stats.expiring}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Percentage Bar */}
              <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-700">
                <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-2">
                  <span>Distribution</span>
                  <span>
                    {stats.total > 0 ? Math.round((stats.cargo / stats.total) * 100) : 0}% / 
                    {stats.total > 0 ? Math.round((stats.landside / stats.total) * 100) : 0}%
                  </span>
                </div>
                <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden flex">
                  <div
                    className="bg-blue-500 dark:bg-blue-400"
                    style={{
                      width: `${stats.total > 0 ? (stats.cargo / stats.total) * 100 : 0}%`
                    }}
                  />
                  <div
                    className="bg-purple-500 dark:bg-purple-400"
                    style={{
                      width: `${stats.total > 0 ? (stats.landside / stats.total) * 100 : 0}%`
                    }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Summary Row */}
        <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-700">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400">Total Years</p>
              <p className="text-2xl font-bold text-slate-700 dark:text-slate-200">
                {yearWiseStats.length}
              </p>
            </div>
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400">All Passes</p>
              <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                {yearWiseStats.reduce((sum, stat) => sum + stat.total, 0)}
              </p>
            </div>
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400">Total Cargo</p>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {yearWiseStats.reduce((sum, stat) => sum + stat.cargo, 0)}
              </p>
            </div>
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400">Total Landside</p>
              <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                {yearWiseStats.reduce((sum, stat) => sum + stat.landside, 0)}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default YearWisePassDistribution;