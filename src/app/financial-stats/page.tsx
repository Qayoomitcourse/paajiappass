'use client';

import React, { useMemo, useState, useEffect } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { DollarSign, Ticket, Plane, Building } from 'lucide-react';

// Define the structure of a pass
interface EmployeePass {
  _id: string;
  dateOfEntry: string;
  category: 'cargo' | 'landside';
}

// Define the label render props type
interface PieLabelRenderProps {
  cx?: number;
  cy?: number;
  midAngle?: number;
  innerRadius?: number;
  outerRadius?: number;
  percent?: number;
}

// --- Constants ---
const PASS_FEE = 300; // Assuming a fixed fee of Rs. 300 per pass
const PIE_CHART_COLORS = ['#0088FE', '#00C49F']; // Colors for Cargo and Landside

// --- Main Component ---
export default function FinancialStatisticsPage() {
  const [passes, setPasses] = useState<EmployeePass[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState<string>('all');

  // Fetch passes data
  useEffect(() => {
    async function fetchPasses() {
      try {
        const response = await fetch('/api/employee-passes');
        if (response.ok) {
          const data = await response.json();
          setPasses(data.passes || []);
        }
      } catch (error) {
        console.error('Failed to fetch passes:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchPasses();
  }, []);

  // useMemo will recalculate statistics only when passes or selectedYear change
  const stats = useMemo(() => {
    // 1. Get a unique list of years from the data for the filter dropdown
    const availableYears = [
      ...new Set(
        passes.map((p) => new Date(p.dateOfEntry).getFullYear().toString())
      ),
    ].sort((a, b) => parseInt(b) - parseInt(a));

    // 2. Filter passes based on the selected year
    const filteredPasses =
      selectedYear === 'all'
        ? passes
        : passes.filter(
            (p) => new Date(p.dateOfEntry).getFullYear().toString() === selectedYear
          );

    // 3. Calculate summary statistics
    let cargoRevenue = 0;
    let landsideRevenue = 0;

    filteredPasses.forEach((pass) => {
      if (pass.category === 'cargo') {
        cargoRevenue += PASS_FEE;
      } else if (pass.category === 'landside') {
        landsideRevenue += PASS_FEE;
      }
    });

    const totalRevenue = cargoRevenue + landsideRevenue;
    const totalPasses = filteredPasses.length;

    // 4. Prepare data for the monthly revenue bar chart
    const monthlyData = Array.from({ length: 12 }, (_, i) => ({
      name: new Date(0, i).toLocaleString('default', { month: 'short' }),
      revenue: 0,
    }));

    filteredPasses.forEach((pass) => {
      const monthIndex = new Date(pass.dateOfEntry).getMonth();
      monthlyData[monthIndex].revenue += PASS_FEE;
    });

    // 5. Prepare data for the category revenue pie chart
    const categoryData = [
      { name: 'Cargo', value: cargoRevenue },
      { name: 'Landside', value: landsideRevenue },
    ];

    return {
      totalRevenue,
      totalPasses,
      cargoRevenue,
      landsideRevenue,
      monthlyData,
      categoryData,
      availableYears,
    };
  }, [passes, selectedYear]);

  // Helper to format currency
  const formatCurrency = (amount: number) => {
    return `Rs. ${amount.toLocaleString()}`;
  };

  // Custom label renderer for pie chart with proper type checking
  const renderCustomLabel = (props: PieLabelRenderProps) => {
    const { cx, cy, midAngle, innerRadius, outerRadius, percent } = props;
    
    // Check if all required values are defined
    if (
      cx === undefined ||
      cy === undefined ||
      midAngle === undefined ||
      innerRadius === undefined ||
      outerRadius === undefined ||
      percent === undefined
    ) {
      return null;
    }

    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * (Math.PI / 180));
    const y = cy + radius * Math.sin(-midAngle * (Math.PI / 180));

    return (
      <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central">
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading financial data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Financial Statistics
            </h1>
            <p className="text-gray-600 mt-1">
              Revenue analysis based on issued passes.
            </p>
          </div>
          {/* Year Filter Dropdown */}
          <div className="mt-4 sm:mt-0">
            <label htmlFor="year-filter" className="sr-only">Filter by year</label>
            <select
              id="year-filter"
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="block w-full sm:w-auto pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
            >
              <option value="all">All Time</option>
              {stats.availableYears.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Statistic Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            title="Total Revenue"
            value={formatCurrency(stats.totalRevenue)}
            icon={<DollarSign className="h-8 w-8 text-green-500" />}
          />
          <StatCard
            title="Total Passes Issued"
            value={stats.totalPasses.toLocaleString()}
            icon={<Ticket className="h-8 w-8 text-blue-500" />}
          />
          <StatCard
            title="Cargo Revenue"
            value={formatCurrency(stats.cargoRevenue)}
            icon={<Plane className="h-8 w-8 text-indigo-500" />}
          />
          <StatCard
            title="Landside Revenue"
            value={formatCurrency(stats.landsideRevenue)}
            icon={<Building className="h-8 w-8 text-amber-500" />}
          />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Monthly Revenue Chart (Bar Chart) */}
          <div className="lg:col-span-2 bg-white p-6 rounded-lg shadow">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">
              Monthly Revenue ({selectedYear === 'all' ? 'All Time' : selectedYear})
            </h2>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={stats.monthlyData} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" />
                <YAxis tickFormatter={(value) => `Rs. ${Number(value) / 1000}k`} />
                <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                <Legend />
                <Bar dataKey="revenue" fill="#3B82F6" name="Revenue" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Revenue by Category (Pie Chart) */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">
              Revenue by Category
            </h2>
            <ResponsiveContainer width="100%" height={400}>
              <PieChart>
                <Pie
                  data={stats.categoryData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={120}
                  fill="#8884d8"
                  dataKey="value"
                  nameKey="name"
                  label={renderCustomLabel}
                >
                  {stats.categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={PIE_CHART_COLORS[index % PIE_CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

// A reusable component for the statistic cards
function StatCard({ title, value, icon }: { title: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="bg-white p-6 rounded-lg shadow flex items-center">
      <div className="bg-gray-100 rounded-full p-3 mr-4">{icon}</div>
      <div>
        <p className="text-sm text-gray-600">{title}</p>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
      </div>
    </div>
  );
}