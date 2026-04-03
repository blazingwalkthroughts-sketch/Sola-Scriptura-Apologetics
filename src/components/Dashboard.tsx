import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BookOpen, 
  HelpCircle, 
  Zap, 
  Info, 
  ArrowRight, 
  CheckCircle2, 
  Sparkles,
  MessageSquare,
  Brain,
  FileText,
  Quote
} from 'lucide-react';
import { cn } from '../lib/utils';

interface DashboardProps {
  isDarkMode: boolean;
  onNavigate: (tab: string) => void;
}

export default function Dashboard({ isDarkMode, onNavigate }: DashboardProps) {
  const [activeDashboardTab, setActiveDashboardTab] = React.useState<'how-to-use' | 'whats-new' | 'about'>('how-to-use');

  const verseOfTheDay = {
    text: "For the word of God is living and active, sharper than any two-edged sword, piercing to the division of soul and of spirit, of joints and of marrow, and discerning the thoughts and intentions of the heart.",
    reference: "Hebrews 4:12",
    version: "ESV"
  };

  const howToUse = [
    {
      title: "Ask the Assistant",
      description: "Use the Apologetics tab to ask complex biblical questions and get scriptural answers.",
      icon: MessageSquare,
      tab: "apologetics"
    },
    {
      title: "Memorize Scripture",
      description: "Practice your favorite verses with our interactive memorization tool.",
      icon: Brain,
      tab: "memorization"
    },
    {
      title: "Take Study Notes",
      description: "Keep track of your research and insights with our integrated notes manager.",
      icon: FileText,
      tab: "notes"
    }
  ];

  const whatsNew = [
    {
      date: "March 2026",
      title: "Dynamic Topic Suggestions",
      description: "Added biblical topic bubbles on the home page for quick research starts.",
      type: "Feature"
    },
    {
      date: "March 2026",
      title: "Enhanced Note Editing",
      description: "Edit your study notes directly in the side panel while chatting with the AI.",
      type: "Feature"
    },
    {
      date: "February 2026",
      title: "Sola Scriptura Hardware v2",
      description: "Optimized processing power for faster AI responses and improved reliability.",
      type: "Hardware"
    }
  ];

  const dashboardTabs = [
    { id: 'how-to-use', label: 'How to Use', icon: HelpCircle },
    { id: 'whats-new', label: "What's New", icon: Zap },
    { id: 'about', label: 'About', icon: Info },
  ] as const;

  return (
    <div className={cn(
      "flex-1 overflow-y-auto p-8 lg:p-12 transition-colors duration-300 custom-scrollbar",
      isDarkMode ? "bg-[#121212]" : "bg-white"
    )}>
      <div className="max-w-6xl mx-auto space-y-12">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row md:items-end justify-between gap-6"
        >
          <div>
            <h1 className={cn(
              "text-4xl lg:text-5xl font-serif font-medium mb-2 tracking-tight",
              isDarkMode ? "text-white" : "text-[#112d60]"
            )}>
              Dashboard
            </h1>
            <p className={cn(
              "text-lg font-serif italic opacity-60",
              isDarkMode ? "text-white" : "text-[#1A1A1A]"
            )}>
              Welcome back to your biblical study companion.
            </p>
          </div>
          <div className={cn(
            "px-4 py-2 rounded-full border text-[10px] uppercase tracking-[0.2em] font-bold",
            isDarkMode ? "border-white/10 text-white/40" : "border-[#112d60]/10 text-[#112d60]/40"
          )}>
            Friday, March 27, 2026
          </div>
        </motion.div>

        {/* Verse of the Day */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className={cn(
            "relative overflow-hidden rounded-[32px] p-8 lg:p-12 border shadow-2xl",
            isDarkMode 
              ? "bg-[#1A1A1A] border-white/10 shadow-black/40" 
              : "bg-white border-[#112d60]/5 shadow-[#112d60]/5"
          )}
        >
          <div className="absolute top-0 right-0 p-8 opacity-5">
            <Quote size={120} />
          </div>
          <div className="relative z-10 max-w-3xl">
            <div className="flex items-center gap-3 mb-6">
              <Sparkles className="text-amber-500" size={20} />
              <span className={cn(
                "text-[10px] uppercase tracking-[0.3em] font-bold",
                isDarkMode ? "text-white/40" : "text-[#112d60]/40"
              )}>
                Verse of the Day
              </span>
            </div>
            <h2 className={cn(
              "text-2xl lg:text-3xl font-serif leading-relaxed mb-6 italic",
              isDarkMode ? "text-white/90" : "text-[#112d60]"
            )}>
              "{verseOfTheDay.text}"
            </h2>
            <div className="flex items-center gap-4">
              <span className={cn(
                "font-serif font-bold text-lg",
                isDarkMode ? "text-white" : "text-[#112d60]"
              )}>
                {verseOfTheDay.reference}
              </span>
              <span className={cn(
                "text-xs px-2 py-1 rounded border",
                isDarkMode ? "border-white/10 text-white/40" : "border-[#112d60]/10 text-[#112d60]/40"
              )}>
                {verseOfTheDay.version}
              </span>
            </div>
          </div>
        </motion.div>

        {/* Dashboard Tabs */}
        <div className="space-y-8">
          <div className="flex flex-wrap items-center gap-4 border-b border-white/10 pb-4">
            {dashboardTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveDashboardTab(tab.id)}
                className={cn(
                  "flex items-center gap-2 px-6 py-3 rounded-2xl text-[11px] uppercase tracking-[0.2em] font-bold transition-all",
                  activeDashboardTab === tab.id
                    ? (isDarkMode ? "bg-white text-black" : "bg-[#112d60] text-white")
                    : (isDarkMode ? "text-white/40 hover:text-white" : "text-[#112d60]/40 hover:text-[#112d60]")
                )}
              >
                <tab.icon size={14} />
                {tab.label}
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={activeDashboardTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {activeDashboardTab === 'how-to-use' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {howToUse.map((item, idx) => (
                    <motion.button
                      key={item.title}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.1 }}
                      onClick={() => onNavigate(item.tab)}
                      className={cn(
                        "p-6 rounded-3xl border text-left transition-all hover:scale-[1.02] group",
                        isDarkMode 
                          ? "bg-white/5 border-white/10 hover:bg-white/10" 
                          : "bg-[#112d60]/5 border-[#112d60]/5 hover:bg-[#112d60]/10"
                      )}
                    >
                      <div className={cn(
                        "w-12 h-12 rounded-2xl flex items-center justify-center mb-4 transition-colors",
                        isDarkMode ? "bg-white/10 text-white" : "bg-[#112d60]/10 text-[#112d60]"
                      )}>
                        <item.icon size={24} />
                      </div>
                      <h4 className={cn(
                        "font-serif font-bold text-lg mb-2",
                        isDarkMode ? "text-white" : "text-[#112d60]"
                      )}>
                        {item.title}
                      </h4>
                      <p className={cn(
                        "text-sm opacity-60 mb-4 line-clamp-3",
                        isDarkMode ? "text-white" : "text-[#1A1A1A]"
                      )}>
                        {item.description}
                      </p>
                      <div className={cn(
                        "flex items-center gap-2 text-[10px] uppercase tracking-widest font-bold opacity-0 group-hover:opacity-100 transition-all transform translate-x-[-10px] group-hover:translate-x-0",
                        isDarkMode ? "text-white" : "text-[#112d60]"
                      )}>
                        Get Started <ArrowRight size={12} />
                      </div>
                    </motion.button>
                  ))}
                </div>
              )}

              {activeDashboardTab === 'whats-new' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {whatsNew.map((update, idx) => (
                    <motion.div
                      key={update.title}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.1 }}
                      className={cn(
                        "p-6 rounded-3xl border",
                        isDarkMode ? "bg-white/5 border-white/10" : "bg-white border-[#112d60]/10 shadow-sm"
                      )}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <span className={cn(
                          "text-[9px] uppercase tracking-widest font-bold px-2 py-1 rounded",
                          update.type === 'Hardware' 
                            ? (isDarkMode ? "bg-amber-500/20 text-amber-500" : "bg-amber-100 text-amber-600")
                            : (isDarkMode ? "bg-blue-500/20 text-blue-500" : "bg-blue-100 text-blue-600")
                        )}>
                          {update.type}
                        </span>
                        <span className={cn(
                          "text-[9px] uppercase tracking-widest font-bold opacity-40",
                          isDarkMode ? "text-white" : "text-[#1A1A1A]"
                        )}>
                          {update.date}
                        </span>
                      </div>
                      <h5 className={cn(
                        "font-serif font-bold mb-2",
                        isDarkMode ? "text-white" : "text-[#112d60]"
                      )}>
                        {update.title}
                      </h5>
                      <p className={cn(
                        "text-xs opacity-60 leading-relaxed",
                        isDarkMode ? "text-white" : "text-[#1A1A1A]"
                      )}>
                        {update.description}
                      </p>
                    </motion.div>
                  ))}
                </div>
              )}

              {activeDashboardTab === 'about' && (
                <div className="max-w-3xl">
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className={cn(
                      "p-8 lg:p-12 rounded-[32px] border",
                      isDarkMode 
                        ? "bg-gradient-to-br from-white/5 to-transparent border-white/10" 
                        : "bg-gradient-to-br from-[#112d60]/5 to-transparent border-[#112d60]/5"
                    )}
                  >
                    <div className="flex items-center gap-3 mb-8">
                      <div className={cn(
                        "w-12 h-12 rounded-2xl flex items-center justify-center",
                        isDarkMode ? "bg-white/10 text-white" : "bg-[#112d60]/10 text-[#112d60]"
                      )}>
                        <Info size={24} />
                      </div>
                      <h4 className={cn(
                        "text-[11px] uppercase tracking-[0.3em] font-bold",
                        isDarkMode ? "text-white/40" : "text-[#112d60]/40"
                      )}>
                        The Mission of Sola Scriptura
                      </h4>
                    </div>
                    <div className="space-y-6">
                      <p className={cn(
                        "text-xl font-serif italic leading-relaxed opacity-80",
                        isDarkMode ? "text-white" : "text-[#112d60]"
                      )}>
                        "All Scripture is breathed out by God and profitable for teaching, for reproof, for correction, and for training in righteousness, that the man of God may be complete, equipped for every good work." — 2 Timothy 3:16-17
                      </p>
                      <p className={cn(
                        "text-lg font-serif leading-relaxed opacity-60",
                        isDarkMode ? "text-white" : "text-[#1A1A1A]"
                      )}>
                        Sola Scriptura is an advanced biblical research and study platform designed to help believers dive deeper into the Word of God. Our mission is to provide accurate, scripturally-grounded insights through cutting-edge technology, always pointing back to the ultimate authority of the Bible.
                      </p>
                      <p className={cn(
                        "text-lg font-serif leading-relaxed opacity-60",
                        isDarkMode ? "text-white" : "text-[#1A1A1A]"
                      )}>
                        Whether you are a pastor, a student of theology, or someone seeking to understand the scriptures better, Sola Scriptura provides the tools you need to explore the historical, linguistic, and theological context of the Bible.
                      </p>
                    </div>
                  </motion.div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
