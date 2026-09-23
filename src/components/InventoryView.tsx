import React, { useState, useMemo } from 'react';
import { 
  Boxes, 
  Search, 
  Plus, 
  Edit, 
  AlertTriangle, 
  CheckCircle2, 
  RefreshCw, 
  Layers, 
  DollarSign, 
  TrendingUp, 
  ArrowUpDown,
  ExternalLink,
  Globe,
  Check,
  Eye,
  X,
  Sparkles,
  Lock,
  Clock,
  Timer
} from 'lucide-react';
import { Product, CafeStatus, Order } from '../types';

interface InventoryViewProps {
  products: Product[];
  orders?: Order[];
  onUpdateStock: (productId: string, newStock: number) => void;
  onOpenEditModal: (product: Product | null) => void;
  onSyncAllStock: () => Promise<void>;
  isSyncingStock: boolean;
  partnerStoreUrl?: string;
  onQuickUpdatePrice?: (productId: string, newPrice: number) => void;
  onQuickRename?: (productId: string, newName: string) => void;
  cafeStatus?: CafeStatus;
  onOpenCafeStatusModal?: () => void;
  onSwitchToCustomerTab?: () => void;
  onReopenCafeEarly?: () => Promise<void>;
}

export const InventoryView: React.FC<InventoryViewProps> = ({
  products,
  orders = [],
  onUpdateStock,
  onOpenEditModal,
  onSyncAllStock,
  isSyncingStock,
  partnerStoreUrl = 'https://brozza.vercel.app',
  onQuickUpdatePrice,
  onQuickRename,
  cafeStatus,
  onOpenCafeStatusModal,
  onSwitchToCustomerTab,
  onReopenCafeEarly
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [editingPriceId, setEditingPriceId] = useState<string | null>(null);
  const [tempPrice, setTempPrice] = useState<string>('');
  const [editingNameId, setEditingNameId] = useState<string | null>(null);
  const [tempName, setTempName] = useState<string>('');
  const [stockInputMap, setStockInputMap] = useState<Record<string, string>>({});
  const [showStorePreview, setShowStorePreview] = useState(false);
  const [showClosedNoticeModal, setShowClosedNoticeModal] = useState(false);

  const getDisplayStock = (prod: Product) => {
    if (stockInputMap[prod.id] !== undefined) {
      return stockInputMap[prod.id];
    }
    return prod.stock.toString();
  };

  const handleStockChange = (productId: string, val: string) => {
    setStockInputMap(prev => ({ ...prev, [productId]: val }));
  };

  const handleStockCommit = (productId: string) => {
    const raw = stockInputMap[productId];
    if (raw === undefined) return;
    const num = parseInt(raw, 10);
    if (!isNaN(num) && num >= 0) {
      onUpdateStock(productId, num);
    }
    setStockInputMap(prev => {
      const next = { ...prev };
      delete next[productId];
      return next;
    });
  };

  const handleStepStock = (productId: string, currentStock: number, delta: number) => {
    const newStock = Math.max(0, currentStock + delta);
    onUpdateStock(productId, newStock);
    setStockInputMap(prev => {
      const next = { ...prev };
      delete next[productId];
      return next;
    });
  };

  // Categories list
  const categories = useMemo(() => {
    const set = new Set(products.map(p => p.category));
    return Array.from(set);
  }, [products]);

  // Filtered products
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchesSearch = 
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.sku.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCat = categoryFilter === 'all' || p.category === categoryFilter;
      const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
      return matchesSearch && matchesCat && matchesStatus;
    });
  }, [products, searchTerm, categoryFilter, statusFilter]);

  const lowStockItems = products.filter(p => p.status === 'low_stock' || p.stock <= p.lowStockThreshold);
  const outOfStockItems = products.filter(p => p.stock === 0 || p.status === 'out_of_stock');

  const handleStartEditPrice = (prod: Product) => {
    setEditingPriceId(prod.id);
    setTempPrice(prod.price.toString());
  };

  const handleSaveQuickPrice = (productId: string) => {
    const num = parseFloat(tempPrice);
    if (!isNaN(num) && num >= 0) {
      if (onQuickUpdatePrice) {
        onQuickUpdatePrice(productId, num);
      }
    }
    setEditingPriceId(null);
  };

  const handleSaveQuickName = (productId: string) => {
    if (tempName.trim()) {
      if (onQuickRename) {
        onQuickRename(productId, tempName.trim());
      }
    }
    setEditingNameId(null);
  };

  return (
    <div className="space-y-6">
      {/* Top Header: Metric & Search / Add Product Bar */}
      <div className="p-3.5 sm:p-4 rounded-xl bg-slate-900 border border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Metric on left */}
        <div className="flex items-center gap-3.5 shrink-0">
          <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0">
            <Boxes className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-white font-mono leading-none">{products.length}</span>
              <span className="text-xs text-slate-300 font-medium">Total Catalog Dishes</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Across {categories.length} distinct categories</p>
          </div>
        </div>

        {/* Search input & Add Product button shifted to upper container */}
        <div className="flex flex-1 items-center gap-2.5 max-w-2xl w-full">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search products by title or SKU code..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700/80 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
            />
          </div>

          <button
            onClick={() => onOpenEditModal(null)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow transition cursor-pointer shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Product</span>
          </button>
        </div>
      </div>

      {/* Low Stock Warning Banner */}
      {lowStockItems.length > 0 && (
        <div className="p-4 rounded-xl bg-amber-950/40 border border-amber-800/60 flex flex-wrap items-center justify-between gap-3 text-amber-200 text-xs">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
            <div>
              <p className="font-bold text-white">
                Low Inventory Notice: {lowStockItems.length} product(s) are below restock threshold
              </p>
              <p className="text-slate-300 text-[11px]">
                {lowStockItems.map(p => `${p.name} (${p.stock} left)`).join(' • ')}
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              lowStockItems.forEach(p => onUpdateStock(p.id, p.stock + 20));
            }}
            className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-bold transition shadow-sm"
          >
            Quick Restock (+20 units)
          </button>
        </div>
      )}

      {/* Inventory Table */}
      <div className="rounded-xl border border-slate-800 bg-slate-900 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-950/80 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Dish / Menu Item</th>
                <th className="py-3 px-4">Available Quantity</th>
                <th className="py-3 px-4">Price (₹ INR) & Margin</th>
                <th className="py-3 px-4 text-right">Edit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 text-slate-300">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-slate-400">
                    <Boxes className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                    <p className="font-semibold text-slate-300">No products matched filter</p>
                  </td>
                </tr>
              ) : (
                filteredProducts.map((prod, idx) => {
                  const marginPercent = Math.round(((prod.price - prod.costPrice) / prod.price) * 100);
                  const isLow = prod.stock <= prod.lowStockThreshold && prod.stock > 0;
                  const isOut = prod.stock === 0;

                  return (
                    <tr key={prod.id ? `${prod.id}-${prod.sku || idx}` : `prod-${idx}`} className="hover:bg-slate-800/40 transition">
                      {/* Product Name (Customer Site Live Sync) */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          {prod.imageUrl ? (
                            <img
                              src={prod.imageUrl}
                              alt={prod.name}
                              className="w-10 h-10 object-cover rounded-lg border border-slate-700 shrink-0 bg-slate-900"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 shrink-0">
                              <Boxes className="w-5 h-5" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            {editingNameId === prod.id ? (
                              <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                                <input
                                  type="text"
                                  value={tempName}
                                  onChange={(e) => setTempName(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      handleSaveQuickName(prod.id);
                                    } else if (e.key === 'Escape') {
                                      setEditingNameId(null);
                                    }
                                  }}
                                  autoFocus
                                  placeholder="Dish title..."
                                  className="px-2 py-1 bg-slate-950 border border-indigo-500 rounded text-xs text-white font-bold focus:outline-none focus:ring-1 focus:ring-indigo-400 w-48"
                                />
                                <button
                                  type="button"
                                  onClick={() => handleSaveQuickName(prod.id)}
                                  className="p-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer shadow-xs"
                                  title="Save Dish Name (Instant Live Sync)"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditingNameId(null)}
                                  className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 cursor-pointer"
                                  title="Cancel"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1.5">
                                <span 
                                  className="font-bold text-white max-w-[280px] truncate capitalize hover:text-indigo-300 cursor-pointer flex items-center gap-1.5 group/dish text-sm"
                                  title="Click to rename dish (Instant sync)"
                                  onClick={() => {
                                    setEditingNameId(prod.id);
                                    setTempName(prod.name);
                                  }}
                                >
                                  {prod.name}
                                  <Edit className="w-3.5 h-3.5 text-slate-500 opacity-60 group-hover/dish:opacity-100 group-hover/dish:text-indigo-400 shrink-0 transition-opacity" />
                                </span>
                              </div>
                            )}
                            {prod.description && (
                              <div className="text-[10px] text-slate-400 max-w-[240px] truncate mt-0.5" title={prod.description}>
                                {prod.description}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Available Quantity (Manual Admin Edit with Live Sync) */}
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          <div className="flex items-center bg-slate-950 border-2 border-slate-700 hover:border-indigo-500 focus-within:border-indigo-500 rounded-xl p-1 shadow-md transition-colors">
                            <button
                              type="button"
                              onClick={() => handleStepStock(prod.id, prod.stock, -1)}
                              disabled={prod.stock <= 0}
                              className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-300 hover:text-white bg-slate-900 hover:bg-rose-600 disabled:opacity-20 disabled:hover:bg-slate-900 transition-all cursor-pointer text-lg font-black active:scale-95 shadow-xs"
                              title="Decrease quantity by 1"
                            >
                              −
                            </button>
                            <div className="relative flex items-center px-1">
                              <input
                                type="number"
                                min="0"
                                step="1"
                                value={getDisplayStock(prod)}
                                onChange={(e) => handleStockChange(prod.id, e.target.value)}
                                onBlur={() => handleStockCommit(prod.id)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    handleStockCommit(prod.id);
                                    (e.target as HTMLInputElement).blur();
                                  }
                                }}
                                className={`w-16 bg-transparent text-center font-mono font-black text-lg focus:outline-none py-0.5 tracking-tight ${
                                  isOut ? 'text-rose-400' : isLow ? 'text-amber-300' : 'text-emerald-300'
                                }`}
                                title="Enter quantity available manually — updates live on brozza.vercel.app"
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => handleStepStock(prod.id, prod.stock, 1)}
                              className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-300 hover:text-white bg-slate-900 hover:bg-emerald-600 transition-all cursor-pointer text-lg font-black active:scale-95 shadow-xs"
                              title="Increase quantity by 1"
                            >
                              +
                            </button>
                          </div>

                          {/* Quick Set 0 / Restock 25 button */}
                          {prod.stock > 0 ? (
                            <button
                              type="button"
                              onClick={() => onUpdateStock(prod.id, 0)}
                              className="px-3 py-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/40 text-xs font-black transition cursor-pointer whitespace-nowrap active:scale-95 shadow-xs"
                              title="Set quantity to 0 (Mark dish Sold Out on brozza.vercel.app)"
                            >
                              Set 0
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => onUpdateStock(prod.id, 25)}
                              className="px-3 py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/50 text-xs font-black transition cursor-pointer whitespace-nowrap active:scale-95 shadow-xs"
                              title="Restock +25 units (Available on brozza.vercel.app)"
                            >
                              Restock 25
                            </button>
                          )}
                        </div>
                      </td>

                      {/* Price & Margin (Pure Indian Rupees ₹) */}
                      <td className="py-3.5 px-4">
                        {editingPriceId === prod.id ? (
                          <div className="flex items-center gap-1.5">
                            <span className="text-emerald-400 font-bold font-mono text-sm">₹</span>
                            <input
                              type="number"
                              step="1"
                              value={tempPrice}
                              onChange={(e) => setTempPrice(e.target.value)}
                              className="w-20 bg-slate-950 border border-emerald-500 rounded px-2 py-1 text-white font-mono text-sm font-bold focus:outline-none focus:ring-1 focus:ring-emerald-400"
                              autoFocus
                              placeholder="Rupees"
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveQuickPrice(prod.id);
                                if (e.key === 'Escape') setEditingPriceId(null);
                              }}
                            />
                            <button
                              onClick={() => handleSaveQuickPrice(prod.id)}
                              className="p-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer shadow-sm transition"
                              title="Save Price in Rupees (₹)"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <div className="group/price flex items-center gap-2">
                            <div>
                              <div className="font-bold text-emerald-400 font-mono text-base flex items-center gap-0.5">
                                <span>₹</span>
                                <span>{prod.price}</span>
                              </div>
                            </div>
                            <button
                              onClick={() => handleStartEditPrice(prod)}
                              className="opacity-0 group-hover/price:opacity-100 p-1 text-slate-400 hover:text-emerald-300 transition cursor-pointer"
                              title="Quick Edit Price (₹)"
                            >
                              <Edit className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </td>





                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => onOpenEditModal(prod)}
                          className="flex items-center gap-1.5 ml-auto px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-indigo-600 hover:text-white text-slate-300 transition text-xs font-semibold cursor-pointer"
                          title="Edit Dish, Price, Photo & Thresholds"
                        >
                          <Edit className="w-3.5 h-3.5" />
                          <span>Edit Dish</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="px-4 py-3 bg-slate-950/60 border-t border-slate-800 flex justify-between items-center text-xs text-slate-400">
          <span>Displaying {filteredProducts.length} inventory records</span>
          <span className="text-slate-400">Warehouse ID: <strong className="text-slate-200 font-mono">WH-NORTH-01</strong></span>
        </div>
      </div>

      {/* Customer Website Live Storefront Preview & Sync Modal */}
      {showStorePreview && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-5xl h-[88vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/70 shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                  <Globe className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-white">Customer Website Live Preview & Catalog Sync</h3>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-mono font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                      Live Connected
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Viewing customer storefront (<span className="text-indigo-300 font-mono">{partnerStoreUrl}</span>) with Firestore menu catalog synchronization
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={onSyncAllStock}
                  disabled={isSyncingStock}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold transition shadow-sm cursor-pointer"
                  title="Push latest dishes & prices to customer site"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncingStock ? 'animate-spin' : ''}`} />
                  <span>{isSyncingStock ? 'Pushing...' : 'Re-sync All Dishes'}</span>
                </button>
                <a
                  href={partnerStoreUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition"
                  title="Open storefront in a new browser tab"
                >
                  <span>Open in New Tab</span>
                  <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                </a>
                <button
                  onClick={() => setShowStorePreview(false)}
                  className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
                  title="Close Preview"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Catalog Synced Dishes Strip */}
            <div className="px-4 py-2.5 bg-slate-950/40 border-b border-slate-800/80 flex items-center justify-between text-xs overflow-x-auto shrink-0 gap-4">
              <div className="flex items-center gap-2 text-slate-300">
                <span className="font-semibold text-white">Active Synced Catalog:</span>
                <span className="text-slate-400">{products.length} dishes live in Firestore doc <code className="text-indigo-300 font-mono text-[11px]">orders/barozza_menu_catalog</code></span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                {products.slice(0, 6).map((p, idx) => (
                  <span key={p.id ? `${p.id}-${p.sku || idx}` : `p-${idx}`} className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 text-[10px] font-medium border border-slate-700 whitespace-nowrap">
                    {p.name} (₹{p.price})
                  </span>
                ))}
                {products.length > 6 && (
                  <span className="text-[10px] text-slate-400 font-medium whitespace-nowrap">+{products.length - 6} more</span>
                )}
              </div>
            </div>

            {/* Cafe Closure Live Warning in Storefront Preview */}
            {cafeStatus && !cafeStatus.isOpen && (
              <div className="px-4 py-3 bg-black border-b-2 border-neutral-700 flex flex-wrap items-center justify-between gap-3 text-xs text-white">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
                  <span className="font-mono font-bold text-rose-300 uppercase">🔒 Cafe Closed Active:</span>
                  <span className="text-neutral-200">
                    "currently cafe is closed. so I'm sorry boss ! . it will open at <strong className="text-amber-300 font-mono">{cafeStatus.formattedReopenTime}</strong>."
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {onSwitchToCustomerTab && (
                    <button
                      onClick={() => {
                        setShowStorePreview(false);
                        onSwitchToCustomerTab();
                      }}
                      className="px-3 py-1.5 rounded-lg bg-white text-black hover:bg-neutral-200 font-bold transition shadow cursor-pointer"
                    >
                      Open Customer Dashboard Tab (B&W)
                    </button>
                  )}
                  {onReopenCafeEarly && (
                    <button
                      onClick={onReopenCafeEarly}
                      className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-white font-bold border border-neutral-600 transition cursor-pointer"
                    >
                      Reopen Cafe Early
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Live Storefront Iframe */}
            <div className="flex-1 w-full bg-slate-950 relative overflow-hidden">
              <iframe
                src={partnerStoreUrl}
                title="Customer Storefront Live View"
                className={`w-full h-full border-0 transition-all duration-500 ${
                  cafeStatus && !cafeStatus.isOpen ? 'filter grayscale contrast-125' : ''
                }`}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              />

              {/* Floating B&W Status & Product Alert Test Helper */}
              {cafeStatus && !cafeStatus.isOpen && (
                <div 
                  onClick={() => setShowClosedNoticeModal(true)}
                  className="absolute bottom-5 right-5 z-20 p-3.5 rounded-xl bg-black/95 border-2 border-neutral-700 text-white shadow-2xl backdrop-blur-md cursor-pointer hover:border-neutral-500 transition max-w-md group"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-neutral-900 border border-neutral-700 flex items-center justify-center shrink-0 mt-0.5">
                      <Lock className="w-4 h-4 text-rose-400" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                        <span className="text-xs font-bold text-white uppercase tracking-wider">
                          Storefront In Black & White Mode
                        </span>
                      </div>
                      <p className="text-[11px] text-neutral-300 mt-1 leading-snug">
                        "currently cafe is closed. so I'm sorry boss ! . it will open at <strong className="text-amber-300 font-mono">{cafeStatus.formattedReopenTime}</strong>."
                      </p>
                      <div className="mt-2 text-[10px] font-semibold text-indigo-400 group-hover:text-indigo-300 flex items-center gap-1">
                        <span>Click to preview product closure dialog</span>
                        <span>→</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer Status */}
            <div className="px-4 py-2.5 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400 shrink-0">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-emerald-300 font-medium">Automatic bi-directional synchronization active</span>
              </div>
              <p className="text-[11px] text-slate-500">
                All newly created dishes and cafe status from the admin dashboard are instantly registered and sent to brozza.vercel.app.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Interactive Product Alert Dialog (Shown when clicking products while cafe is closed) */}
      {showClosedNoticeModal && cafeStatus && !cafeStatus.isOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-black border-2 border-neutral-700 rounded-2xl max-w-md w-full p-6 text-white shadow-2xl relative animate-in fade-in zoom-in duration-200">
            <button
              onClick={() => setShowClosedNoticeModal(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg bg-neutral-900 text-neutral-400 hover:text-white transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-neutral-900 border border-neutral-700 flex items-center justify-center text-rose-400">
                <Lock className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] font-mono font-bold tracking-widest text-rose-400 uppercase bg-rose-950/50 border border-rose-800/40 px-2 py-0.5 rounded">
                  ORDERING LOCKED
                </span>
                <h3 className="text-base font-bold text-white mt-1">Cafe Currently Closed</h3>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 mb-5">
              <p className="text-xs text-neutral-400 uppercase tracking-wider font-mono mb-1">Notice to Customers:</p>
              <p className="text-sm font-medium text-white leading-relaxed">
                "currently cafe is closed. so I'm sorry boss ! . it will open at <strong className="text-amber-300 font-mono font-bold">{cafeStatus.formattedReopenTime}</strong>."
              </p>
            </div>

            <div className="flex items-center gap-2 text-xs text-neutral-400 mb-6 bg-neutral-900/60 p-3 rounded-xl border border-neutral-800">
              <Clock className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Scheduled Reopen Time: <strong className="text-white font-mono">{cafeStatus.formattedReopenTime}</strong></span>
            </div>

            <div className="flex flex-col gap-2">
              <a
                href={partnerStoreUrl}
                target="_blank"
                rel="noreferrer"
                className="w-full py-2.5 px-4 rounded-xl bg-white text-black font-bold text-xs hover:bg-neutral-200 transition text-center flex items-center justify-center gap-2"
              >
                <span>Open brozza.vercel.app in New Tab</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>

              {onReopenCafeEarly && (
                <button
                  onClick={() => {
                    setShowClosedNoticeModal(false);
                    onReopenCafeEarly();
                  }}
                  className="w-full py-2.5 px-4 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white font-semibold text-xs border border-neutral-600 transition cursor-pointer"
                >
                  Reopen Cafe Early as Rohit Admin
                </button>
              )}

              <button
                onClick={() => setShowClosedNoticeModal(false)}
                className="w-full py-2 text-xs text-neutral-400 hover:text-white transition"
              >
                Dismiss Notice
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
