import React, { useState } from 'react';
import {
  BanknotesIcon,
  ChartBarIcon,
  CalendarDaysIcon,
  ArrowTrendingUpIcon,
  CurrencyDollarIcon,
  DocumentChartBarIcon,
  BuildingOfficeIcon,
  FunnelIcon,
  ArrowDownTrayIcon,
  BuildingStorefrontIcon,
  UserIcon,
  ChevronDownIcon,
  ChevronUpIcon
} from '@heroicons/react/24/outline';

// Pass fee constant
const PASS_FEE = 300; // PKR 300 per pass

interface Pass {
  dateOfEntry: string;
  category: 'cargo' | 'landside';
  organization?: string;
  name?: string;
  passId?: string;
}

interface FinancialStats {
  year: string;
  totalPasses: number;
  cargoPasses: number;
  landsidePasses: number;
  totalRevenue: number;
  cargoRevenue: number;
  landsideRevenue: number;
}

interface MonthlyFinancialStats {
  month: string;
  passes: number;
  revenue: number;
}

interface QuarterlyStats {
  quarter: string;
  passes: number;
  revenue: number;
  cargoPasses: number;
  landsidePasses: number;
}

interface OrganizationStats {
  name: string;
  totalPasses: number;
  cargoPasses: number;
  landsidePasses: number;
  totalRevenue: number;
  employees: string[];
}

interface FinancialStatisticsProps {
  passes: Pass[];
}

type ReportPeriod = 'monthly' | 'quarterly' | 'yearly';
type ReportType = 'overall' | 'organization' | 'individual';
type CategoryFilter = 'all' | 'cargo' | 'landside';

