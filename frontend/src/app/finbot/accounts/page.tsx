"use client";
import { FC, useEffect, useState } from "react";
import { apiMethods } from "@/api/client";
import Link from "next/link";

interface Account {
  id: string;
  name: string;
  type: string;
  balance: number;
  currency: string;
  institution?: string;
  accountNumber?: string;
  isActive: boolean;
}

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    try {
      // TODO: Replace with actual API call
      // const data = await apiMethods.get<Account[]>('/finbot/accounts');
      // setAccounts(data);
      
      // Mock data
      setAccounts([
        {
          id: '1',
          name: 'Checking Account',
          type: 'checking',
          balance: 12500.75,
          currency: 'USD',
          institution: 'Bank of America',
          accountNumber: '****1234',
          isActive: true,
        },
        {
          id: '2',
          name: 'Savings Account',
          type: 'savings',
          balance: 32500.00,
          currency: 'USD',
          institution: 'Chase Bank',
          accountNumber: '****5678',
          isActive: true,
        },
        {
          id: '3',
          name: 'Credit Card',
          type: 'credit',
          balance: -1250.50,
          currency: 'USD',
          institution: 'American Express',
          accountNumber: '****9012',
          isActive: true,
        },
      ]);
    } catch (error) {
      console.error('Failed to fetch accounts:', error);
    } finally {
      setLoading(false);
    }
  };

  const getAccountTypeColor = (type: string) => {
    switch (type) {
      case 'checking':
        return 'bg-blue-100 text-blue-700';
      case 'savings':
        return 'bg-green-100 text-green-700';
      case 'credit':
        return 'bg-red-100 text-red-700';
      case 'investment':
        return 'bg-purple-100 text-purple-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const formatBalance = (balance: number, currency: string = 'USD') => {
    const sign = balance >= 0 ? '' : '-';
    return `${sign}$${Math.abs(balance).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
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
              🏦 Accounts
            </h1>
            <p className="text-gray-600">Hesap yönetimi ve bakiyeler</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            + New Account
          </button>
        </div>

        {/* Accounts Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {accounts.map((account) => (
            <div
              key={account.id}
              className="p-6 bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">
                    {account.name}
                  </h3>
                  <p className="text-sm text-gray-500">{account.institution}</p>
                  {account.accountNumber && (
                    <p className="text-xs text-gray-400 mt-1">{account.accountNumber}</p>
                  )}
                </div>
                <span className={`px-2 py-1 text-xs font-medium rounded ${getAccountTypeColor(account.type)}`}>
                  {account.type}
                </span>
              </div>
              
              <div className="pt-4 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Balance</span>
                  <span className={`text-2xl font-bold ${
                    account.balance >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {formatBalance(account.balance, account.currency)}
                  </span>
                </div>
              </div>

              <div className="flex gap-2 mt-4">
                <button className="flex-1 px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded transition-colors">
                  Edit
                </button>
                <button className="flex-1 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded transition-colors">
                  Transactions
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Empty State */}
        {accounts.length === 0 && (
          <div className="text-center py-12">
            <span className="text-6xl mb-4 block">🏦</span>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No accounts yet</h3>
            <p className="text-gray-500 mb-4">Create your first account to get started</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Create Account
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

