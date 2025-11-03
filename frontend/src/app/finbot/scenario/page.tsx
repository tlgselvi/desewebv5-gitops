"use client";
import { FC, useState } from "react";
import Link from "next/link";

interface Scenario {
  id: string;
  name: string;
  description: string;
  projectedIncome: number;
  projectedExpense: number;
  projectedSavings: number;
  timeFrame: string;
}

export default function ScenarioPage() {
  const [scenarios, setScenarios] = useState<Scenario[]>([
    {
      id: '1',
      name: 'Current Plan',
      description: 'Continue with current spending patterns',
      projectedIncome: 8500,
      projectedExpense: 6240,
      projectedSavings: 2260,
      timeFrame: 'monthly',
    },
    {
      id: '2',
      name: 'Reduce Expenses',
      description: 'Cut 20% from discretionary spending',
      projectedIncome: 8500,
      projectedExpense: 4992,
      projectedSavings: 3508,
      timeFrame: 'monthly',
    },
    {
      id: '3',
      name: 'Increase Savings',
      description: 'Save 40% of income',
      projectedIncome: 8500,
      projectedExpense: 5100,
      projectedSavings: 3400,
      timeFrame: 'monthly',
    },
  ]);

  const [showCreateModal, setShowCreateModal] = useState(false);

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
              🔮 Scenario Analysis
            </h1>
            <p className="text-gray-600">What-if analizi ve finansal projeksiyonlar</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            + New Scenario
          </button>
        </div>

        {/* Scenarios Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {scenarios.map((scenario) => (
            <div
              key={scenario.id}
              className="p-6 bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
            >
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-1">
                  {scenario.name}
                </h3>
                <p className="text-sm text-gray-500">{scenario.description}</p>
              </div>

              {/* Projections */}
              <div className="space-y-3 mb-4">
                <div className="flex items-center justify-between p-3 bg-green-50 rounded">
                  <span className="text-sm text-gray-600">Projected Income</span>
                  <span className="text-sm font-semibold text-green-700">
                    ${scenario.projectedIncome.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-red-50 rounded">
                  <span className="text-sm text-gray-600">Projected Expense</span>
                  <span className="text-sm font-semibold text-red-700">
                    ${scenario.projectedExpense.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-blue-50 rounded">
                  <span className="text-sm text-gray-600">Projected Savings</span>
                  <span className="text-sm font-semibold text-blue-700">
                    ${scenario.projectedSavings.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-200">
                <div className="flex gap-2">
                  <button className="flex-1 px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded transition-colors">
                    Compare
                  </button>
                  <button className="flex-1 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded transition-colors">
                    Edit
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Comparison Chart Section */}
        <div className="mt-8 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Scenario Comparison</h2>
          <div className="text-center py-12 text-gray-500">
            <span className="text-4xl mb-2 block">📈</span>
            <p>Chart visualization will be implemented here</p>
            <p className="text-sm mt-2">Compare different scenarios side by side</p>
          </div>
        </div>
      </div>
    </div>
  );
}

