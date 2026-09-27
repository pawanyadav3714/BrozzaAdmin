import React, { useState, useRef, useEffect, useMemo } from 'react';
import { X, Package, Save, Check, UploadCloud, Trash2, Globe, CheckCircle2, ChevronDown, AlertTriangle, Loader2 } from 'lucide-react';
import { Product } from '../types';

interface EditProductModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (productData: Partial<Product>) => void;
  onDelete?: (productId: string) => void;
  availableCategories?: string[];
}

export const EditProductModal: React.FC<EditProductModalProps> = ({
  product,
  isOpen,
  onClose,
  onSave,
  onDelete,
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
  const [imageFileName, setImageFileName] = useState<string>('');
  const [imageSizeKb, setImageSizeKb] = useState<number | null>(null);
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const [syncedWithExternalStore, setSyncedWithExternalStore] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Track initialization to avoid wiping out user typed inputs on background re-renders
  const initializedKeyRef = useRef<string | null>(null);

  // Sync form inputs only when modal opens or edited product changes (never during user typing)
  useEffect(() => {
    if (isOpen) {
      const currentTargetKey = product ? `edit_${product.id || product.sku}` : 'add_new';
      if (initializedKeyRef.current !== currentTargetKey) {
        initializedKeyRef.current = currentTargetKey;
        const initialCat = product?.category || 'Starters';
        setName(product?.name || '');
        setSku(product?.sku || `BRZ-DISH-${Date.now().toString().slice(-4)}`);
        setCategory(initialCat);
        setIsCustomCategory(!categoryOptions.includes(initialCat));
        setDescription(product?.description || '');
        setPrice(product?.price || 40.00);
        setCostPrice(product?.costPrice || 20.00);
        setStock(product?.stock ?? 25);
        setLowStockThreshold(product?.lowStockThreshold ?? 10);
        setImageUrl(product?.imageUrl || '');
        setImageFileName(product?.imageUrl ? 'Existing dish photo' : '');
        setImageSizeKb(null);
        setIsProcessingImage(false);
        setSyncedWithExternalStore(true);
        setFormError(null);
      }
    } else {
      initializedKeyRef.current = null;
    }
  }, [isOpen, product?.id, product?.sku]);

  if (!isOpen) return null;

  const handleFileSelect = (file: File) => {
    if (!file || !file.type.startsWith('image/')) return;
    setIsProcessingImage(true);
    const fname = file.name;
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      if (result) {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          // Optimize to 400px max dimension for fast database save & crisp retina display
          const maxDim = 400;
          if (width > height && width > maxDim) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else if (height > maxDim) {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.78);
            const approxKb = Math.round((compressedDataUrl.length * 3 / 4) / 1024);
            setImageUrl(compressedDataUrl);
            setImageFileName(fname);
            setImageSizeKb(approxKb);
          } else {
            setImageUrl(result);
            setImageFileName(fname);
          }
          setIsProcessingImage(false);
        };
        img.onerror = () => {
          setImageUrl(result);
          setImageFileName(fname);
          setIsProcessingImage(false);
        };
        img.src = result;
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
    setFormError(null);

    const trimmedName = name.trim();
    if (!trimmedName) {
      setFormError("Please enter a valid dish or product name.");
      return;
    }

    const numPrice = Number(price);
    if (isNaN(numPrice) || numPrice < 0) {
      setFormError("Please enter a valid price in ₹ INR (e.g. 40).");
      return;
    }

    const numStock = Number(stock);
    if (isNaN(numStock) || numStock < 0) {
      setFormError("Please enter a valid stock quantity (e.g. 25).");
      return;
    }

    const finalSku = sku.trim() || `BRZ-DISH-${Date.now().toString().slice(-4)}`;
    const finalCategory = isCustomCategory ? (category.trim() || 'General') : (category.trim() || 'Starters');

    onSave({
      id: product?.id,
      dishId: product?.dishId,
      name: trimmedName,
      sku: finalSku,
      category: finalCategory,
      description: description.trim() || undefined,
      price: numPrice,
      costPrice: Number(costPrice) || Math.round(numPrice * 0.5),
      stock: numStock,
      lowStockThreshold: Number(lowStockThreshold) || 5,
      status: numStock === 0 ? 'out_of_stock' : numStock <= Number(lowStockThreshold || 5) ? 'low_stock' : 'in_stock',
      syncedWithExternalStore: true,
      lastSyncedAt: new Date().toISOString(),
      imageUrl: imageUrl || undefined
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-black/75 backdrop-blur-xs">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg max-h-[94vh] overflow-hidden flex flex-col shadow-2xl text-slate-100 animate-in fade-in zoom-in-95 duration-200">
        <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/70 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">
                {isEditing ? 'Edit Inventory Item' : 'Add New Dish to Catalog'}
              </h2>
              <p className="text-xs text-slate-400">Pushes immediately to database & customer storefront</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4 text-xs">
          {formError && (
            <div className="p-3 rounded-xl bg-rose-950/70 border border-rose-800/80 text-rose-200 text-xs flex items-center gap-2.5 animate-in fade-in duration-200">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              <span className="font-semibold">{formError}</span>
            </div>
          )}

          <div>
            <label className="text-slate-400 block mb-1">Dish Name / Product Title <span className="text-rose-400">*</span></label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (formError) setFormError(null);
              }}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-200 focus:outline-none focus:border-indigo-500 text-xs"
              placeholder="e.g. Special Paneer Tikka or Masala Momos"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-slate-400 block mb-1">SKU Code (Auto-Generated)</label>
              <input
                type="text"
                value={sku}
                onChange={(e) => setSku(e.target.value.toUpperCase())}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-200 font-mono focus:outline-none focus:border-indigo-500"
                placeholder="BRZ-DISH-01"
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
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-slate-300 font-semibold text-xs flex items-center gap-1.5">
                <span>Dish Picture (Upload from File)</span>
                <span className="text-[10px] text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-800/60 font-mono">
                  Database & Customer Sync
                </span>
              </label>
              {imageUrl && (
                <span className="text-[11px] text-emerald-400 font-mono font-medium flex items-center gap-1">
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  {imageSizeKb ? `${imageSizeKb} KB` : 'Attached'}
                </span>
              )}
            </div>

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
              <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-slate-950 border border-emerald-500/40 shadow-inner group">
                <div className="relative shrink-0">
                  <img
                    src={imageUrl}
                    alt="Product preview"
                    className="w-16 h-16 rounded-xl object-cover border border-emerald-500/60 bg-slate-900 shadow-md group-hover:scale-105 transition-transform"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px] shadow">
                    <Check className="w-3 h-3" />
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-white truncate">
                    {imageFileName || 'Dish Picture Ready'}
                  </p>
                  <p className="text-[11px] text-emerald-300 flex items-center gap-1 mt-0.5 font-medium">
                    <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>Stored on Database • Shows on Customer Menu</span>
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Will display across customer storefront cards and live kitchen orders
                  </p>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 font-semibold transition cursor-pointer active:scale-95 border border-slate-700"
                  >
                    Change
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setImageUrl('');
                      setImageFileName('');
                      setImageSizeKb(null);
                    }}
                    className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition cursor-pointer active:scale-90 border border-rose-500/30"
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
                className={`border-2 border-dashed rounded-2xl p-4 sm:p-5 text-center cursor-pointer transition-all duration-200 flex flex-col items-center justify-center gap-2.5 relative group ${
                  isDragging
                    ? 'border-indigo-400 bg-indigo-500/20 scale-[0.99] shadow-lg shadow-indigo-500/20'
                    : 'border-indigo-500/40 hover:border-indigo-400 bg-slate-950/70 hover:bg-slate-950 shadow-inner'
                }`}
              >
                <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400 shadow-sm group-hover:scale-110 group-hover:bg-indigo-600/30 transition-all duration-200">
                  <UploadCloud className="w-6 h-6 text-indigo-400 animate-pulse" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-200">
                    <span className="text-indigo-400 font-bold underline underline-offset-2">Click to choose dish picture</span> or drag & drop here
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    PNG, JPG, WEBP, GIF up to 10MB • Auto-compressed for fast database storage
                  </p>
                </div>
                <div className="flex items-center gap-1.5 text-[10px] text-emerald-400 font-medium bg-emerald-950/60 px-3 py-1 rounded-full border border-emerald-800/60">
                  <Check className="w-3 h-3 text-emerald-400 shrink-0" />
                  <span>Picture will be stored on database & shown on customer dashboard</span>
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

          <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
            {isEditing && product ? (
              <button
                type="button"
                onClick={() => {
                  if (onDelete) onDelete(product.id);
                  onClose();
                }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/40 text-xs font-bold transition cursor-pointer active:scale-95"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Dish</span>
              </button>
            ) : <div />}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isProcessingImage}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold shadow transition cursor-pointer active:scale-95"
              >
                {isProcessingImage ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Compressing Photo...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5" />
                    <span>{isEditing ? 'Save Changes' : 'Create Product'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
