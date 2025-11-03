"use client";
import { FC, useEffect, useState } from "react";
import { apiMethods } from "@/api/client";
import Link from "next/link";

interface Budget {
  id: string;
  name: string;
  category: string;
  allocated: number;
  spent: number;
  period: string;
  startDate: string;
  endDate: string;
}

export default function BudgetsPage() {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBudgets();
  }, []);

  const fetchBudgets = async () => {
    try {
      // TODO: Replace with actual API call
      // const data = await apiMethods.get<Budget[]>('/finbot/budgets');
      // setBudgets(data);
      
      // Mock data
      setBudgets([
        {
          id: '1',
          name: 'Monthly Groceries',
          category: 'Food',
          allocated: 500.00,
          spent: 325.50,
          period: 'monthly',
          startDate: '2025-01-01',
          endDate: '2025-01-31',
        },
        {
          id: '2',
          name: 'Utilities Budget',
          category: 'Utilities',
          allocated: 200.00,
          spent: 185.00,
          period: 'monthly',
          startDate: '2025-01-01',
          endDate: '2025-01-31',
        },
        {
          id: '3',
          name: 'Entertainment',
          category: 'Entertainment',
          allocated: 300.00,
          spent: 275.75,
          period: 'monthly',
          startDate: '2025-01-01',
          endDate: '2025-01-31',
        },
      ]);
    } catch (error) {
      console.error('Failed to fetch budgets:', error);
    } finally {
      setLoading(false);
    }
  };

  const getProgressPercentage = (spent: number, allocated: number) => {
    return Math.min((spent / allocated) * 100, 100);
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 90) return 'bg-red-500';
    if (percentage >= 75) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getRemainingAmount = (allocated: number, spent: number) => {
    return allocated - spent;
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="max-w-7xl w-full mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <Link href="/finbot" className="text-blue-600 hover:text-blue-700 mb-2 inline-block">
              ← FinBot Dashboard
            </Link>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              📊 Budgets
            </h1>
            <p className="text-gray-600">Bütçe planlama ve takip</p>
          </div>
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            + New Budget
          </button>
        </div>

        {/* Budgets Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {budgets.map((budget) => {
            const progress = getProgressPercentage(budget.spent, budget.allocated);
            const remaining = getRemainingAmount(budget.allocated, budget.spent);
            
            return (
              <div
                key={budget.id}
                className="p-6 bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">
                      {budget.name}
                    </h3>
                    <p className="text-sm text-gray-500 capitalize">{budget.category}</p>
                  </div>
                  <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-700 rounded">
                    {budget.period}
                  </span>
                </div>

                {/* Progress Bar */}
                <div className="mb-4">
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-gray-600">
                      ${budget.spent.toLocaleString('en-US', { minimumFractionDigits: 2 })} / ${budget.allocated.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </span>
                    <span className={`font-semibold ${
                      progress >= 90 ? 'text-red-600' : progress >= 75 ? 'text-yellow-600' : 'text-green-600'
                    }`}>
                      {progress.toFixed(1)}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div
                      className={`h-2.5 rounded-full transition-all ${getProgressColor(progress)}`}
                      style={{ width: `${progress}%` }}
                    ></div>
                  </div>
                </div>

                {/* Remaining Amount */}
                <div className="pt-4 border-t border-gray-200">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">Remaining</span>
                    <span className={`text-lg font-bold ${
                      remaining >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      ${Math.abs(remaining).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

                <div className="flex gap-2 mt-4">
                  <button className="flex-1 px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded transition-colors">
                    Edit
                  </button>
                  <button className="flex-1 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded transition-colors">
                    Details
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Summary Card */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
          <div className="p-6 bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="text-sm text-gray-500 mb-1">Total Budget</div>
            <div className="text-2xl font-bold text-gray-900">
              ${budgets.reduce((sum, b) => sum + b.allocated, 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
          </div>
          <div className="p-6 bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="text-sm text-gray-500 mb-1">Total Spent</div>
            <div className="text-2xl font-bold text-red-600">
              ${budgets.reduce((sum, b) => sum + b.spent, 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
          </div>
          <div className="p-6 bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="text-sm text-gray-500 mb-1">Total Remaining</div>
            <div className="text-2xl font-bold text-green-600">
              ${budgets.reduce((sum, b) => sum + getRemainingAmount(b.allocated, b.spent), 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
          </div>
        </div>

        {/* Empty State */}
        {budgets.length === 0 && (
          <div className="text-center py-12 bg-white rounded-lg shadow-sm border border-gray-200">
            <span className="text-6xl mb-4 block">📊</span>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No budgets yet</h3>
            <p className="text-gray-500 mb-4">Create your first budget to track your spending</p>
            <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              Create Budget
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

