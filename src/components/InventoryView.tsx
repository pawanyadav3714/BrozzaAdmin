import React, { useState, useMemo } from 'react';
import { 
  Boxes, 
  Search, 
  Filter, 
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
  Store,
  Check,
  Eye,
  X,
  Sparkles
} from 'lucide-react';
import { Product } from '../types';

interface InventoryViewProps {
  products: Product[];
  onUpdateStock: (productId: string, newStock: number) => void;
  onOpenEditModal: (product: Product | null) => void;
  onSyncAllStock: () => Promise<void>;
  isSyncingStock: boolean;
  partnerStoreUrl?: string;
  onQuickUpdatePrice?: (productId: string, newPrice: number) => void;
}

export const InventoryView: React.FC<InventoryViewProps> = ({
  products,
  onUpdateStock,
  onOpenEditModal,
  onSyncAllStock,
  isSyncingStock,
  partnerStoreUrl = 'https://brozza.vercel.app',
  onQuickUpdatePrice
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [editingPriceId, setEditingPriceId] = useState<string | null>(null);
  const [tempPrice, setTempPrice] = useState<string>('');
  const [showStorePreview, setShowStorePreview] = useState(false);

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

  const totalStockUnits = products.reduce((sum, p) => sum + p.stock, 0);
  const totalCatalogValue = products.reduce((sum, p) => sum + (p.stock * p.price), 0);
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

  return (
    <div className="space-y-6">
      {/* Live Customer Storefront Sync Banner */}
      <div className="p-4 rounded-xl bg-gradient-to-r from-indigo-950/70 via-slate-900 to-purple-950/70 border border-indigo-500/30 flex flex-wrap items-center justify-between gap-4 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400 shrink-0 shadow-inner">
            <Store className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-white tracking-wide">Customer Storefront & Dishes Sync Active</h2>
              <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-[11px] font-semibold text-emerald-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Live 2-Way Sync
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              Connected to <strong className="text-indigo-300 font-mono">{partnerStoreUrl}</strong> & Firestore Catalog. Any dish additions or price edits here reflect on the customer website automatically.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowStorePreview(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-950/70 hover:bg-indigo-900/80 text-indigo-200 text-xs font-semibold border border-indigo-700/50 transition shadow-sm cursor-pointer"
          >
            <Eye className="w-3.5 h-3.5 text-indigo-400" />
            <span>Preview Customer Website</span>
          </button>
          <a
            href={partnerStoreUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition shadow-sm"
          >
            <Globe className="w-3.5 h-3.5 text-indigo-400" />
            <span>Open Customer Site</span>
            <ExternalLink className="w-3 h-3 text-slate-400" />
          </a>
          <button
            onClick={onSyncAllStock}
            disabled={isSyncingStock}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold shadow transition cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncingStock ? 'animate-spin' : ''}`} />
            <span>{isSyncingStock ? 'Syncing...' : 'Push All to Customer Site'}</span>
          </button>
        </div>
      </div>

      {/* Top Metrics Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Total Catalog SKUs</span>
            <Boxes className="w-4 h-4 text-indigo-400" />
          </div>
          <p className="text-2xl font-bold text-white">{products.length}</p>
          <p className="text-[11px] text-slate-400 mt-1">Across {categories.length} distinct categories</p>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Warehouse Units</span>
            <Boxes className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-bold text-emerald-300 font-mono">{totalStockUnits}</p>
          <p className="text-[11px] text-slate-400 mt-1">Total on-hand units</p>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Menu Valuation</span>
            <span className="text-sm font-bold text-emerald-400">₹</span>
          </div>
          <p className="text-2xl font-bold text-emerald-300 font-mono">₹{totalCatalogValue.toLocaleString('en-IN')}</p>
          <p className="text-[11px] text-slate-400 mt-1">Estimated catalog valuation</p>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Reorder Attention</span>
            <AlertTriangle className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-2xl font-bold text-amber-300 font-mono">{lowStockItems.length + outOfStockItems.length}</p>
          <p className="text-[11px] text-amber-400/80 mt-1">
            {outOfStockItems.length} out of stock, {lowStockItems.length} low
          </p>
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

      {/* Control Bar */}
      <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-wrap items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search products by title or SKU code..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>

        {/* Filters & Actions */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {/* Category */}
          <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-300">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="bg-transparent border-none text-slate-200 focus:outline-none cursor-pointer"
            >
              <option value="all">All Categories</option>
              {categories.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Status */}
          <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-300">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-transparent border-none text-slate-200 focus:outline-none cursor-pointer"
            >
              <option value="all">All Stock Status</option>
              <option value="in_stock">In Stock</option>
              <option value="low_stock">Low Stock</option>
              <option value="out_of_stock">Out of Stock</option>
            </select>
          </div>

          {/* Push Stock to Partner API */}
          <button
            onClick={onSyncAllStock}
            disabled={isSyncingStock}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-900/60 hover:bg-purple-800 text-purple-200 border border-purple-700/60 font-medium transition disabled:opacity-50"
            title="Push updated warehouse stock to external storefront API"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncingStock ? 'animate-spin' : ''}`} />
            <span>{isSyncingStock ? 'Pushing Sync...' : 'Sync Stock to Partner API'}</span>
          </button>

          {/* Add Product */}
          <button
            onClick={() => onOpenEditModal(null)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold shadow transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Product</span>
          </button>
        </div>
      </div>

      {/* Inventory Table */}
      <div className="rounded-xl border border-slate-800 bg-slate-900 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-950/80 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Dish / Menu Item</th>
                <th className="py-3 px-4">Category</th>
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
                filteredProducts.map(prod => {
                  const marginPercent = Math.round(((prod.price - prod.costPrice) / prod.price) * 100);
                  const isLow = prod.stock <= prod.lowStockThreshold && prod.stock > 0;
                  const isOut = prod.stock === 0;

                  return (
                    <tr key={prod.id} className="hover:bg-slate-800/40 transition">
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
                          <div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-bold text-white max-w-[220px] truncate capitalize">{prod.name}</span>
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-[10px] font-semibold">
                                <Globe className="w-2.5 h-2.5 text-emerald-400" />
                                Live on Customer Site
                              </span>
                            </div>
                            {prod.description && (
                              <div className="text-[10px] text-slate-400 max-w-[240px] truncate mt-0.5" title={prod.description}>
                                {prod.description}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 text-[11px]">
                          {prod.category}
                        </span>
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
                {products.slice(0, 6).map((p) => (
                  <span key={p.id} className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 text-[10px] font-medium border border-slate-700 whitespace-nowrap">
                    {p.name} (₹{p.price})
                  </span>
                ))}
                {products.length > 6 && (
                  <span className="text-[10px] text-slate-400 font-medium whitespace-nowrap">+{products.length - 6} more</span>
                )}
              </div>
            </div>

            {/* Live Storefront Iframe */}
            <div className="flex-1 w-full bg-slate-950 relative">
              <iframe
                src={partnerStoreUrl}
                title="Customer Storefront Live View"
                className="w-full h-full border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              />
            </div>

            {/* Footer Status */}
            <div className="px-4 py-2.5 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400 shrink-0">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-emerald-300 font-medium">Automatic bi-directional synchronization active</span>
              </div>
              <p className="text-[11px] text-slate-500">
                All newly created dishes from the admin dashboard are instantly registered and sent to the customer site.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
