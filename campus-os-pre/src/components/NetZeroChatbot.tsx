import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Send, X, Bot, User, Zap, Droplets, Recycle } from 'lucide-react';
import { cn } from '../lib/utils';

interface Message {
    id: string;
    sender: 'user' | 'bot';
    text: string | React.ReactNode;
}

const STRATEGIES = {
    energy: (
        <div className="space-y-4 text-sm">
            <h3 className="text-emerald-400 font-bold text-base border-b border-emerald-500/20 pb-2">🔴 ENERGY NET ZERO STRATEGY</h3>

            <div>
                <div className="font-semibold text-zinc-200">PHASE 1 — MEASURE (No assumptions. Only data.)</div>
                <ul className="list-disc pl-4 text-zinc-400">
                    <li>Deploy Real-Time Energy Measurement (5 min sampling)</li>
                    <li>Integrate Into Digital Twin (Single Source of Energy Truth)</li>
                </ul>
            </div>

            <div>
                <div className="font-semibold text-zinc-200">PHASE 2 — BASELINE & GAP CALCULATION</div>
                <div className="text-zinc-400 bg-zinc-900/50 p-2 rounded mt-1 border border-white/5">
                    Baseline Consumption = 2.13 million kWh/year<br />
                    Energy Gap = 2.13 million kWh
                </div>
            </div>

            <div>
                <div className="font-semibold text-zinc-200">PHASE 3 — STRATEGY SIMULATION</div>
                <div className="text-zinc-400 space-y-2 mt-1">
                    <p><strong>Demand Reduction:</strong></p>
                    <ul className="list-disc pl-4">
                        <li>HVAC Optimization (-20% load) → Savings: 72k kWh</li>
                        <li>Solar Water Heater (Hostel) → Savings: 210k kWh</li>
                        <li>LED Optimization → Savings: 200k kWh</li>
                    </ul>
                    <p className="text-emerald-400 font-medium">Optimized Demand ≈ 1.65 million kWh</p>

                    <p className="mt-2"><strong>Renewable Integration:</strong></p>
                    <ul className="list-disc pl-4">
                        <li>Add 1.2 MW Solar → 1.74M kWh/year</li>
                    </ul>
                    <div className="bg-emerald-500/10 text-emerald-400 p-2 rounded border border-emerald-500/20 mt-2">
                        ✔ Net Zero Achieved<br />
                        ✔ 92,000 kWh surplus
                    </div>
                </div>
            </div>

            <div>
                <div className="font-semibold text-zinc-200">PHASE 4 & 5 — IMPLEMENTATION & AI OPTIMIZATION</div>
                <p className="text-zinc-400 mt-1">Install physical systems and let AI predict load, detect spikes, and optimize HVAC runtime.</p>
            </div>
        </div>
    ),
    water: (
        <div className="space-y-4 text-sm">
            <h3 className="text-blue-400 font-bold text-base border-b border-blue-500/20 pb-2">🔵 WATER NET ZERO STRATEGY</h3>

            <div>
                <div className="font-semibold text-zinc-200">PHASE 1 — MEASURE</div>
                <ul className="list-disc pl-4 text-zinc-400">
                    <li>Install digital flow meters (Narmada, Borewell)</li>
                    <li>Building-level sub-meters (15 min sampling)</li>
                </ul>
            </div>

            <div>
                <div className="font-semibold text-zinc-200">PHASE 2 — BASELINE</div>
                <div className="text-zinc-400 bg-zinc-900/50 p-2 rounded mt-1 border border-white/5">
                    Total Freshwater Baseline = 72 million litres/year
                </div>
            </div>

            <div>
                <div className="font-semibold text-zinc-200">PHASE 3 — SIMULATION LAYER</div>
                <div className="text-zinc-400 space-y-2 mt-1">
                    <p><strong>Demand Reduction:</strong></p>
                    <ul className="list-disc pl-4">
                        <li>Hostel Efficiency (Low-flow fixtures) → Savings: 9M L/yr</li>
                        <li>Kitchen Optimization → Savings: 1.4M L/yr</li>
                        <li>Leak Detection (-10% loss) → Savings: 6M L/yr</li>
                    </ul>
                    <p className="text-blue-400 font-medium">Optimized Demand: 55 million litres/year</p>

                    <p className="mt-2"><strong>Recycling & Harvesting:</strong></p>
                    <ul className="list-disc pl-4">
                        <li>STP Optimization (80% reuse) → Offsets 40M L/yr</li>
                        <li>Rainwater Harvesting → Offsets 6.6M L/yr</li>
                    </ul>
                    <div className="bg-blue-500/10 text-blue-400 p-2 rounded border border-blue-500/20 mt-2">
                        Remaining Gap = 8.4M litres/year<br />
                        (Close via expanded harvesting or smart irrigation)
                    </div>
                </div>
            </div>
        </div>
    ),
    waste: (
        <div className="space-y-4 text-sm">
            <h3 className="text-amber-400 font-bold text-base border-b border-amber-500/20 pb-2">🟢 WASTE NET ZERO STRATEGY</h3>

            <div>
                <div className="font-semibold text-zinc-200">PHASE 1 — MEASURE</div>
                <ul className="list-disc pl-4 text-zinc-400">
                    <li>Smart Weighing Stations (Load-cells at bins)</li>
                    <li>Segregation tracking (Organic, Dry, Reject)</li>
                </ul>
            </div>

            <div>
                <div className="font-semibold text-zinc-200">PHASE 2 — BASELINE & GAP</div>
                <div className="text-zinc-400 bg-zinc-900/50 p-2 rounded mt-1 border border-white/5">
                    Organic: 250 kg/day | Dry: 100 kg/day<br />
                    Waste Gap (Landfill) = ~10 kg/day Reject Waste (3.6 tons/yr)
                </div>
            </div>

            <div>
                <div className="font-semibold text-zinc-200">PHASE 3 — BIOGAS INTEGRATION</div>
                <div className="text-zinc-400 space-y-2 mt-1">
                    <ul className="list-disc pl-4">
                        <li>250 kg food waste → 10 m³ biogas/day</li>
                        <li>Offsets kitchen LPG / hostel water heating</li>
                        <li>Updates Energy Twin Renewable stats!</li>
                    </ul>
                </div>
            </div>

            <div>
                <div className="font-semibold text-zinc-200">PHASE 4 & 5 — CIRCULARITY</div>
                <ul className="list-disc pl-4 text-zinc-400 mt-1">
                    <li>Slurry Utilization: ~200 kg digestate/day for landscaping</li>
                    <li>Dry Waste: ₹1.5 lakh/year revenue from recycling</li>
                </ul>
                <div className="bg-amber-500/10 text-amber-400 p-2 rounded border border-amber-500/20 mt-2">
                    Target: Reject Waste ≤ 0 (Zero Landfill)
                </div>
            </div>
        </div>
    )
};

