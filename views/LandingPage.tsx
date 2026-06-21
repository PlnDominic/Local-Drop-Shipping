import React from 'react';
import { useGlobalStore } from '../store/globalStore';
import { 
  ArrowRight, 
  Tv, 
  Shirt, 
  Sparkles, 
  Home as HomeIcon, 
  Activity, 
  Utensils, 
  ShieldCheck, 
  Truck, 
  CreditCard,
  TrendingUp,
  ChevronRight
} from 'lucide-react';

interface LandingPageProps {
  onJoinAsDropshipper: () => void;
  onBrowseMarketplace: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ 
  onJoinAsDropshipper, 
  onBrowseMarketplace 
}) => {
  const { categories, products } = useGlobalStore();

  const getCategoryIcon = (iconName: string) => {
    switch (iconName) {
      case 'Tv': return <Tv size={22} className="text-primary" />;
      case 'Shirt': return <Shirt size={22} className="text-primary" />;
      case 'Sparkles': return <Sparkles size={22} className="text-primary" />;
      case 'Home': return <HomeIcon size={22} className="text-primary" />;
      case 'Activity': return <Activity size={22} className="text-primary" />;
      case 'Utensils': return <Utensils size={22} className="text-primary" />;
      default: return <Tv size={22} className="text-primary" />;
    }
  };

  const steps = [
    {
      num: '01',
      title: 'Suppliers Stock & List',
      desc: 'Local Ghanaian suppliers list wholesale-priced products and manage warehouse inventory.'
    },
    {
      num: '02',
      title: 'Dropshippers Import',
      desc: 'Add products to your shop in one click, write custom descriptions, and set your own markups.'
    },
    {
      num: '03',
      title: 'Share & Sell Online',
      desc: 'Share links to your custom storefront on WhatsApp, TikTok, and Instagram to receive orders.'
    },
    {
      num: '04',
      title: 'Automatic Fulfillment',
      desc: 'Customer pays, Supplier fulfills & ships directly via GhanaPost GPS. You pocket the markup!'
    }
  ];

  return (
    <div className="bg-[#F9FAFB] min-h-screen text-[#111827] font-sans pb-16 animate-fade-in">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-8 pb-16 sm:pb-20 dot-grid border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-7 flex flex-col justify-center space-y-6">
            <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 text-primary px-3 py-1.5 text-xs font-semibold w-fit">
              <span className="w-2 h-2 bg-accent animate-pulse-border"></span>
              Ghana's #1 Local Dropshipping Ecosystem
            </div>
            
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-neutral-dark tracking-tight leading-tight">
              Start Your Online Business <span className="text-primary relative inline-block">
                Without Stocking
                <span className="absolute bottom-1 left-0 w-full h-2 bg-accent/40 -z-10"></span>
              </span> Inventory
            </h1>

            <p className="text-gray-600 text-base sm:text-lg max-w-xl leading-relaxed">
              Connect directly with verified local suppliers in Accra, Kumasi & Tema. Import high-margin products in seconds, share on social media, and get paid instantly via MTN MoMo, Telecel Cash & bank cards.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 pt-2">
              <button 
                onClick={onJoinAsDropshipper}
                className="bg-primary hover:bg-primary-dark text-white px-8 py-4 font-bold transition-all shadow-premium hover:shadow-premium-hover flex items-center justify-center gap-2 group"
              >
                <span>Start Dropshipping Now</span>
                <ArrowRight size={18} className="transform group-hover:translate-x-1 transition-transform" />
              </button>
              <button 
                onClick={onBrowseMarketplace}
                className="bg-white hover:bg-gray-50 text-neutral-dark border border-gray-200 px-8 py-4 font-bold transition-all flex items-center justify-center gap-2 shadow-sm"
              >
                <span>Browse Products</span>
                <ChevronRight size={18} />
              </button>
            </div>

            {/* Micro stats banner */}
            <div className="grid grid-cols-3 gap-6 pt-6 border-t border-gray-200/80 max-w-md">
              <div>
                <span className="block text-2xl font-black text-primary">1,200+</span>
                <span className="text-xs text-neutral-gray font-medium">Verified Suppliers</span>
              </div>
              <div>
                <span className="block text-2xl font-black text-primary">₵4.5M+</span>
                <span className="text-xs text-neutral-gray font-medium">Commissions Paid</span>
              </div>
              <div>
                <span className="block text-2xl font-black text-primary">99.2%</span>
                <span className="text-xs text-neutral-gray font-medium">Success Delivery Rate</span>
              </div>
            </div>
          </div>

          <div className="lg:col-span-5 relative flex items-center justify-center">
            {/* Visual representation of dropshipping cycle */}
            <div className="w-full max-w-md bg-white p-6 shadow-premium border border-gray-100 relative space-y-6">
              <div className="absolute -top-4 -right-4 bg-accent text-neutral-dark font-black text-xs px-3 py-1.5 rotate-6 shadow-md border border-white">
                No Capital Required!
              </div>

              {/* Suppler to Customer flowchart */}
              <div className="space-y-4">
                <div className="flex items-center gap-4 p-3 bg-primary-light border border-primary/5">
                  <div className="w-10 h-10 bg-primary flex items-center justify-center text-white font-bold">₵</div>
                  <div>
                    <span className="block text-xs text-primary font-bold">SUPPLIER COST</span>
                    <span className="text-sm font-black text-primary-dark">₵180.00 wholesale</span>
                  </div>
                </div>

                <div className="flex justify-center">
                  <div className="h-6 w-0.5 border-l-2 border-dashed border-gray-300"></div>
                </div>

                <div className="flex items-center justify-between p-3 bg-accent-light border border-accent/10">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-accent flex items-center justify-center text-neutral-dark font-bold">🛒</div>
                    <div>
                      <span className="block text-xs text-accent-dark font-bold">YOUR SELLING PRICE</span>
                      <span className="text-sm font-black text-neutral-dark">₵260.00 retail</span>
                    </div>
                  </div>
                  <span className="bg-accent text-white font-black text-xs px-2.5 py-1">
                    +₵80 Margin
                  </span>
                </div>

                <div className="flex justify-center">
                  <div className="h-6 w-0.5 border-l-2 border-dashed border-gray-300"></div>
                </div>

                <div className="flex items-center gap-4 p-3 bg-neutral-light border border-gray-200">
                  <div className="w-10 h-10 bg-neutral-dark flex items-center justify-center text-white font-bold">🚚</div>
                  <div>
                    <span className="block text-xs text-neutral-gray font-bold">DELIVERY TO CUSTOMER</span>
                    <span className="text-sm font-black text-neutral-dark">Accra (via GhanaPost GPS)</span>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 p-4 text-xs text-gray-500 space-y-1">
                <div className="flex justify-between font-bold text-neutral-dark">
                  <span>Customer paid:</span>
                  <span>₵260.00</span>
                </div>
                <div className="flex justify-between">
                  <span>Supplier paid:</span>
                  <span>-₵180.00</span>
                </div>
                <div className="flex justify-between text-accent font-extrabold border-t border-gray-200 pt-1 text-sm">
                  <span>Your Net Profit:</span>
                  <span>₵80.00</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trust Badges */}
      <section className="bg-white py-8 border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 md:grid-cols-3 gap-8 text-center md:text-left">
          <div className="flex flex-col md:flex-row items-center gap-4">
            <div className="w-12 h-12 bg-primary/10 flex items-center justify-center text-primary">
              <ShieldCheck size={24} />
            </div>
            <div>
              <h3 className="font-bold text-neutral-dark">100% Verified Suppliers</h3>
              <p className="text-xs text-neutral-gray">Physical address & business license verified.</p>
            </div>
          </div>

          <div className="flex flex-col md:flex-row items-center gap-4">
            <div className="w-12 h-12 bg-primary/10 flex items-center justify-center text-primary">
              <CreditCard size={24} />
            </div>
            <div>
              <h3 className="font-bold text-neutral-dark">Secure Ghana MoMo Payments</h3>
              <p className="text-xs text-neutral-gray">Integrations with MTN MoMo, Telecel & Cards.</p>
            </div>
          </div>

          <div className="flex flex-col md:flex-row items-center gap-4">
            <div className="w-12 h-12 bg-primary/10 flex items-center justify-center text-primary">
              <Truck size={24} />
            </div>
            <div>
              <h3 className="font-bold text-neutral-dark">GhanaPost GPS Integration</h3>
              <p className="text-xs text-neutral-gray">Exact location deliveries across all 16 regions.</p>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="max-w-7xl mx-auto px-4 py-16">
        <div className="text-center space-y-4 mb-12">
          <h2 className="text-3xl font-black text-neutral-dark">How Local Dropshipping Works</h2>
          <p className="text-gray-500 max-w-xl mx-auto">
            A comprehensive network matching wholesale stock, retail marketing, secure escrow payments, and swift local logistics.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {steps.map((s, idx) => (
            <div key={idx} className="bg-white p-6 shadow-premium border border-gray-100 relative group hover:border-primary/20 transition-all">
              <span className="absolute top-4 right-4 text-4xl font-black text-gray-100 group-hover:text-primary/10 transition-colors">
                {s.num}
              </span>
              <h3 className="font-bold text-lg text-neutral-dark mb-2 mt-4">{s.title}</h3>
              <p className="text-xs text-neutral-gray leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Categories */}
      <section className="bg-white py-16 border-y border-gray-100">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex justify-between items-end mb-12">
            <div>
              <h2 className="text-3xl font-black text-neutral-dark">Browse Popular Categories</h2>
              <p className="text-gray-500 text-sm mt-1">High-demand categories in Ghana dropshipping right now.</p>
            </div>
            <button 
              onClick={onBrowseMarketplace}
              className="text-primary font-bold text-sm flex items-center gap-1 hover:underline whitespace-nowrap"
            >
              <span>View All Shop Items</span>
              <ChevronRight size={16} />
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-6">
            {categories.map((c) => (
              <button
                key={c.id}
                onClick={onBrowseMarketplace}
                className="bg-neutral-light p-6 border border-gray-100 flex flex-col items-center justify-center text-center gap-3 hover:bg-primary-light hover:border-primary/20 transition-all group"
              >
                <div className="w-12 h-12 bg-white flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                  {getCategoryIcon(c.icon)}
                </div>
                <span className="font-bold text-sm text-neutral-dark group-hover:text-primary transition-colors">
                  {c.name}
                </span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Trending Products */}
      <section className="max-w-7xl mx-auto px-4 py-16">
        <div className="flex justify-between items-end mb-12">
          <div>
            <h2 className="text-3xl font-black text-neutral-dark">Trending Wholesale Products</h2>
            <p className="text-gray-500 text-sm mt-1">Products added by local suppliers waiting for your shop import.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {products.map((p) => (
            <div 
              key={p.id} 
              className="bg-white overflow-hidden border border-gray-100 hover:border-primary/20 shadow-sm hover:shadow-premium transition-all flex flex-col"
            >
              <div className="relative aspect-video w-full overflow-hidden bg-gray-100">
                <img src={p.images[0]} alt={p.name} className="w-full h-full object-cover" />
                <span className="absolute top-3 left-3 bg-primary text-white font-bold text-xs px-2.5 py-1">
                  Wholesale
                </span>
              </div>
              
              <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                <div className="space-y-1">
                  <span className="text-[10px] text-primary font-bold uppercase tracking-wider bg-primary/10 px-2 py-0.5">
                    {p.sku}
                  </span>
                  <h3 className="font-bold text-neutral-dark line-clamp-1">{p.name}</h3>
                  <p className="text-xs text-gray-500 line-clamp-2">{p.description}</p>
                </div>

                <div className="space-y-3 pt-2">
                  <div className="flex justify-between items-center text-xs">
                    <div>
                      <span className="block text-gray-400 text-[10px]">SUPPLIER COST</span>
                      <span className="font-extrabold text-primary text-sm">₵{p.costPrice.toFixed(2)}</span>
                    </div>
                    <div className="text-right">
                      <span className="block text-gray-400 text-[10px]">SUGGESTED RET.</span>
                      <span className="font-extrabold text-neutral-dark text-sm">₵{p.suggestedPrice.toFixed(2)}</span>
                    </div>
                  </div>

                  <div className="flex justify-between items-center text-[10px] text-gray-400 border-t border-gray-100 pt-2">
                    <span>Stock: <strong className="text-neutral-dark">{p.stockQty} units</strong></span>
                    <span>Supplier: <strong className="text-primary">{p.supplierName.split(' ')[0]}</strong></span>
                  </div>

                  <button 
                    onClick={onJoinAsDropshipper}
                    className="w-full bg-accent hover:bg-accent-dark text-neutral-dark font-extrabold py-2.5 px-4 text-xs transition-colors flex items-center justify-center gap-1.5"
                  >
                    <TrendingUp size={14} />
                    <span>Import & Sell This</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
