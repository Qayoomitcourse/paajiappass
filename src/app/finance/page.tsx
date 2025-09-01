// app/finance/page.tsx (Example Component)
"use client";

import { useState, useEffect } from 'react';
import { client } from '@/sanity/lib/client';

// Define an interface for the payment data
interface FeePayment {
  _id: string;
  receiptNo: string;
  paymentDate: string;
  bank: string;
  totalAmount: number;
  // This will be populated with data from the referenced employees
  employees: {
    _id: string;
    name: string;
    passId: number;
    organization: string;
  }[];
}

export default function FinancialRecordsPage() {
  const [payments, setPayments] = useState<FeePayment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch all payment records and their associated employees
  useEffect(() => {
    const fetchPayments = async () => {
      setIsLoading(true);
      const query = `*[_type == "feePayment"]{
        _id,
        receiptNo,
        paymentDate,
        bank,
        totalAmount,
        "employees": employees[]->{
          _id,
          name,
          passId,
          organization
        }
      }`;
      const data = await client.fetch(query);
      setPayments(data);
      setIsLoading(false);
    };
    fetchPayments();
  }, []);

  const feePerEmployee = 300;

  if (isLoading) return <div className="text-center py-10">Loading financial records...</div>;

  return (
    <div className="max-w-7xl mx-auto p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Financial Records</h1>
        {/* This button would open a modal or navigate to a new page to add a payment */}
        <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          Add New Receipt
        </button>
      </div>

      <div className="bg-white shadow-md rounded-lg overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Receipt No.</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount (PKR)</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Usage</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Balance (PKR)</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Associated Employees</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {payments.map((payment) => {
              const employeesPaidFor = payment.employees?.length || 0;
              const maxEmployees = Math.floor(payment.totalAmount / feePerEmployee);
              const balance = payment.totalAmount - (employeesPaidFor * feePerEmployee);

              return (
                <tr key={payment._id}>
                  <td className="px-6 py-4 font-medium text-gray-900">{payment.receiptNo}</td>
                  <td className="px-6 py-4 text-gray-700">{payment.totalAmount.toLocaleString()}</td>
                  <td className="px-6 py-4 text-gray-700">{employeesPaidFor} / {maxEmployees}</td>
                  <td className={`px-6 py-4 font-semibold ${balance > 0 ? 'text-green-600' : 'text-gray-600'}`}>
                    {balance.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-gray-700">
                    {payment.employees?.map(e => e.name).join(', ') || 'None'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}