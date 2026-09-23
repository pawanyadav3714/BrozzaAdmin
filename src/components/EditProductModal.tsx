import React, { useState, useRef, useEffect, useMemo } from 'react';
import { X, Package, Save, Check, UploadCloud, Trash2, Globe, CheckCircle2, ChevronDown } from 'lucide-react';
import { Product } from '../types';

interface EditProductModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (productData: Partial<Product>) => void;
  availableCategories?: string[];
}

export const EditProductModal: React.FC<EditProductModalProps> = ({
  product,
  isOpen,
  onClose,
  onSave,
  availableCategories = []
}) => {
  const isEditing = !!product;
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const baseCategories = useMemo(() => ['Starters', 'Chinese', 'Italian', 'Rolls', 'Beverages', 'Specials', 'Snacks'], []);
  const categoryOptions = useMemo(() => {
    return Array.from(new Set([...baseCategories, ...availableCategories, ...(product?.category ? [product.category] : [])])).filter(Boolean);
  }, [baseCategories, availableCategories, product]);

  const [name, setName] = useState(product?.name || '');
  const [sku, setSku] = useState(product?.sku || '');
  const [category, setCategory] = useState(product?.category || 'Starters');
  const [isCustomCategory, setIsCustomCategory] = useState(false);
  const [description, setDescription] = useState(product?.description || '');
  const [price, setPrice] = useState(product?.price || 40.00);
  const [costPrice, setCostPrice] = useState(product?.costPrice || 20.00);
  const [stock, setStock] = useState(product?.stock ?? 25);
  const [lowStockThreshold, setLowStockThreshold] = useState(product?.lowStockThreshold ?? 10);
  const [imageUrl, setImageUrl] = useState(product?.imageUrl || '');
  const [syncedWithExternalStore, setSyncedWithExternalStore] = useState(true);
  const [isDragging, setIsDragging] = useState(false);

  // Sync form inputs whenever modal opens or edited product changes
  useEffect(() => {
    if (isOpen) {
      const initialCat = product?.category || categoryOptions[0] || 'Starters';
      setName(product?.name || '');
      setSku(product?.sku || '');
      setCategory(initialCat);
      setIsCustomCategory(!categoryOptions.includes(initialCat));
      setDescription(product?.description || '');
      setPrice(product?.price || 40.00);
      setCostPrice(product?.costPrice || 20.00);
      setStock(product?.stock ?? 25);
      setLowStockThreshold(product?.lowStockThreshold ?? 10);
      setImageUrl(product?.imageUrl || '');
      setSyncedWithExternalStore(true);
    }
  }, [isOpen, product, categoryOptions]);

  if (!isOpen) return null;

  const handleFileSelect = (file: File) => {
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      if (result) {
        setImageUrl(result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      id: product?.id,
      dishId: product?.dishId,
      name,
      sku,
      category,
      description: description.trim() || undefined,
      price: Number(price),
      costPrice: Number(costPrice),
      stock: Number(stock),
      lowStockThreshold: Number(lowStockThreshold),
      status: Number(stock) === 0 ? 'out_of_stock' : Number(stock) <= Number(lowStockThreshold) ? 'low_stock' : 'in_stock',
      syncedWithExternalStore,
      lastSyncedAt: new Date().toISOString(),
      imageUrl: imageUrl || undefined
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg overflow-hidden flex flex-col shadow-2xl text-slate-100 animate-in fade-in zoom-in-95 duration-200">
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/70">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">
                {isEditing ? 'Edit Inventory Item' : 'Add New Product to Catalog'}
              </h2>
              <p className="text-xs text-slate-400">Update stock levels & partner store sync attributes</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          <div>
            <label className="text-slate-400 block mb-1">Product Title</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-200 focus:outline-none focus:border-indigo-500"
              placeholder="e.g. Tactile Mechanical Split Keyboard"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-slate-400 block mb-1">SKU Code</label>
              <input
                type="text"
                required
                value={sku}
                onChange={(e) => setSku(e.target.value.toUpperCase())}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-200 font-mono focus:outline-none focus:border-indigo-500"
                placeholder="SKU-1001"
              />
            </div>
            <div>
              <label className="text-slate-400 block mb-1">Category</label>
              <div className="relative">
                <select
                  value={isCustomCategory ? '__custom__' : category}
                  onChange={(e) => {
                    if (e.target.value === '__custom__') {
                      setIsCustomCategory(true);
                      setCategory('');
                    } else {
                      setIsCustomCategory(false);
                      setCategory(e.target.value);
                    }
                  }}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-200 focus:outline-none focus:border-indigo-500 cursor-pointer appearance-none pr-8 text-xs"
                >
                  {categoryOptions.map((cat) => (
                    <option key={cat} value={cat} className="bg-slate-900 text-slate-200">
                      {cat}
                    </option>
                  ))}
                  <option value="__custom__" className="bg-slate-900 text-indigo-400 font-semibold">
                    + Add New Category...
                  </option>
                </select>
                <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                  <ChevronDown className="w-3.5 h-3.5" />
                </div>
              </div>

              {isCustomCategory && (
                <div className="mt-1.5">
                  <input
                    type="text"
                    required
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-slate-950 border border-indigo-500/80 rounded-lg px-3 py-1.5 text-slate-200 focus:outline-none placeholder-slate-500 text-xs"
                    placeholder="Type new category..."
                    autoFocus
                  />
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-slate-400 block mb-1">Menu Price (₹ INR)</label>
              <div className="relative flex items-center">
                <span className="absolute left-3 text-emerald-400 font-bold font-mono">₹</span>
                <input
                  type="number"
                  step="1"
                  required
                  value={price}
                  onChange={(e) => setPrice(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-7 pr-3 py-1.5 text-slate-200 font-mono font-bold focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="text-slate-400 block mb-1">Available Quantity (Units)</label>
              <input
                type="number"
                min="0"
                step="1"
                required
                value={stock}
                onChange={(e) => setStock(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-200 font-mono font-bold focus:outline-none focus:border-indigo-500"
                placeholder="25"
              />
            </div>
          </div>

          <div>
            <label className="text-slate-400 block mb-1">Dish Description / Recipe Notes</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-200 focus:outline-none focus:border-indigo-500 text-xs resize-none"
              placeholder="e.g. Crispy golden fries served hot and fresh with artisanal herbs."
            />
          </div>

          <div>
            <label className="text-slate-400 block mb-1.5 text-xs font-medium">Product Image (Upload from File)</label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleFileSelect(e.target.files[0]);
                }
              }}
            />

            {imageUrl ? (
              <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-950 border border-slate-700/80 shadow-inner">
                <img
                  src={imageUrl}
                  alt="Product preview"
                  className="w-14 h-14 rounded-lg object-cover border border-slate-700 bg-slate-900 shrink-0"
                  referrerPolicy="no-referrer"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-slate-200 truncate">Image file attached</p>
                  <p className="text-[11px] text-emerald-400 flex items-center gap-1 mt-0.5 font-medium">
                    <Check className="w-3.5 h-3.5" /> Ready to save
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 font-medium transition cursor-pointer"
                  >
                    Change File
                  </button>
                  <button
                    type="button"
                    onClick={() => setImageUrl('')}
                    className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition cursor-pointer"
                    title="Remove image"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition flex flex-col items-center justify-center gap-2 ${
                  isDragging
                    ? 'border-indigo-500 bg-indigo-500/10 scale-[0.99]'
                    : 'border-slate-700 hover:border-indigo-500/60 bg-slate-950/60 hover:bg-slate-950'
                }`}
              >
                <div className="w-10 h-10 rounded-full bg-slate-800/90 flex items-center justify-center text-slate-300 shadow-inner">
                  <UploadCloud className="w-5 h-5 text-indigo-400" />
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-200">
                    <span className="text-indigo-400 font-semibold underline underline-offset-2">Click to choose file</span> or drag & drop here
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">PNG, JPG, WEBP, GIF, SVG up to 10MB</p>
                </div>
              </div>
            )}
          </div>

          <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-800/60 flex items-center justify-between">
            <div className="flex items-start gap-2.5">
              <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 mt-0.5 shrink-0">
                <Globe className="w-4 h-4" />
              </div>
              <div>
                <p className="font-bold text-white text-xs flex items-center gap-1.5">
                  <span>Sync with Customer Website & Dashboard</span>
                  <span className="px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-semibold border border-emerald-500/30">
                    Live Push
                  </span>
                </p>
                <p className="text-[11px] text-emerald-200/70 mt-0.5">
                  Dish will immediately appear on the customer storefront (<strong>brozza.vercel.app</strong>) and live menu catalog
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-emerald-400 font-semibold text-xs shrink-0">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Enabled</span>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow transition"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isEditing ? 'Save Changes' : 'Create Product'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
