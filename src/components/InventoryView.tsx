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
  ExternalLink
} from 'lucide-react';
import { Product } from '../types';

interface InventoryViewProps {
  products: Product[];
  onUpdateStock: (productId: string, newStock: number) => void;
  onOpenEditModal: (product: Product | null) => void;
  onSyncAllStock: () => Promise<void>;
  isSyncingStock: boolean;
}

export const InventoryView: React.FC<InventoryViewProps> = ({
  products,
  onUpdateStock,
  onOpenEditModal,
  onSyncAllStock,
  isSyncingStock
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

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

  return (
    <div className="space-y-6">
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
            <span>Inventory Asset Value</span>
            <DollarSign className="w-4 h-4 text-cyan-400" />
          </div>
          <p className="text-2xl font-bold text-white font-mono">${totalCatalogValue.toFixed(0)}</p>
          <p className="text-[11px] text-slate-400 mt-1">Estimated retail valuation</p>
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
                <th className="py-3 px-4">Product & SKU</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Pricing & Margin</th>
                <th className="py-3 px-4">Stock Level (Quick Edit)</th>
                <th className="py-3 px-4">Inventory Status</th>
                <th className="py-3 px-4">Partner Store Sync</th>
                <th className="py-3 px-4 text-right">Edit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 text-slate-300">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
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
                      {/* Product Name & SKU */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          {prod.imageUrl ? (
                            <img
                              src={prod.imageUrl}
                              alt={prod.name}
                              className="w-10 h-10 object-cover rounded-lg border border-slate-700 shrink-0"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 shrink-0">
                              <Boxes className="w-5 h-5" />
                            </div>
                          )}
                          <div>
                            <div className="font-bold text-white max-w-[220px] truncate">{prod.name}</div>
                            <div className="text-[11px] font-mono text-indigo-400">SKU: {prod.sku}</div>
                          </div>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 text-[11px]">
                          {prod.category}
                        </span>
                      </td>

                      {/* Price & Margin */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-white font-mono">${prod.price.toFixed(2)}</div>
                        <div className="text-[10px] text-slate-400">
                          Cost: ${prod.costPrice.toFixed(2)}{' '}
                          <span className="text-emerald-400 font-semibold">({marginPercent}% margin)</span>
                        </div>
                      </td>

                      {/* Stock Level Quick Edit */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <div className="flex items-center rounded-lg border border-slate-700 bg-slate-950">
                            <button
                              onClick={() => onUpdateStock(prod.id, Math.max(0, prod.stock - 1))}
                              className="px-2.5 py-1 text-slate-400 hover:text-white hover:bg-slate-800 transition rounded-l"
                              title="Decrease stock by 1"
                            >
                              -
                            </button>
                            <span className={`px-3 font-mono font-bold text-sm ${
                              isOut ? 'text-rose-400' : isLow ? 'text-amber-400' : 'text-white'
                            }`}>
                              {prod.stock}
                            </span>
                            <button
                              onClick={() => onUpdateStock(prod.id, prod.stock + 1)}
                              className="px-2.5 py-1 text-slate-400 hover:text-white hover:bg-slate-800 transition rounded-r"
                              title="Increase stock by 1"
                            >
                              +
                            </button>
                          </div>
                          <span className="text-[10px] text-slate-500 font-mono">
                            (Min: {prod.lowStockThreshold})
                          </span>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        {isOut ? (
                          <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                            Out of Stock
                          </span>
                        ) : isLow ? (
                          <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            Low Stock Alert
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            In Stock
                          </span>
                        )}
                      </td>

                      {/* Partner Store Sync */}
                      <td className="py-3.5 px-4">
                        {prod.syncedWithExternalStore ? (
                          <div className="space-y-0.5">
                            <span className="inline-flex items-center gap-1 text-[11px] text-purple-300 font-medium">
                              <CheckCircle2 className="w-3 h-3 text-purple-400" />
                              Synced with API
                            </span>
                            {prod.lastSyncedAt && (
                              <p className="text-[10px] text-slate-500 font-mono">
                                {new Date(prod.lastSyncedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </p>
                            )}
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-500">Local Only</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => onOpenEditModal(prod)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
                          title="Edit Product & Thresholds"
                        >
                          <Edit className="w-4 h-4" />
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
    </div>
  );
};
