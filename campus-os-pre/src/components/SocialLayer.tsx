import React from 'react';
import { 
  Users, 
  Trophy, 
  Zap, 
  ArrowRightLeft, 
  TrendingUp,
  Award,
  Leaf
} from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

const leaderboard = [
  { rank: 1, name: "Science Faculty", score: 9850, change: "+12%", avatar: "🧪" },
  { rank: 2, name: "Dormitory A", score: 9200, change: "+5%", avatar: "🏠" },
  { rank: 3, name: "Central Library", score: 8900, change: "-2%", avatar: "📚" },
  { rank: 4, name: "Student Hub", score: 8500, change: "+8%", avatar: "☕" },
  { rank: 5, name: "Admin Block", score: 7200, change: "+1%", avatar: "💼" },
];

const trades = [
  { id: 1, from: "Science Faculty", to: "Dormitory B", amount: "50 kWh", price: "2.5 CC", time: "2m ago" },
  { id: 2, from: "Solar Farm A", to: "Central Library", amount: "120 kWh", price: "2.1 CC", time: "5m ago" },
  { id: 3, from: "Dormitory A", to: "Student Hub", amount: "15 kWh", price: "2.8 CC", time: "12m ago" },
];

export default function SocialLayer() {
  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <header>
        <h1 className="text-4xl font-light tracking-tight text-white mb-2">
          Community <span className="font-serif italic text-blue-400">Exchange</span>
        </h1>
        <p className="text-zinc-400 max-w-2xl">
          Gamified sustainability and decentralized energy trading platform.
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Leaderboard */}
        <div className="lg:col-span-2 bg-zinc-900/50 border border-white/5 rounded-2xl p-6 backdrop-blur-sm">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-amber-500/10 rounded-xl text-amber-400">
                <Trophy size={24} />
              </div>
              <h2 className="text-xl font-medium text-white">Sustainability Leaderboard</h2>
            </div>
            <div className="flex gap-2">
              <button className="px-3 py-1 text-xs font-medium bg-white/10 text-white rounded-full">Weekly</button>
              <button className="px-3 py-1 text-xs font-medium text-zinc-500 hover:text-zinc-300">Monthly</button>
              <button className="px-3 py-1 text-xs font-medium text-zinc-500 hover:text-zinc-300">All Time</button>
            </div>
          </div>

          <div className="space-y-4">
            {leaderboard.map((item, index) => (
              <motion.div 
                key={item.rank}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-center gap-4 p-4 bg-zinc-800/30 border border-white/5 rounded-xl hover:bg-zinc-800/50 transition-colors"
              >
                <div className={cn(
                  "w-8 h-8 flex items-center justify-center rounded-full font-bold font-mono",
                  index === 0 ? "bg-amber-500 text-black" : 
                  index === 1 ? "bg-zinc-400 text-black" : 
                  index === 2 ? "bg-orange-700 text-white" : "bg-zinc-800 text-zinc-500"
                )}>
                  {item.rank}
                </div>
                <div className="text-2xl">{item.avatar}</div>
                <div className="flex-1">
                  <div className="font-medium text-white">{item.name}</div>
                  <div className="text-xs text-zinc-500">Carbon Credits Earned</div>
                </div>
                <div className="text-right">
                  <div className="font-mono font-bold text-emerald-400">{item.score}</div>
                  <div className={cn("text-xs font-medium", item.change.startsWith('+') ? "text-emerald-500" : "text-rose-500")}>
                    {item.change}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* P2P Exchange */}
        <div className="space-y-6">
          <div className="bg-zinc-900/50 border border-white/5 rounded-2xl p-6 backdrop-blur-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-blue-500/10 rounded-xl text-blue-400">
                <ArrowRightLeft size={24} />
              </div>
              <h2 className="text-xl font-medium text-white">Energy Exchange</h2>
            </div>

            <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 mb-6">
              <div className="text-sm text-blue-200 mb-1">Current Market Price</div>
              <div className="text-3xl font-mono font-bold text-blue-400">2.45 <span className="text-sm font-normal text-blue-300/60">CC/kWh</span></div>
            </div>

            <h3 className="text-sm font-medium text-zinc-400 mb-3 uppercase tracking-wider">Recent Trades</h3>
            <div className="space-y-3">
              {trades.map((trade) => (
                <div key={trade.id} className="p-3 bg-zinc-800/30 border border-white/5 rounded-xl">
                  <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center gap-2 text-sm text-white">
                      <span className="font-medium">{trade.from}</span>
                      <ArrowRightLeft size={12} className="text-zinc-500" />
                      <span className="font-medium">{trade.to}</span>
                    </div>
                    <span className="text-xs text-zinc-500">{trade.time}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="px-2 py-1 bg-emerald-500/10 text-emerald-400 rounded-md font-mono">{trade.amount}</span>
                    <span className="text-zinc-400">@ {trade.price}</span>
                  </div>
                </div>
              ))}
            </div>

            <button className="w-full mt-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-medium transition-colors">
              Place Order
            </button>
          </div>

          {/* My Stats */}
          <div className="bg-zinc-900/50 border border-white/5 rounded-2xl p-6 backdrop-blur-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white font-bold">
                JD
              </div>
              <div>
                <div className="font-medium text-white">John Doe</div>
                <div className="text-xs text-zinc-500">Student • Dorm A</div>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-zinc-800/50 rounded-xl text-center">
                <div className="text-2xl font-bold text-white">1,250</div>
                <div className="text-xs text-zinc-500">Points</div>
              </div>
              <div className="p-3 bg-zinc-800/50 rounded-xl text-center">
                <div className="text-2xl font-bold text-white">12</div>
                <div className="text-xs text-zinc-500">Badges</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
