"use client";
import { FC, useEffect, useState } from "react";
import Link from "next/link";
import { apiMethods } from "@/api/client";

interface DashboardStats {
  totalAccounts: number;
  totalTransactions: number;
  totalBudgets: number;
  totalBalance: number;
  monthlyIncome: number;
  monthlyExpense: number;
}

export default function FinBotDashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    totalAccounts: 0,
    totalTransactions: 0,
    totalBudgets: 0,
    totalBalance: 0,
    monthlyIncome: 0,
    monthlyExpense: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // TODO: Replace with actual API call
    // const fetchStats = async () => {
    //   try {
    //     const data = await apiMethods.get<DashboardStats>('/finbot/dashboard/stats');
    //     setStats(data);
    //   } catch (error) {
    //     console.error('Failed to fetch stats:', error);
    //   } finally {
    //     setLoading(false);
    //   }
    // };
    // fetchStats();
    
    // Mock data for now
    setStats({
      totalAccounts: 5,
      totalTransactions: 127,
      totalBudgets: 3,
      totalBalance: 45230.50,
      monthlyIncome: 8500.00,
      monthlyExpense: 6240.75,
    });
    setLoading(false);
  }, []);

  const StatCard: FC<{ title: string; value: string | number; icon: string; color: string; link?: string }> = ({ 
    title, 
    value, 
    icon, 
    color,
    link 
  }) => {
    const content = (
      <div className={`p-6 bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow ${link ? 'cursor-pointer' : ''}`}>
        <div className="flex items-center justify-between mb-4">
          <span className={`text-3xl ${color}`}>{icon}</span>
          <span className="text-sm text-gray-500">{title}</span>
        </div>
        <div className="text-2xl font-bold text-gray-900">
          {typeof value === 'number' && title.includes('Balance') || title.includes('Income') || title.includes('Expense') 
            ? `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
            : value}
        </div>
      </div>
    );

    if (link) {
      return <Link href={link}>{content}</Link>;
    }
    return content;
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
        <div className="mb-6">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            💰 FinBot Dashboard
          </h1>
          <p className="text-gray-600">
            Finansal planlama ve bütçe yönetimi
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <StatCard 
            title="Toplam Bakiye" 
            value={stats.totalBalance} 
            icon="💳" 
            color="text-blue-500"
          />
          <StatCard 
            title="Aylık Gelir" 
            value={stats.monthlyIncome} 
            icon="📈" 
            color="text-green-500"
          />
          <StatCard 
            title="Aylık Gider" 
            value={stats.monthlyExpense} 
            icon="📉" 
            color="text-red-500"
          />
        </div>

        {/* Module Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Link href="/finbot/accounts">
            <div className="p-6 bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-all cursor-pointer">
              <div className="flex items-center gap-4 mb-4">
                <span className="text-4xl">🏦</span>
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">Accounts</h3>
                  <p className="text-sm text-gray-500">Hesap yönetimi</p>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold text-gray-700">{stats.totalAccounts}</span>
                <span className="text-gray-400">→</span>
              </div>
            </div>
          </Link>

          <Link href="/finbot/transactions">
            <div className="p-6 bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-all cursor-pointer">
              <div className="flex items-center gap-4 mb-4">
                <span className="text-4xl">💸</span>
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">Transactions</h3>
                  <p className="text-sm text-gray-500">İşlem yönetimi</p>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold text-gray-700">{stats.totalTransactions}</span>
                <span className="text-gray-400">→</span>
              </div>
            </div>
          </Link>

          <Link href="/finbot/budgets">
            <div className="p-6 bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-all cursor-pointer">
              <div className="flex items-center gap-4 mb-4">
                <span className="text-4xl">📊</span>
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">Budgets</h3>
                  <p className="text-sm text-gray-500">Bütçe planlama</p>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold text-gray-700">{stats.totalBudgets}</span>
                <span className="text-gray-400">→</span>
              </div>
            </div>
          </Link>

          <Link href="/finbot/scenario">
            <div className="p-6 bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-all cursor-pointer">
              <div className="flex items-center gap-4 mb-4">
                <span className="text-4xl">🔮</span>
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">Scenario</h3>
                  <p className="text-sm text-gray-500">Senaryo analizi</p>
                </div>
              </div>
              <p className="text-sm text-gray-400 mt-2">What-if analizi ve projeksiyonlar</p>
            </div>
          </Link>

          <Link href="/finbot/ai-personas">
            <div className="p-6 bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-all cursor-pointer">
              <div className="flex items-center gap-4 mb-4">
                <span className="text-4xl">🤖</span>
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">AI Personas</h3>
                  <p className="text-sm text-gray-500">AI finansal danışmanlık</p>
                </div>
              </div>
              <p className="text-sm text-gray-400 mt-2">Kişiselleştirilmiş finansal tavsiyeler</p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}

