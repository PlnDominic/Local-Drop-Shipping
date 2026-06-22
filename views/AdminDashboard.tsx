'use client';

import React, { useState } from 'react';
import { useGlobalStore } from '../store/globalStore';
import {
  LayoutGrid,
  FileCheck,
  TrendingUp,
  Bell,
  Check,
  Mail,
  MessageSquare,
  Smartphone,
  Users,
} from 'lucide-react';

const formatMoney = (amount: number) =>
  `GHS ${amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;

type Tab = 'overview' | 'approvals' | 'commissions' | 'activity';

export const AdminDashboard: React.FC = () => {
  const {
    supplierProfiles,
    users,
    orders,
    commissions,
    notifications,
    approveSupplier,
    wallets,
    currentUserId,
  } = useGlobalStore();

  const uid = currentUserId ?? '';
  const [activeTab, setActiveTab] = useState<Tab>('overview');

  const pendingSuppliers = supplierProfiles.filter((sp) => !sp.isApproved);
  const totalSales = orders.reduce((acc, o) => acc + o.totalAmount, 0);
  const platformBalance = wallets[uid]?.balance || 0;

  const getChannelIcon = (type: 'sms' | 'email' | 'whatsapp') => {
    switch (type) {
      case 'sms': return <Smartphone size={13} className="text-blue-500" />;
      case 'email': return <Mail size={13} className="text-purple-500" />;
      case 'whatsapp': return <MessageSquare size={13} className="text-[#f04438]" />;
    }
  };

  const tabs: { id: Tab; label: string; icon: typeof LayoutGrid; badge?: number }[] = [
    { id: 'overview', label: 'Overview', icon: LayoutGrid },
    { id: 'approvals', label: 'Approvals', icon: FileCheck, badge: pendingSuppliers.length },
    { id: 'commissions', label: 'Commissions', icon: TrendingUp },
    { id: 'activity', label: 'Activity', icon: Bell },
  ];

  return (
    <div className="bg-[#F9FAFB] min-h-screen font-sans animate-fade-in">
      {/* ── Hero ── */}
      <div className="bg-[#151515] text-white">
        <div className="max-w-[1280px] mx-auto px-4 py-7 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[#f04438] text-[11px] font-black uppercase tracking-widest mb-1">Admin Panel</p>
            <h1 className="text-[26px] font-black leading-tight">Platform Control Center</h1>
            <p className="text-gray-400 text-[12px] mt-1">Supplier compliance, escrow payouts, and messaging logs.</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded bg-white/5 border border-white/10 px-4 py-3">
              <p className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">Platform Wallet</p>
              <p className="text-lg font-black text-white">{formatMoney(platformBalance)}</p>
            </div>
            <div className="rounded bg-white/5 border border-white/10 px-4 py-3">
              <p className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">Pending</p>
              <p className="text-lg font-black text-white">{pendingSuppliers.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Tab pills ── */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-[1280px] mx-auto px-4 flex gap-1 overflow-x-auto py-3 scrollbar-none">
          {tabs.map((t) => {
            const Icon = t.icon;
            const active = activeTab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setActiveTab(t.id)}
                className={`flex items-center gap-1.5 h-9 rounded px-4 text-[12px] font-black whitespace-nowrap transition-colors ${
                  active ? 'bg-[#f04438] text-white' : 'bg-gray-100 text-[#555] hover:bg-gray-200'
                }`}
              >
                <Icon size={14} />
                {t.label}
                {t.badge ? (
                  <span className={`text-[9px] font-black px-1.5 py-0.5 rounded ${active ? 'bg-white/25' : 'bg-[#f04438] text-white'}`}>
                    {t.badge}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>

      <div className="max-w-[1280px] mx-auto px-4 py-5 space-y-4">

        {/* ── OVERVIEW ── */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { label: 'Gross GMV', value: formatMoney(totalSales), sub: 'Purchases processed', icon: TrendingUp, color: 'text-[#151515]' },
              { label: 'Platform Wallet', value: formatMoney(platformBalance), sub: '2% escrow commissions', icon: TrendingUp, color: 'text-[#f04438]' },
              { label: 'Registered Users', value: String(users.length), sub: 'Customers, suppliers, shops', icon: Users, color: 'text-[#151515]' },
              { label: 'Approvals Pending', value: String(pendingSuppliers.length), sub: 'Compliance reviews', icon: FileCheck, color: 'text-yellow-600' },
            ].map((kpi) => {
              const Icon = kpi.icon;
              return (
                <div key={kpi.label} className="bg-white rounded border border-gray-100 p-4 flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{kpi.label}</span>
                    <Icon size={14} className="text-gray-300" />
                  </div>
                  <h3 className={`text-xl font-black ${kpi.color}`}>{kpi.value}</h3>
                  <span className="text-[10px] text-[#999]">{kpi.sub}</span>
                </div>
              );
            })}
          </div>
        )}

        {/* ── APPROVALS ── */}
        {activeTab === 'approvals' && (
          <section className="bg-white rounded border border-gray-100 overflow-hidden">
            <div className="border-b border-gray-100 px-4 py-4">
              <h2 className="text-[15px] font-black text-[#151515]">Supplier Verification Queue</h2>
              <p className="text-[11px] text-[#888]">Approve suppliers after reviewing their registration details.</p>
            </div>
            <div className="p-4">
              {pendingSuppliers.length === 0 ? (
                <div className="flex flex-col items-center justify-center border border-dashed border-gray-200 rounded p-16 text-center">
                  <FileCheck size={40} className="text-gray-300 mb-4" />
                  <p className="font-black text-[#151515] text-lg">No pending reviews</p>
                  <p className="mt-2 text-sm text-[#777]">All suppliers are verified.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {pendingSuppliers.map((sp) => {
                    const supplierUser = users.find((u) => u.id === sp.userId);
                    return (
                      <div key={sp.id} className="flex flex-wrap items-center justify-between gap-3 rounded bg-[#f7f7f7] px-4 py-3">
                        <div className="min-w-0">
                          <strong className="block text-[13px] font-black text-[#151515]">{sp.businessName}</strong>
                          <span className="block text-[10px] text-[#999]">Reg {sp.businessRegNumber || '—'} · {sp.region || '—'}{supplierUser ? ` · ${supplierUser.email}` : ''}</span>
                        </div>
                        <button
                          onClick={() => approveSupplier(sp.id)}
                          className="h-9 rounded bg-[#151515] px-4 text-[11px] font-black text-white hover:bg-[#f04438] transition-colors flex items-center gap-1.5"
                        >
                          <Check size={13} /> Approve
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </section>
        )}

        {/* ── COMMISSIONS ── */}
        {activeTab === 'commissions' && (
          <section className="bg-white rounded border border-gray-100 overflow-hidden">
            <div className="border-b border-gray-100 px-4 py-4">
              <h2 className="text-[15px] font-black text-[#151515]">Escrow Commission Settlements</h2>
              <p className="text-[11px] text-[#888]">Platform commission payouts by order.</p>
            </div>
            {commissions.length === 0 ? (
              <div className="p-5">
                <div className="flex flex-col items-center justify-center border border-dashed border-gray-200 rounded p-16 text-center">
                  <TrendingUp size={40} className="text-gray-300 mb-4" />
                  <p className="font-black text-[#151515] text-lg">No payouts yet</p>
                  <p className="mt-2 text-sm text-[#777]">Commission settlements will appear here.</p>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#f7f7f7] border-b border-gray-100 text-[10px] text-[#999] font-black uppercase tracking-wider">
                      <th className="p-4">Order</th>
                      <th className="p-4">Dropshipper</th>
                      <th className="p-4">Commission</th>
                      <th className="p-4">Status</th>
                      <th className="p-4">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-[12px] text-[#151515]">
                    {commissions.map((c) => (
                      <tr key={c.id} className="hover:bg-[#fafafa]">
                        <td className="p-4 font-black text-[#f04438]">{c.orderNumber}</td>
                        <td className="p-4 text-[#777] font-mono text-[11px]">{c.dropshipperId.slice(0, 8)}</td>
                        <td className="p-4 font-black text-[#f04438]">{formatMoney(c.amount)}</td>
                        <td className="p-4">
                          <span className={`px-2.5 py-1 text-[9px] font-black uppercase tracking-wider rounded ${
                            c.status === 'paid' ? 'bg-[#f04438]/10 text-[#c0392b]' : 'bg-yellow-50 text-yellow-700'
                          }`}>{c.status}</span>
                        </td>
                        <td className="p-4 text-[#999] text-[10px]">{new Date(c.createdAt).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {/* ── ACTIVITY ── */}
        {activeTab === 'activity' && (
          <section className="bg-white rounded border border-gray-100 overflow-hidden">
            <div className="border-b border-gray-100 px-4 py-4 flex items-center justify-between">
              <h2 className="text-[15px] font-black text-[#151515]">Message Dispatch Logs</h2>
              <span className="text-[9px] bg-gray-100 text-[#777] rounded px-2 py-0.5 font-black uppercase tracking-wider">Real-time</span>
            </div>
            <div className="p-4">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center border border-dashed border-gray-200 rounded p-16 text-center">
                  <Bell size={40} className="text-gray-300 mb-4" />
                  <p className="font-black text-[#151515] text-lg">No messages dispatched</p>
                  <p className="mt-2 text-sm text-[#777]">SMS, email, and WhatsApp logs will appear here.</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
                  {notifications.map((notif) => (
                    <div key={notif.id} className="rounded bg-[#f7f7f7] p-3 space-y-1.5">
                      <div className="flex justify-between items-center text-[10px]">
                        <span className="flex items-center gap-1 font-black text-[#151515] uppercase tracking-wider">
                          {getChannelIcon(notif.type)} {notif.type}
                        </span>
                        <span className="text-[#999]">{new Date(notif.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <p className="text-[11px] text-[#555] leading-relaxed bg-white rounded p-2 border border-gray-100">{notif.message}</p>
                      <div className="text-[9px] text-[#999] font-bold">To: <span className="text-[#151515] font-mono">{notif.recipient}</span></div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        )}
      </div>
    </div>
  );
};
