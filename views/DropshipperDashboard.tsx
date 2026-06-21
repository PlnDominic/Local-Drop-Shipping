import React, { useState } from 'react';
import { useGlobalStore } from '../store/globalStore';
import type { Product } from '../store/globalStore';
import { useToast } from '../components/Toast';
import {
  ShoppingBag,
  Layers,
  Wallet,
  PlusCircle,
  Trash2,
  AlertCircle,
  ArrowRight,
  Globe,
  FileText,
  CheckCircle2,
  X,
  Menu
} from 'lucide-react';

export const DropshipperDashboard: React.FC = () => {
  const {
    products,
    dropshipperProducts,
    importProductToStore,
    togglePublishProduct,
    updateImportedPrice,
    removeImportedProduct,
    orders,
    wallets,
    withdrawFunds,
    transactions
  } = useGlobalStore();

  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<'overview' | 'import' | 'my-store' | 'orders' | 'wallet'>('overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Importer state
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [markupPrice, setMarkupPrice] = useState<number>(0);
  const [customDesc, setCustomDesc] = useState('');

  // Wallet state
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [momoProvider, setMomoProvider] = useState('MTN MoMo');
  const [momoPhone, setMomoPhone] = useState('+233 55 876 5432');
  const [withdrawSuccess, setWithdrawSuccess] = useState(false);
  const [withdrawError, setWithdrawError] = useState('');

  // Get products not imported yet
  const importedProductIds = dropshipperProducts.map(dp => dp.productId);
  const availableToImport = products.filter(p => !importedProductIds.includes(p.id));

  // Calculated Stats
  const dpOrders = orders.filter(o => o.dropshipperId === 'dp-1');
  const wallet = wallets['u-dropshipper-1'] || { balance: 0, totalEarned: 0 };

  const totalSales = dpOrders.reduce((acc, o) => acc + o.totalAmount, 0);
  const totalOrders = dpOrders.length;
  const totalCommissions = dpOrders.reduce((acc, o) => acc + o.profitAmount, 0);
  const pendingCommissions = orders
    .filter(o => o.dropshipperId === 'dp-1' && o.status !== 'shipped')
    .reduce((acc, o) => acc + o.profitAmount, 0);

  const handleOpenImportModal = (p: Product) => {
    setSelectedProduct(p);
    setMarkupPrice(p.suggestedPrice);
    setCustomDesc(p.description);
  };

  const handleImportSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;

    importProductToStore(selectedProduct.id, markupPrice, customDesc);
    setSelectedProduct(null);
    setActiveTab('my-store');
    showToast('Product imported to your store!', 'success');
  };

  const handleWithdrawal = (e: React.FormEvent) => {
    e.preventDefault();
    setWithdrawError('');
    setWithdrawSuccess(false);

    const amt = parseFloat(withdrawAmount);
    if (isNaN(amt) || amt <= 0) {
      setWithdrawError('Enter a valid amount.');
      return;
    }

    if (amt > wallet.balance) {
      setWithdrawError('Insufficient balance.');
      return;
    }

    const success = withdrawFunds('u-dropshipper-1', amt, `${momoProvider} (${momoPhone})`);
    if (success) {
      setWithdrawSuccess(true);
      setWithdrawAmount('');
      showToast('Withdrawal successful!', 'success');
    } else {
      setWithdrawError('Withdrawal transaction failed.');
      showToast('Withdrawal failed', 'error');
    }
  };

  const handleTabChange = (tab: typeof activeTab) => {
    setActiveTab(tab);
    setSidebarOpen(false);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 min-h-screen font-sans animate-fade-in">
      {/* Mobile hamburger */}
      <div className="flex items-center gap-3 mb-4 md:hidden">
        <button
          type="button"
          onClick={() => setSidebarOpen(v => !v)}
          className="flex items-center gap-2 border border-gray-200 bg-white px-3 py-2 text-xs font-bold text-[#151515]"
        >
          <Menu size={16} />
          <span>Menu</span>
        </button>
        <span className="text-sm font-black text-[#151515] capitalize">{activeTab.replace('-', ' ')}</span>
      </div>

      <div className="flex flex-col md:flex-row gap-8">
        {/* Sidebar Panel */}
        <aside className={`w-full md:w-64 bg-white p-6 border border-gray-100 shadow-sm h-fit space-y-6 ${sidebarOpen ? 'block' : 'hidden md:block'}`}>
          <div className="flex items-center gap-3 border-b border-gray-100 pb-4">
            <div className="w-10 h-10 bg-accent flex items-center justify-center text-white font-bold">
              K
            </div>
            <div>
              <h4 className="font-extrabold text-neutral-dark text-sm">Kofi Owusu</h4>
              <span className="text-[10px] text-accent bg-accent-light px-2 py-0.5 font-bold">Dropshipper Pro</span>
            </div>
          </div>

          <nav className="flex flex-col gap-1.5">
            <button
              onClick={() => handleTabChange('overview')}
              className={`flex items-center gap-2.5 px-4 py-2.5 text-xs font-bold transition-colors ${
                activeTab === 'overview' ? 'bg-primary text-white' : 'text-neutral-gray hover:bg-gray-50 hover:text-neutral-dark'
              }`}
            >
              <Layers size={16} />
              <span>SaaS Overview</span>
            </button>

            <button
              onClick={() => handleTabChange('import')}
              className={`flex items-center gap-2.5 px-4 py-2.5 text-xs font-bold transition-colors ${
                activeTab === 'import' ? 'bg-primary text-white' : 'text-neutral-gray hover:bg-gray-50 hover:text-neutral-dark'
              }`}
            >
              <PlusCircle size={16} />
              <span>Import Products</span>
              {availableToImport.length > 0 && (
                <span className="ml-auto bg-accent text-neutral-dark text-[9px] font-black px-1.5 py-0.5">
                  {availableToImport.length} new
                </span>
              )}
            </button>

            <button
              onClick={() => handleTabChange('my-store')}
              className={`flex items-center gap-2.5 px-4 py-2.5 text-xs font-bold transition-colors ${
                activeTab === 'my-store' ? 'bg-primary text-white' : 'text-neutral-gray hover:bg-gray-50 hover:text-neutral-dark'
              }`}
            >
              <ShoppingBag size={16} />
              <span>My Store Items</span>
            </button>

            <button
              onClick={() => handleTabChange('orders')}
              className={`flex items-center gap-2.5 px-4 py-2.5 text-xs font-bold transition-colors ${
                activeTab === 'orders' ? 'bg-primary text-white' : 'text-neutral-gray hover:bg-gray-50 hover:text-neutral-dark'
              }`}
            >
              <FileText size={16} />
              <span>Store Orders</span>
              {orders.filter(o => o.dropshipperId === 'dp-1' && o.status === 'pending').length > 0 && (
                <span className="ml-auto bg-red-500 text-white text-[9px] font-black px-1.5 py-0.5">
                  {orders.filter(o => o.dropshipperId === 'dp-1' && o.status === 'pending').length}
                </span>
              )}
            </button>

            <button
              onClick={() => handleTabChange('wallet')}
              className={`flex items-center gap-2.5 px-4 py-2.5 text-xs font-bold transition-colors ${
                activeTab === 'wallet' ? 'bg-primary text-white' : 'text-neutral-gray hover:bg-gray-50 hover:text-neutral-dark'
              }`}
            >
              <Wallet size={16} />
              <span>Wallet & Payouts</span>
            </button>
          </nav>

          <div className="border-t border-gray-100 pt-4 space-y-3">
            <div className="bg-gray-50 p-3 text-[10px] text-neutral-gray flex justify-between">
              <span>Store Link:</span>
              <span className="text-primary font-bold hover:underline cursor-pointer">kofiexpress.ld.gh</span>
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 space-y-8">

          {/* KPI CARDS (Always visible at top of Overview) */}
          {activeTab === 'overview' && (
            <div className="space-y-8">
              {/* Header */}
              <div>
                <h2 className="text-2xl font-black text-neutral-dark">Dropshipper SaaS Hub</h2>
                <p className="text-xs text-neutral-gray">Review storefront analytics, commissions, and logistics pipelines.</p>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white p-5 border border-gray-100 shadow-sm flex flex-col justify-between h-32">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Gross Sales</span>
                  <h3 className="text-2xl font-black text-neutral-dark">₵{totalSales.toFixed(2)}</h3>
                  <span className="text-[10px] text-neutral-gray">From {totalOrders} orders</span>
                </div>

                <div className="bg-white p-5 border border-gray-100 shadow-sm flex flex-col justify-between h-32">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider text-primary">Withdrawable Balance</span>
                  <h3 className="text-2xl font-black text-primary">₵{wallet.balance.toFixed(2)}</h3>
                  <span className="text-[10px] text-neutral-gray">Total earnings: ₵{wallet.totalEarned.toFixed(2)}</span>
                </div>

                <div className="bg-white p-5 border border-gray-100 shadow-sm flex flex-col justify-between h-32">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider text-accent">Commissions Settled</span>
                  <h3 className="text-2xl font-black text-accent">₵{totalCommissions.toFixed(2)}</h3>
                  <span className="text-[10px] text-neutral-gray">Net margins credited</span>
                </div>

                <div className="bg-white p-5 border border-gray-100 shadow-sm flex flex-col justify-between h-32">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider text-yellow-600">Escrow Held</span>
                  <h3 className="text-2xl font-black text-yellow-600">₵{pendingCommissions.toFixed(2)}</h3>
                  <span className="text-[10px] text-neutral-gray">Pending supplier shipment</span>
                </div>
              </div>

              {/* Quick Actions / Integration Info */}
              <div className="bg-white p-6 border border-gray-100 shadow-sm grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                <div className="space-y-3">
                  <h4 className="font-extrabold text-sm text-neutral-dark">Promote Your Shop Link</h4>
                  <p className="text-xs text-neutral-gray leading-relaxed">
                    Earn up to ₵450 daily by sharing imported items on social media. When a customer orders, the supplier is notified immediately and ships the package automatically.
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleTabChange('import')}
                      className="bg-primary hover:bg-primary-dark text-white font-bold py-2.5 px-5 text-xs flex items-center gap-1.5 transition-all shadow-sm"
                    >
                      <span>Import Supplier Products</span>
                      <ArrowRight size={14} />
                    </button>
                  </div>
                </div>
                <div className="bg-[#E6F3EC] p-5 border border-primary/10 space-y-2 text-xs text-primary-dark">
                  <h5 className="font-bold flex items-center gap-1">
                    <Globe size={14} className="text-primary animate-pulse-border" />
                    Your Active Storefront
                  </h5>
                  <p className="text-[11px] leading-relaxed">
                    Name: <strong>Kofi's Express Deals</strong><br />
                    Domain: <span className="underline hover:text-primary cursor-pointer font-semibold">localdropshippinggh.com/store/kofiexpress</span><br />
                    Imported inventory count: <strong>{dropshipperProducts.length} items published</strong>.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* IMPORT FLOW */}
          {activeTab === 'import' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-black text-neutral-dark">Supplier Catalog Browser</h2>
                <p className="text-xs text-neutral-gray">Select wholesale products listed by local manufacturers/wholesalers in Ghana to import to your storefront.</p>
              </div>

              {availableToImport.length === 0 ? (
                <div className="text-center py-20 bg-white border border-gray-100 flex flex-col items-center">
                  <CheckCircle2 size={48} className="text-[#f04438] mb-4" />
                  <h4 className="font-extrabold text-neutral-dark text-lg">All products imported!</h4>
                  <p className="text-xs text-neutral-gray mt-1 max-w-xs">You have imported all available products from suppliers. Check back when new products are listed.</p>
                  <button
                    onClick={() => handleTabChange('my-store')}
                    className="mt-5 bg-primary hover:bg-primary-dark text-white font-bold py-2.5 px-5 text-xs flex items-center gap-1.5 transition-all"
                  >
                    <span>View My Store</span>
                    <ArrowRight size={14} />
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {availableToImport.map((p) => (
                    <div key={p.id} className="bg-white overflow-hidden border border-gray-100 shadow-sm flex flex-col justify-between">
                      <div>
                        <div className="aspect-video bg-gray-50 overflow-hidden">
                          <img src={p.images[0]} alt={p.name} className="w-full h-full object-cover" />
                        </div>
                        <div className="p-4 space-y-1">
                          <span className="text-[9px] bg-primary-light text-primary font-extrabold px-1.5 py-0.5">
                            Cost: GHS {p.costPrice.toFixed(2)}
                          </span>
                          <h4 className="font-bold text-xs text-neutral-dark line-clamp-1 mt-1">{p.name}</h4>
                          <p className="text-[11px] text-gray-400 line-clamp-2">{p.description}</p>
                        </div>
                      </div>

                      <div className="p-4 border-t border-gray-50 flex items-center justify-between">
                        <div className="text-xs font-bold text-neutral-dark">
                          Suggested: <span className="text-primary font-black">₵{p.suggestedPrice.toFixed(2)}</span>
                        </div>
                        <button
                          onClick={() => handleOpenImportModal(p)}
                          className="bg-accent hover:bg-accent-dark text-neutral-dark font-extrabold py-1.5 px-3 text-xs transition-colors"
                        >
                          Import Setup
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* IMPORT SETUP DIALOG */}
          {selectedProduct && (
            <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
              <form onSubmit={handleImportSubmit} className="bg-white w-full max-w-md overflow-hidden shadow-2xl border border-gray-100 p-6 space-y-6 animate-slide-up">
                <div className="flex justify-between items-center pb-3 border-b border-gray-100">
                  <h4 className="font-extrabold text-neutral-dark">Setup Selling Markup</h4>
                  <button type="button" onClick={() => setSelectedProduct(null)} className="text-neutral-gray hover:text-neutral-dark">
                    <X size={18} />
                  </button>
                </div>

                <div className="bg-gray-50 p-4 text-xs space-y-2 border border-gray-100">
                  <h5 className="font-bold text-neutral-dark">{selectedProduct.name}</h5>
                  <div className="flex justify-between text-neutral-gray">
                    <span>Supplier wholesale price:</span>
                    <span className="font-semibold text-neutral-dark">₵{selectedProduct.costPrice.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-neutral-gray">
                    <span>Suggested retail price:</span>
                    <span className="font-semibold text-neutral-dark">₵{selectedProduct.suggestedPrice.toFixed(2)}</span>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] text-gray-500 font-bold mb-1">Set Your Store Price (GHS)</label>
                    <input
                      type="number"
                      min={selectedProduct.costPrice}
                      required
                      value={markupPrice}
                      onChange={(e) => setMarkupPrice(parseFloat(e.target.value))}
                      className="w-full border border-gray-200 px-3 py-2 text-xs focus:outline-none focus:border-primary font-bold text-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] text-gray-500 font-bold mb-1">Custom Product Description</label>
                    <textarea
                      rows={3}
                      value={customDesc}
                      onChange={(e) => setCustomDesc(e.target.value)}
                      className="w-full border border-gray-200 px-3 py-2 text-xs focus:outline-none focus:border-primary"
                    />
                  </div>

                  {markupPrice > selectedProduct.costPrice && (
                    <div className="bg-accent-light p-3 border border-accent/10 flex justify-between text-xs text-accent-dark">
                      <span>Your net profit margin per sale:</span>
                      <strong className="font-black">₵{(markupPrice - selectedProduct.costPrice).toFixed(2)}</strong>
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  className="w-full bg-primary hover:bg-primary-dark text-white font-extrabold py-3 px-4 text-xs transition-colors"
                >
                  Publish to My Storefront
                </button>
              </form>
            </div>
          )}

          {/* MY STORE ITEMS */}
          {activeTab === 'my-store' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-black text-neutral-dark">My Active Storefront Inventory</h2>
                <p className="text-xs text-neutral-gray">Manage prices, descriptions, and publish status of your imported items.</p>
              </div>

              {dropshipperProducts.length === 0 ? (
                <div className="text-center py-20 bg-white border border-gray-100 flex flex-col items-center">
                  <ShoppingBag size={48} className="text-gray-200 mb-4" />
                  <h4 className="font-extrabold text-neutral-dark text-lg">Your store is empty</h4>
                  <p className="text-xs text-neutral-gray mt-1 max-w-xs">Import products from the supplier catalog to start selling and earning commissions.</p>
                  <button
                    onClick={() => handleTabChange('import')}
                    className="mt-5 bg-primary hover:bg-primary-dark text-white font-bold py-2.5 px-5 text-xs flex items-center gap-1.5 transition-all"
                  >
                    <span>Browse & Import Products</span>
                    <ArrowRight size={14} />
                  </button>
                </div>
              ) : (
                <div className="bg-white border border-gray-100 shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-100 text-[10px] text-gray-400 font-extrabold uppercase">
                          <th className="p-4">Product Info</th>
                          <th className="p-4">Cost Price</th>
                          <th className="p-4">Your Price</th>
                          <th className="p-4">Profit Margin</th>
                          <th className="p-4">Status</th>
                          <th className="p-4 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 text-xs text-neutral-dark">
                        {dropshipperProducts.map((dp) => (
                          <tr key={dp.id} className="hover:bg-gray-50">
                            <td className="p-4 flex items-center gap-3">
                              <img src={dp.product.images[0]} alt="" className="w-10 h-10 object-cover bg-gray-50 flex-shrink-0" />
                              <div>
                                <strong className="block font-bold text-neutral-dark line-clamp-1">{dp.product.name}</strong>
                                <span className="text-[9px] text-gray-400">SKU: {dp.product.sku}</span>
                              </div>
                            </td>
                            <td className="p-4 font-semibold text-gray-500">₵{dp.product.costPrice.toFixed(2)}</td>
                            <td className="p-4 font-extrabold">
                              <div className="flex items-center gap-1">
                                <span>₵</span>
                                <input
                                  type="number"
                                  value={dp.sellingPrice}
                                  onChange={(e) => updateImportedPrice(dp.id, parseFloat(e.target.value) || 0)}
                                  className="w-16 border border-gray-200 px-1 py-0.5 text-xs font-extrabold text-primary focus:outline-none"
                                />
                              </div>
                            </td>
                            <td className="p-4 text-accent font-black">
                              ₵{(dp.sellingPrice - dp.product.costPrice).toFixed(2)}
                            </td>
                            <td className="p-4">
                              <button
                                onClick={() => togglePublishProduct(dp.id)}
                                className={`px-2.5 py-1 text-[9px] font-black border uppercase tracking-wider ${
                                  dp.isPublished
                                    ? 'bg-accent-light text-accent-dark border-accent/20'
                                    : 'bg-yellow-50 text-yellow-700 border-yellow-200'
                                }`}
                              >
                                {dp.isPublished ? 'Published' : 'Hidden'}
                              </button>
                            </td>
                            <td className="p-4 text-right">
                              <button
                                onClick={() => removeImportedProduct(dp.id)}
                                className="text-red-500 hover:bg-red-50 p-2 transition-colors"
                                title="Remove item"
                              >
                                <Trash2 size={14} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STORE ORDERS */}
          {activeTab === 'orders' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-black text-neutral-dark">Customer Referrals & Store Orders</h2>
                <p className="text-xs text-neutral-gray">Monitor commission updates linked to individual cargo shipments.</p>
              </div>

              {dpOrders.length === 0 ? (
                <div className="text-center py-20 bg-white border border-gray-100">
                  <AlertCircle size={48} className="mx-auto text-gray-200 mb-2" />
                  <h4 className="font-extrabold text-neutral-dark text-sm">No Store Orders Yet</h4>
                  <p className="text-xs text-neutral-gray mt-1">Share your storefront link with customer bases to drive orders.</p>
                </div>
              ) : (
                <div className="bg-white border border-gray-100 shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-100 text-[10px] text-gray-400 font-extrabold uppercase">
                          <th className="p-4">Order Code</th>
                          <th className="p-4">Customer</th>
                          <th className="p-4">Item Details</th>
                          <th className="p-4">Sale Total</th>
                          <th className="p-4">Your Commission</th>
                          <th className="p-4">Status</th>
                          <th className="p-4">Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 text-xs text-neutral-dark">
                        {dpOrders.map((o) => (
                          <tr key={o.id} className="hover:bg-gray-50">
                            <td className="p-4 font-bold text-primary">{o.orderNumber}</td>
                            <td className="p-4">
                              <span className="block font-bold">{o.customerName}</span>
                              <span className="text-[10px] text-gray-400">{o.customerPhone}</span>
                            </td>
                            <td className="p-4 max-w-xs truncate">
                              {o.items.map(item => `${item.productName} (x${item.quantity})`).join(', ')}
                            </td>
                            <td className="p-4 font-semibold">₵{o.totalAmount.toFixed(2)}</td>
                            <td className="p-4 font-black text-accent">₵{o.profitAmount.toFixed(2)}</td>
                            <td className="p-4">
                              <span className={`px-2.5 py-1 text-[9px] font-black uppercase tracking-wider ${
                                o.status === 'delivered' ? 'bg-accent-light text-accent-dark border border-accent/20' :
                                o.status === 'shipped' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                                o.status === 'processing' ? 'bg-purple-50 text-purple-700 border border-purple-200' :
                                'bg-yellow-50 text-yellow-700 border border-yellow-200'
                              }`}>
                                {o.status}
                              </span>
                            </td>
                            <td className="p-4 text-gray-400 text-[10px]">
                              {new Date(o.createdAt).toLocaleDateString([], {month: 'short', day: 'numeric', year: 'numeric'})}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* WALLET & PAYOUTS */}
          {activeTab === 'wallet' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-6">
                <div className="bg-white p-6 border border-gray-100 shadow-sm space-y-6">
                  <div>
                    <h3 className="font-extrabold text-sm text-neutral-dark">Withdraw Funds via Mobile Money</h3>
                    <p className="text-xs text-neutral-gray">Instantly pull commissions into your MTN MoMo, Telecel Cash, or bank wallet.</p>
                  </div>

                  <form onSubmit={handleWithdrawal} className="space-y-4">
                    {withdrawError && (
                      <div className="bg-red-50 text-red-700 text-xs p-3 border border-red-100 flex items-center gap-1.5">
                        <AlertCircle size={14} />
                        <span>{withdrawError}</span>
                      </div>
                    )}

                    {withdrawSuccess && (
                      <div className="bg-accent-light text-accent-dark text-xs p-3 border border-accent/10 flex items-center gap-1.5">
                        <CheckCircle2 size={14} />
                        <span>Withdrawal processed! Check your phone's SMS logs.</span>
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] text-gray-500 font-bold mb-1">Momo Provider</label>
                        <select
                          value={momoProvider}
                          onChange={(e) => setMomoProvider(e.target.value)}
                          className="w-full border border-gray-200 px-3 py-2.5 text-xs focus:outline-none focus:border-primary bg-white font-semibold"
                        >
                          <option>MTN MoMo</option>
                          <option>Telecel Cash</option>
                          <option>AirtelTigo Money</option>
                          <option>GCB Bank Account</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] text-gray-500 font-bold mb-1">Phone Number / Account</label>
                        <input
                          type="text"
                          required
                          value={momoPhone}
                          onChange={(e) => setMomoPhone(e.target.value)}
                          className="w-full border border-gray-200 px-3 py-2.5 text-xs focus:outline-none focus:border-primary font-semibold"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] text-gray-500 font-bold mb-1">Amount to Withdraw (GHS)</label>
                      <div className="relative">
                        <input
                          type="number"
                          min="1"
                          max={wallet.balance}
                          required
                          placeholder="e.g. 200"
                          value={withdrawAmount}
                          onChange={(e) => setWithdrawAmount(e.target.value)}
                          className="w-full border border-gray-200 pl-8 pr-4 py-2.5 text-xs font-extrabold focus:outline-none focus:border-primary text-primary"
                        />
                        <span className="absolute left-3.5 top-3 text-xs font-extrabold text-neutral-gray">₵</span>
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="w-full bg-primary hover:bg-primary-dark text-white font-extrabold py-3.5 px-4 text-xs transition-colors flex items-center justify-center gap-1.5 shadow-premium"
                    >
                      <Wallet size={15} />
                      <span>Initiate Mobile Money Payout</span>
                    </button>
                  </form>
                </div>

                {/* Transactions list */}
                <div className="bg-white p-6 border border-gray-100 shadow-sm space-y-4">
                  <h4 className="font-extrabold text-sm text-neutral-dark">Payout History</h4>

                  {transactions.length === 0 ? (
                    <p className="text-xs text-neutral-gray py-6 text-center">No ledger logs found for this wallet.</p>
                  ) : (
                    <div className="space-y-3">
                      {transactions.map((tx) => (
                        <div key={tx.id} className="flex justify-between items-center text-xs p-3 bg-gray-50 border border-gray-100">
                          <div>
                            <strong className="block font-bold text-neutral-dark">{tx.description}</strong>
                            <span className="text-[10px] text-gray-400">{tx.reference} · {new Date(tx.createdAt).toLocaleTimeString()}</span>
                          </div>
                          <strong className={`font-extrabold ${tx.type === 'withdrawal' || tx.type === 'debit' ? 'text-red-500' : 'text-accent'}`}>
                            {tx.type === 'withdrawal' || tx.type === 'debit' ? '-' : '+'}₵{tx.amount.toFixed(2)}
                          </strong>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-6">
                <div className="bg-accent-light/60 border border-primary/10 p-5 space-y-4 text-xs">
                  <h4 className="font-black text-primary flex items-center gap-1">
                    <Wallet size={15} />
                    Wallet Analytics
                  </h4>
                  <div className="space-y-2">
                    <div className="flex justify-between text-neutral-gray">
                      <span>Available Cash:</span>
                      <strong className="text-neutral-dark">₵{wallet.balance.toFixed(2)}</strong>
                    </div>
                    <div className="flex justify-between text-neutral-gray">
                      <span>Commission Rate:</span>
                      <strong className="text-neutral-dark">12.5%</strong>
                    </div>
                    <div className="flex justify-between text-neutral-gray">
                      <span>Total Cash Outflow:</span>
                      <strong className="text-neutral-dark">₵{(wallet.totalEarned - wallet.balance).toFixed(2)}</strong>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

        </main>
      </div>
    </div>
  );
};
