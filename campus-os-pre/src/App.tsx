import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  LayoutDashboard,
  Box,
  BrainCircuit,
  Users,
  TrendingUp,
  Settings,
  Menu,
  X,
  Bot,
  LogOut,
  Cpu
} from 'lucide-react';
import { cn } from './lib/utils';
import Dashboard from './components/Dashboard';
import DigitalTwin from './components/DigitalTwin';
import AIBrain from './components/AIBrain';
import SocialLayer from './components/SocialLayer';
import Roadmap from './components/Roadmap';
import NetZeroChatbot from './components/NetZeroChatbot';
import HardwareRegistry from './components/HardwareRegistry';
import Login from './components/Login';
import CampusPicker, { type CampusId } from './components/CampusPicker';
import { useAuth, AuthProvider } from './contexts/AuthContext';

const CAMPUS_CHOSEN_KEY = 'paryay_campus_chosen';
const SELECTED_CAMPUS_KEY = 'paryay_selected_campus';

type Tab = 'dashboard' | 'twin' | 'ai' | 'social' | 'roadmap' | 'hardware';

function AppContent() {
  const [activeTab, setActiveTab] = useState<Tab>(() => {
    const saved = sessionStorage.getItem(SELECTED_CAMPUS_KEY);
    return saved ? 'twin' : 'dashboard';
  });
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isChatbotOpen, setIsChatbotOpen] = useState(false);
  const [hasChosenCampus, setHasChosenCampus] = useState(() => !!sessionStorage.getItem(CAMPUS_CHOSEN_KEY));
  const [chosenCampus, setChosenCampus] = useState<CampusId | null>(() => sessionStorage.getItem(SELECTED_CAMPUS_KEY) as CampusId | null);

  const { isAuthenticated, logout, user } = useAuth();

  const handleCampusChoose = (campusId: CampusId) => {
    sessionStorage.setItem(CAMPUS_CHOSEN_KEY, '1');
    sessionStorage.setItem(SELECTED_CAMPUS_KEY, campusId);
    setChosenCampus(campusId);
    setHasChosenCampus(true);
    setActiveTab('twin');
  };

  const tabs = [
    { id: 'dashboard', label: 'Overview', icon: LayoutDashboard },
    { id: 'twin', label: 'Digital Twin', icon: Box },
    { id: 'ai', label: 'AI Brain', icon: BrainCircuit },
    { id: 'social', label: 'Social & P2P', icon: Users },
    { id: 'roadmap', label: 'Impact & Roadmap', icon: TrendingUp },
    { id: 'hardware', label: 'Hardware Registry', icon: Cpu },
  ];

  if (!isAuthenticated) {
    return <Login />;
  }

  if (isAuthenticated && !hasChosenCampus) {
    return <CampusPicker onChoose={handleCampusChoose} />;
  }

  return (
    <div className="flex h-screen bg-zinc-950 text-zinc-100 overflow-hidden font-sans">
      {/* Sidebar */}
      <motion.aside
        initial={false}
        animate={{ width: isSidebarOpen ? 280 : 80 }}
        className="border-r border-white/10 bg-zinc-900/50 backdrop-blur-xl flex flex-col z-20 relative"
      >
        <div className="p-6 flex items-center justify-between">
          <motion.div
            animate={{ opacity: isSidebarOpen ? 1 : 0 }}
            className="font-bold text-xl tracking-tight text-emerald-400 whitespace-nowrap overflow-hidden"
          >
            ParyayOS
          </motion.div>
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2 hover:bg-white/5 rounded-lg transition-colors"
          >
            {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        <nav className="flex-1 px-4 space-y-2 mt-4">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as Tab)}
              className={cn(
                "w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-200 group relative overflow-hidden",
                activeTab === tab.id
                  ? "bg-emerald-500/10 text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.1)] border border-emerald-500/20"
                  : "text-zinc-400 hover:bg-white/5 hover:text-zinc-100"
              )}
            >
              <tab.icon size={24} strokeWidth={1.5} className={cn("shrink-0 transition-colors", activeTab === tab.id ? "text-emerald-400" : "text-zinc-500 group-hover:text-zinc-300")} />
              <motion.span
                animate={{ opacity: isSidebarOpen ? 1 : 0, width: isSidebarOpen ? 'auto' : 0 }}
                className="whitespace-nowrap overflow-hidden font-medium"
              >
                {tab.label}
              </motion.span>
              {activeTab === tab.id && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute inset-0 bg-emerald-400/5 rounded-xl"
                  initial={false}
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                />
              )}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-white/10 space-y-4">
          <button
            onClick={() => setIsChatbotOpen(true)}
            className={cn(
              "w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-200 group relative overflow-hidden bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20",
              !isSidebarOpen && "justify-center px-0"
            )}
          >
            <Bot size={24} strokeWidth={1.5} className="shrink-0" />
            {isSidebarOpen && (
              <span className="whitespace-nowrap font-semibold">NetZero Advisor</span>
            )}
          </button>

          <div className={cn("flex items-center gap-4 px-4 py-3 text-zinc-500 text-sm justify-between group", !isSidebarOpen && "justify-center")}>
            <div className="flex items-center gap-4">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
              {isSidebarOpen && <span className="truncate max-w-[120px]">{user?.username}</span>}
            </div>

            {isSidebarOpen && (
              <button onClick={logout} className="hover:text-red-400 transition-colors p-1" title="Logout">
                <LogOut size={16} />
              </button>
            )}
          </div>
        </div>
      </motion.aside>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden relative bg-zinc-950">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-900/20 via-zinc-950/0 to-zinc-950 pointer-events-none" />

        <div className="h-full overflow-y-auto p-8 relative z-10">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="h-full"
            >
              {activeTab === 'dashboard' && <Dashboard />}
              {activeTab === 'twin' && <DigitalTwin initialModel={chosenCampus || 'campus1'} />}
              {activeTab === 'ai' && <AIBrain />}
              {activeTab === 'social' && <SocialLayer />}
              {activeTab === 'roadmap' && <Roadmap />}
              {activeTab === 'hardware' && <HardwareRegistry />}
            </motion.div>
          </AnimatePresence>
        </div>

        <NetZeroChatbot
          isOpen={isChatbotOpen}
          onClose={() => setIsChatbotOpen(false)}
        />
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
