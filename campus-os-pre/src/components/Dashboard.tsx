import React, { useState, useEffect } from 'react';
import {
  Zap,
  Droplets,
  Recycle,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  DollarSign,
  Leaf,
  BrainCircuit,
  Gauge,
  ThermometerSun,
  Battery,
  Wind,
  Trash2,
  TrendingDown,
  Cpu,
  BarChart3
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';
import { useAuth } from '../contexts/AuthContext';

const formatTime = (isoString: string) => {
  const date = new Date(isoString);
  return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
};

const MetricCard = ({ title, value, unit, trend, trendValue, icon: Icon, color, data, dataKey = "value" }: any) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className="bg-zinc-900/50 border border-white/5 rounded-2xl p-6 backdrop-blur-sm hover:border-white/10 transition-colors group relative"
  >
    <div className="flex justify-between items-start mb-4">
      <div className="flex items-center gap-3">
        <div className={cn("p-3 rounded-xl bg-opacity-10", `bg-${color}-500/10 text-${color}-400`)}>
          <Icon size={24} />
        </div>
        <div>
          <h3 className="text-zinc-400 text-sm font-medium uppercase tracking-wider">{title}</h3>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-3xl font-bold font-mono text-zinc-100">{value}</span>
            <span className="text-zinc-500 text-sm font-mono">{unit}</span>
          </div>
        </div>
      </div>
      <div className={cn("flex items-center gap-1 text-sm font-mono px-2 py-1 rounded-lg", trend === 'up' ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400")}>
        {trend === 'up' ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
        {trendValue}
      </div>
    </div>

    <div className="h-[120px] w-full mt-4">
      {data.length > 0 ? (
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id={`color${title}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color === 'emerald' ? '#10b981' : color === 'blue' ? '#3b82f6' : '#f59e0b'} stopOpacity={0.3} />
                <stop offset="95%" stopColor={color === 'emerald' ? '#10b981' : color === 'blue' ? '#3b82f6' : '#f59e0b'} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
            <Tooltip
              contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '8px' }}
              itemStyle={{ color: '#e4e4e7' }}
              labelFormatter={(label) => `Time: ${label}`}
            />
            <XAxis dataKey="time" hide />
            <Area
              type="monotone"
              dataKey={dataKey}
              stroke={color === 'emerald' ? '#10b981' : color === 'blue' ? '#3b82f6' : '#f59e0b'}
              fillOpacity={1}
              fill={`url(#color${title})`}
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      ) : (
        <div className="h-full w-full flex items-center justify-center text-zinc-600 text-sm">
          No data available
        </div>
      )}
    </div>
  </motion.div>
);

export default function Dashboard() {
  const { token } = useAuth();

  const [energyData, setEnergyData] = useState<any[]>([]);
  const [waterData, setWaterData] = useState<any[]>([]);
  const [hvacData, setHvacData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const [currentEnergy, setCurrentEnergy] = useState("0");
  const [currentWater, setCurrentWater] = useState("0");
  const [currentHvac, setCurrentHvac] = useState("0");

  // KPI indicators (20+) — derived from sensor data + computed; backend/AI can override later
  const kpiIndicators = [
    { pillar: 'Energy', label: 'Current Load', value: currentEnergy, unit: 'kW', icon: Zap, color: 'emerald' },
    { pillar: 'Energy', label: 'Peak Demand (Today)', value: (Number(currentEnergy) * 1.15).toFixed(1), unit: 'kW', icon: Gauge, color: 'emerald' },
    { pillar: 'Energy', label: 'Renewable %', value: '34', unit: '%', icon: Leaf, color: 'emerald' },
    { pillar: 'Energy', label: 'Solar Output', value: (Number(currentEnergy) * 0.28).toFixed(1), unit: 'kW', icon: ThermometerSun, color: 'emerald' },
    { pillar: 'Energy', label: 'Grid Draw', value: (Number(currentEnergy) * 0.72).toFixed(1), unit: 'kW', icon: Zap, color: 'emerald' },
    { pillar: 'Energy', label: 'Battery SOC', value: '62', unit: '%', icon: Battery, color: 'emerald' },
    { pillar: 'Carbon', label: 'Scope 1 (kg CO₂e)', value: (Number(currentEnergy) * 0.4).toFixed(0), unit: '', icon: Leaf, color: 'amber' },
    { pillar: 'Carbon', label: 'Scope 2 (kg CO₂e)', value: (Number(currentEnergy) * 0.35).toFixed(0), unit: '', icon: Leaf, color: 'amber' },
    { pillar: 'Carbon', label: 'Carbon Intensity', value: '0.28', unit: 'kg/kWh', icon: Leaf, color: 'amber' },
    { pillar: 'Carbon', label: 'Offset %', value: '22', unit: '%', icon: TrendingDown, color: 'amber' },
    { pillar: 'Water', label: 'Current Usage', value: currentWater, unit: 'L', icon: Droplets, color: 'blue' },
    { pillar: 'Water', label: 'Recycling Rate', value: '45', unit: '%', icon: Droplets, color: 'blue' },
    { pillar: 'Water', label: 'STP Output', value: (Number(currentWater) * 0.4).toFixed(0), unit: 'L', icon: Droplets, color: 'blue' },
    { pillar: 'Water', label: 'Harvesting (Today)', value: '1.2', unit: 'kL', icon: Droplets, color: 'blue' },
    { pillar: 'Waste', label: 'Organic (kg/day)', value: '248', unit: '', icon: Recycle, color: 'amber' },
    { pillar: 'Waste', label: 'Dry Waste (kg/day)', value: '98', unit: '', icon: Trash2, color: 'amber' },
    { pillar: 'Waste', label: 'Diversion Rate', value: '89', unit: '%', icon: Recycle, color: 'amber' },
    { pillar: 'Financial', label: 'Energy Cost (MTD)', value: '42', unit: 'k ₹', icon: DollarSign, color: 'emerald' },
    { pillar: 'Financial', label: 'Water Cost (MTD)', value: '8', unit: 'k ₹', icon: DollarSign, color: 'blue' },
    { pillar: 'Financial', label: 'Savings vs Baseline', value: '12', unit: '%', icon: TrendingDown, color: 'emerald' },
    { pillar: 'AI', label: 'Predictions Today', value: '—', unit: '', icon: BrainCircuit, color: 'purple' },
    { pillar: 'AI', label: 'Model Confidence', value: '—', unit: '%', icon: Cpu, color: 'purple' },
    { pillar: 'AI', label: 'Anomalies Flagged', value: '2', unit: '', icon: Activity, color: 'purple' },
  ];

  const fetchSensorData = async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      const res = await fetch('http://localhost:8000/api/sensors?limit=50', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();

        // Filter and format data for charts
        const energyRaw = data.filter((d: any) => d.sensor_type === 'power').reverse();
        const waterRaw = data.filter((d: any) => d.sensor_type === 'water').reverse();
        const hvacRaw = data.filter((d: any) => d.sensor_type === 'hvac').reverse();

        const formatData = (arr: any[]) => arr.map(d => ({ time: formatTime(d.timestamp), value: d.value }));

        setEnergyData(formatData(energyRaw));
        setWaterData(formatData(waterRaw));
        setHvacData(formatData(hvacRaw));

        if (energyRaw.length > 0) setCurrentEnergy(energyRaw[energyRaw.length - 1].value.toString());
        if (waterRaw.length > 0) setCurrentWater(waterRaw[waterRaw.length - 1].value.toString());
        if (hvacRaw.length > 0) setCurrentHvac(hvacRaw[hvacRaw.length - 1].value.toString());
      }
    } catch (e) {
      console.error("Failed to fetch sensor data:", e);
    } finally {
      setIsLoading(false);
    }
  };

  const triggerDataGeneration = async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      await fetch('http://localhost:8000/api/data/generate?num_records=10', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      await fetchSensorData();
    } catch (e) {
      console.error("Failed to generate data:", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSensorData();

    // Auto refresh every 30 seconds
    const interval = setInterval(fetchSensorData, 30000);
    return () => clearInterval(interval);
  }, [token]);

  return (
    <div className="space-y-8 p-8 max-w-7xl mx-auto">
      <header className="flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-light tracking-tight text-white mb-2">
            Campus <span className="font-serif italic text-emerald-400">Metabolism</span>
          </h1>
          <p className="text-zinc-400 max-w-2xl">
            Real-time monitoring of the university's resource flows.
            The system is currently operating at <span className="text-emerald-400 font-mono">94% efficiency</span>.
          </p>
        </div>
        <div className="flex gap-4">
          <button
            onClick={triggerDataGeneration}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-emerald-400 text-sm font-medium hover:bg-emerald-500/20 transition-colors disabled:opacity-50"
          >
            <RefreshCw size={16} className={cn({ "animate-spin": isLoading })} />
            <span>Simulate Sensors</span>
          </button>
          <div className="flex items-center gap-2 px-4 py-2 bg-zinc-800 border border-white/5 rounded-full text-zinc-400 text-sm">
            <span className={cn("w-2 h-2 rounded-full", isLoading ? "bg-amber-500" : "bg-emerald-500 animate-pulse")} />
            Live Data
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <MetricCard
          title="Energy Load"
          value={currentEnergy}
          unit="kW"
          trend="down"
          trendValue="12% vs avg"
          icon={Zap}
          color="emerald"
          data={energyData}
        />
        <MetricCard
          title="Water Usage"
          value={currentWater}
          unit="L"
          trend="up"
          trendValue="5% vs avg"
          icon={Droplets}
          color="blue"
          data={waterData}
        />
        <MetricCard
          title="HVAC Avg Temp"
          value={currentHvac}
          unit="°C"
          trend="down"
          trendValue="Optimal Range"
          icon={Recycle}
          color="amber"
          data={hvacData}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Alerts Section */}
        <div className="bg-zinc-900/50 border border-white/5 rounded-2xl p-6 backdrop-blur-sm">
          <h3 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
            <AlertTriangle className="text-amber-400" size={20} />
            Active Alerts
          </h3>
          <div className="space-y-3">
            {[
              { id: 1, msg: "High water pressure detected in Science Block B", time: "2m ago", type: "warning" },
              { id: 2, msg: "Solar array efficiency drop - Panel Group 4", time: "15m ago", type: "warning" },
              { id: 3, msg: "HVAC optimization complete for Library", time: "1h ago", type: "success" },
            ].map((alert) => (
              <div key={alert.id} className="flex items-start gap-3 p-3 rounded-lg bg-white/5 border border-white/5 hover:bg-white/10 transition-colors">
                {alert.type === 'warning' ? (
                  <AlertTriangle size={16} className="text-amber-400 mt-1 shrink-0" />
                ) : (
                  <CheckCircle2 size={16} className="text-emerald-400 mt-1 shrink-0" />
                )}
                <div>
                  <p className="text-sm text-zinc-200">{alert.msg}</p>
                  <span className="text-xs text-zinc-500 font-mono">{alert.time}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-zinc-900/50 border border-white/5 rounded-2xl p-6 backdrop-blur-sm">
          <h3 className="text-lg font-medium text-white mb-4">System Controls</h3>
          <div className="grid grid-cols-2 gap-4">
            <button className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors text-left group">
              <Zap className="text-emerald-400 mb-2 group-hover:scale-110 transition-transform" size={24} />
              <div className="font-medium text-emerald-100">Optimize Grid</div>
              <div className="text-xs text-emerald-400/60 mt-1">Run load balancing</div>
            </button>
            <button className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 hover:bg-blue-500/20 transition-colors text-left group">
              <Droplets className="text-blue-400 mb-2 group-hover:scale-110 transition-transform" size={24} />
              <div className="font-medium text-blue-100">Leak Check</div>
              <div className="text-xs text-blue-400/60 mt-1">Scan all sectors</div>
            </button>
            <button className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/20 transition-colors text-left group">
              <Recycle className="text-amber-400 mb-2 group-hover:scale-110 transition-transform" size={24} />
              <div className="font-medium text-amber-100">Waste Log</div>
              <div className="text-xs text-amber-400/60 mt-1">Update collection data</div>
            </button>
            <button className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20 hover:bg-purple-500/20 transition-colors text-left group">
              <Activity className="text-purple-400 mb-2 group-hover:scale-110 transition-transform" size={24} />
              <div className="font-medium text-purple-100">System Report</div>
              <div className="text-xs text-purple-400/60 mt-1">Generate daily PDF</div>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Dashboard — 20+ indicators across Energy, Carbon, Water, Waste, Financial, AI */}
      <div className="mt-8">
        <h3 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
          <BarChart3 size={20} className="text-emerald-400" />
          KPI Monitor
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
          {kpiIndicators.map((kpi, i) => {
            const Icon = kpi.icon;
            const iconClass = kpi.color === 'emerald' ? 'text-emerald-400' : kpi.color === 'blue' ? 'text-blue-400' : kpi.color === 'amber' ? 'text-amber-400' : 'text-purple-400';
            return (
              <div
                key={i}
                className="p-3 rounded-xl border border-white/5 bg-zinc-900/50 backdrop-blur-sm hover:border-white/10 transition-colors"
              >
                <div className="flex items-center gap-2 mb-1">
                  <Icon size={14} className={iconClass} />
                  <span className="text-[10px] uppercase tracking-wider text-zinc-500">{kpi.pillar}</span>
                </div>
                <div className="text-sm font-mono text-white truncate" title={kpi.label}>
                  {kpi.value} {kpi.unit}
                </div>
                <div className="text-xs text-zinc-500 truncate">{kpi.label}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
