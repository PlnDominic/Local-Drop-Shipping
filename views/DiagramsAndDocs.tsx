import React, { useState } from 'react';
import { Database, Cpu, FileCode, Play, Terminal } from 'lucide-react';

interface RouteDoc {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  path: string;
  desc: string;
  role: string;
  requestBody?: string;
  response: string;
}

export const DiagramsAndDocs: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'architecture' | 'database' | 'api'>('architecture');
  const [selectedRoute, setSelectedRoute] = useState<number>(0);
  const [apiOutput, setApiOutput] = useState<string | null>(null);
  const [apiLoading, setApiLoading] = useState(false);

  const apiRoutes: RouteDoc[] = [
    {
      method: 'POST',
      path: '/auth/register',
      desc: 'Register a new customer, dropshipper, or supplier.',
      role: 'Public',
      requestBody: JSON.stringify({
        email: "ama.mensah@gmail.com",
        phone: "+233244123456",
        fullName: "Ama Mensah",
        role: "customer"
      }, null, 2),
      response: JSON.stringify({
        success: true,
        user: {
          id: "u-customer-1",
          email: "ama.mensah@gmail.com",
          fullName: "Ama Mensah",
          role: "customer",
          isVerified: true
        },
        token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
      }, null, 2)
    },
    {
      method: 'POST',
      path: '/auth/login',
      desc: 'Authenticate user and retrieve JWT token.',
      role: 'Public',
      requestBody: JSON.stringify({
        email: "ama.mensah@gmail.com",
        password: "securepassword123"
      }, null, 2),
      response: JSON.stringify({
        token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
        role: "customer"
      }, null, 2)
    },
    {
      method: 'GET',
      path: '/products',
      desc: 'Retrieve active wholesale supplier catalog.',
      role: 'Public',
      response: JSON.stringify([
        {
          id: "p-1",
          name: "Kantanka Smart TV 43\"",
          costPrice: 1800.00,
          suggestedPrice: 2200.00,
          stockQty: 45,
          sku: "KTK-TV-43",
          supplier: "Kantanka Wholesalers Ltd."
        }
      ], null, 2)
    },
    {
      method: 'POST',
      path: '/dropshipper/products/import',
      desc: 'Import supplier products to dropshipper storefront with markup.',
      role: 'Dropshipper',
      requestBody: JSON.stringify({
        productId: "p-1",
        sellingPrice: 2150.00,
        customDescription: "Premium local Smart TV"
      }, null, 2),
      response: JSON.stringify({
        success: true,
        id: "dp-prod-1",
        sellingPrice: 2150.00,
        isPublished: true
      }, null, 2)
    },
    {
      method: 'POST',
      path: '/orders',
      desc: 'Create customer dropshipping order with escrow hold.',
      role: 'Customer',
      requestBody: JSON.stringify({
        paymentProvider: "mtn_momo",
        momoNumber: "+233244123456",
        deliveryAddress: {
          fullName: "Ama Mensah",
          phone: "+233244123456",
          region: "Greater Accra",
          city: "Accra",
          ghanaPostGps: "GA-184-9022"
        },
        items: [
          {
            dropshipperProductId: "dp-prod-1",
            quantity: 1
          }
        ]
      }, null, 2),
      response: JSON.stringify({
        orderNumber: "LDK-392817",
        status: "pending",
        totalAmount: 2150.00,
        profitAmount: 350.00
      }, null, 2)
    },
    {
      method: 'PATCH',
      path: '/orders/:id/status',
      desc: 'Update shipment status. Triggers wallet credits on dispatch.',
      role: 'Supplier / Admin',
      requestBody: JSON.stringify({
        status: "shipped"
      }, null, 2),
      response: JSON.stringify({
        orderId: "o-193283",
        newStatus: "shipped",
        commissionReleased: 350.00,
        supplierPayout: 1764.00,
        platformFee: 36.00
      }, null, 2)
    },
    {
      method: 'POST',
      path: '/wallet/withdraw',
      desc: 'Initiate MoMo cashout withdrawal from wallet balance.',
      role: 'Auth User',
      requestBody: JSON.stringify({
        amount: 300.00,
        momoPhone: "+233558765432",
        momoProvider: "MTN MoMo"
      }, null, 2),
      response: JSON.stringify({
        success: true,
        transactionRef: "WDR-928174",
        remainingBalance: 150.00
      }, null, 2)
    }
  ];

  const handleTryItOut = (route: RouteDoc) => {
    setApiLoading(true);
    setApiOutput(null);
    setTimeout(() => {
      setApiOutput(route.response);
      setApiLoading(false);
    }, 800);
  };

  const getMethodColor = (m: string) => {
    switch (m) {
      case 'GET': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'POST': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'PUT': 
      case 'PATCH': return 'bg-yellow-50 text-yellow-700 border-yellow-200';
      case 'DELETE': return 'bg-red-50 text-red-700 border-red-200';
      default: return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 min-h-screen space-y-8 font-sans animate-fade-in">
      {/* Title */}
      <div>
        <h2 className="text-2xl font-black text-neutral-dark">Platform Developer Portal</h2>
        <p className="text-xs text-neutral-gray">Review system architecture blueprints, database schemas, and REST endpoint specs.</p>
      </div>

      {/* Nav */}
      <div className="flex border-b border-gray-200 gap-6">
        <button
          onClick={() => { setActiveTab('architecture'); setApiOutput(null); }}
          className={`pb-3 text-sm font-bold flex items-center gap-1.5 border-b-2 transition-all ${
            activeTab === 'architecture' ? 'border-primary text-primary' : 'border-transparent text-neutral-gray hover:text-neutral-dark'
          }`}
        >
          <Cpu size={16} />
          <span>System Architecture</span>
        </button>
        
        <button
          onClick={() => { setActiveTab('database'); setApiOutput(null); }}
          className={`pb-3 text-sm font-bold flex items-center gap-1.5 border-b-2 transition-all ${
            activeTab === 'database' ? 'border-primary text-primary' : 'border-transparent text-neutral-gray hover:text-neutral-dark'
          }`}
        >
          <Database size={16} />
          <span>Database ER Diagram</span>
        </button>

        <button
          onClick={() => { setActiveTab('api'); setApiOutput(null); }}
          className={`pb-3 text-sm font-bold flex items-center gap-1.5 border-b-2 transition-all ${
            activeTab === 'api' ? 'border-primary text-primary' : 'border-transparent text-neutral-gray hover:text-neutral-dark'
          }`}
        >
          <FileCode size={16} />
          <span>REST API Explorer</span>
        </button>
      </div>

      {/* ARCHITECTURE DIAGRAM */}
      {activeTab === 'architecture' && (
        <div className="bg-white p-6 md:p-10 border border-gray-100 shadow-sm flex flex-col items-center">
          <div className="w-full max-w-4xl space-y-8">
            <div className="text-center">
              <h3 className="font-extrabold text-neutral-dark">Platform Data & Logic Flow</h3>
              <p className="text-xs text-neutral-gray mt-1">Multi-client frontend communicating via edge CDN to a modular monolithic Nest.js service Layer.</p>
            </div>

            {/* Architecture SVG representation */}
            <div className="border border-gray-100 bg-gray-50/50 p-6 flex justify-center">
              <svg viewBox="0 0 800 550" className="w-full h-auto max-w-3xl">
                {/* Client Layer */}
                <rect x="20" y="30" width="760" height="90" rx="16" fill="#f3f4f6" stroke="#e5e7eb" strokeWidth="2" />
                <text x="400" y="55" textAnchor="middle" fill="#374151" fontSize="12" fontWeight="bold">USER CLIENT INTERFACES (Web & Mobile Apps)</text>
                
                {/* User Roles */}
                <rect x="50" y="70" width="140" height="36" rx="8" fill="#ffffff" stroke="#cbd5e1" />
                <text x="120" y="92" textAnchor="middle" fill="#0f172a" fontSize="10" fontWeight="bold">Customer (Shopify Style)</text>

                <rect x="230" y="70" width="140" height="36" rx="8" fill="#ffffff" stroke="#cbd5e1" />
                <text x="300" y="92" textAnchor="middle" fill="#0f172a" fontSize="10" fontWeight="bold">Dropshipper SaaS</text>

                <rect x="410" y="70" width="140" height="36" rx="8" fill="#ffffff" stroke="#cbd5e1" />
                <text x="480" y="92" textAnchor="middle" fill="#0f172a" fontSize="10" fontWeight="bold">Supplier Portal</text>

                <rect x="590" y="70" width="140" height="36" rx="8" fill="#ffffff" stroke="#cbd5e1" />
                <text x="660" y="92" textAnchor="middle" fill="#0f172a" fontSize="10" fontWeight="bold">Admin Control Console</text>

                {/* Arrow Client -> CDN */}
                <line x1="400" y1="120" x2="400" y2="160" stroke="#006B3F" strokeWidth="3" markerEnd="url(#arrow)" strokeDasharray="4 4" />

                {/* Edge CDN */}
                <rect x="250" y="160" width="300" height="40" rx="10" fill="#006B3F" />
                <text x="400" y="185" textAnchor="middle" fill="#ffffff" fontSize="11" fontWeight="bold">Vercel Edge Network / Cloudflare CDN</text>

                {/* Arrow CDN -> Backend */}
                <line x1="400" y1="200" x2="400" y2="240" stroke="#006B3F" strokeWidth="3" markerEnd="url(#arrow)" />

                {/* NestJS Monolith */}
                <rect x="80" y="240" width="640" height="150" rx="16" fill="#f8fafc" stroke="#006B3F" strokeWidth="2" />
                <text x="400" y="265" textAnchor="middle" fill="#006B3F" fontSize="12" fontWeight="black">Nest.js Modular Monolith Engine</text>

                {/* Modules */}
                <rect x="110" y="290" width="120" height="30" rx="6" fill="#ffffff" stroke="#e2e8f0" />
                <text x="170" y="308" textAnchor="middle" fill="#0f172a" fontSize="9" fontWeight="bold">Auth & User Module</text>

                <rect x="250" y="290" width="120" height="30" rx="6" fill="#ffffff" stroke="#e2e8f0" />
                <text x="310" y="308" textAnchor="middle" fill="#0f172a" fontSize="9" fontWeight="bold">Products Module</text>

                <rect x="390" y="290" width="120" height="30" rx="6" fill="#ffffff" stroke="#e2e8f0" />
                <text x="450" y="308" textAnchor="middle" fill="#0f172a" fontSize="9" fontWeight="bold">Orders Module</text>

                <rect x="530" y="290" width="140" height="30" rx="6" fill="#ffffff" stroke="#e2e8f0" />
                <text x="600" y="308" textAnchor="middle" fill="#0f172a" fontSize="9" fontWeight="bold">Wallet & Payouts</text>

                {/* Integrations */}
                <rect x="110" y="340" width="560" height="36" rx="6" fill="#f1f5f9" stroke="#cbd5e1" />
                <text x="390" y="362" textAnchor="middle" fill="#475569" fontSize="9" fontWeight="bold">Paystack MoMo Bridge · Hubtel SMS Gateway · WhatsApp API · GhanaPost GPS Route Manager</text>

                {/* Arrow Backend -> Database */}
                <line x1="250" y1="390" x2="250" y2="440" stroke="#475569" strokeWidth="2.5" markerEnd="url(#arrow)" />
                <line x1="550" y1="390" x2="550" y2="440" stroke="#475569" strokeWidth="2.5" markerEnd="url(#arrow)" />

                {/* Database Services */}
                <rect x="60" y="440" width="320" height="60" rx="12" fill="#006B3F" fillOpacity="0.05" stroke="#006B3F" strokeWidth="1.5" />
                <text x="220" y="465" textAnchor="middle" fill="#006B3F" fontSize="11" fontWeight="bold">Supabase PostgreSQL Database</text>
                <text x="220" y="485" textAnchor="middle" fill="#475569" fontSize="9">Row Level Security (RLS) + JWT Auth</text>

                <rect x="420" y="440" width="320" height="60" rx="12" fill="#fcd116" fillOpacity="0.05" stroke="#d6b00c" strokeWidth="1.5" />
                <text x="580" y="465" textAnchor="middle" fill="#d6b00c" fontSize="11" fontWeight="bold">Supabase Storage & Realtime CDN</text>
                <text x="580" y="485" textAnchor="middle" fill="#475569" fontSize="9">Product Images & Websocket Order Updates</text>

                {/* SVG Marker Definitions */}
                <defs>
                  <marker id="arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                    <path d="M 0 0 L 10 5 L 0 10 z" fill="#006B3F" />
                  </marker>
                </defs>
              </svg>
            </div>
          </div>
        </div>
      )}

      {/* DATABASE ERD */}
      {activeTab === 'database' && (
        <div className="bg-white p-6 md:p-10 border border-gray-100 shadow-sm flex flex-col items-center">
          <div className="w-full max-w-5xl space-y-6">
            <div className="text-center">
              <h3 className="font-extrabold text-neutral-dark">Database Schema Relationships</h3>
              <p className="text-xs text-neutral-gray mt-1">Supabase PostgreSQL entity relationship tables with primary and foreign references.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-4">
              
              {/* Table USERS */}
              <div className="bg-gray-50 border border-gray-200 overflow-hidden text-xs">
                <div className="bg-primary text-white p-3 font-bold flex justify-between">
                  <span>users</span>
                  <span className="text-[10px] text-accent">Entity</span>
                </div>
                <div className="p-3 space-y-1.5 font-mono text-[10px]">
                  <div className="flex justify-between"><span className="font-bold">id</span><span className="text-gray-400">UUID (PK)</span></div>
                  <div className="flex justify-between"><span>email</span><span className="text-gray-400">TEXT UNIQUE</span></div>
                  <div className="flex justify-between"><span>phone</span><span className="text-gray-400">TEXT</span></div>
                  <div className="flex justify-between"><span>full_name</span><span className="text-gray-400">TEXT</span></div>
                  <div className="flex justify-between"><span>role</span><span className="text-gray-400">VARCHAR (ENUM)</span></div>
                  <div className="flex justify-between"><span>is_verified</span><span className="text-gray-400">BOOLEAN</span></div>
                </div>
              </div>

              {/* Table SUPPLIER PROFILES */}
              <div className="bg-gray-50 border border-gray-200 overflow-hidden text-xs">
                <div className="bg-purple-900 text-white p-3 font-bold flex justify-between">
                  <span>supplier_profiles</span>
                  <span className="text-[10px] text-purple-300">Entity</span>
                </div>
                <div className="p-3 space-y-1.5 font-mono text-[10px]">
                  <div className="flex justify-between"><span className="font-bold">id</span><span className="text-gray-400">UUID (PK)</span></div>
                  <div className="flex justify-between text-purple-700"><span>user_id</span><span className="text-gray-400">UUID (FK)</span></div>
                  <div className="flex justify-between"><span>business_name</span><span className="text-gray-400">TEXT</span></div>
                  <div className="flex justify-between"><span>business_reg</span><span className="text-gray-400">TEXT</span></div>
                  <div className="flex justify-between"><span>is_approved</span><span className="text-gray-400">BOOLEAN</span></div>
                  <div className="flex justify-between"><span>rating</span><span className="text-gray-400">DECIMAL</span></div>
                </div>
              </div>

              {/* Table DROPSHIPPER PROFILES */}
              <div className="bg-gray-50 border border-gray-200 overflow-hidden text-xs">
                <div className="bg-emerald-800 text-white p-3 font-bold flex justify-between">
                  <span>dropshipper_profiles</span>
                  <span className="text-[10px] text-emerald-300">Entity</span>
                </div>
                <div className="p-3 space-y-1.5 font-mono text-[10px]">
                  <div className="flex justify-between"><span className="font-bold">id</span><span className="text-gray-400">UUID (PK)</span></div>
                  <div className="flex justify-between text-emerald-600"><span>user_id</span><span className="text-gray-400">UUID (FK)</span></div>
                  <div className="flex justify-between"><span>store_name</span><span className="text-gray-400">TEXT</span></div>
                  <div className="flex justify-between"><span>store_slug</span><span className="text-gray-400">TEXT UNIQUE</span></div>
                  <div className="flex justify-between"><span>commission_rate</span><span className="text-gray-400">DECIMAL</span></div>
                </div>
              </div>

              {/* Table PRODUCTS */}
              <div className="bg-gray-50 border border-gray-200 overflow-hidden text-xs">
                <div className="bg-gray-800 text-white p-3 font-bold flex justify-between">
                  <span>products</span>
                  <span className="text-[10px] text-gray-400">Entity</span>
                </div>
                <div className="p-3 space-y-1.5 font-mono text-[10px]">
                  <div className="flex justify-between"><span className="font-bold">id</span><span className="text-gray-400">UUID (PK)</span></div>
                  <div className="flex justify-between text-purple-700"><span>supplier_id</span><span className="text-gray-400">UUID (FK)</span></div>
                  <div className="flex justify-between"><span>category_id</span><span className="text-gray-400">UUID (FK)</span></div>
                  <div className="flex justify-between"><span>name</span><span className="text-gray-400">TEXT</span></div>
                  <div className="flex justify-between"><span>cost_price</span><span className="text-gray-400">DECIMAL</span></div>
                  <div className="flex justify-between"><span>stock_qty</span><span className="text-gray-400">INTEGER</span></div>
                </div>
              </div>

              {/* Table ORDERS */}
              <div className="bg-gray-50 border border-gray-200 overflow-hidden text-xs">
                <div className="bg-blue-900 text-white p-3 font-bold flex justify-between">
                  <span>orders</span>
                  <span className="text-[10px] text-blue-300">Entity</span>
                </div>
                <div className="p-3 space-y-1.5 font-mono text-[10px]">
                  <div className="flex justify-between"><span className="font-bold">id</span><span className="text-gray-400">UUID (PK)</span></div>
                  <div className="flex justify-between"><span>order_number</span><span className="text-gray-400">TEXT UNIQUE</span></div>
                  <div className="flex justify-between text-blue-600"><span>customer_id</span><span className="text-gray-400">UUID (FK)</span></div>
                  <div className="flex justify-between text-emerald-600"><span>dropshipper_id</span><span className="text-gray-400">UUID (FK)</span></div>
                  <div className="flex justify-between text-purple-700"><span>supplier_id</span><span className="text-gray-400">UUID (FK)</span></div>
                  <div className="flex justify-between"><span>status</span><span className="text-gray-400">VARCHAR</span></div>
                  <div className="flex justify-between"><span>total_amount</span><span className="text-gray-400">DECIMAL</span></div>
                </div>
              </div>

              {/* Table WALLETS */}
              <div className="bg-gray-50 border border-gray-200 overflow-hidden text-xs">
                <div className="bg-yellow-900 text-white p-3 font-bold flex justify-between">
                  <span>wallets</span>
                  <span className="text-[10px] text-yellow-300">Entity</span>
                </div>
                <div className="p-3 space-y-1.5 font-mono text-[10px]">
                  <div className="flex justify-between"><span className="font-bold">id</span><span className="text-gray-400">UUID (PK)</span></div>
                  <div className="flex justify-between text-yellow-600"><span>user_id</span><span className="text-gray-400">UUID (FK)</span></div>
                  <div className="flex justify-between"><span>balance</span><span className="text-gray-400">DECIMAL</span></div>
                  <div className="flex justify-between"><span>total_earned</span><span className="text-gray-400">DECIMAL</span></div>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* REST API EXPLORER */}
      {activeTab === 'api' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Side menu: Routes */}
          <div className="lg:col-span-4 bg-white p-5 border border-gray-100 shadow-sm space-y-4">
            <h4 className="font-extrabold text-sm text-neutral-dark">REST Endpoints</h4>
            <div className="flex flex-col gap-1.5">
              {apiRoutes.map((route, idx) => (
                <button
                  key={idx}
                  onClick={() => { setSelectedRoute(idx); setApiOutput(null); }}
                  className={`p-3 border text-left flex flex-col gap-1.5 transition-colors ${
                    selectedRoute === idx 
                      ? 'border-primary bg-primary-light/30' 
                      : 'border-gray-100 hover:border-gray-200 bg-gray-50/50'
                  }`}
                >
                  <div className="flex justify-between items-center text-[10px]">
                    <span className={`px-2 py-0.5 font-bold border ${getMethodColor(route.method)}`}>
                      {route.method}
                    </span>
                    <span className="text-gray-400 font-bold">{route.role}</span>
                  </div>
                  <span className="font-mono text-xs font-semibold text-neutral-dark">{route.path}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Route Content Area */}
          <div className="lg:col-span-8 space-y-6">
            <div className="bg-white p-6 border border-gray-100 shadow-sm space-y-6">
              
              {/* API Info */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className={`px-2.5 py-0.8 text-xs font-black border uppercase tracking-wider ${getMethodColor(apiRoutes[selectedRoute].method)}`}>
                    {apiRoutes[selectedRoute].method}
                  </span>
                  <span className="font-mono text-sm font-bold text-neutral-dark">
                    https://api.localdropshippinggh.com/v1{apiRoutes[selectedRoute].path}
                  </span>
                </div>
                <p className="text-xs text-neutral-gray">{apiRoutes[selectedRoute].desc}</p>
              </div>

              {/* DTO Request Body */}
              {apiRoutes[selectedRoute].requestBody && (
                <div className="space-y-2">
                  <span className="text-[10px] font-bold uppercase text-gray-400 tracking-wider">Request JSON Payload</span>
                  <pre className="bg-neutral-dark text-gray-300 p-4 text-xs font-mono overflow-x-auto leading-relaxed border border-gray-800">
                    {apiRoutes[selectedRoute].requestBody}
                  </pre>
                </div>
              )}

              {/* Action trigger */}
              <div className="flex items-center gap-4">
                <button
                  onClick={() => handleTryItOut(apiRoutes[selectedRoute])}
                  disabled={apiLoading}
                  className="bg-primary hover:bg-primary-dark text-white font-extrabold py-2.5 px-5 text-xs transition-colors flex items-center gap-1.5 shadow-premium"
                >
                  {apiLoading ? (
                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent animate-spin"></span>
                  ) : (
                    <Play size={14} className="fill-current" />
                  )}
                  <span>Try It Out</span>
                </button>
                <span className="text-[10px] text-gray-400">Click to execute mock request call and review output.</span>
              </div>
            </div>

            {/* Simulated Response Output */}
            {(apiOutput || apiLoading) && (
              <div className="bg-[#1e293b] p-6 shadow-xl border border-slate-800 space-y-4 animate-slide-up">
                <div className="flex justify-between items-center text-xs font-bold text-slate-400 border-b border-slate-800 pb-3">
                  <span className="flex items-center gap-1.5 text-emerald-400">
                    <Terminal size={14} />
                    SIMULATED RESPONSE: 200 OK
                  </span>
                  <span>JSON Output</span>
                </div>

                {apiLoading ? (
                  <div className="py-6 flex items-center justify-center gap-2 text-slate-400 text-xs">
                    <span className="w-4 h-4 border-2 border-slate-400 border-t-transparent animate-spin"></span>
                    <span>Waiting for mock server response...</span>
                  </div>
                ) : (
                  <pre className="text-slate-300 text-xs font-mono overflow-x-auto leading-relaxed">
                    {apiOutput}
                  </pre>
                )}
              </div>
            )}

          </div>

        </div>
      )}
    </div>
  );
};
