'use client';

import { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  DollarSign,
  ShoppingCart,
  Users,
  Store,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  Calendar,
  Package,
  Star,
  UserPlus,
  CreditCard,
  ChevronDown,
  Globe,
  Smartphone,
  Share2,
  Code,
  MoreHorizontal,
  FileText,
  CircleDollarSign,
  Wallet,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import {
  revenueData,
  recentOrders,
  topProducts,
  recentActivity,
  conversionData,
  revenueByChannel,
  type ActivityItem,
} from '@/lib/mock-data';

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.04 },
  },
};

const item = {
  hidden: { opacity: 0, y: 10 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease: [0.25, 0.1, 0.25, 1] as const },
  },
};

function AnimatedCounter({
  value,
  prefix = '',
}: {
  value: number;
  prefix?: string;
}) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const steps = 40;
    const duration = 900;
    let step = 0;
    const timer = setInterval(() => {
      step++;
      const eased = 1 - Math.pow(1 - step / steps, 3);
      setCount(Math.floor(value * eased));
      if (step >= steps) {
        setCount(value);
        clearInterval(timer);
      }
    }, duration / steps);
    return () => clearInterval(timer);
  }, [value]);

  return (
    <span>
      {prefix}
      {count.toLocaleString()}
    </span>
  );
}

const statCards = [
  {
    label: 'Orders',
    numericValue: 3842,
    change: 8.2,
    subtitle: 'since last month',
    icon: ShoppingCart,
    prefix: '',
  },
  {
    label: 'Approved',
    numericValue: 2986,
    change: 3.4,
    subtitle: 'since last month',
    icon: FileText,
    prefix: '',
  },
  {
    label: 'Customers',
    numericValue: 12648,
    subtitle: 'since last month',
    change: 0,
    icon: Users,
    prefix: '',
  },
  {
    label: 'Active Sellers',
    numericValue: 342,
    subtitle: 'since last month',
    change: 0,
    icon: Store,
    prefix: '',
  },
];

const financialCards = [
  {
    label: 'Total Revenue',
    numericValue: 284520,
    change: 0.2,
    subtitle: 'since last month',
    icon: CircleDollarSign,
    prefix: '$',
  },
  {
    label: 'Monthly Revenue',
    numericValue: 31942,
    change: 1.2,
    subtitle: 'since last month',
    icon: Wallet,
    prefix: '$',
  },
];

const pieData = [
  { name: 'New', value: 63, color: '#8b5cf6' },
  { name: 'Returning', value: 25, color: '#3b82f6' },
  { name: 'Inactive', value: 12, color: '#475569' },
];

const orderPieData = [
  { name: 'Paid', value: 70, color: '#8b5cf6' },
  { name: 'Due', value: 20, color: '#3b82f6' },
  { name: 'Trial', value: 10, color: '#475569' },
];

const activityConfig: Record<
  ActivityItem['type'],
  { icon: React.ReactNode; color: string }
> = {
  order: { icon: <ShoppingCart size={14} />, color: 'text-blue-400 bg-blue-500/10' },
  seller: { icon: <Store size={14} />, color: 'text-violet-400 bg-violet-500/10' },
  product: { icon: <Package size={14} />, color: 'text-indigo-400 bg-indigo-500/10' },
  customer: { icon: <UserPlus size={14} />, color: 'text-emerald-400 bg-emerald-500/10' },
  payout: { icon: <CreditCard size={14} />, color: 'text-amber-400 bg-amber-500/10' },
  review: { icon: <Star size={14} />, color: 'text-rose-400 bg-rose-500/10' },
};

const statusRowColors: Record<string, string> = {
  Delivered: 'bg-emerald-500/8 hover:bg-emerald-500/12',
  Processing: 'bg-amber-500/8 hover:bg-amber-500/12',
  Shipped: 'bg-blue-500/8 hover:bg-blue-500/12',
  Pending: 'bg-orange-500/8 hover:bg-orange-500/12',
  Cancelled: 'bg-rose-500/8 hover:bg-rose-500/12',
};

const statusDotColors: Record<string, string> = {
  Delivered: 'bg-emerald-400',
  Processing: 'bg-amber-400',
  Shipped: 'bg-blue-400',
  Pending: 'bg-orange-400',
  Cancelled: 'bg-rose-400',
};

function BarTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-surface-3 px-3 py-2 shadow-dropdown">
      <p className="text-[11px] text-muted">{label}</p>
      <p className="text-sm font-semibold text-heading">${payload[0].value.toLocaleString()}</p>
    </div>
  );
}

