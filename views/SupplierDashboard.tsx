import React, { useState } from 'react';
import { useGlobalStore } from '../store/globalStore';
import { 
  Plus, 
  Truck, 
  Package, 
  AlertCircle, 
  Check
} from 'lucide-react';

export const SupplierDashboard: React.FC = () => {
  const { 
    products, 
    orders, 
    addSupplierProduct, 
    updateSupplierProductStock,
    fulfillOrder, 
    shipOrder,
    categories,
    wallets
  } = useGlobalStore();

  const [activeTab, setActiveTab] = useState<'products' | 'upload' | 'orders'>('products');

  // New Product form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [costPrice, setCostPrice] = useState('');
  const [suggestedPrice, setSuggestedPrice] = useState('');
  const [stockQty, setStockQty] = useState('');
  const [categoryId, setCategoryId] = useState('cat-1');
  const [imageUrl, setImageUrl] = useState('');
  const [sku, setSku] = useState('');

  const supplierProducts = products.filter(p => p.supplierId === 'sp-1');
  const supplierOrders = orders.filter(o => o.supplierId === 'sp-1');
  const wallet = wallets['u-supplier-1'] || { balance: 0, totalEarned: 0 };

  const handleProductUpload = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Fallback image if empty
    const img = imageUrl || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=600&h=400&q=80';

    addSupplierProduct({
      categoryId,
      name,
      description,
      images: [img],
      costPrice: parseFloat(costPrice) || 0,
      suggestedPrice: parseFloat(suggestedPrice) || 0,
      stockQty: parseInt(stockQty) || 0,
      sku: sku || `KTK-PROD-${Math.floor(1000 + Math.random() * 9000)}`,
      isActive: true
    });

    // Reset form
    setName('');
    setDescription('');
    setCostPrice('');
    setSuggestedPrice('');
    setStockQty('');
    setImageUrl('');
    setSku('');
    setActiveTab('products');
  };

  const handleStockUpdate = (pId: string, newQty: string) => {
    const qty = parseInt(newQty);
    if (!isNaN(qty) && qty >= 0) {
      updateSupplierProductStock(pId, qty);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 min-h-screen flex flex-col md:flex-row gap-8 font-sans animate-fade-in">
      {/* Sidebar Panel */}
      <aside className="w-full md:w-64 bg-white p-6 border border-gray-100 shadow-sm h-fit space-y-6">
        <div className="flex items-center gap-3 border-b border-gray-100 pb-4">
          <div className="w-10 h-10 bg-purple-500 flex items-center justify-center text-white font-bold">
            KT
          </div>
          <div>
            <h4 className="font-extrabold text-neutral-dark text-sm">Kantanka Ltd.</h4>
            <span className="text-[10px] text-purple-600 bg-purple-50 px-2 py-0.5 font-bold">Gold Wholesaler</span>
          </div>
        </div>

        <nav className="flex flex-col gap-1.5">
          <button
            onClick={() => setActiveTab('products')}
            className={`flex items-center gap-2.5 px-4 py-2.5 text-xs font-bold transition-colors ${
              activeTab === 'products' ? 'bg-primary text-white' : 'text-neutral-gray hover:bg-gray-50 hover:text-neutral-dark'
            }`}
          >
            <Package size={16} />
            <span>Listed Products ({supplierProducts.length})</span>
          </button>
          
          <button
            onClick={() => setActiveTab('upload')}
            className={`flex items-center gap-2.5 px-4 py-2.5 text-xs font-bold transition-colors ${
              activeTab === 'upload' ? 'bg-primary text-white' : 'text-neutral-gray hover:bg-gray-50 hover:text-neutral-dark'
            }`}
          >
            <Plus size={16} />
            <span>Upload New Item</span>
          </button>

          <button
            onClick={() => setActiveTab('orders')}
            className={`flex items-center gap-2.5 px-4 py-2.5 text-xs font-bold transition-colors ${
              activeTab === 'orders' ? 'bg-primary text-white' : 'text-neutral-gray hover:bg-gray-50 hover:text-neutral-dark'
            }`}
          >
            <Truck size={16} />
            <span>Fulfillment Queue</span>
            {supplierOrders.filter(o => ['pending', 'processing'].includes(o.status)).length > 0 && (
              <span className="ml-auto bg-red-500 text-white text-[9px] font-black px-1.5 py-0.5">
                {supplierOrders.filter(o => ['pending', 'processing'].includes(o.status)).length}
              </span>
            )}
          </button>
        </nav>

        {/* Payout Display */}
        <div className="border-t border-gray-100 pt-4 space-y-3">
          <div className="bg-purple-50 p-4 border border-purple-100 text-xs">
            <span className="text-[10px] text-purple-700 block font-bold">Wholesale Escrow Ledger</span>
            <strong className="text-lg font-black text-purple-900 block mt-1">₵{wallet.balance.toFixed(2)}</strong>
            <span className="text-[9px] text-purple-600 block mt-0.5">Earnings paid on courier dispatch</span>
          </div>
        </div>
      </aside>

      {/* Main Panel */}
      <main className="flex-1 space-y-8">
        
        {/* LISTED PRODUCTS TAB */}
        {activeTab === 'products' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-black text-neutral-dark">My Wholesale Catalog</h2>
              <p className="text-xs text-neutral-gray">Manage warehouse listings, stock availability, and trade prices.</p>
            </div>

            {supplierProducts.length === 0 ? (
              <div className="text-center py-20 bg-white border border-gray-100">
                <AlertCircle size={48} className="mx-auto text-gray-200 mb-2" />
                <h4 className="font-extrabold text-neutral-dark text-sm">No Wholesale Items Listed</h4>
                <p className="text-xs text-neutral-gray mt-1">Upload your first wholesale product to start dropshipping deals.</p>
              </div>
            ) : (
              <div className="bg-white border border-gray-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-100 text-[10px] text-gray-400 font-extrabold uppercase">
                        <th className="p-4">SKU / Code</th>
                        <th className="p-4">Product Details</th>
                        <th className="p-4">Wholesale Price</th>
                        <th className="p-4">Suggested Retail</th>
                        <th className="p-4">Warehouse Stock</th>
                        <th className="p-4">Date Uploaded</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-xs text-neutral-dark">
                      {supplierProducts.map((p) => (
                        <tr key={p.id} className="hover:bg-gray-50">
                          <td className="p-4 font-bold text-gray-500 uppercase">{p.sku}</td>
                          <td className="p-4 flex items-center gap-3">
                            <img src={p.images[0]} alt="" className="w-10 h-10 object-cover bg-gray-50 flex-shrink-0" />
                            <div>
                              <strong className="block font-bold text-neutral-dark line-clamp-1">{p.name}</strong>
                              <span className="text-[10px] text-primary font-semibold">{p.supplierName}</span>
                            </div>
                          </td>
                          <td className="p-4 font-extrabold text-primary">₵{p.costPrice.toFixed(2)}</td>
                          <td className="p-4 font-semibold text-gray-500">₵{p.suggestedPrice.toFixed(2)}</td>
                          <td className="p-4">
                            <div className="flex items-center gap-1.5">
                              <input
                                type="number"
                                value={p.stockQty}
                                onChange={(e) => handleStockUpdate(p.id, e.target.value)}
                                className="w-16 border border-gray-200 px-1 py-0.5 text-xs font-bold text-neutral-dark focus:outline-none"
                              />
                              <span className="text-[10px] text-gray-400">units</span>
                            </div>
                          </td>
                          <td className="p-4 text-gray-400 text-[10px]">
                            {new Date(p.createdAt).toLocaleDateString([], {month: 'short', day: 'numeric', year: 'numeric'})}
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

        {/* UPLOAD NEW ITEM TAB */}
        {activeTab === 'upload' && (
          <div className="bg-white border border-gray-100 shadow-sm p-6 md:p-8 space-y-6">
            <div>
              <h2 className="text-xl font-black text-neutral-dark">Upload Wholesale Product</h2>
              <p className="text-xs text-neutral-gray">Publish a product to the dropshipper explorer page. When dropshippers list it, they handle customer sourcing.</p>
            </div>

            <form onSubmit={handleProductUpload} className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] text-gray-500 font-bold mb-1">Product Title</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Accra Leather Men Sandals"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full border border-gray-200 px-3 py-2 text-xs focus:outline-none focus:border-primary font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-[10px] text-gray-500 font-bold mb-1">Wholesale Trade Price (GHS)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="e.g. 150"
                    value={costPrice}
                    onChange={(e) => setCostPrice(e.target.value)}
                    className="w-full border border-gray-200 px-3 py-2 text-xs focus:outline-none focus:border-primary font-bold text-primary"
                  />
                </div>

                <div>
                  <label className="block text-[10px] text-gray-500 font-bold mb-1">Suggested Retail Price (GHS)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="e.g. 210"
                    value={suggestedPrice}
                    onChange={(e) => setSuggestedPrice(e.target.value)}
                    className="w-full border border-gray-200 px-3 py-2 text-xs focus:outline-none focus:border-primary font-semibold text-gray-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] text-gray-500 font-bold mb-1">Category</label>
                    <select
                      value={categoryId}
                      onChange={(e) => setCategoryId(e.target.value)}
                      className="w-full border border-gray-200 px-3 py-2 text-xs focus:outline-none focus:border-primary bg-white"
                    >
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] text-gray-500 font-bold mb-1">Initial Stock Qty</label>
                    <input
                      type="number"
                      required
                      placeholder="50"
                      value={stockQty}
                      onChange={(e) => setStockQty(e.target.value)}
                      className="w-full border border-gray-200 px-3 py-2 text-xs focus:outline-none focus:border-primary"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4 flex flex-col justify-between">
                <div>
                  <label className="block text-[10px] text-gray-500 font-bold mb-1">SKU Code</label>
                  <input
                    type="text"
                    placeholder="e.g. KTK-LDR-SAN"
                    value={sku}
                    onChange={(e) => setSku(e.target.value)}
                    className="w-full border border-gray-200 px-3 py-2 text-xs focus:outline-none focus:border-primary uppercase font-bold"
                  />
                </div>

                <div>
                  <label className="block text-[10px] text-gray-500 font-bold mb-1">Product Photo URL</label>
                  <input
                    type="text"
                    placeholder="e.g. https://images.unsplash.com/..."
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    className="w-full border border-gray-200 px-3 py-2 text-xs focus:outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block text-[10px] text-gray-500 font-bold mb-1">Product Description</label>
                  <textarea
                    rows={4}
                    required
                    placeholder="Detailed dimensions, material specs, region made in..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full border border-gray-200 px-3 py-2 text-xs focus:outline-none focus:border-primary"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-primary hover:bg-primary-dark text-white font-extrabold py-3.5 px-4 text-xs transition-colors flex items-center justify-center gap-1.5 shadow-premium"
                >
                  <Plus size={16} />
                  <span>List wholesale item</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* FULFILLMENT QUEUE TAB */}
        {activeTab === 'orders' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-black text-neutral-dark">Supplier Fulfillment Queue</h2>
              <p className="text-xs text-neutral-gray">Acknowledge customer orders, process packages, and dispatch cargo couriers.</p>
            </div>

            {supplierOrders.length === 0 ? (
              <div className="text-center py-20 bg-white border border-gray-100">
                <AlertCircle size={48} className="mx-auto text-gray-200 mb-2" />
                <h4 className="font-extrabold text-neutral-dark text-sm">Fulfillment Queue is Empty</h4>
                <p className="text-xs text-neutral-gray mt-1">Pending order requests will trigger supplier alerts in real-time.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {supplierOrders.map((o) => (
                  <div key={o.id} className="bg-white border border-gray-100 shadow-sm p-6 flex flex-col lg:flex-row justify-between gap-6">
                    <div className="space-y-4 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <strong className="text-primary text-sm font-black">{o.orderNumber}</strong>
                        <span className="text-gray-300">|</span>
                        <span className="text-[10px] text-gray-400 font-bold">Dropshipper: {o.dropshipperStoreName}</span>
                        <span className="text-gray-300">|</span>
                        <span className="text-[10px] text-gray-400 font-bold">{new Date(o.createdAt).toLocaleString()}</span>
                      </div>

                      {/* Items */}
                      <div className="divide-y divide-gray-50 bg-gray-50 p-4 border border-gray-100">
                        {o.items.map((item) => (
                          <div key={item.id} className="py-2.5 flex justify-between text-xs font-semibold">
                            <span className="text-neutral-dark">{item.productName} <strong className="text-primary">x{item.quantity}</strong></span>
                            <span className="text-gray-400">Unit Cost: ₵{item.costPrice.toFixed(2)}</span>
                          </div>
                        ))}
                        <div className="flex justify-between text-xs font-black text-primary border-t border-gray-200 pt-2">
                          <span>Total Payout Pending:</span>
                          <span>₵{o.costAmount.toFixed(2)}</span>
                        </div>
                      </div>

                      {/* Delivery Address */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                        <div className="bg-purple-50/40 p-3 border border-purple-100/50">
                          <strong className="block text-purple-900 font-bold">Delivery Consignee</strong>
                          <span className="text-[11px] text-gray-600 block mt-1">{o.deliveryAddress.fullName}</span>
                          <span className="text-[11px] text-gray-600 block">{o.deliveryAddress.phone}</span>
                        </div>
                        <div className="bg-purple-50/40 p-3 border border-purple-100/50">
                          <strong className="block text-purple-900 font-bold">GhanaPost GPS Hub</strong>
                          <span className="text-[11px] text-gray-600 block mt-1">{o.deliveryAddress.region}, {o.deliveryAddress.city}</span>
                          <strong className="text-primary text-[11px] block mt-0.5 uppercase">{o.deliveryAddress.ghanaPostGps}</strong>
                        </div>
                      </div>
                    </div>

                    <div className="w-full lg:w-64 border-t lg:border-t-0 lg:border-l border-gray-100 pt-6 lg:pt-0 lg:pl-6 flex flex-col justify-center space-y-3">
                      <div className="text-center">
                        <span className="text-[10px] text-gray-400 block uppercase">Order Status</span>
                        <strong className="text-xs uppercase font-extrabold bg-gray-100 text-neutral-dark px-3 py-1 inline-block mt-1">
                          {o.status}
                        </strong>
                      </div>

                      {o.status === 'pending' && (
                        <button
                          onClick={() => fulfillOrder(o.id)}
                          className="w-full bg-primary hover:bg-primary-dark text-white font-extrabold py-3 px-4 text-xs transition-colors flex items-center justify-center gap-1 shadow-sm"
                        >
                          <Check size={14} />
                          <span>Acknowledge Order</span>
                        </button>
                      )}

                      {o.status === 'processing' && (
                        <button
                          onClick={() => shipOrder(o.id)}
                          className="w-full bg-accent hover:bg-accent-dark text-neutral-dark font-extrabold py-3 px-4 text-xs transition-colors flex items-center justify-center gap-1.5 shadow-sm"
                        >
                          <Truck size={14} />
                          <span>Fulfill & Ship via GPS</span>
                        </button>
                      )}

                      {['shipped', 'delivered'].includes(o.status) && (
                        <div className="bg-accent-light text-accent-dark text-xs p-3 border border-accent/10 text-center font-extrabold">
                          ✅ Order Dispatched & Funds Released!
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </main>
    </div>
  );
};
