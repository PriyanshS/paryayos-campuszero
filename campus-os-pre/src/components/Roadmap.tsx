import React from 'react';
import { 
  TrendingUp, 
  Calendar, 
  CheckCircle2, 
  Circle, 
  ArrowRight,
  PieChart,
  BarChart as BarChartIcon
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

const financialData = [
  { year: '2024', capex: 500, opex: 200, savings: 0 },
  { year: '2025', capex: 300, opex: 180, savings: 50 },
  { year: '2026', capex: 100, opex: 160, savings: 120 },
  { year: '2027', capex: 50, opex: 150, savings: 180 },
  { year: '2028', capex: 20, opex: 140, savings: 250 },
  { year: '2029', capex: 20, opex: 130, savings: 320 },
];

const phases = [
  { 
    id: 1, 
    title: "Phase 1: Low-Hanging Fruit", 
    time: "Year 1-2", 
    status: "current",
    items: ["Campus-wide Energy Audit", "LED Retrofitting (100%)", "Smart Meter Installation"] 
  },
  { 
    id: 2, 
    title: "Phase 2: Infrastructure Integration", 
    time: "Year 3-4", 
    status: "upcoming",
    items: ["Rooftop Solar (2MW)", "Rainwater Harvesting Systems", "Biogas Plant Construction"] 
  },
  { 
    id: 3, 
    title: "Phase 3: AI Autonomy", 
    time: "Year 5+", 
    status: "upcoming",
    items: ["Fully Autonomous Grid", "Predictive Maintenance AI", "Net-Zero Certification"] 
  },
];

export default function Roadmap() {
  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <header>
        <h1 className="text-4xl font-light tracking-tight text-white mb-2">
          Strategic <span className="font-serif italic text-amber-400">Roadmap</span>
        </h1>
        <p className="text-zinc-400 max-w-2xl">
          Phased implementation plan and financial viability analysis.
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Phased Implementation */}
        <div className="bg-zinc-900/50 border border-white/5 rounded-2xl p-6 backdrop-blur-sm h-fit">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-amber-500/10 rounded-xl text-amber-400">
              <Calendar size={24} />
            </div>
            <h2 className="text-xl font-medium text-white">Implementation Plan</h2>
          </div>

          <div className="space-y-8 relative before:absolute before:left-[19px] before:top-10 before:bottom-10 before:w-0.5 before:bg-zinc-800">
            {phases.map((phase, index) => (
              <div key={phase.id} className="relative pl-12">
                <div className={cn(
                  "absolute left-0 top-1 w-10 h-10 rounded-full border-4 flex items-center justify-center z-10 bg-zinc-900",
                  phase.status === 'completed' ? "border-emerald-500 text-emerald-500" :
                  phase.status === 'current' ? "border-amber-500 text-amber-500" : "border-zinc-700 text-zinc-700"
                )}>
                  {phase.status === 'completed' ? <CheckCircle2 size={18} /> : <span className="font-mono font-bold">{phase.id}</span>}
                </div>
                
                <div>
                  <div className="flex items-baseline justify-between mb-2">
                    <h3 className={cn("font-medium text-lg", phase.status === 'current' ? "text-white" : "text-zinc-400")}>{phase.title}</h3>
                    <span className="text-xs font-mono text-zinc-500">{phase.time}</span>
                  </div>
                  <ul className="space-y-2">
                    {phase.items.map((item, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm text-zinc-400">
                        <div className="w-1.5 h-1.5 rounded-full bg-zinc-600" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Financial Analysis */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-zinc-900/50 border border-white/5 rounded-2xl p-6 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-400">
                  <TrendingUp size={24} />
                </div>
                <h2 className="text-xl font-medium text-white">Cost-Benefit Analysis</h2>
              </div>
              <div className="flex gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-rose-500" />
                  <span className="text-zinc-400">CAPEX</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-blue-500" />
                  <span className="text-zinc-400">OPEX</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-emerald-500" />
                  <span className="text-zinc-400">Cumulative Savings</span>
                </div>
              </div>
            </div>

            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={financialData}>
                  <defs>
                    <linearGradient id="colorSavings" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                  <XAxis dataKey="year" stroke="#71717a" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#71717a" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `$${value}k`} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '8px' }}
                    itemStyle={{ color: '#e4e4e7' }}
                  />
                  <Area type="monotone" dataKey="savings" stroke="#10b981" fillOpacity={1} fill="url(#colorSavings)" strokeWidth={2} />
                  <Area type="monotone" dataKey="capex" stroke="#f43f5e" fill="none" strokeWidth={2} strokeDasharray="5 5" />
                  <Area type="monotone" dataKey="opex" stroke="#3b82f6" fill="none" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-zinc-900/50 border border-white/5 rounded-2xl p-6 backdrop-blur-sm text-center">
              <div className="text-sm text-zinc-400 mb-1">Payback Period</div>
              <div className="text-3xl font-mono font-bold text-white">4.2 <span className="text-sm font-sans font-normal text-zinc-500">Years</span></div>
            </div>
            <div className="bg-zinc-900/50 border border-white/5 rounded-2xl p-6 backdrop-blur-sm text-center">
              <div className="text-sm text-zinc-400 mb-1">Net Present Value</div>
              <div className="text-3xl font-mono font-bold text-emerald-400">$1.2M</div>
            </div>
            <div className="bg-zinc-900/50 border border-white/5 rounded-2xl p-6 backdrop-blur-sm text-center">
              <div className="text-sm text-zinc-400 mb-1">IRR</div>
              <div className="text-3xl font-mono font-bold text-blue-400">14.5%</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
