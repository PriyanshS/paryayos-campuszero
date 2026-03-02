import React, { useState, useEffect } from 'react';
import {
  BrainCircuit,
  TrendingUp,
  DollarSign,
  Leaf,
  AlertCircle,
  ArrowRight,
  RefreshCw,
  Check,
  Activity,
  Cpu,
  Search,
  ShieldCheck,
  Zap,
  Database,
  History,
  Layers,
  GitBranch,
  Play
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area,
  ScatterChart,
  Scatter
} from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

// --- Simulation Data ---
const initialSimulationData = [
  { year: '2024', savings: 0, cost: 50000 },
  { year: '2025', savings: 15000, cost: 0 },
  { year: '2026', savings: 18000, cost: 0 },
  { year: '2027', savings: 22000, cost: 0 },
  { year: '2028', savings: 25000, cost: 0 },
];

const predictions = [
  { id: 1, system: "HVAC - Science Block", probability: 89, issue: "Compressor efficiency drop predicted in 48h", action: "Schedule maintenance" },
  { id: 2, system: "Water Pump - Dorm A", probability: 76, issue: "Vibration anomaly detected", action: "Inspect bearings" },
  { id: 3, system: "Solar Inverter #3", probability: 62, issue: "Output variance > 5%", action: "Recalibrate" },
];

// --- Live Monitoring Data Generators ---
const generateLiveMetric = (prev: number) => {
  const change = (Math.random() - 0.5) * 5;
  return Math.max(0, Math.min(100, prev + change));
};

const aiLogs = [
  "Analyzing grid frequency stability...",
  "Optimizing HVAC setpoints for Zone B...",
  "Detected minor pressure drop in Water Loop 4...",
  "Verifying solar array output efficiency...",
  "Cross-referencing occupancy data with lighting usage...",
  "Predicting peak load for 14:00 hours...",
  "Scanning for cybersecurity anomalies...",
  "Adjusting battery storage charge rate...",
];

// --- Training Data ---
const datasets = [
  { id: 1, name: "Energy_Logs_2023_2025.csv", size: "2.4 GB", records: "14.2M", status: "ready" },
  { id: 2, name: "Weather_Historical_Local.json", size: "450 MB", records: "850k", status: "ready" },
  { id: 3, name: "Equipment_Failure_Reports.sql", size: "120 MB", records: "12k", status: "processing" },
  { id: 4, name: "Occupancy_Sensors_Raw.parquet", size: "5.1 GB", records: "42M", status: "ready" },
];

const trainingMetrics = [
  { epoch: 1, loss: 0.85, accuracy: 0.45 },
  { epoch: 5, loss: 0.62, accuracy: 0.68 },
  { epoch: 10, loss: 0.45, accuracy: 0.79 },
  { epoch: 15, loss: 0.32, accuracy: 0.86 },
  { epoch: 20, loss: 0.21, accuracy: 0.92 },
  { epoch: 25, loss: 0.15, accuracy: 0.95 },
];

