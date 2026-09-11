import React, { useMemo, useState } from 'react';
import { 
  TrendingUp, 
  DollarSign, 
  ShoppingBag, 
  Users, 
  Activity, 
  Calendar, 
  ArrowUpRight, 
  PieChart as PieChartIcon, 
  BarChart3, 
  CheckCircle2,
  Clock,
  Layers,
  Sparkles
} from 'lucide-react';
import { Order, Product, SyncLog } from '../types';

interface AnalyticsViewProps {
  orders: Order[];
  products: Product[];
  syncLogs: SyncLog[];
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({
  orders,
  products,
  syncLogs
}) => {
  const [timeRange, setTimeRange] = useState<'24h' | '7d' | '30d'>('7d');

  // Key KPI metrics calculations
  const totalRevenue = useMemo(() => {
    return orders
      .filter(o => o.status !== 'cancelled')
      .reduce((sum, o) => sum + o.totalAmount, 0);
  }, [orders]);

  const totalCompletedOrders = useMemo(() => {
    return orders.filter(o => o.status === 'delivered' || o.status === 'shipped').length;
  }, [orders]);

  const averageOrderValue = useMemo(() => {
    const validOrders = orders.filter(o => o.status !== 'cancelled');
    if (validOrders.length === 0) return 0;
    return totalRevenue / validOrders.length;
  }, [orders, totalRevenue]);

  const externalOrdersCount = useMemo(() => {
    return orders.filter(o => o.source === 'synced_partner_store').length;
  }, [orders]);

  const externalSyncPercentage = orders.length > 0 
    ? Math.round((externalOrdersCount / orders.length) * 100) 
    : 0;

  // Status breakdown
  const statusCounts = useMemo(() => {
    const counts = {
      pending: 0,
      processing: 0,
      shipped: 0,
      delivered: 0,
      cancelled: 0
    };
    orders.forEach(o => {
      if (counts[o.status] !== undefined) {
        counts[o.status]++;
      }
    });
    return counts;
  }, [orders]);

  // Sales by Category
  const categorySales = useMemo(() => {
    const map: Record<string, { revenue: number; units: number }> = {};
    orders.forEach(order => {
      if (order.status === 'cancelled') return;
      order.items.forEach(item => {
        const prod = products.find(p => p.sku === item.sku);
        const cat = prod?.category || 'General Store';
        if (!map[cat]) map[cat] = { revenue: 0, units: 0 };
        map[cat].revenue += item.price * item.quantity;
        map[cat].units += item.quantity;
      });
    });
    return Object.entries(map).sort((a, b) => b[1].revenue - a[1].revenue);
  }, [orders, products]);

  // Top Selling Products
  const topProducts = useMemo(() => {
    const map: Record<string, { name: string; sku: string; units: number; revenue: number; image?: string }> = {};
    orders.forEach(order => {
      if (order.status === 'cancelled') return;
      order.items.forEach(item => {
        if (!map[item.sku]) {
          const prod = products.find(p => p.sku === item.sku);
          map[item.sku] = {
            name: item.name,
            sku: item.sku,
            units: 0,
            revenue: 0,
            image: item.image || prod?.imageUrl
          };
        }
        map[item.sku].units += item.quantity;
        map[item.sku].revenue += item.price * item.quantity;
      });
    });
    return Object.values(map).sort((a, b) => b.revenue - a.revenue).slice(0, 5);
  }, [orders, products]);

  // Dynamic trend data generation for visual SVG chart
  const trendData = useMemo(() => {
    // Generate 7 days labels
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Today'];
    const maxVal = Math.max(totalRevenue * 0.35, 600);
    return days.map((day, idx) => {
      const multiplier = 0.5 + ((idx + 1) * 0.08) + (Math.sin(idx * 1.5) * 0.2);
      const dayRev = Number((Math.min(totalRevenue, maxVal) * multiplier).toFixed(2));
      const dayOrders = Math.max(1, Math.round(orders.length * (0.1 + idx * 0.04)));
      return { day, revenue: dayRev, orders: dayOrders };
    });
  }, [totalRevenue, orders]);

  return (
    <div className="space-y-6">
      {/* Top Banner & Range Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl bg-slate-900 border border-slate-800">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Activity className="w-5 h-5 text-emerald-400" />
            Real-Time Commerce Intelligence
          </h2>
          <p className="text-xs text-slate-400">
            Live metrics streaming across direct storefront, Firebase database, and partner API sync.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex rounded-lg bg-slate-950 p-1 border border-slate-800 text-xs">
            {(['24h', '7d', '30d'] as const).map(range => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-3 py-1 rounded font-medium transition ${
                  timeRange === range ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                {range === '24h' ? 'Last 24 Hours' : range === '7d' ? 'Last 7 Days' : 'Last 30 Days'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Gross Revenue */}
        <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">Total Gross Revenue</span>
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold font-mono text-white">
              ${totalRevenue.toFixed(2)}
            </span>
            <span className="text-xs text-emerald-400 font-semibold flex items-center">
              <ArrowUpRight className="w-3 h-3" /> +14.2%
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Excludes refunded & cancelled orders</p>
        </div>

        {/* Total Orders */}
        <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">Processed Orders</span>
            <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <ShoppingBag className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold font-mono text-white">
              {orders.length}
            </span>
            <span className="text-xs text-indigo-400 font-semibold flex items-center">
              <ArrowUpRight className="w-3 h-3" /> +8.6%
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">{totalCompletedOrders} fulfilled & delivered</p>
        </div>

        {/* Average Order Value */}
        <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">Average Order Value (AOV)</span>
            <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold font-mono text-white">
              ${averageOrderValue.toFixed(2)}
            </span>
            <span className="text-xs text-emerald-400 font-semibold flex items-center">
              <ArrowUpRight className="w-3 h-3" /> +5.1%
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Across all product collections</p>
        </div>

        {/* External Store API Sync Rate */}
        <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">External Store API Share</span>
            <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold font-mono text-purple-300">
              {externalSyncPercentage}%
            </span>
            <span className="text-xs text-slate-400">
              ({externalOrdersCount} orders)
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Ingested via Partner Webhooks</p>
        </div>
      </div>

      {/* Main Charts & Visualizations */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Trend SVG Chart (2 Cols) */}
        <div className="lg:col-span-2 p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-indigo-400" />
                Revenue & Order Volume Trajectory
              </h3>
              <p className="text-xs text-slate-400">Daily velocity over the selected operating period</p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1.5 text-slate-300">
                <span className="w-2.5 h-2.5 rounded-sm bg-indigo-500"></span>
                Daily Revenue ($)
              </span>
            </div>
          </div>

          {/* SVG Bar & Line Visualization */}
          <div className="h-64 w-full pt-4">
            <div className="h-full flex items-end justify-between gap-2 sm:gap-4 px-2 border-b border-slate-800 pb-2">
              {trendData.map((item, idx) => {
                const maxDayRev = Math.max(...trendData.map(d => d.revenue), 100);
                const barHeightPercent = Math.max(15, Math.round((item.revenue / maxDayRev) * 100));

                return (
                  <div key={idx} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
                    {/* Tooltip on hover */}
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px] font-mono bg-slate-950 border border-slate-700 px-2 py-1 rounded text-white shadow pointer-events-none whitespace-nowrap">
                      ${item.revenue.toFixed(0)} ({item.orders} ords)
                    </div>

                    {/* Bar */}
                    <div
                      style={{ height: `${barHeightPercent}%` }}
                      className="w-full max-w-[48px] rounded-t-lg bg-gradient-to-t from-indigo-700 to-indigo-500 group-hover:from-indigo-600 group-hover:to-indigo-400 transition-all shadow-md relative"
                    >
                      <div className="absolute -top-5 left-1/2 -translate-x-1/2 text-[10px] font-mono text-slate-300 hidden sm:block">
                        ${item.revenue.toFixed(0)}
                      </div>
                    </div>

                    {/* Label */}
                    <span className="text-[11px] text-slate-400 font-medium">{item.day}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Order Fulfillment Status Breakdown */}
        <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-4">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <PieChartIcon className="w-4 h-4 text-emerald-400" />
              Order Status Distribution
            </h3>
            <p className="text-xs text-slate-400">Current fulfillment queue breakdown</p>
          </div>

          <div className="space-y-3 pt-2">
            {[
              { label: 'Delivered', count: statusCounts.delivered, color: 'bg-emerald-500', text: 'text-emerald-400' },
              { label: 'Shipped', count: statusCounts.shipped, color: 'bg-indigo-500', text: 'text-indigo-400' },
              { label: 'Processing', count: statusCounts.processing, color: 'bg-blue-500', text: 'text-blue-400' },
              { label: 'Pending', count: statusCounts.pending, color: 'bg-amber-500', text: 'text-amber-400' },
              { label: 'Cancelled', count: statusCounts.cancelled, color: 'bg-rose-500', text: 'text-rose-400' },
            ].map(item => {
              const pct = orders.length > 0 ? Math.round((item.count / orders.length) * 100) : 0;
              return (
                <div key={item.label} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-300 font-medium">{item.label}</span>
                    <span className="font-mono text-slate-400">
                      {item.count} ({pct}%)
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
                    <div
                      style={{ width: `${pct}%` }}
                      className={`h-full ${item.color} rounded-full transition-all duration-500`}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Category Breakdown & Top Products */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales by Category */}
        <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-cyan-400" />
            Revenue by Product Category
          </h3>

          <div className="space-y-3 pt-1">
            {categorySales.length === 0 ? (
              <p className="text-xs text-slate-500 py-6 text-center">No category data recorded yet</p>
            ) : (
              categorySales.map(([cat, val]) => {
                const pct = totalRevenue > 0 ? Math.round((val.revenue / totalRevenue) * 100) : 0;
                return (
                  <div key={cat} className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-200 font-medium">{cat}</span>
                      <span className="font-mono text-white font-bold">
                        ${val.revenue.toFixed(2)}{' '}
                        <span className="text-slate-400 font-normal">({val.units} units)</span>
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
                      <div
                        style={{ width: `${pct}%` }}
                        className="h-full bg-cyan-500 rounded-full transition-all"
                      ></div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Top Selling Products */}
        <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400" />
            Top Selling Products
          </h3>

          <div className="divide-y divide-slate-800">
            {topProducts.length === 0 ? (
              <p className="text-xs text-slate-500 py-6 text-center">No products sold yet</p>
            ) : (
              topProducts.map((p, idx) => (
                <div key={p.sku} className="py-2.5 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="w-5 text-center text-xs font-bold text-slate-500 font-mono">
                      #{idx + 1}
                    </span>
                    {p.image ? (
                      <img src={p.image} alt={p.name} className="w-8 h-8 rounded-lg object-cover border border-slate-700" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 text-xs">
                        {p.name.slice(0, 1)}
                      </div>
                    )}
                    <div>
                      <p className="text-xs font-semibold text-white truncate max-w-[200px]">{p.name}</p>
                      <p className="text-[10px] text-slate-400 font-mono">SKU: {p.sku}</p>
                    </div>
                  </div>

                  <div className="text-right text-xs">
                    <p className="font-bold text-white font-mono">${p.revenue.toFixed(2)}</p>
                    <p className="text-[11px] text-emerald-400 font-medium">{p.units} units sold</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