function FinancialStatisticsPage({ passes }: FinancialStatisticsProps) {
  const [reportPeriod, setReportPeriod] = useState<ReportPeriod>('monthly');
  const [reportType, setReportType] = useState<ReportType>('overall');
  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
  const [expandedOrg, setExpandedOrg] = useState<string | null>(null);

  // Filter passes by category
  const filteredPasses = React.useMemo(() => {
    if (categoryFilter === 'all') return passes;
    return passes.filter(pass => pass.category === categoryFilter);
  }, [passes, categoryFilter]);

  // Calculate financial statistics by year
  const yearlyFinancials = React.useMemo(() => {
    const statsMap = new Map<string, FinancialStats>();

    filteredPasses.forEach(pass => {
      if (!pass.dateOfEntry) return;
      
      const year = new Date(pass.dateOfEntry).getFullYear().toString();
      
      if (!statsMap.has(year)) {
        statsMap.set(year, {
          year,
          totalPasses: 0,
          cargoPasses: 0,
          landsidePasses: 0,
          totalRevenue: 0,
          cargoRevenue: 0,
          landsideRevenue: 0
        });
      }

      const stats = statsMap.get(year)!;
      stats.totalPasses++;
      stats.totalRevenue += PASS_FEE;
      
      if (pass.category === 'cargo') {
        stats.cargoPasses++;
        stats.cargoRevenue += PASS_FEE;
      } else if (pass.category === 'landside') {
        stats.landsidePasses++;
        stats.landsideRevenue += PASS_FEE;
      }
    });

    return Array.from(statsMap.values()).sort((a, b) => 
      parseInt(b.year) - parseInt(a.year)
    );
  }, [filteredPasses]);

  // Get available years
  const availableYears = React.useMemo(() => {
    return yearlyFinancials.map(y => y.year);
  }, [yearlyFinancials]);

  // Calculate monthly statistics for selected year
  const monthlyStats = React.useMemo(() => {
    const monthlyMap = new Map<number, MonthlyFinancialStats>();
    
    // Initialize all months
    for (let i = 0; i < 12; i++) {
      monthlyMap.set(i, {
        month: new Date(parseInt(selectedYear), i, 1).toLocaleString('default', { month: 'short' }),
        passes: 0,
        revenue: 0
      });
    }

    filteredPasses.forEach(pass => {
      if (!pass.dateOfEntry) return;
      
      const entryDate = new Date(pass.dateOfEntry);
      if (entryDate.getFullYear().toString() === selectedYear) {
        const month = entryDate.getMonth();
        const stats = monthlyMap.get(month)!;
        stats.passes++;
        stats.revenue += PASS_FEE;
      }
    });

    return Array.from(monthlyMap.values());
  }, [filteredPasses, selectedYear]);

  // Calculate quarterly statistics for selected year
  const quarterlyStats = React.useMemo(() => {
    const quarters: QuarterlyStats[] = [
      { quarter: 'Q1 (Jan-Mar)', passes: 0, revenue: 0, cargoPasses: 0, landsidePasses: 0 },
      { quarter: 'Q2 (Apr-Jun)', passes: 0, revenue: 0, cargoPasses: 0, landsidePasses: 0 },
      { quarter: 'Q3 (Jul-Sep)', passes: 0, revenue: 0, cargoPasses: 0, landsidePasses: 0 },
      { quarter: 'Q4 (Oct-Dec)', passes: 0, revenue: 0, cargoPasses: 0, landsidePasses: 0 }
    ];

    filteredPasses.forEach(pass => {
      if (!pass.dateOfEntry) return;
      
      const entryDate = new Date(pass.dateOfEntry);
      if (entryDate.getFullYear().toString() === selectedYear) {
        const month = entryDate.getMonth();
        const quarterIndex = Math.floor(month / 3);
        
        quarters[quarterIndex].passes++;
        quarters[quarterIndex].revenue += PASS_FEE;
        
        if (pass.category === 'cargo') {
          quarters[quarterIndex].cargoPasses++;
        } else if (pass.category === 'landside') {
          quarters[quarterIndex].landsidePasses++;
        }
      }
    });

    return quarters;
  }, [filteredPasses, selectedYear]);

  // Calculate organization-wise statistics
  const organizationStats = React.useMemo(() => {
    const orgMap = new Map<string, OrganizationStats>();

    filteredPasses.forEach(pass => {
      if (!pass.dateOfEntry) return;
      
      const entryDate = new Date(pass.dateOfEntry);
      if (entryDate.getFullYear().toString() !== selectedYear) return;

      const orgName = pass.organization || 'Unknown Organization';
      
      if (!orgMap.has(orgName)) {
        orgMap.set(orgName, {
          name: orgName,
          totalPasses: 0,
          cargoPasses: 0,
          landsidePasses: 0,
          totalRevenue: 0,
          employees: []
        });
      }

      const stats = orgMap.get(orgName)!;
      stats.totalPasses++;
      stats.totalRevenue += PASS_FEE;
      
      if (pass.name) {
        stats.employees.push(pass.name);
      }
      
      if (pass.category === 'cargo') {
        stats.cargoPasses++;
      } else if (pass.category === 'landside') {
        stats.landsidePasses++;
      }
    });

    return Array.from(orgMap.values()).sort((a, b) => b.totalRevenue - a.totalRevenue);
  }, [filteredPasses, selectedYear]);

  // Calculate individual employee statistics
  const individualStats = React.useMemo(() => {
    const individuals = filteredPasses
      .filter(pass => {
        if (!pass.dateOfEntry) return false;
        const entryDate = new Date(pass.dateOfEntry);
        return entryDate.getFullYear().toString() === selectedYear;
      })
      .map(pass => ({
        name: pass.name || 'Unknown',
        organization: pass.organization || 'Unknown Organization',
        category: pass.category || 'unknown',
        dateOfEntry: pass.dateOfEntry,
        passId: pass.passId,
        revenue: PASS_FEE
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    return individuals;
  }, [filteredPasses, selectedYear]);

  // Calculate overall totals
  const overallTotals = React.useMemo(() => {
    return yearlyFinancials.reduce(
      (acc, year) => ({
        totalPasses: acc.totalPasses + year.totalPasses,
        totalRevenue: acc.totalRevenue + year.totalRevenue,
        cargoPasses: acc.cargoPasses + year.cargoPasses,
        landsidePasses: acc.landsidePasses + year.landsidePasses
      }),
      { totalPasses: 0, totalRevenue: 0, cargoPasses: 0, landsidePasses: 0 }
    );
  }, [yearlyFinancials]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-PK', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const currentYear = new Date().getFullYear();
  const currentYearStats = yearlyFinancials.find(y => y.year === currentYear.toString());

  // Export functionality
  const exportToCSV = () => {
    let csvContent = '';
    let filename = '';
    const categoryLabel = categoryFilter === 'all' ? 'All' : categoryFilter === 'cargo' ? 'Cargo' : 'Landside';

    if (reportType === 'overall') {
      if (reportPeriod === 'monthly') {
        csvContent = 'Month,Passes,Revenue\n';
        monthlyStats.forEach(m => {
          csvContent += `${m.month},${m.passes},${m.revenue}\n`;
        });
        filename = `monthly-report-${categoryLabel}-${selectedYear}.csv`;
      } else if (reportPeriod === 'quarterly') {
        csvContent = 'Quarter,Passes,Cargo,Landside,Revenue\n';
        quarterlyStats.forEach(q => {
          csvContent += `${q.quarter},${q.passes},${q.cargoPasses},${q.landsidePasses},${q.revenue}\n`;
        });
        filename = `quarterly-report-${categoryLabel}-${selectedYear}.csv`;
      } else {
        csvContent = 'Year,Total Passes,Cargo,Landside,Revenue\n';
        yearlyFinancials.forEach(y => {
          csvContent += `${y.year},${y.totalPasses},${y.cargoPasses},${y.landsidePasses},${y.totalRevenue}\n`;
        });
        filename = `yearly-report-${categoryLabel}-all.csv`;
      }
    } else if (reportType === 'organization') {
      csvContent = 'Organization,Total Passes,Cargo,Landside,Revenue,Employees\n';
      organizationStats.forEach(org => {
        csvContent += `${org.name},${org.totalPasses},${org.cargoPasses},${org.landsidePasses},${org.totalRevenue},${org.employees.length}\n`;
      });
      filename = `organization-report-${categoryLabel}-${selectedYear}.csv`;
    } else {
      csvContent = 'Name,Organization,Category,Date of Entry,Pass ID,Revenue\n';
      individualStats.forEach(ind => {
        csvContent += `${ind.name},${ind.organization},${ind.category},${formatDate(ind.dateOfEntry)},${ind.passId || 'N/A'},${ind.revenue}\n`;
      });
      filename = `individual-report-${categoryLabel}-${selectedYear}.csv`;
    }

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-800 dark:text-slate-100">
            Financial Statistics & Reports
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-2">
            Comprehensive revenue analysis with customizable reports
          </p>
        </div>

        {/* Overall Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-gradient-to-br from-green-50 to-emerald-100 dark:from-green-900/30 dark:to-emerald-800/30 rounded-xl shadow-lg border border-green-200 dark:border-green-700/50 p-6">
            <div className="flex items-center justify-between mb-2">
              <CurrencyDollarIcon className="w-8 h-8 text-green-600 dark:text-green-400" />
              <span className="text-sm font-medium text-green-700 dark:text-green-300">
                All Time
              </span>
            </div>
            <p className="text-3xl font-bold text-green-700 dark:text-green-300 mb-1">
              {formatCurrency(overallTotals.totalRevenue)}
            </p>
            <p className="text-sm text-green-600 dark:text-green-400">
              Total Revenue
            </p>
          </div>

          <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 rounded-xl shadow-lg border border-blue-200 dark:border-blue-700/50 p-6">
            <div className="flex items-center justify-between mb-2">
              <DocumentChartBarIcon className="w-8 h-8 text-blue-600 dark:text-blue-400" />
              <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                All Time
              </span>
            </div>
            <p className="text-3xl font-bold text-blue-700 dark:text-blue-300 mb-1">
              {overallTotals.totalPasses.toLocaleString()}
            </p>
            <p className="text-sm text-blue-600 dark:text-blue-400">
              Total Passes Issued
            </p>
          </div>

          <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/30 dark:to-purple-800/30 rounded-xl shadow-lg border border-purple-200 dark:border-purple-700/50 p-6">
            <div className="flex items-center justify-between mb-2">
              <ArrowTrendingUpIcon className="w-8 h-8 text-purple-600 dark:text-purple-400" />
              <span className="text-sm font-medium text-purple-700 dark:text-purple-300">
                {currentYear}
              </span>
            </div>
            <p className="text-3xl font-bold text-purple-700 dark:text-purple-300 mb-1">
              {formatCurrency(currentYearStats?.totalRevenue || 0)}
            </p>
            <p className="text-sm text-purple-600 dark:text-purple-400">
              Current Year Revenue
            </p>
          </div>

          <div className="bg-gradient-to-br from-amber-50 to-orange-100 dark:from-amber-900/30 dark:to-orange-800/30 rounded-xl shadow-lg border border-amber-200 dark:border-amber-700/50 p-6">
            <div className="flex items-center justify-between mb-2">
              <BanknotesIcon className="w-8 h-8 text-amber-600 dark:text-amber-400" />
              <span className="text-sm font-medium text-amber-700 dark:text-amber-300">
                Per Pass
              </span>
            </div>
            <p className="text-3xl font-bold text-amber-700 dark:text-amber-300 mb-1">
              {formatCurrency(PASS_FEE)}
            </p>
            <p className="text-sm text-amber-600 dark:text-amber-400">
              Standard Fee
            </p>
          </div>
        </div>

        {/* Report Filters */}
        <div className="bg-white dark:bg-slate-800/70 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 p-6 mb-8">
          <div className="flex items-center mb-4">
            <FunnelIcon className="w-5 h-5 text-indigo-600 dark:text-indigo-400 mr-2" />
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">
              Generate Custom Report
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {/* Category Filter */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Category Filter
              </label>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value as CategoryFilter)}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
              >
                <option value="all">All Categories</option>
                <option value="cargo">Cargo Only</option>
                <option value="landside">Landside Only</option>
              </select>
            </div>

            {/* Report Period */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Report Period
              </label>
              <select
                value={reportPeriod}
                onChange={(e) => setReportPeriod(e.target.value as ReportPeriod)}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
              >
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>

            {/* Report Type */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Report Type
              </label>
              <select
                value={reportType}
                onChange={(e) => setReportType(e.target.value as ReportType)}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
              >
                <option value="overall">Overall Summary</option>
                <option value="organization">By Organization</option>
                <option value="individual">By Individual</option>
              </select>
            </div>

            {/* Year Selection */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Select Year
              </label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
              >
                {availableYears.map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>

            {/* Export Button */}
            <div className="flex items-end">
              <button
                onClick={exportToCSV}
                className="w-full inline-flex items-center justify-center px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors font-medium"
              >
                <ArrowDownTrayIcon className="w-4 h-4 mr-2" />
                Export CSV
              </button>
            </div>
          </div>
        </div>

        {/* Report Content */}
        {reportType === 'overall' && (
          <>
            {reportPeriod === 'monthly' && (
              <div className="bg-white dark:bg-slate-800/70 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 p-6 mb-8">
                <div className="flex items-center mb-6">
                  <ChartBarIcon className="w-6 h-6 text-indigo-600 dark:text-indigo-400 mr-3" />
                  <div>
                    <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">
                      Monthly Revenue Report - {selectedYear}
                    </h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      Pass issuance and revenue by month
                    </p>
                  </div>
                </div>
                
                <div className="space-y-3">
                  {monthlyStats.map((month) => (
                    <div key={month.month} className="flex items-center">
                      <div className="w-16 text-sm font-medium text-slate-600 dark:text-slate-400">
                        {month.month}
                      </div>
                      <div className="flex-1 ml-4">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm text-slate-600 dark:text-slate-400">
                            {month.passes} passes
                          </span>
                          <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                            {formatCurrency(month.revenue)}
                          </span>
                        </div>
                        <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                          <div
                            className="bg-gradient-to-r from-indigo-500 to-purple-500 h-2 rounded-full transition-all duration-500"
                            style={{
                              width: `${month.passes > 0 ? Math.max((month.revenue / Math.max(...monthlyStats.map(m => m.revenue))) * 100, 5) : 0}%`
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {reportPeriod === 'quarterly' && (
              <div className="bg-white dark:bg-slate-800/70 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 p-6 mb-8">
                <div className="flex items-center mb-6">
                  <CalendarDaysIcon className="w-6 h-6 text-blue-600 dark:text-blue-400 mr-3" />
                  <div>
                    <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">
                      Quarterly Revenue Report - {selectedYear}
                    </h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      Pass distribution and revenue by quarter
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {quarterlyStats.map((quarter) => (
                    <div
                      key={quarter.quarter}
                      className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900/50 dark:to-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700 p-5"
                    >
                      <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4">
                        {quarter.quarter}
                      </h3>

                      <div className="space-y-3">
                        <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded">
                          <span className="text-sm font-medium text-green-700 dark:text-green-300">
                            Total Revenue
                          </span>
                          <span className="text-lg font-bold text-green-700 dark:text-green-300">
                            {formatCurrency(quarter.revenue)}
                          </span>
                        </div>

                        <div className="flex items-center justify-between p-2 bg-blue-50 dark:bg-blue-900/20 rounded">
                          <span className="text-xs text-blue-600 dark:text-blue-400">
                            🚛 Cargo
                          </span>
                          <span className="text-sm font-semibold text-blue-700 dark:text-blue-300">
                            {quarter.cargoPasses} passes
                          </span>
                        </div>

                        <div className="flex items-center justify-between p-2 bg-purple-50 dark:bg-purple-900/20 rounded">
                          <span className="text-xs text-purple-600 dark:text-purple-400">
                            🏢 Landside
                          </span>
                          <span className="text-sm font-semibold text-purple-700 dark:text-purple-300">
                            {quarter.landsidePasses} passes
                          </span>
                        </div>

                        <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
                          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                            <span>Total Passes</span>
                            <span className="font-semibold">{quarter.passes}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {reportPeriod === 'yearly' && (
              <div className="bg-white dark:bg-slate-800/70 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 p-6 mb-8">
                <div className="flex items-center mb-6">
                  <CalendarDaysIcon className="w-6 h-6 text-blue-600 dark:text-blue-400 mr-3" />
                  <div>
                    <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">
                      Year-Wise Financial Report
                    </h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      Complete revenue breakdown by year
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {yearlyFinancials.map((year) => (
                    <div
                      key={year.year}
                      className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900/50 dark:to-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700 p-5"
                    >
                      <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-200 dark:border-slate-700">
                        <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
                          {year.year}
                        </h3>
                        <BuildingOfficeIcon className="w-6 h-6 text-slate-500 dark:text-slate-400" />
                      </div>

                      <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                        <p className="text-xs text-green-600 dark:text-green-400 mb-1">
                          Total Revenue
                        </p>
                        <p className="text-2xl font-bold text-green-700 dark:text-green-300">
                          {formatCurrency(year.totalRevenue)}
                        </p>
                        <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                          {year.totalPasses} passes issued
                        </p>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between p-2 bg-blue-50 dark:bg-blue-900/20 rounded">
                          <div>
                            <span className="text-xs text-blue-600 dark:text-blue-400">
                              🚛 Cargo
                            </span>
                            <p className="text-sm font-semibold text-blue-700 dark:text-blue-300">
                              {year.cargoPasses} passes
                            </p>
                          </div>
                          <p className="text-sm font-bold text-blue-700 dark:text-blue-300">
                            {formatCurrency(year.cargoRevenue)}
                          </p>
                        </div>

                        <div className="flex items-center justify-between p-2 bg-purple-50 dark:bg-purple-900/20 rounded">
                          <div>
                            <span className="text-xs text-purple-600 dark:text-purple-400">
                              🏢 Landside
                            </span>
                            <p className="text-sm font-semibold text-purple-700 dark:text-purple-300">
                              {year.landsidePasses} passes
                            </p>
                          </div>
                          <p className="text-sm font-bold text-purple-700 dark:text-purple-300">
                            {formatCurrency(year.landsideRevenue)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {reportType === 'organization' && (
          <div className="bg-white dark:bg-slate-800/70 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 p-6 mb-8">
            <div className="flex items-center mb-6">
              <BuildingStorefrontIcon className="w-6 h-6 text-emerald-600 dark:text-emerald-400 mr-3" />
              <div>
                <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">
                  Organization-Wise Report - {selectedYear}
                  {categoryFilter !== 'all' && (
                    <span className="ml-2 text-sm font-normal text-slate-500">
                      ({categoryFilter === 'cargo' ? '🚛 Cargo Only' : '🏢 Landside Only'})
                    </span>
                  )}
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Revenue breakdown by company/organization
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {organizationStats.length > 0 ? (
                organizationStats.map((org, index) => (
                  <div
                    key={org.name}
                    className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden"
                  >
                    <div
                      className="bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20 p-4 cursor-pointer hover:from-emerald-100 hover:to-green-100 dark:hover:from-emerald-900/30 dark:hover:to-green-900/30 transition-colors"
                      onClick={() => setExpandedOrg(expandedOrg === org.name ? null : org.name)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center mb-2">
                            <span className="text-lg font-bold text-slate-800 dark:text-slate-100">
                              {/* FIX: Used 'index' to create a numbered list */}
                              {index + 1}. {org.name}
                            </span>
                            <span className="ml-3 px-2 py-1 bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 text-xs rounded-full">
                              {org.employees.length} employees
                            </span>
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                              <p className="text-slate-500 dark:text-slate-400 text-xs">Total Passes</p>
                              <p className="font-semibold text-slate-700 dark:text-slate-200">{org.totalPasses}</p>
                            </div>
                            <div>
                              <p className="text-slate-500 dark:text-slate-400 text-xs">Cargo</p>
                              <p className="font-semibold text-blue-600 dark:text-blue-400">{org.cargoPasses}</p>
                            </div>
                            <div>
                              <p className="text-slate-500 dark:text-slate-400 text-xs">Landside</p>
                              <p className="font-semibold text-purple-600 dark:text-purple-400">{org.landsidePasses}</p>
                            </div>
                            <div>
                              <p className="text-slate-500 dark:text-slate-400 text-xs">Total Revenue</p>
                              <p className="font-bold text-green-600 dark:text-green-400">{formatCurrency(org.totalRevenue)}</p>
                            </div>
                          </div>
                        </div>
                        <div className="ml-4">
                          {expandedOrg === org.name ? (
                            <ChevronUpIcon className="w-5 h-5 text-slate-500" />
                          ) : (
                            <ChevronDownIcon className="w-5 h-5 text-slate-500" />
                          )}
                        </div>
                      </div>
                    </div>

                    {expandedOrg === org.name && (
                      <div className="bg-white dark:bg-slate-800/50 p-4 border-t border-slate-200 dark:border-slate-700">
                        <h4 className="font-semibold text-slate-700 dark:text-slate-300 mb-3 flex items-center">
                          <UserIcon className="w-4 h-4 mr-2" />
                          Employees ({org.employees.length})
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                          {org.employees.map((employee, idx) => (
                            <div
                              key={idx}
                              className="text-sm text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/50 px-3 py-2 rounded"
                            >
                              {idx + 1}. {employee}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-center py-12">
                  <BuildingStorefrontIcon className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                  <p className="text-slate-500 dark:text-slate-400">
                    No organization data available for {selectedYear}
                  </p>
                </div>
              )}
            </div>

            {/* Organization Summary */}
            {organizationStats.length > 0 && (
              <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-700">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                  <div>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Total Organizations</p>
                    <p className="text-2xl font-bold text-slate-700 dark:text-slate-200">
                      {organizationStats.length}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Total Employees</p>
                    <p className="text-2xl font-bold text-slate-700 dark:text-slate-200">
                      {organizationStats.reduce((sum, org) => sum + org.employees.length, 0)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Total Passes</p>
                    <p className="text-2xl font-bold text-slate-700 dark:text-slate-200">
                      {organizationStats.reduce((sum, org) => sum + org.totalPasses, 0)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Total Revenue</p>
                    <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                      {formatCurrency(organizationStats.reduce((sum, org) => sum + org.totalRevenue, 0))}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {reportType === 'individual' && (
          <div className="bg-white dark:bg-slate-800/70 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 p-6 mb-8">
            <div className="flex items-center mb-6">
              <UserIcon className="w-6 h-6 text-blue-600 dark:text-blue-400 mr-3" />
              <div>
                <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">
                  Individual Employee Report - {selectedYear}
                  {categoryFilter !== 'all' && (
                    <span className="ml-2 text-sm font-normal text-slate-500">
                      ({categoryFilter === 'cargo' ? '🚛 Cargo Only' : '🏢 Landside Only'})
                    </span>
                  )}
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Detailed list of all employees with passes
                </p>
              </div>
            </div>

            {individualStats.length > 0 ? (
              <>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                    <thead className="bg-slate-50 dark:bg-slate-900/50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                          #
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                          Name
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                          Organization
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                          Category
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                          Pass ID
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                          Date of Entry
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                          Revenue
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-slate-800/50 divide-y divide-slate-200 dark:divide-slate-700">
                      {individualStats.map((individual, index) => (
                        <tr key={index} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                          <td className="px-4 py-3 text-sm text-slate-900 dark:text-slate-100">
                            {index + 1}
                          </td>
                          <td className="px-4 py-3 text-sm font-medium text-slate-900 dark:text-slate-100">
                            {individual.name}
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">
                            {individual.organization}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              individual.category === 'cargo'
                                ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                                : 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300'
                            }`}>
                              {individual.category === 'cargo' ? '🚛 Cargo' : '🏢 Landside'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm font-mono text-slate-600 dark:text-slate-400">
                            {individual.passId || 'N/A'}
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">
                            {formatDate(individual.dateOfEntry)}
                          </td>
                          <td className="px-4 py-3 text-sm font-semibold text-green-600 dark:text-green-400">
                            {formatCurrency(individual.revenue)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-slate-50 dark:bg-slate-900/50">
                      <tr>
                        <td colSpan={6} className="px-4 py-3 text-sm font-bold text-slate-700 dark:text-slate-300 text-right">
                          Total:
                        </td>
                        <td className="px-4 py-3 text-sm font-bold text-green-600 dark:text-green-400">
                          {formatCurrency(individualStats.length * PASS_FEE)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {/* Individual Summary */}
                <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-700">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                    <div>
                      <p className="text-sm text-slate-500 dark:text-slate-400">Total Individuals</p>
                      <p className="text-2xl font-bold text-slate-700 dark:text-slate-200">
                        {individualStats.length}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-500 dark:text-slate-400">Cargo Passes</p>
                      <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                        {individualStats.filter(i => i.category === 'cargo').length}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-500 dark:text-slate-400">Landside Passes</p>
                      <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                        {individualStats.filter(i => i.category === 'landside').length}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-500 dark:text-slate-400">Total Revenue</p>
                      <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                        {formatCurrency(individualStats.length * PASS_FEE)}
                      </p>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-12">
                <UserIcon className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                <p className="text-slate-500 dark:text-slate-400">
                  No individual data available for {selectedYear}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Fee Information */}
        <div className="bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-indigo-900/20 dark:to-blue-900/20 rounded-xl shadow-lg border border-indigo-200 dark:border-indigo-700/50 p-6">
          <div className="flex items-start">
            <BanknotesIcon className="w-6 h-6 text-indigo-600 dark:text-indigo-400 mt-1 mr-3 flex-shrink-0" />
            <div>
              <h3 className="text-lg font-semibold text-indigo-800 dark:text-indigo-300 mb-2">
                Fee Structure & Report Information
              </h3>
              <div className="space-y-1 text-sm text-indigo-700 dark:text-indigo-400">
                <p>• Standard pass fee: <span className="font-semibold">{formatCurrency(PASS_FEE)}</span> per pass</p>
                <p>• Applies to both Cargo and Landside passes</p>
                <p>• Reports can be filtered by period (Monthly/Quarterly/Yearly)</p>
                <p>• Export functionality available in CSV format for all report types</p>
                <p>• Organization reports show detailed employee breakdown</p>
                <p>• Individual reports provide complete pass holder listing</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default FinancialStatisticsPage;