function MiniDonut({ data, centerLabel }: { data: typeof pieData; centerLabel: string }) {
  return (
    <div className="relative h-[100px] w-[100px]">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={32}
            outerRadius={46}
            paddingAngle={3}
            dataKey="value"
            strokeWidth={0}
          >
            {data.map((entry, i) => (
              <Cell key={i} fill={entry.color} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-[11px] font-semibold text-heading">{centerLabel}</span>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-5"
    >
      {/* Row 1: Stat Cards */}
      <motion.div variants={item} className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="card rounded-2xl p-5"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[13px] font-medium text-muted">{stat.label}</p>
                  <p className="mt-2 text-[28px] font-bold leading-none tracking-tight text-heading">
                    <AnimatedCounter value={stat.numericValue} prefix={stat.prefix} />
                  </p>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface-4">
                  <Icon size={18} className="text-muted" strokeWidth={1.6} />
                </div>
              </div>
              {stat.change > 0 && (
                <p className="mt-3 text-[12px] text-muted">
                  <span className="inline-flex items-center gap-0.5 font-semibold text-emerald-400">
                    <TrendingUp size={11} /> {stat.change}%
                  </span>{' '}
                  {stat.subtitle}
                </p>
              )}
              {stat.change === 0 && (
                <p className="mt-3 text-[12px] text-muted">{stat.subtitle}</p>
              )}
            </div>
          );
        })}
      </motion.div>

      {/* Row 2: Financial Cards + Customer Pie + Revenue Pie */}
      <motion.div variants={item} className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        {financialCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="card rounded-2xl p-5"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[13px] font-medium text-muted">{stat.label}</p>
                  <p className="mt-2 text-[28px] font-bold leading-none tracking-tight text-heading">
                    <AnimatedCounter value={stat.numericValue} prefix={stat.prefix} />
                  </p>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface-4">
                  <Icon size={18} className="text-muted" strokeWidth={1.6} />
                </div>
              </div>
              <p className="mt-3 text-[12px] text-muted">
                <span className="inline-flex items-center gap-0.5 font-semibold text-emerald-400">
                  <TrendingUp size={11} /> +{stat.change}%
                </span>{' '}
                {stat.subtitle}
              </p>
            </div>
          );
        })}

        {/* Customer Breakdown Donut */}
        <div className="card flex items-center gap-4 rounded-2xl p-5">
          <MiniDonut data={pieData} centerLabel="63%" />
          <div className="space-y-2">
            {pieData.map((d) => (
              <div key={d.name} className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full" style={{ background: d.color }} />
                <span className="text-[12px] text-muted">{d.value}% {d.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Subscription Donut */}
        <div className="card flex items-center gap-4 rounded-2xl p-5">
          <MiniDonut data={orderPieData} centerLabel="70%" />
          <div className="space-y-2">
            {orderPieData.map((d) => (
              <div key={d.name} className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full" style={{ background: d.color }} />
                <span className="text-[12px] text-muted">{d.value}% {d.name}</span>
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Row 3: Sales Bar Chart + Paid Invoices + Funds Received */}
      <motion.div variants={item} className="grid grid-cols-1 gap-4 xl:grid-cols-5">
        {/* Sales Dynamics */}
        <div className="card rounded-2xl p-5 xl:col-span-3">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-heading">Sales dynamics</h2>
            <div className="relative">
              <select className="input-field h-[30px] appearance-none pr-7 text-[12px] font-medium">
                <option>2026</option>
                <option>2025</option>
              </select>
              <ChevronDown size={12} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-muted" />
            </div>
          </div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={revenueData} margin={{ top: 4, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 11, fill: '#565a72' }}
                  tickLine={false}
                  axisLine={{ stroke: 'rgba(255,255,255,0.06)' }}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#565a72' }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `$${v / 1000}k`}
                />
                <Tooltip content={<BarTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                <Bar
                  dataKey="revenue"
                  fill="#6d28d9"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={32}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Paid Invoices */}
        <div className="card flex flex-col justify-between rounded-2xl p-5">
          <div>
            <div className="mb-3 flex items-center justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-500/10">
                <FileText size={18} className="text-primary-400" />
              </div>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-400">
                <TrendingUp size={10} /> +15%
              </span>
            </div>
            <p className="text-[13px] text-muted">Paid Invoices</p>
            <p className="mt-1 text-[24px] font-bold tracking-tight text-heading">
              $<AnimatedCounter value={30256} />
            </p>
          </div>
          <p className="text-[11px] text-muted">Current Financial Year</p>
        </div>

        {/* Funds Received */}
        <div className="card flex flex-col justify-between rounded-2xl p-5">
          <div>
            <div className="mb-3 flex items-center justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10">
                <Wallet size={18} className="text-blue-400" />
              </div>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-400">
                <TrendingUp size={10} /> +58%
              </span>
            </div>
            <p className="text-[13px] text-muted">Funds received</p>
            <p className="mt-1 text-[24px] font-bold tracking-tight text-heading">
              $<AnimatedCounter value={150256} />
            </p>
          </div>
          <p className="text-[11px] text-muted">Current Financial Year</p>
        </div>
      </motion.div>

      {/* Row 4: Activity + Customer Orders */}
      <motion.div variants={item} className="grid grid-cols-1 gap-4 xl:grid-cols-5">
        {/* Activity Feed */}
        <div className="card rounded-2xl p-5 xl:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-heading">Overall Activity</h2>
            <div className="relative">
              <select className="input-field h-[30px] appearance-none pr-7 text-[12px] font-medium">
                <option>2026</option>
                <option>2025</option>
              </select>
              <ChevronDown size={12} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-muted" />
            </div>
          </div>
          <div className="space-y-1">
            {recentActivity.slice(0, 8).map((event, idx) => {
              const cfg = activityConfig[event.type];
              return (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.03 * idx, duration: 0.2 }}
                  className="flex items-center gap-3 rounded-xl px-2 py-2.5 transition-colors hover:bg-surface-3"
                >
                  <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${cfg.color}`}>
                    {cfg.icon}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[12px] leading-snug text-body">{event.message}</p>
                    <p className="mt-0.5 text-[11px] text-subtle">{event.time}</p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Customer Orders Table */}
        <div className="card overflow-hidden rounded-2xl xl:col-span-3">
          <div className="flex items-center justify-between px-5 py-4">
            <h2 className="text-sm font-semibold text-heading">Customer order</h2>
            <button className="btn-secondary h-[30px] text-[12px]">
              View All <ArrowRight size={11} />
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  {['Profile', 'Address', 'Date', 'Status', 'Price'].map((h) => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recentOrders.map((order, idx) => {
                  const rowColor = statusRowColors[order.status] || '';
                  const dotColor = statusDotColors[order.status] || 'bg-slate-400';
                  return (
                    <tr key={order.id} className={`${rowColor} transition-colors`}>
                      <td>
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-primary-400/30 to-primary-600/30 text-[10px] font-bold text-primary-300">
                            {order.customer.split(' ').map((n) => n[0]).join('')}
                          </div>
                          <span className="text-[13px] font-medium text-heading">{order.customer.split(' ')[0]}</span>
                        </div>
                      </td>
                      <td className="text-[13px] text-muted">New York</td>
                      <td className="text-[13px] text-muted">{order.date}</td>
                      <td>
                        <div className="flex items-center gap-1.5">
                          <span className={`h-2 w-2 rounded-full ${dotColor}`} />
                          <span className="text-[13px] text-body">{order.status}</span>
                        </div>
                      </td>
                      <td className="text-[13px] font-semibold text-heading">${order.amount.toFixed(0)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </motion.div>

      {/* Row 5: Top Products + Revenue by Channel */}
      <motion.div variants={item} className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {/* Top Products */}
        <div className="card rounded-2xl p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-heading">Top Products</h2>
            <button className="text-[12px] font-medium text-primary-400 transition-colors hover:text-primary-300">
              View All
            </button>
          </div>
          <div className="space-y-2">
            {topProducts.map((product, index) => (
              <div
                key={product.id}
                className="flex items-center gap-3 rounded-xl p-2.5 transition-colors hover:bg-surface-3"
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-surface-4 text-[12px] font-bold text-muted">
                  {index + 1}
                </span>
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-surface-3 text-base">
                  {product.image}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-medium text-heading">{product.name}</p>
                  <p className="text-[11px] text-muted">{product.sold} sold</p>
                </div>
                <p className="text-[13px] font-semibold tabular-nums text-heading">
                  ${product.revenue.toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Revenue by Channel */}
        <div className="card rounded-2xl p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-heading">Revenue by Channel</h2>
          </div>
          <div className="space-y-3">
            {revenueByChannel.map((ch, idx) => {
              const icons: Record<string, React.ReactNode> = {
                'Web Store': <Globe size={16} />,
                'Mobile App': <Smartphone size={16} />,
                'Social Media': <Share2 size={16} />,
                'Marketplace API': <Code size={16} />,
              };
              const colors = ['bg-violet-500', 'bg-blue-500', 'bg-emerald-500', 'bg-amber-500'];
              const iconBg = ['bg-violet-500/10 text-violet-400', 'bg-blue-500/10 text-blue-400', 'bg-emerald-500/10 text-emerald-400', 'bg-amber-500/10 text-amber-400'];
              return (
                <div key={ch.channel} className="rounded-xl bg-surface-3 p-3.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${iconBg[idx]}`}>
                        {icons[ch.channel] ?? <Globe size={16} />}
                      </div>
                      <div>
                        <p className="text-[13px] font-medium text-heading">{ch.channel}</p>
                        <p className="text-[11px] text-muted">{ch.orders.toLocaleString()} orders</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-[13px] font-semibold text-heading">${ch.revenue.toLocaleString()}</p>
                      <p className="text-[11px] font-medium text-primary-400">{ch.percentage}%</p>
                    </div>
                  </div>
                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-surface-5">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${ch.percentage}%` }}
                      transition={{ delay: 0.2 + idx * 0.08, duration: 0.5, ease: 'easeOut' }}
                      className={`h-full rounded-full ${colors[idx]}`}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
