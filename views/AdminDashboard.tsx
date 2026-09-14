'use client';

import React, { useState } from 'react';
import { useGlobalStore } from '../store/globalStore';
import type { Order, SupplierProfile } from '../store/globalStore';
import {
  LayoutGrid,
  FileCheck,
  TrendingUp,
  Bell,
  Check,
  X,
  Users,
  ShoppingBag,
  Store,
  FileText,
  Search,
  ExternalLink,
  Package,
  Truck,
  UserPlus,
} from 'lucide-react';

const formatMoney = (amount: number) =>
  `GHS ${amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

type Tab = 'overview' | 'suppliers' | 'dropshippers' | 'orders' | 'revenue' | 'users' | 'activity';

const STATUS_STYLE: Record<Order['status'], string> = {
  pending: 'bg-yellow-50 text-yellow-700',
  confirmed: 'bg-blue-50 text-blue-700',
  processing: 'bg-purple-50 text-purple-700',
  shipped: 'bg-[#f04438]/10 text-[#c0392b]',
  delivered: 'bg-emerald-50 text-emerald-700',
  cancelled: 'bg-gray-100 text-gray-500',
};

export const AdminDashboard: React.FC = () => {
  const {
    supplierProfiles,
    dropshipperProfiles,
    products,
    users,
    orders,
    setSupplierApproval,
  } = useGlobalStore();

  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [supplierQuery, setSupplierQuery] = useState('');
  const [dropshipperQuery, setDropshipperQuery] = useState('');
  const [userQuery, setUserQuery] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState<'all' | 'customer' | 'dropshipper' | 'supplier' | 'admin'>('all');
  const [revenueStatusFilter, setRevenueStatusFilter] = useState<'all' | 'realized' | 'pending'>('all');

  // ── Derived platform metrics ────────────────────────────────────────────
  const pendingSuppliers = supplierProfiles.filter((sp) => !sp.isApproved);
  const approvedSuppliers = supplierProfiles.filter((sp) => sp.isApproved);
  const REALIZED_STATUSES: Order['status'][] = ['shipped', 'delivered'];

  const totalGmv = orders.reduce((acc, o) => acc + o.totalAmount, 0);
  const totalPlatformRevenue = orders.reduce((acc, o) => acc + o.platformFee, 0);
  const realizedPlatformRevenue = orders
    .filter((o) => REALIZED_STATUSES.includes(o.status))
    .reduce((acc, o) => acc + o.platformFee, 0);
  const pendingPlatformRevenue = totalPlatformRevenue - realizedPlatformRevenue;

  const usersByRole = {
    customer: users.filter((u) => u.role === 'customer').length,
    dropshipper: users.filter((u) => u.role === 'dropshipper').length,
    supplier: users.filter((u) => u.role === 'supplier').length,
    admin: users.filter((u) => u.role === 'admin').length,
  };

  const productCountBySupplier = (supplierId: string) =>
    products.filter((p) => p.supplierId === supplierId).length;

  const filteredSuppliers = supplierProfiles.filter((sp) =>
    sp.businessName.toLowerCase().includes(supplierQuery.trim().toLowerCase()),
  );

  const filteredDropshippers = dropshipperProfiles.filter((dp) =>
    (dp.storeName || dp.businessName).toLowerCase().includes(dropshipperQuery.trim().toLowerCase()),
  );

  const filteredUsers = users
    .filter((u) => userRoleFilter === 'all' || u.role === userRoleFilter)
    .filter((u) =>
      `${u.fullName} ${u.email} ${u.phone}`.toLowerCase().includes(userQuery.trim().toLowerCase()),
    );

  const filteredRevenueOrders = orders.filter((o) => {
    if (revenueStatusFilter === 'all') return true;
    const isRealized = REALIZED_STATUSES.includes(o.status);
    return revenueStatusFilter === 'realized' ? isRealized : !isRealized;
  });

  // ── Activity feed: derived from real rows, no fabricated notification log ──
  type ActivityItem = { id: string; icon: React.ReactNode; text: string; createdAt: string };
  const activity: ActivityItem[] = [
    ...orders.map((o): ActivityItem => ({
      id: `order-${o.id}`,
      icon: <ShoppingBag size={13} className="text-[#f04438]" />,
      text: `Order ${o.orderNumber} placed at ${o.dropshipperStoreName || 'a storefront'} — ${formatMoney(o.totalAmount)}`,
      createdAt: o.createdAt,
    })),
    ...supplierProfiles.map((sp): ActivityItem => ({
      id: `supplier-${sp.id}`,
      icon: <Truck size={13} className="text-blue-500" />,
      text: `${sp.businessName} applied as a supplier${sp.isApproved ? ' (approved)' : ' (pending review)'}`,
      createdAt: sp.createdAt,
    })),
    ...dropshipperProfiles.map((dp): ActivityItem => ({
      id: `dropshipper-${dp.id}`,
      icon: <UserPlus size={13} className="text-emerald-500" />,
      text: `${dp.storeName || dp.businessName} opened a storefront`,
      createdAt: dp.createdAt,
    })),
  ]
    .filter((item) => item.createdAt)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 40);

  const tabs: { id: Tab; label: string; icon: typeof LayoutGrid; badge?: number }[] = [
    { id: 'overview', label: 'Overview', icon: LayoutGrid },
    { id: 'suppliers', label: 'Suppliers', icon: FileCheck, badge: pendingSuppliers.length },
    { id: 'dropshippers', label: 'Dropshippers', icon: Store },
    { id: 'orders', label: 'Orders', icon: FileText },
    { id: 'revenue', label: 'Revenue', icon: TrendingUp },
    { id: 'users', label: 'Users', icon: Users },
    { id: 'activity', label: 'Activity', icon: Bell },
  ];

  const SupplierRow: React.FC<{ sp: SupplierProfile }> = ({ sp }) => (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded bg-[#f7f7f7] px-4 py-3">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <strong className="block text-[13px] font-black text-[#151515]">{sp.businessName}</strong>
          <span className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${
            sp.isApproved ? 'bg-emerald-50 text-emerald-700' : 'bg-yellow-50 text-yellow-700'
          }`}>
            {sp.isApproved ? 'Approved' : 'Pending'}
          </span>
        </div>
        <span className="block text-[10px] text-[#999] mt-0.5">
          Reg {sp.businessRegNumber || '—'} · {sp.region || '—'} · {productCountBySupplier(sp.id)} product{productCountBySupplier(sp.id) === 1 ? '' : 's'} · Joined {formatDate(sp.createdAt)}
        </span>
      </div>
      {sp.isApproved ? (
        <button
          onClick={() => setSupplierApproval(sp.id, false)}
          className="h-9 rounded border border-gray-200 px-4 text-[11px] font-black text-[#777] hover:border-red-300 hover:text-red-600 transition-colors flex items-center gap-1.5"
        >
          <X size={13} /> Revoke
        </button>
      ) : (
        <button
          onClick={() => setSupplierApproval(sp.id, true)}
          className="h-9 rounded bg-[#151515] px-4 text-[11px] font-black text-white hover:bg-[#f04438] transition-colors flex items-center gap-1.5"
        >
          <Check size={13} /> Approve
        </button>
      )}
    </div>
  );

  return (
    <div className="bg-[#F9FAFB] min-h-screen font-sans animate-fade-in">
      {/* ── Hero ── */}
      <div className="bg-[#151515] text-white">
        <div className="max-w-[1280px] mx-auto px-4 py-7 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[#f04438] text-[11px] font-black uppercase tracking-widest mb-1">Admin Panel</p>
            <h1 className="text-[26px] font-black leading-tight">Platform Control Center</h1>
            <p className="text-gray-400 text-[12px] mt-1">Supplier compliance, marketplace revenue, and platform activity.</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded bg-white/5 border border-white/10 px-4 py-3">
              <p className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">Platform Revenue</p>
              <p className="text-lg font-black text-white">{formatMoney(totalPlatformRevenue)}</p>
            </div>
            <div className="rounded bg-white/5 border border-white/10 px-4 py-3">
              <p className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">Pending Reviews</p>
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
          <div className="space-y-4">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                { label: 'Gross Merchandise Value', value: formatMoney(totalGmv), sub: `${orders.length} order${orders.length === 1 ? '' : 's'}`, icon: TrendingUp, color: 'text-[#151515]' },
                { label: 'Platform Revenue', value: formatMoney(totalPlatformRevenue), sub: `${formatMoney(realizedPlatformRevenue)} realized`, icon: TrendingUp, color: 'text-[#f04438]' },
                { label: 'Registered Users', value: String(users.length), sub: `${usersByRole.dropshipper} dropshippers · ${usersByRole.supplier} suppliers`, icon: Users, color: 'text-[#151515]' },
                { label: 'Approvals Pending', value: String(pendingSuppliers.length), sub: `${approvedSuppliers.length} suppliers approved`, icon: FileCheck, color: pendingSuppliers.length > 0 ? 'text-yellow-600' : 'text-[#151515]' },
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

            {pendingSuppliers.length > 0 && (
              <section className="bg-white rounded border border-gray-100 overflow-hidden">
                <div className="border-b border-gray-100 px-4 py-4 flex items-center justify-between">
                  <div>
                    <h2 className="text-[15px] font-black text-[#151515]">Needs your review</h2>
                    <p className="text-[11px] text-[#888]">{pendingSuppliers.length} supplier application{pendingSuppliers.length === 1 ? '' : 's'} awaiting approval.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('suppliers')}
                    className="h-9 rounded bg-[#151515] px-4 text-[11px] font-black text-white hover:bg-[#f04438] transition-colors"
                  >
                    Review Now
                  </button>
                </div>
                <div className="p-4 space-y-2">
                  {pendingSuppliers.slice(0, 3).map((sp) => (
                    <SupplierRow key={sp.id} sp={sp} />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}

        {/* ── SUPPLIERS ── */}
        {activeTab === 'suppliers' && (
          <section className="bg-white rounded border border-gray-100 overflow-hidden">
            <div className="border-b border-gray-100 px-4 py-4 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-[15px] font-black text-[#151515]">Suppliers</h2>
                <p className="text-[11px] text-[#888]">
                  {pendingSuppliers.length} pending review · {approvedSuppliers.length} approved
                </p>
              </div>
              <div className="flex h-9 items-center border border-gray-200 rounded overflow-hidden flex-1 max-w-[220px]">
                <Search size={13} className="ml-3 text-gray-400 flex-shrink-0" />
                <input
                  value={supplierQuery}
                  onChange={(e) => setSupplierQuery(e.target.value)}
                  placeholder="Search suppliers..."
                  className="flex-1 min-w-0 px-2 text-[11px] outline-none"
                />
              </div>
            </div>
            <div className="p-4">
              {filteredSuppliers.length === 0 ? (
                <div className="flex flex-col items-center justify-center border border-dashed border-gray-200 rounded p-16 text-center">
                  <FileCheck size={40} className="text-gray-300 mb-4" />
                  <p className="font-black text-[#151515] text-lg">No suppliers found</p>
                  <p className="mt-2 text-sm text-[#777]">Suppliers who register will appear here.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredSuppliers.map((sp) => (
                    <SupplierRow key={sp.id} sp={sp} />
                  ))}
                </div>
              )}
            </div>
          </section>
        )}

        {/* ── DROPSHIPPERS ── */}
        {activeTab === 'dropshippers' && (
          <section className="bg-white rounded border border-gray-100 overflow-hidden">
            <div className="border-b border-gray-100 px-4 py-4 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-[15px] font-black text-[#151515]">Dropshipper Storefronts</h2>
                <p className="text-[11px] text-[#888]">{dropshipperProfiles.length} store{dropshipperProfiles.length === 1 ? '' : 's'} on the platform.</p>
              </div>
              <div className="flex h-9 items-center border border-gray-200 rounded overflow-hidden flex-1 max-w-[220px]">
                <Search size={13} className="ml-3 text-gray-400 flex-shrink-0" />
                <input
                  value={dropshipperQuery}
                  onChange={(e) => setDropshipperQuery(e.target.value)}
                  placeholder="Search stores..."
                  className="flex-1 min-w-0 px-2 text-[11px] outline-none"
                />
              </div>
            </div>
            <div className="p-4">
              {filteredDropshippers.length === 0 ? (
                <div className="flex flex-col items-center justify-center border border-dashed border-gray-200 rounded p-16 text-center">
                  <Store size={40} className="text-gray-300 mb-4" />
                  <p className="font-black text-[#151515] text-lg">No storefronts found</p>
                  <p className="mt-2 text-sm text-[#777]">Dropshipper stores will appear here as they're created.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredDropshippers.map((dp) => (
                    <div key={dp.id} className="flex flex-wrap items-center justify-between gap-3 rounded bg-[#f7f7f7] px-4 py-3">
                      <div className="min-w-0">
                        <strong className="block text-[13px] font-black text-[#151515]">{dp.storeName || dp.businessName}</strong>
                        <span className="block text-[10px] text-[#999] mt-0.5">
                          {dp.commissionRate}% commission · Joined {formatDate(dp.createdAt)}
                        </span>
                      </div>
                      {dp.storeSlug && (
                        <a
                          href={`/store/${dp.storeSlug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="h-9 rounded border border-gray-200 px-4 text-[11px] font-black text-[#151515] hover:border-[#f04438] hover:text-[#f04438] transition-colors flex items-center gap-1.5"
                        >
                          <ExternalLink size={13} /> View Store
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        )}

        {/* ── ORDERS ── */}
        {activeTab === 'orders' && (
          <section className="bg-white rounded border border-gray-100 overflow-hidden">
            <div className="border-b border-gray-100 px-4 py-4">
              <h2 className="text-[15px] font-black text-[#151515]">All Orders</h2>
              <p className="text-[11px] text-[#888]">Every order placed across the platform.</p>
            </div>
            {orders.length === 0 ? (
              <div className="p-5">
                <div className="flex flex-col items-center justify-center border border-dashed border-gray-200 rounded p-16 text-center">
                  <Package size={40} className="text-gray-300 mb-4" />
                  <p className="font-black text-[#151515] text-lg">No orders yet</p>
                  <p className="mt-2 text-sm text-[#777]">Orders placed on any storefront will appear here.</p>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#f7f7f7] border-b border-gray-100 text-[10px] text-[#999] font-black uppercase tracking-wider">
                      <th className="p-4">Order</th>
                      <th className="p-4">Store</th>
                      <th className="p-4">Customer</th>
                      <th className="p-4">Total</th>
                      <th className="p-4">Platform Fee</th>
                      <th className="p-4">Status</th>
                      <th className="p-4">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-[12px] text-[#151515]">
                    {orders.map((o) => (
                      <tr key={o.id} className="hover:bg-[#fafafa]">
                        <td className="p-4 font-black text-[#f04438]">{o.orderNumber}</td>
                        <td className="p-4 text-[#555] font-semibold">{o.dropshipperStoreName || '—'}</td>
                        <td className="p-4">
                          <span className="block font-bold">{o.customerName}</span>
                          <span className="text-[10px] text-[#999]">{o.customerPhone}</span>
                        </td>
                        <td className="p-4 font-semibold">{formatMoney(o.totalAmount)}</td>
                        <td className="p-4 font-black text-[#f04438]">{formatMoney(o.platformFee)}</td>
                        <td className="p-4">
                          <span className={`px-2.5 py-1 text-[9px] font-black uppercase tracking-wider rounded ${STATUS_STYLE[o.status]}`}>
                            {o.status}
                          </span>
                        </td>
                        <td className="p-4 text-[#999] text-[10px]">{formatDate(o.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {/* ── REVENUE ── */}
        {activeTab === 'revenue' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-white rounded border border-gray-100 p-4">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Total Platform Fees</span>
                <h3 className="text-xl font-black text-[#151515] mt-1">{formatMoney(totalPlatformRevenue)}</h3>
              </div>
              <div className="bg-white rounded border border-gray-100 p-4">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Realized (Shipped+)</span>
                <h3 className="text-xl font-black text-[#f04438] mt-1">{formatMoney(realizedPlatformRevenue)}</h3>
              </div>
              <div className="bg-white rounded border border-gray-100 p-4">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Pending</span>
                <h3 className="text-xl font-black text-yellow-600 mt-1">{formatMoney(pendingPlatformRevenue)}</h3>
              </div>
            </div>

            <section className="bg-white rounded border border-gray-100 overflow-hidden">
              <div className="border-b border-gray-100 px-4 py-4 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-[15px] font-black text-[#151515]">Platform Fee by Order</h2>
                  <p className="text-[11px] text-[#888]">Fee is realized once the order ships (commissions/payouts credit at that point).</p>
                </div>
                <select
                  value={revenueStatusFilter}
                  onChange={(e) => setRevenueStatusFilter(e.target.value as typeof revenueStatusFilter)}
                  className="h-9 rounded border border-gray-200 px-3 text-[11px] font-semibold bg-white"
                >
                  <option value="all">All orders</option>
                  <option value="realized">Realized only</option>
                  <option value="pending">Pending only</option>
                </select>
              </div>
              {filteredRevenueOrders.length === 0 ? (
                <div className="p-5">
                  <div className="flex flex-col items-center justify-center border border-dashed border-gray-200 rounded p-16 text-center">
                    <TrendingUp size={40} className="text-gray-300 mb-4" />
                    <p className="font-black text-[#151515] text-lg">Nothing to show</p>
                    <p className="mt-2 text-sm text-[#777]">Try a different filter.</p>
                  </div>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-[#f7f7f7] border-b border-gray-100 text-[10px] text-[#999] font-black uppercase tracking-wider">
                        <th className="p-4">Order</th>
                        <th className="p-4">Store</th>
                        <th className="p-4">Order Total</th>
                        <th className="p-4">Platform Fee</th>
                        <th className="p-4">Status</th>
                        <th className="p-4">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-[12px] text-[#151515]">
                      {filteredRevenueOrders.map((o) => (
                        <tr key={o.id} className="hover:bg-[#fafafa]">
                          <td className="p-4 font-black text-[#f04438]">{o.orderNumber}</td>
                          <td className="p-4 text-[#555] font-semibold">{o.dropshipperStoreName || '—'}</td>
                          <td className="p-4">{formatMoney(o.totalAmount)}</td>
                          <td className="p-4 font-black text-[#f04438]">{formatMoney(o.platformFee)}</td>
                          <td className="p-4">
                            <span className={`px-2.5 py-1 text-[9px] font-black uppercase tracking-wider rounded ${STATUS_STYLE[o.status]}`}>
                              {o.status}
                            </span>
                          </td>
                          <td className="p-4 text-[#999] text-[10px]">{formatDate(o.createdAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </div>
        )}

        {/* ── USERS ── */}
        {activeTab === 'users' && (
          <section className="bg-white rounded border border-gray-100 overflow-hidden">
            <div className="border-b border-gray-100 px-4 py-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-[15px] font-black text-[#151515]">All Users</h2>
                <p className="text-[11px] text-[#888]">{users.length} registered.</p>
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={userRoleFilter}
                  onChange={(e) => setUserRoleFilter(e.target.value as typeof userRoleFilter)}
                  className="h-9 rounded border border-gray-200 px-3 text-[11px] font-semibold bg-white"
                >
                  <option value="all">All roles</option>
                  <option value="customer">Customers</option>
                  <option value="dropshipper">Dropshippers</option>
                  <option value="supplier">Suppliers</option>
                  <option value="admin">Admins</option>
                </select>
                <div className="flex h-9 items-center border border-gray-200 rounded overflow-hidden max-w-[220px]">
                  <Search size={13} className="ml-3 text-gray-400 flex-shrink-0" />
                  <input
                    value={userQuery}
                    onChange={(e) => setUserQuery(e.target.value)}
                    placeholder="Search users..."
                    className="flex-1 min-w-0 px-2 text-[11px] outline-none"
                  />
                </div>
              </div>
            </div>
            {filteredUsers.length === 0 ? (
              <div className="p-5">
                <div className="flex flex-col items-center justify-center border border-dashed border-gray-200 rounded p-16 text-center">
                  <Users size={40} className="text-gray-300 mb-4" />
                  <p className="font-black text-[#151515] text-lg">No users found</p>
                  <p className="mt-2 text-sm text-[#777]">
                    {users.length === 0 ? 'Only an admin account can see the user directory.' : 'Try a different search or filter.'}
                  </p>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#f7f7f7] border-b border-gray-100 text-[10px] text-[#999] font-black uppercase tracking-wider">
                      <th className="p-4">Name</th>
                      <th className="p-4">Contact</th>
                      <th className="p-4">Role</th>
                      <th className="p-4">Verified</th>
                      <th className="p-4">Joined</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-[12px] text-[#151515]">
                    {filteredUsers.map((u) => (
                      <tr key={u.id} className="hover:bg-[#fafafa]">
                        <td className="p-4 font-bold">{u.fullName || '—'}</td>
                        <td className="p-4 text-[#777]">
                          <span className="block">{u.email}</span>
                          <span className="text-[10px] text-[#999]">{u.phone}</span>
                        </td>
                        <td className="p-4">
                          <span className="px-2.5 py-1 text-[9px] font-black uppercase tracking-wider rounded bg-gray-100 text-[#555]">
                            {u.role}
                          </span>
                        </td>
                        <td className="p-4">
                          {u.isVerified ? (
                            <span className="text-emerald-600 font-black text-[11px]">Yes</span>
                          ) : (
                            <span className="text-[#999] font-semibold text-[11px]">No</span>
                          )}
                        </td>
                        <td className="p-4 text-[#999] text-[10px]">{formatDate(u.createdAt)}</td>
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
              <h2 className="text-[15px] font-black text-[#151515]">Recent Activity</h2>
              <span className="text-[9px] bg-gray-100 text-[#777] rounded px-2 py-0.5 font-black uppercase tracking-wider">Live</span>
            </div>
            <div className="p-4">
              {activity.length === 0 ? (
                <div className="flex flex-col items-center justify-center border border-dashed border-gray-200 rounded p-16 text-center">
                  <Bell size={40} className="text-gray-300 mb-4" />
                  <p className="font-black text-[#151515] text-lg">Nothing yet</p>
                  <p className="mt-2 text-sm text-[#777]">New orders, suppliers, and storefronts will show up here.</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
                  {activity.map((item) => (
                    <div key={item.id} className="flex items-start gap-2.5 rounded bg-[#f7f7f7] px-3 py-2.5">
                      <div className="mt-0.5 flex-shrink-0">{item.icon}</div>
                      <p className="flex-1 text-[12px] text-[#333] leading-snug">{item.text}</p>
                      <span className="flex-shrink-0 text-[10px] text-[#999]">{formatDate(item.createdAt)}</span>
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
