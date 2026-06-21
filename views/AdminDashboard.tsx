import React from 'react';
import { useGlobalStore } from '../store/globalStore';
import { 
  TrendingUp, 
  Bell, 
  FileCheck, 
  Check, 
  Mail,
  MessageSquare,
  Smartphone
} from 'lucide-react';

export const AdminDashboard: React.FC = () => {
  const { 
    supplierProfiles, 
    users, 
    orders, 
    commissions, 
    notifications, 
    approveSupplier,
    wallets
  } = useGlobalStore();

  const pendingSuppliers = supplierProfiles.filter(sp => !sp.isApproved);

  // Platform aggregates
  const totalSales = orders.reduce((acc, o) => acc + o.totalAmount, 0);
  const registeredUsersCount = users.length;
  const platformBalance = wallets['u-admin-1']?.balance || 0;

  const getChannelIcon = (type: 'sms' | 'email' | 'whatsapp') => {
    switch (type) {
      case 'sms': return <Smartphone size={14} className="text-blue-500" />;
      case 'email': return <Mail size={14} className="text-purple-500" />;
      case 'whatsapp': return <MessageSquare size={14} className="text-accent" />;
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 min-h-screen space-y-8 font-sans animate-fade-in">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-black text-neutral-dark">Platform Control Center</h2>
        <p className="text-xs text-neutral-gray">Oversee supplier registration compliance, escrow payouts, and automated messaging logs.</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-5 border border-gray-100 shadow-sm flex flex-col justify-between h-32">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Gross Platform GMV</span>
          <h3 className="text-2xl font-black text-neutral-dark">₵{totalSales.toFixed(2)}</h3>
          <span className="text-[10px] text-neutral-gray">Total purchases processed</span>
        </div>

        <div className="bg-white p-5 border border-gray-100 shadow-sm flex flex-col justify-between h-32">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider text-primary">Platform Wallet</span>
          <h3 className="text-2xl font-black text-primary">₵{platformBalance.toFixed(2)}</h3>
          <span className="text-[10px] text-neutral-gray">2% Escrow commissions</span>
        </div>

        <div className="bg-white p-5 border border-gray-100 shadow-sm flex flex-col justify-between h-32">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider text-blue-600">Registered Users</span>
          <h3 className="text-2xl font-black text-blue-600">{registeredUsersCount}</h3>
          <span className="text-[10px] text-neutral-gray">Customers, Suppliers, Shops</span>
        </div>

        <div className="bg-white p-5 border border-gray-100 shadow-sm flex flex-col justify-between h-32">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider text-red-500">Approvals Pending</span>
          <h3 className="text-2xl font-black text-red-500">{pendingSuppliers.length}</h3>
          <span className="text-[10px] text-neutral-gray">Compliance registration reviews</span>
        </div>
      </div>

      {/* Split section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Col - Queue & Commissions */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Supplier Approval Queue */}
          <div className="bg-white p-6 border border-gray-100 shadow-sm space-y-4">
            <h3 className="font-extrabold text-sm text-neutral-dark flex items-center gap-1.5">
              <FileCheck size={18} className="text-primary" />
              Supplier Verification queue
            </h3>

            {pendingSuppliers.length === 0 ? (
              <p className="text-xs text-neutral-gray py-6 text-center">No pending supplier compliance reviews found.</p>
            ) : (
              <div className="space-y-4">
                {pendingSuppliers.map((sp) => {
                  const supplierUser = users.find(u => u.id === sp.userId);
                  return (
                    <div key={sp.id} className="p-4 bg-gray-50 border border-gray-100 flex justify-between items-center text-xs">
                      <div className="space-y-1">
                        <strong className="block font-bold text-neutral-dark text-sm">{sp.businessName}</strong>
                        <span className="block text-[10px] text-gray-400">Reg No: {sp.businessRegNumber}</span>
                        <span className="block text-[10px] text-gray-400">Region: {sp.region} · Contact: {supplierUser?.email}</span>
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => approveSupplier(sp.id)}
                          className="bg-primary hover:bg-primary-dark text-white font-extrabold py-1.5 px-3 text-[10px] flex items-center gap-1"
                        >
                          <Check size={12} />
                          <span>Approve</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Platform Commissions Ledger */}
          <div className="bg-white p-6 border border-gray-100 shadow-sm space-y-4">
            <h3 className="font-extrabold text-sm text-neutral-dark flex items-center gap-1.5">
              <TrendingUp size={18} className="text-primary" />
              Escrow Commission Settlements
            </h3>

            {commissions.length === 0 ? (
              <p className="text-xs text-neutral-gray py-6 text-center">No platform payouts created yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-gray-100 text-[10px] text-gray-400 font-extrabold uppercase">
                      <th className="py-2">Order Reference</th>
                      <th className="py-2">Dropshipper</th>
                      <th className="py-2">Commission Earned</th>
                      <th className="py-2">Payout Status</th>
                      <th className="py-2">Settlement Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {commissions.map((c) => (
                      <tr key={c.id}>
                        <td className="py-3 font-semibold text-primary">{c.orderNumber}</td>
                        <td className="py-3">Kofi's Express Deals</td>
                        <td className="py-3 font-extrabold text-accent">₵{c.amount.toFixed(2)}</td>
                        <td className="py-3">
                          <span className={`px-2 py-0.5 text-[8px] font-black uppercase tracking-wider border ${
                            c.status === 'paid' 
                              ? 'bg-accent-light text-accent-dark border-accent/20' 
                              : 'bg-yellow-50 text-yellow-700 border-yellow-200'
                          }`}>
                            {c.status}
                          </span>
                        </td>
                        <td className="py-3 text-[10px] text-gray-400">
                          {new Date(c.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Right Col - Real-Time Communication Logs */}
        <div className="space-y-6">
          <div className="bg-white p-6 border border-gray-100 shadow-sm space-y-4">
            <div className="border-b border-gray-100 pb-3 flex justify-between items-center">
              <h3 className="font-extrabold text-sm text-neutral-dark flex items-center gap-1.5">
                <Bell size={18} className="text-primary animate-pulse-border" />
                Message Dispatch Logs
              </h3>
              <span className="text-[9px] bg-neutral-light text-neutral-gray border px-2 py-0.5 font-extrabold">
                Real-Time
              </span>
            </div>

            <div className="space-y-3.5 max-h-[55vh] overflow-y-auto pr-1">
              {notifications.length === 0 ? (
                <p className="text-xs text-neutral-gray py-6 text-center">No messages dispatched.</p>
              ) : (
                notifications.map((notif) => (
                  <div key={notif.id} className="p-3 bg-gray-50 border border-gray-100 space-y-1.5">
                    <div className="flex justify-between items-center text-[10px]">
                      <div className="flex items-center gap-1 font-bold text-neutral-dark">
                        {getChannelIcon(notif.type)}
                        <span className="uppercase">{notif.type} Link</span>
                      </div>
                      <span className="text-gray-400">{new Date(notif.timestamp).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit', second: '2-digit'})}</span>
                    </div>

                    <p className="text-[11px] text-gray-600 leading-relaxed font-mono bg-white p-2 border border-gray-100">
                      {notif.message}
                    </p>

                    <div className="text-[9px] text-gray-400 font-bold">
                      Recipient: <span className="text-neutral-dark font-mono">{notif.recipient}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
