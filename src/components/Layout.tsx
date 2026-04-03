import React, { useState, useEffect } from 'react';
import { auth, signInWithGoogle, logout, db } from '../firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { useUser } from '../contexts/UserContext';
import { 
  BookOpen, 
  MessageSquare, 
  Brain, 
  FileText, 
  LogOut, 
  LogIn, 
  Menu, 
  X,
  Settings,
  Moon,
  Sun,
  HelpCircle,
  AlertCircle,
  ChevronDown,
  History,
  Plus,
  Trash2,
  LayoutDashboard
} from 'lucide-react';
import { cn } from '../lib/utils';
import { Toaster, toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';
import { deleteDoc, doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { BIBLE_TRANSLATIONS } from '../lib/bible';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  activeChatId?: string | null;
  onChatSelect?: (id: string) => void;
}

interface ChatHistoryItem {
  id: string;
  title: string;
  updatedAt: string;
}

export default function Layout({ 
  children, 
  activeTab, 
  setActiveTab, 
  activeChatId,
  onChatSelect
}: LayoutProps) {
  const { user, profile, loading, isDarkMode, setIsDarkMode, preferredTranslation, setPreferredTranslation } = useUser();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isChatHistoryOpen, setIsChatHistoryOpen] = useState(false);
  const [chats, setChats] = useState<ChatHistoryItem[]>([]);
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);

  useEffect(() => {
    if (isSidebarOpen) {
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
      document.documentElement.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
      document.documentElement.style.overflow = 'unset';
    };
  }, [isSidebarOpen]);

  useEffect(() => {
    if (!user) {
      setChats([]);
      return;
    }

    const q = query(
      collection(db, 'chats'),
      where('uid', '==', user.uid),
      orderBy('updatedAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        title: doc.data().title,
        updatedAt: doc.data().updatedAt
      }));
      
      // Ensure unique IDs to prevent UI doubling glitches
      const uniqueData = data.filter((v, i, a) => a.findIndex(t => t.id === v.id) === i);
      setChats(uniqueData);
    });

    return () => unsubscribe();
  }, [user]);

  const handleDeleteChat = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setConfirmingDeleteId(id);
  };

  const confirmDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'chats', id));
      if (activeChatId === id) {
        onChatSelect?.('');
      }
      toast.success("Conversation deleted");
    } catch (error) {
      console.error("Error deleting chat:", error);
      toast.error("Failed to delete conversation");
    } finally {
      setConfirmingDeleteId(null);
    }
  };

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'apologetics', label: 'Apologetics', icon: MessageSquare },
    { id: 'memorization', label: 'Memorization', icon: Brain },
    { id: 'notes', label: 'Study Notes', icon: FileText },
  ];

  return (
    <div className={cn("min-h-screen font-serif transition-colors duration-300", isDarkMode ? "bg-[#121212] text-white" : "bg-white text-[#1A1A1A]")}>
      <Toaster position="top-right" />
      
      {/* Mobile Header */}
      <header className={cn("lg:hidden flex items-center justify-between p-4 border-b sticky top-0 z-50", isDarkMode ? "bg-[#1A1A1A] border-white/10" : "bg-white border-[#1A1A1A]/10")}>
        <button 
          onClick={() => setActiveTab('home')}
          className="flex items-center gap-2"
        >
          <div className="w-8 h-8 bg-[#112d60] rounded-lg flex items-center justify-center text-white">
            <BookOpen size={18} />
          </div>
          <h1 className="text-xl font-bold tracking-tight">Sola Scriptura</h1>
        </button>
        <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2">
          {isSidebarOpen ? <X /> : <Menu />}
        </button>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside className={cn(
          "fixed inset-y-0 left-0 z-[60] w-72 border-r transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:h-screen lg:z-40 overscroll-behavior-none",
          isDarkMode ? "bg-[#1A1A1A] border-white/5" : "bg-white border-[#1A1A1A]/5",
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}>
          <div className="flex flex-col h-full">
            <div className="p-8 pb-4">
              <button 
                onClick={() => {
                  setActiveTab('home');
                  setIsSidebarOpen(false);
                }}
                className="flex items-center gap-4 text-left"
              >
                <div className="w-12 h-12 bg-[#112d60] rounded-2xl flex items-center justify-center text-white shadow-lg shadow-[#112d60]/20">
                  <BookOpen size={24} />
                </div>
                <div className="flex flex-col">
                  <h1 className="text-xl font-bold tracking-tight leading-none">Sola</h1>
                  <h1 className="text-xl font-bold tracking-tight leading-none">Scriptura</h1>
                </div>
              </button>
            </div>

            <nav className="flex-1 min-h-0 space-y-3 overflow-y-auto custom-scrollbar px-8 py-4 touch-pan-y">
              {navItems.map((item) => (
                <div key={item.id} className="space-y-1">
                  <button
                    onClick={() => {
                      setActiveTab(item.id);
                      setIsSidebarOpen(false);
                    }}
                    className={cn(
                      "w-full flex items-center gap-4 px-5 py-3.5 transition-all duration-300 text-left rounded-2xl group",
                      activeTab === item.id 
                        ? "bg-[#112d60] text-white shadow-xl shadow-[#112d60]/20" 
                        : isDarkMode ? "text-white/60 hover:text-white" : "text-[#1A1A1A]/50 hover:text-[#1A1A1A]"
                    )}
                  >
                    <item.icon className={cn("w-5 h-5 transition-colors", activeTab === item.id ? "text-white" : isDarkMode ? "text-white/40 group-hover:text-white" : "text-[#1A1A1A]/40 group-hover:text-[#1A1A1A]")} />
                    <span className="text-[11px] uppercase tracking-[0.2em] font-bold">{item.label}</span>
                  </button>

                  {/* Chat History Sub-menu */}
                  {item.id === 'notes' && user && (
                    <div className="mt-2 ml-4 space-y-1">
                      <button 
                        onClick={() => setIsChatHistoryOpen(!isChatHistoryOpen)}
                        className={cn(
                          "w-full flex items-center justify-between px-4 py-2 text-[10px] uppercase tracking-widest font-bold transition-colors rounded-xl",
                          isDarkMode ? "text-white/60 hover:text-white" : "text-[#1A1A1A]/40 hover:text-[#1A1A1A]"
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <History size={12} />
                          <span>Chat History</span>
                        </div>
                        <ChevronDown size={12} className={cn("transition-transform", isChatHistoryOpen && "rotate-180")} />
                      </button>
                      
                      <AnimatePresence>
                        {isChatHistoryOpen && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden space-y-1"
                          >
                            <button
                              onClick={() => {
                                onChatSelect?.('');
                                setIsSidebarOpen(false);
                              }}
                              className={cn(
                                "w-full flex items-center gap-2 px-4 py-2 text-[10px] font-bold rounded-xl transition-all",
                                !activeChatId && activeTab === 'apologetics'
                                  ? "bg-[#112d60]/10 text-[#112d60] dark:text-white"
                                  : isDarkMode ? "text-white/40 hover:text-white" : "text-[#1A1A1A]/40 hover:text-[#1A1A1A]"
                              )}
                            >
                              <Plus size={12} />
                              <span>New Conversation</span>
                            </button>
                            {chats.map((chat) => (
                              <div key={chat.id} className="group relative">
                                <button
                                  onClick={() => {
                                    onChatSelect?.(chat.id);
                                    setIsSidebarOpen(false);
                                  }}
                                  className={cn(
                                    "w-full flex items-center gap-2 px-4 py-2 text-[10px] font-medium rounded-xl transition-all text-left truncate pr-8",
                                    activeChatId === chat.id
                                      ? "bg-[#112d60]/10 text-[#112d60] dark:text-white"
                                      : isDarkMode ? "text-white/60 hover:text-white" : "text-[#1A1A1A]/40 hover:text-[#1A1A1A]"
                                  )}
                                >
                                  <span className="truncate">{chat.title}</span>
                                </button>
                                
                                {confirmingDeleteId === chat.id ? (
                                  <div className="absolute inset-0 bg-red-500 rounded-xl flex items-center justify-around px-2 z-10">
                                    <button 
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        confirmDelete(chat.id);
                                      }}
                                      className="text-white text-[8px] font-bold uppercase tracking-tighter hover:scale-110 transition-transform"
                                    >
                                      Confirm
                                    </button>
                                    <button 
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setConfirmingDeleteId(null);
                                      }}
                                      className="text-white/70 text-[8px] font-bold uppercase tracking-tighter hover:text-white transition-colors"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    onClick={(e) => handleDeleteChat(e, chat.id)}
                                    className={cn(
                                      "absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg transition-all hover:bg-red-500/10 text-red-500 lg:opacity-0 lg:group-hover:opacity-100",
                                      activeChatId === chat.id && "lg:opacity-100"
                                    )}
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                )}
                              </div>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )}
                </div>
              ))}
            </nav>

            <div className="mt-auto space-y-4 p-8 pt-6 border-t border-[#1A1A1A]/5">
              {loading ? (
                <div className="space-y-4 px-5 animate-pulse">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-gray-200 dark:bg-white/10" />
                    <div className="space-y-2">
                      <div className="h-3 w-24 bg-gray-200 dark:bg-white/10 rounded" />
                      <div className="h-2 w-32 bg-gray-200 dark:bg-white/10 rounded" />
                    </div>
                  </div>
                </div>
              ) : user ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-3 px-5">
                    <img 
                      src={user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName}`} 
                      alt={user.displayName || 'User'} 
                      className="w-10 h-10 rounded-2xl border border-[#1A1A1A]/10"
                      referrerPolicy="no-referrer"
                    />
                    <div className="overflow-hidden">
                      <p className="text-sm font-bold truncate">{user.displayName}</p>
                      <p className={cn("text-xs truncate", isDarkMode ? "text-white/60" : "text-[#1A1A1A]/40")}>{user.email}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsSettingsOpen(true)}
                    className={cn("w-full flex items-center gap-4 px-5 py-3 text-[11px] uppercase tracking-[0.2em] font-bold transition-all rounded-2xl", isDarkMode ? "text-white/60 hover:text-white" : "text-[#1A1A1A]/40 hover:text-[#1A1A1A]")}
                  >
                    <Settings className="w-4 h-4" />
                    <span>Settings</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <button
                    onClick={signInWithGoogle}
                    className={cn(
                      "w-full flex items-center gap-4 px-5 py-4 border border-dashed rounded-2xl transition-all",
                      isDarkMode 
                        ? "border-white/30 text-white hover:bg-white/5" 
                        : "border-[#112d60]/30 text-[#112d60] hover:bg-[#112d60]/5"
                    )}
                  >
                    <LogIn className="w-5 h-5" />
                    <span className="text-[11px] uppercase tracking-[0.2em] font-bold">Sign In</span>
                  </button>
                  <button 
                    onClick={() => setIsSettingsOpen(true)}
                    className={cn("w-full flex items-center gap-4 px-5 py-4 transition-all", isDarkMode ? "text-white/80 hover:text-white" : "text-[#1A1A1A]/40 hover:text-[#1A1A1A]")}
                  >
                    <Settings className="w-5 h-5" />
                    <span className="text-[11px] uppercase tracking-[0.2em] font-bold">Settings</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className={cn("flex-1 h-screen overflow-y-auto transition-colors duration-300", isDarkMode ? "bg-[#121212]" : "bg-white")}>
          <div className="mx-auto max-w-none h-full">
            {children}
          </div>
        </main>
      </div>

      {/* Settings Modal */}
      <AnimatePresence>
        {isSettingsOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSettingsOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className={cn(
                "relative w-full max-w-lg rounded-[48px] shadow-2xl overflow-hidden border",
                isDarkMode ? "bg-[#1A1A1A] border-white/10 text-white" : "bg-white border-[#1A1A1A]/10 text-[#1A1A1A]"
              )}
            >
              <div className="p-10 flex items-center justify-between border-b border-white/5">
                <h3 className="text-3xl font-serif font-medium">Settings</h3>
                <button 
                  onClick={() => setIsSettingsOpen(false)}
                  className="p-3 hover:bg-white/5 rounded-2xl transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="p-10 space-y-10">
                {/* Theme Toggle */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={cn("p-3 rounded-2xl", isDarkMode ? "bg-white/5" : "bg-[#112d60]/5")}>
                      {isDarkMode ? <Moon className="w-6 h-6" /> : <Sun className="w-6 h-6" />}
                    </div>
                    <div>
                      <p className="font-bold text-sm uppercase tracking-widest">Appearance</p>
                      <p className="text-xs opacity-60 italic font-serif">{isDarkMode ? 'Dark Mode' : 'Light Mode'}</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setIsDarkMode(!isDarkMode)}
                    className={cn(
                      "w-16 h-8 rounded-full relative transition-colors duration-300",
                      isDarkMode ? "bg-[#112d60]" : "bg-[#1A1A1A]/10"
                    )}
                  >
                    <motion.div 
                      animate={{ x: isDarkMode ? 32 : 4 }}
                      className="absolute top-1 w-6 h-6 bg-white rounded-full shadow-lg"
                    />
                  </button>
                </div>

                {/* Bible Translation Preference */}
                {user && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-4">
                      <div className={cn("p-3 rounded-2xl", isDarkMode ? "bg-white/5" : "bg-[#112d60]/5")}>
                        <BookOpen className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="font-bold text-sm uppercase tracking-widest">Bible Translation</p>
                        <p className="text-xs opacity-60 italic font-serif">Preferred version for links</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {BIBLE_TRANSLATIONS.map((translation) => (
                        <button
                          key={translation.id}
                          onClick={() => {
                            setPreferredTranslation(translation.id);
                            toast.success(`Translation set to ${translation.id}`);
                          }}
                          className={cn(
                            "px-4 py-3 rounded-2xl text-[10px] font-bold uppercase tracking-widest transition-all border",
                            preferredTranslation === translation.id
                              ? "bg-[#112d60] text-white border-[#112d60] shadow-lg shadow-[#112d60]/20"
                              : isDarkMode 
                                ? "bg-white/5 border-white/10 text-white/60 hover:text-white hover:bg-white/10" 
                                : "bg-[#112d60]/5 border-[#112d60]/10 text-[#112d60]/60 hover:text-[#112d60] hover:bg-[#112d60]/10"
                          )}
                        >
                          {translation.id}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Account Section */}
                <div className="space-y-4">
                  <p className="text-[10px] font-bold uppercase tracking-[0.3em] opacity-40 ml-4">Account</p>
                  {user ? (
                    <button 
                      onClick={() => {
                        logout();
                        setIsSettingsOpen(false);
                        toast.success("Signed out successfully");
                      }}
                      className="w-full flex items-center gap-4 p-5 rounded-[24px] bg-red-500/5 text-red-500 hover:bg-red-500/10 transition-all text-left"
                    >
                      <LogOut className="w-5 h-5" />
                      <div>
                        <p className="font-bold text-sm uppercase tracking-widest">Sign Out</p>
                        <p className="text-xs opacity-60 italic font-serif">Logged in as {user.email}</p>
                      </div>
                    </button>
                  ) : (
                    <button 
                      onClick={() => {
                        signInWithGoogle();
                        setIsSettingsOpen(false);
                      }}
                      className="w-full flex items-center gap-4 p-5 rounded-[24px] bg-[#112d60]/5 text-[#112d60] hover:bg-[#112d60]/10 transition-all text-left"
                    >
                      <LogIn className="w-5 h-5" />
                      <div>
                        <p className="font-bold text-sm uppercase tracking-widest">Sign In</p>
                        <p className={cn("text-xs opacity-60 italic font-serif", isDarkMode ? "text-white" : "text-[#112d60]")}>Connect with Google</p>
                      </div>
                    </button>
                  )}
                </div>

                {/* Support Section */}
                <div className="space-y-4">
                  <p className="text-[10px] font-bold uppercase tracking-[0.3em] opacity-40 ml-4">Support</p>
                  <div className="grid grid-cols-2 gap-4">
                    <button 
                      onClick={() => toast.info("Help center coming soon")}
                      className={cn("flex flex-col gap-4 p-6 rounded-[32px] transition-all text-left", isDarkMode ? "bg-white/5 hover:bg-white/10" : "bg-[#112d60]/5 hover:bg-[#112d60]/10")}
                    >
                      <HelpCircle className="w-6 h-6 opacity-60" />
                      <span className="font-bold text-[10px] uppercase tracking-widest">Help Center</span>
                    </button>
                    <button 
                      onClick={() => toast.info("Feedback form coming soon")}
                      className={cn("flex flex-col gap-4 p-6 rounded-[32px] transition-all text-left", isDarkMode ? "bg-white/5 hover:bg-white/10" : "bg-[#1A1A1A]/5 hover:bg-[#1A1A1A]/10")}
                    >
                      <AlertCircle className="w-6 h-6 opacity-60" />
                      <span className="font-bold text-[10px] uppercase tracking-widest">Report Issue</span>
                    </button>
                  </div>
                </div>
              </div>

              <div className="p-10 bg-black/5 text-center">
                <p className="text-[10px] opacity-60 uppercase tracking-[0.4em] font-bold">Sola Scriptura v1.0.0</p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Mobile Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[55] lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
    </div>
  );
}