interface NetZeroChatbotProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function NetZeroChatbot({ isOpen, onClose }: NetZeroChatbotProps) {
    const [messages, setMessages] = useState<Message[]>([
        {
            id: '1',
            sender: 'bot',
            text: 'Hello! I am your AI Sustainability Advisor. How can I help you achieve Net Zero today? Select a strategy below or type your question.',
        }
    ]);
    const [input, setInput] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isOpen]);

    const handleSend = (text: string = input, type?: 'energy' | 'water' | 'waste') => {
        if (!text.trim() && !type) return;

        const userMessage: Message = {
            id: Date.now().toString(),
            sender: 'user',
            text: type ? `${type.charAt(0).toUpperCase() + type.slice(1)} Strategy` : text
        };

        setMessages(prev => [...prev, userMessage]);
        setInput('');

        // Bot response: show static strategy and optionally fetch AI advice from Hugging Face backend
        const lowerText = text.toLowerCase();
        let botResponseText: React.ReactNode | string = "I can analyze energy, water, or waste configurations. Click the quick actions or ask about them!";
        if (type === 'energy' || lowerText.includes('energy')) {
            botResponseText = STRATEGIES.energy;
        } else if (type === 'water' || lowerText.includes('water')) {
            botResponseText = STRATEGIES.water;
        } else if (type === 'waste' || lowerText.includes('waste')) {
            botResponseText = STRATEGIES.waste;
        }

        const addBotMessage = (extra?: string) => {
            const content = extra ? (
                <div className="space-y-3">
                    <div>{botResponseText}</div>
                    <div className="pt-2 border-t border-white/10 text-sm text-emerald-300/90">
                        <strong>AI advice (Hugging Face):</strong> {extra}
                    </div>
                </div>
            ) : botResponseText;
            const botMessage: Message = {
                id: (Date.now() + 1).toString(),
                sender: 'bot',
                text: content
            };
            setMessages(prev => [...prev, botMessage]);
        };

        const token = localStorage.getItem('token');
        const topic = type === 'energy' ? 'energy' : type === 'water' ? 'water' : type === 'waste' ? 'waste' : (lowerText.includes('water') ? 'water' : lowerText.includes('waste') ? 'waste' : 'energy');

        setTimeout(() => {
            addBotMessage();
            if (token) {
                fetch(`http://localhost:8000/api/ai/advice?topic=${encodeURIComponent(topic)}&context=`, {
                    headers: { Authorization: `Bearer ${token}` },
                })
                    .then(res => res.ok ? res.json() : null)
                    .then(data => {
                        if (data?.advice) {
                            const adviceMsg: Message = {
                                id: (Date.now() + 2).toString(),
                                sender: 'bot',
                                text: <span className="text-emerald-300/90"><strong>AI advice:</strong> {data.advice}</span>
                            };
                            setMessages(prev => [...prev, adviceMsg]);
                        }
                    })
                    .catch(() => {});
            }
        }, 600);
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 z-40 bg-black/40 backdrop-blur-sm"
                    />
                    <motion.div
                        initial={{ x: '100%', opacity: 0.5 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: '100%', opacity: 0.5 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className="absolute right-0 top-0 bottom-0 w-[450px] bg-zinc-950 border-l border-white/10 shadow-2xl z-50 flex flex-col"
                    >
                        {/* Header */}
                        <div className="p-4 border-b border-white/10 flex items-center justify-between bg-zinc-900/50">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                                    <Bot size={18} />
                                </div>
                                <div>
                                    <h2 className="font-semibold text-zinc-100">NetZero Advisor</h2>
                                    <p className="text-xs text-emerald-400 flex items-center gap-1">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Online
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-2 text-zinc-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Messages Area */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-4">
                            {messages.map((msg, i) => (
                                <motion.div
                                    key={msg.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: i === messages.length - 1 ? 0.1 : 0 }}
                                    className={cn(
                                        "flex gap-3 max-w-[85%]",
                                        msg.sender === 'user' ? "ml-auto flex-row-reverse" : ""
                                    )}
                                >
                                    <div className={cn(
                                        "w-8 h-8 shrink-0 rounded-full flex items-center justify-center",
                                        msg.sender === 'bot'
                                            ? "bg-emerald-500/20 text-emerald-400"
                                            : "bg-zinc-800 text-zinc-300"
                                    )}>
                                        {msg.sender === 'bot' ? <Bot size={16} /> : <User size={16} />}
                                    </div>
                                    <div className={cn(
                                        "rounded-2xl px-4 py-3 text-sm",
                                        msg.sender === 'user'
                                            ? "bg-emerald-500 text-zinc-950 rounded-tr-sm"
                                            : "bg-zinc-900 border border-white/5 text-zinc-300 rounded-tl-sm"
                                    )}>
                                        {msg.text}
                                    </div>
                                </motion.div>
                            ))}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Quick Actions & Input */}
                        <div className="p-4 border-t border-white/10 bg-zinc-900/30">
                            <div className="flex gap-2 mb-4 overflow-x-auto pb-2 scrollbar-none">
                                <button
                                    onClick={() => handleSend('energy', 'energy')}
                                    className="flex items-center gap-1.5 whitespace-nowrap px-3 py-1.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors text-xs font-medium"
                                >
                                    <Zap size={14} /> Energy Strategy
                                </button>
                                <button
                                    onClick={() => handleSend('water', 'water')}
                                    className="flex items-center gap-1.5 whitespace-nowrap px-3 py-1.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 hover:bg-blue-500/20 transition-colors text-xs font-medium"
                                >
                                    <Droplets size={14} /> Water Strategy
                                </button>
                                <button
                                    onClick={() => handleSend('waste', 'waste')}
                                    className="flex items-center gap-1.5 whitespace-nowrap px-3 py-1.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/20 transition-colors text-xs font-medium"
                                >
                                    <Recycle size={14} /> Waste Strategy
                                </button>
                            </div>

                            <div className="relative flex items-center">
                                <input
                                    type="text"
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                                    placeholder="Ask about net zero..."
                                    className="w-full bg-zinc-900 border border-white/10 rounded-xl pl-4 pr-12 py-3 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-emerald-500/50 transition-colors"
                                />
                                <button
                                    onClick={() => handleSend()}
                                    disabled={!input.trim()}
                                    className="absolute right-2 p-2 text-zinc-400 hover:text-emerald-400 disabled:opacity-50 disabled:hover:text-zinc-400 transition-colors"
                                >
                                    <Send size={18} />
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
