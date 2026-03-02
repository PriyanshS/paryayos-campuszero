import React, { useState, useEffect } from 'react';
import { Cpu, Plus, RefreshCw, ArrowRight, CheckCircle2, Server, Box } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

type HardwareItem = {
  id: number;
  name: string;
  device_type: string;
  location: string | null;
  specs: string | null;
  sensor_ids: string | null;
  status: string;
  cba_result: string | null;
  created_at: string;
  updated_at: string;
};

export default function HardwareRegistry() {
  const { token } = useAuth();
  const [list, setList] = useState<HardwareItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState('sensor');
  const [newLocation, setNewLocation] = useState('');

  const fetchList = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch('http://localhost:8000/api/hardware', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setList(await res.json());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchList();
  }, [token]);

  const createHardware = async () => {
    if (!token || !newName.trim()) return;
    try {
      const res = await fetch('http://localhost:8000/api/hardware', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          name: newName.trim(),
          device_type: newType,
          location: newLocation.trim() || null,
          status: 'draft',
        }),
      });
      if (res.ok) {
        setNewName('');
        setNewLocation('');
        fetchList();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const runLifecycle = async (id: number, action: 'add-to-twin' | 'cba-run' | 'approve-install' | 'sync-to-server') => {
    if (!token) return;
    try {
      const res = await fetch(`http://localhost:8000/api/hardware/${id}/${action}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) fetchList();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      <header>
        <h1 className="text-4xl font-light tracking-tight text-white mb-2">
          Hardware <span className="font-serif italic text-emerald-400">Registry</span>
        </h1>
        <p className="text-zinc-400 max-w-2xl">
          Lifecycle: Add to Twin → AI CBA Run → Approve & Install → Sync to Server.
        </p>
      </header>

      <div className="bg-zinc-900/50 border border-white/5 rounded-2xl p-6 backdrop-blur-sm">
        <h3 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
          <Plus size={20} className="text-emerald-400" />
          Add Device
        </h3>
        <div className="flex flex-wrap gap-4 items-end">
          <div>
            <label className="block text-xs text-zinc-500 mb-1">Name</label>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g. Meter Block A"
              className="bg-zinc-800 border border-white/10 rounded-lg px-4 py-2 text-white placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
            />
          </div>
          <div>
            <label className="block text-xs text-zinc-500 mb-1">Type</label>
            <select
              value={newType}
              onChange={(e) => setNewType(e.target.value)}
              className="bg-zinc-800 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
            >
              <option value="sensor">Sensor</option>
              <option value="meter">Meter</option>
              <option value="actuator">Actuator</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-zinc-500 mb-1">Location</label>
            <input
              type="text"
              value={newLocation}
              onChange={(e) => setNewLocation(e.target.value)}
              placeholder="e.g. Library"
              className="bg-zinc-800 border border-white/10 rounded-lg px-4 py-2 text-white placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
            />
          </div>
          <button
            onClick={createHardware}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
          >
            <Plus size={16} /> Add to Twin
          </button>
        </div>
      </div>

      <div className="bg-zinc-900/50 border border-white/5 rounded-2xl p-6 backdrop-blur-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-white flex items-center gap-2">
            <Cpu size={20} className="text-emerald-400" />
            Devices
          </h3>
          <button
            onClick={fetchList}
            disabled={loading}
            className="p-2 text-zinc-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
        <div className="space-y-3">
          {list.length === 0 && !loading && (
            <p className="text-zinc-500 text-sm">No hardware registered. Add a device above.</p>
          )}
          {list.map((h) => (
            <div
              key={h.id}
              className="flex flex-wrap items-center gap-4 p-4 bg-zinc-800/30 border border-white/5 rounded-xl"
            >
              <div className="flex items-center gap-3 min-w-0">
                <Box size={20} className="text-zinc-500 shrink-0" />
                <div>
                  <div className="font-medium text-white">{h.name}</div>
                  <div className="text-xs text-zinc-500">{h.device_type} · {h.location || '—'}</div>
                </div>
              </div>
              <span className="text-xs font-mono px-2 py-1 rounded bg-zinc-700 text-zinc-300">
                {h.status}
              </span>
              <div className="flex items-center gap-2 flex-wrap">
                {h.status === 'draft' && (
                  <button
                    onClick={() => runLifecycle(h.id, 'add-to-twin')}
                    className="text-xs px-3 py-1.5 bg-emerald-500/20 text-emerald-400 rounded-lg hover:bg-emerald-500/30"
                  >
                    Add to Twin
                  </button>
                )}
                {(h.status === 'in_twin' || h.status === 'draft') && (
                  <button
                    onClick={() => runLifecycle(h.id, 'cba-run')}
                    className="text-xs px-3 py-1.5 bg-purple-500/20 text-purple-400 rounded-lg hover:bg-purple-500/30 flex items-center gap-1"
                  >
                    AI CBA Run
                  </button>
                )}
                {(h.status === 'cba_requested' || h.status === 'cba_done') && (
                  <button
                    onClick={() => runLifecycle(h.id, 'approve-install')}
                    className="text-xs px-3 py-1.5 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30 flex items-center gap-1"
                  >
                    <CheckCircle2 size={12} /> Approve & Install
                  </button>
                )}
                {(h.status === 'approved' || h.status === 'installed') && (
                  <button
                    onClick={() => runLifecycle(h.id, 'sync-to-server')}
                    className="text-xs px-3 py-1.5 bg-amber-500/20 text-amber-400 rounded-lg hover:bg-amber-500/30 flex items-center gap-1"
                  >
                    <Server size={12} /> Sync to Server
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
