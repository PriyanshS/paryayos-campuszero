import React from 'react';
import { motion } from 'motion/react';
import { MapPin } from 'lucide-react';

export type CampusId = 'campus1' | 'campus2' | 'campus3' | 'default';

const CAMPUSES: { id: CampusId; label: string }[] = [
  { id: 'campus1', label: 'Campus 1' },
  { id: 'campus2', label: 'Campus 2' },
  { id: 'campus3', label: 'Campus 3' },
  { id: 'default', label: 'DefaultComplex' },
];

interface CampusPickerProps {
  onChoose: (campusId: CampusId) => void;
}

export default function CampusPicker({ onChoose }: CampusPickerProps) {
  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4 relative overflow-hidden font-sans">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-900/20 via-zinc-950/0 to-zinc-950 pointer-events-none" />
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-2xl z-10"
      >
        <div className="text-center mb-8">
          <h1 className="text-3xl font-light tracking-tight text-white mb-2">
            Choose <span className="font-serif italic text-emerald-400">Campus</span>
          </h1>
          <p className="text-zinc-400">Select a campus to open the Digital Twin</p>
        </div>
        <div className="grid grid-cols-2 gap-4">
          {CAMPUSES.map((campus) => (
            <button
              key={campus.id}
              onClick={() => onChoose(campus.id)}
              className="flex items-center justify-center gap-3 p-6 rounded-2xl bg-zinc-900/80 border border-white/10 hover:border-emerald-500/40 hover:bg-zinc-800/80 transition-all text-left group"
            >
              <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400 group-hover:bg-emerald-500/20 transition-colors">
                <MapPin size={28} />
              </div>
              <span className="text-lg font-medium text-white">{campus.label}</span>
            </button>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