export default function AIBrain() {
  const [viewMode, setViewMode] = useState<'monitor' | 'training'>('monitor');

  // Simulation State
  const [isSimulating, setIsSimulating] = useState(false);
  const [scenario, setScenario] = useState('solar');
  const [data, setData] = useState(initialSimulationData);

  // Live Monitoring State
  const [liveData, setLiveData] = useState(Array(20).fill(0).map((_, i) => ({ time: i, value: 50, baseline: 50 })));
  const [logs, setLogs] = useState<string[]>([]);
  const [systemHealth, setSystemHealth] = useState(98);
  const [anomalyScore, setAnomalyScore] = useState(2);

  // Training State
  const [isTraining, setIsTraining] = useState(false);
  const [progress, setProgress] = useState(0);

  // Backend Data
  const [dbPredictions, setDbPredictions] = useState<any[]>([]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      fetch('http://localhost:8000/api/predictions?limit=3', {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) setDbPredictions(data);
        })
        .catch(console.error);
    }
  }, []);

  // Live Data Effect
  useEffect(() => {
    const interval = setInterval(() => {
      setLiveData(prev => {
        const last = prev[prev.length - 1];
        const newValue = generateLiveMetric(last.value);
        const newBaseline = 50 + Math.sin(Date.now() / 1000) * 10;
        return [...prev.slice(1), { time: last.time + 1, value: newValue, baseline: newBaseline }];
      });

      setSystemHealth(prev => Math.max(90, Math.min(100, prev + (Math.random() - 0.5))));
      setAnomalyScore(prev => Math.max(0, Math.min(10, prev + (Math.random() - 0.5))));

      if (Math.random() > 0.7) {
        setLogs(prev => [aiLogs[Math.floor(Math.random() * aiLogs.length)], ...prev].slice(0, 6));
      }
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const runSimulation = () => {
    setIsSimulating(true);
    setTimeout(() => {
      const multiplier = scenario === 'solar' ? 1.2 : scenario === 'hvac' ? 0.9 : 1.5;
      const newData = initialSimulationData.map(d => ({
        ...d,
        savings: d.year === '2024' ? 0 : Math.round(d.savings * multiplier * (1 + Math.random() * 0.2))
      }));
      setData(newData);
      setIsSimulating(false);
    }, 1500);
  };

  const startTraining = () => {
    setIsTraining(true);
    setProgress(0);
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsTraining(false);
          return 100;
        }
        return prev + 2;
      });
    }, 100);
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <header className="flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-light tracking-tight text-white mb-2">
            AI <span className="font-serif italic text-purple-400">Monitor & Brain</span>
          </h1>
          <p className="text-zinc-400 max-w-2xl">
            Real-time autonomous monitoring, anomaly detection, and strategic optimization.
          </p>
        </div>
        <div className="flex bg-zinc-900 border border-white/10 rounded-lg p-1">
          <button
            onClick={() => setViewMode('monitor')}
            className={cn("px-4 py-2 rounded-md text-sm font-medium transition-all", viewMode === 'monitor' ? "bg-purple-500 text-white shadow-lg" : "text-zinc-400 hover:text-white")}
          >
            Live Monitor
          </button>
          <button
            onClick={() => setViewMode('training')}
            className={cn("px-4 py-2 rounded-md text-sm font-medium transition-all", viewMode === 'training' ? "bg-purple-500 text-white shadow-lg" : "text-zinc-400 hover:text-white")}
          >
            Model Training
          </button>
        </div>
      </header>

      <AnimatePresence mode="wait">
        {viewMode === 'monitor' ? (
          <motion.div
            key="monitor"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-8"
          >
            {/* --- REAL-TIME MONITORING SECTION --- */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Live Anomaly Detection */}
              <div className="lg:col-span-2 bg-zinc-900/50 border border-white/5 rounded-2xl p-6 backdrop-blur-sm">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-rose-500/10 rounded-xl text-rose-400">
                      <Activity size={24} />
                    </div>
                    <div>
                      <h2 className="text-xl font-medium text-white">Live Anomaly Detection</h2>
                      <p className="text-xs text-zinc-500">Real-time deviation from expected baseline</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-purple-500" />
                      <span className="text-zinc-400">Actual</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-zinc-600 dashed border border-zinc-500" />
                      <span className="text-zinc-400">Baseline</span>
                    </div>
                  </div>
                </div>

                <div className="h-[250px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={liveData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                      <XAxis dataKey="time" hide />
                      <YAxis domain={[0, 100]} hide />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '8px' }}
                        itemStyle={{ color: '#e4e4e7' }}
                      />
                      <Line
                        type="monotone"
                        dataKey="baseline"
                        stroke="#52525b"
                        strokeWidth={2}
                        strokeDasharray="5 5"
                        dot={false}
                        isAnimationActive={false}
                      />
                      <Line
                        type="monotone"
                        dataKey="value"
                        stroke="#a855f7"
                        strokeWidth={3}
                        dot={false}
                        isAnimationActive={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* AI Decision Log */}
              <div className="bg-zinc-900/50 border border-white/5 rounded-2xl p-6 backdrop-blur-sm flex flex-col">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-3 bg-blue-500/10 rounded-xl text-blue-400">
                    <Cpu size={24} />
                  </div>
                  <div>
                    <h2 className="text-xl font-medium text-white">AI Decision Log</h2>
                    <p className="text-xs text-zinc-500">Autonomous actions & scans</p>
                  </div>
                </div>

                <div className="flex-1 overflow-hidden relative">
                  <div className="absolute inset-0 overflow-y-auto space-y-3 pr-2 font-mono text-xs">
                    <AnimatePresence initial={false}>
                      {logs.map((log, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="flex gap-3 text-zinc-300 border-l-2 border-zinc-700 pl-3 py-1"
                        >
                          <span className="text-zinc-600 shrink-0">{new Date().toLocaleTimeString()}</span>
                          <span>{log}</span>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-zinc-900 to-transparent pointer-events-none" />
                </div>
              </div>
            </div>

            {/* --- PREDICTIVE MAINTENANCE --- */}
            <div className="bg-zinc-900/50 border border-white/5 rounded-2xl p-6 backdrop-blur-sm">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-medium text-white flex items-center gap-2">
                  <ShieldCheck size={20} className="text-emerald-400" />
                  Predictive Maintenance Alerts
                </h3>
                <button
                  onClick={async () => {
                    const token = localStorage.getItem('token');
                    if (token) {
                      await fetch('http://localhost:8000/api/ai/predict', {
                        method: 'POST',
                        headers: { Authorization: `Bearer ${token}` }
                      });
                      // Re-fetch predictions
                      const res = await fetch('http://localhost:8000/api/predictions?limit=3', {
                        headers: { Authorization: `Bearer ${token}` }
                      });
                      if (res.ok) {
                        const newPreds = await res.json();
                        setDbPredictions(newPreds);
                      }
                    }
                  }}
                  className="p-2 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 rounded-lg transition-colors flex items-center gap-2 text-sm"
                >
                  <RefreshCw size={14} /> Calculate New Insight
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {dbPredictions.length > 0 ? (
                  dbPredictions.map((pred: any) => (
                    <div key={pred.id} className="bg-black/20 border border-white/5 rounded-xl p-4 hover:border-white/10 transition-colors group flex flex-col justify-between">
                      <div>
                        <div className="flex justify-between items-start mb-3">
                          <span className="text-sm font-medium text-zinc-200 group-hover:text-white transition-colors">
                            {pred.model_type.replace(/_/g, ' ').toUpperCase()}
                          </span>
                          <span className={cn("text-xs font-mono px-2 py-1 rounded", (pred.confidence_score * 100) > 80 ? "bg-emerald-500/10 text-emerald-400" : "bg-amber-500/10 text-amber-400")}>
                            {Math.round(pred.confidence_score * 100)}% Conf.
                          </span>
                        </div>
                        <p className="text-xs text-zinc-400 mb-2">
                          {pred.target_metric}: <span className="text-white font-mono">{pred.predicted_value} kW</span>
                        </p>
                        <p className="text-[10px] text-zinc-600 mb-3 truncate">
                          Sensors Traced: {pred.based_on_sensors}
                        </p>
                      </div>
                      <button className="w-full py-2 bg-white/5 hover:bg-white/10 rounded-lg text-xs font-medium text-zinc-300 transition-colors flex items-center justify-center gap-2 mt-auto">
                        <Search size={14} />
                        View Model Logic
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="col-span-3 py-8 text-center text-zinc-500 text-sm border border-dashed border-zinc-800 rounded-xl">
                    No predictions available. Generate sensor data first, then calculate insights.
                  </div>
                )}
              </div>
            </div>

            {/* --- STRATEGIC SIMULATION --- */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pt-8 border-t border-white/5">
              <div className="lg:col-span-1">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-400">
                    <BrainCircuit size={24} />
                  </div>
                  <div>
                    <h2 className="text-xl font-medium text-white">Scenario Simulator</h2>
                    <p className="text-xs text-zinc-500">Long-term optimization modeling</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <button
                    onClick={() => setScenario('solar')}
                    className={cn("w-full px-4 py-3 rounded-xl text-left border transition-all", scenario === 'solar' ? "bg-emerald-500/10 border-emerald-500/50 text-emerald-100" : "bg-zinc-800/50 border-white/5 text-zinc-400 hover:bg-zinc-800")}
                  >
                    <div className="font-medium">Solar Array Expansion</div>
                    <div className="text-xs opacity-60">Add 500kW capacity</div>
                  </button>
                  <button
                    onClick={() => setScenario('hvac')}
                    className={cn("w-full px-4 py-3 rounded-xl text-left border transition-all", scenario === 'hvac' ? "bg-emerald-500/10 border-emerald-500/50 text-emerald-100" : "bg-zinc-800/50 border-white/5 text-zinc-400 hover:bg-zinc-800")}
                  >
                    <div className="font-medium">Smart HVAC Retrofit</div>
                    <div className="text-xs opacity-60">AI-driven climate control</div>
                  </button>

                  <div className="pt-4">
                    <button
                      onClick={runSimulation}
                      disabled={isSimulating}
                      className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSimulating ? <RefreshCw className="animate-spin" size={18} /> : <Zap size={18} />}
                      {isSimulating ? "Simulating..." : "Run Simulation"}
                    </button>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-2">
                <div className="bg-zinc-900/50 border border-white/5 rounded-2xl p-6 backdrop-blur-sm h-full">
                  <h3 className="text-lg font-medium text-white mb-6 flex items-center gap-2">
                    <TrendingUp size={20} className="text-emerald-400" />
                    Projected Impact (5-Year)
                  </h3>
                  <div className="h-[250px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={data}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                        <XAxis dataKey="year" stroke="#71717a" fontSize={12} tickLine={false} axisLine={false} />
                        <YAxis stroke="#71717a" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `$${value / 1000}k`} />
                        <Tooltip
                          cursor={{ fill: '#ffffff05' }}
                          contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '8px' }}
                          itemStyle={{ color: '#e4e4e7' }}
                        />
                        <Legend />
                        <Bar dataKey="cost" name="Investment Cost" fill="#ef4444" radius={[4, 4, 0, 0]} maxBarSize={50} />
                        <Bar dataKey="savings" name="Operational Savings" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={50} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="training"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-8"
          >
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Data Ingestion */}
              <div className="bg-zinc-900/50 border border-white/5 rounded-2xl p-6 backdrop-blur-sm">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-3 bg-blue-500/10 rounded-xl text-blue-400">
                    <Database size={24} />
                  </div>
                  <div>
                    <h2 className="text-xl font-medium text-white">Historical Data</h2>
                    <p className="text-xs text-zinc-500">Training datasets</p>
                  </div>
                </div>

                <div className="space-y-3">
                  {datasets.map((ds) => (
                    <div key={ds.id} className="p-3 bg-zinc-800/30 border border-white/5 rounded-xl flex items-center justify-between group hover:bg-zinc-800/50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-zinc-700/50 rounded-lg text-zinc-400">
                          <History size={16} />
                        </div>
                        <div>
                          <div className="text-sm font-medium text-zinc-200 group-hover:text-white">{ds.name}</div>
                          <div className="text-xs text-zinc-500">{ds.records} records • {ds.size}</div>
                        </div>
                      </div>
                      <div className={cn("w-2 h-2 rounded-full", ds.status === 'ready' ? "bg-emerald-500" : "bg-amber-500 animate-pulse")} />
                    </div>
                  ))}
                </div>

                <div className="mt-6 pt-6 border-t border-white/5">
                  <label className="block w-full">
                    <span className="sr-only">Upload CSV</span>
                    <input
                      type="file"
                      accept=".csv"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file || !file.name.toLowerCase().endsWith('.csv')) return;
                        const token = localStorage.getItem('token');
                        if (!token) return;
                        const form = new FormData();
                        form.append('file', file);
                        try {
                          const res = await fetch('http://localhost:8000/api/data/upload', {
                            method: 'POST',
                            headers: { Authorization: `Bearer ${token}` },
                            body: form,
                          });
                          if (res.ok) {
                            const data = await res.json();
                            alert(`Uploaded ${Array.isArray(data) ? data.length : 0} rows from ${file.name}.`);
                          } else {
                            const err = await res.json().catch(() => ({}));
                            alert(err.detail || 'Upload failed.');
                          }
                        } catch (err) {
                          alert('Upload failed.');
                        }
                        e.target.value = '';
                      }}
                    />
                    <span className="flex items-center justify-center gap-2 w-full py-2 border border-dashed border-zinc-700 text-zinc-500 rounded-xl hover:bg-zinc-800/50 hover:text-zinc-300 transition-colors text-sm cursor-pointer">
                      + Upload CSV (Historical Data)
                    </span>
                  </label>
                </div>
              </div>

              {/* Training Control */}
              <div className="lg:col-span-2 space-y-6">
                <div className="bg-zinc-900/50 border border-white/5 rounded-2xl p-6 backdrop-blur-sm">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-purple-500/10 rounded-xl text-purple-400">
                        <Layers size={24} />
                      </div>
                      <div>
                        <h2 className="text-xl font-medium text-white">Model Training</h2>
                        <p className="text-xs text-zinc-500">Deep Learning (LSTM + Transformer)</p>
                      </div>
                    </div>
                    <button
                      onClick={startTraining}
                      disabled={isTraining}
                      className="px-6 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-medium transition-colors flex items-center gap-2 disabled:opacity-50"
                    >
                      {isTraining ? <RefreshCw className="animate-spin" size={18} /> : <Play size={18} fill="currentColor" />}
                      {isTraining ? "Training..." : "Retrain Model"}
                    </button>
                  </div>

                  {isTraining && (
                    <div className="mb-8 space-y-2">
                      <div className="flex justify-between text-xs text-zinc-400">
                        <span>Training Progress (Epoch 25/100)</span>
                        <span>{progress}%</span>
                      </div>
                      <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                        <motion.div
                          className="h-full bg-purple-500"
                          initial={{ width: 0 }}
                          animate={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                  )}

                  <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={trainingMetrics}>
                        <defs>
                          <linearGradient id="colorAccuracy" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                        <XAxis dataKey="epoch" stroke="#71717a" fontSize={12} tickLine={false} axisLine={false} label={{ value: 'Epochs', position: 'insideBottom', offset: -5, fill: '#71717a' }} />
                        <YAxis stroke="#71717a" fontSize={12} tickLine={false} axisLine={false} />
                        <Tooltip
                          contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '8px' }}
                          itemStyle={{ color: '#e4e4e7' }}
                        />
                        <Legend />
                        <Area type="monotone" dataKey="accuracy" name="Validation Accuracy" stroke="#a855f7" fillOpacity={1} fill="url(#colorAccuracy)" strokeWidth={2} />
                        <Line type="monotone" dataKey="loss" name="Loss Function" stroke="#f43f5e" strokeWidth={2} dot={false} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
