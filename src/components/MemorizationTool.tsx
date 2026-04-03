import React, { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { collection, query, where, onSnapshot, addDoc, deleteDoc, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { MemorizationVerse } from '../types';
import { Plus, Trash2, CheckCircle, Brain, Loader2, Search, Cross } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion } from 'motion/react';
import { toast } from 'sonner';
import { getBibleVerse } from '../services/gemini';

export default function MemorizationTool({ isDarkMode }: { isDarkMode: boolean }) {
  const [verses, setVerses] = useState<MemorizationVerse[]>([]);
  const [newReference, setNewReference] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    if (!auth.currentUser) return;

    const q = query(
      collection(db, 'memorization'),
      where('uid', '==', auth.currentUser.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as MemorizationVerse[];
      setVerses(data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    });

    return () => unsubscribe();
  }, []);

  const handleAddVerse = async () => {
    if (!newReference.trim() || !auth.currentUser) return;

    setIsAdding(true);
    try {
      const text = await getBibleVerse(newReference);
      if (text === "Verse not found." || text === "Error retrieving verse.") {
        toast.error("Could not find that verse. Please check the reference.");
        return;
      }

      await addDoc(collection(db, 'memorization'), {
        uid: auth.currentUser.uid,
        reference: newReference,
        text,
        status: 'learning',
        createdAt: new Date().toISOString()
      });

      setNewReference('');
      toast.success("Verse added to your memory list!");
    } catch (error) {
      console.error("Error adding verse:", error);
      toast.error("Failed to add verse.");
    } finally {
      setIsAdding(false);
    }
  };

  const toggleStatus = async (verse: MemorizationVerse) => {
    try {
      const newStatus = verse.status === 'learning' ? 'mastered' : 'learning';
      await updateDoc(doc(db, 'memorization', verse.id), {
        status: newStatus
      });
      toast.success(`Verse marked as ${newStatus}!`);
    } catch (error) {
      console.error("Error updating status:", error);
      toast.error("Failed to update status.");
    }
  };

  const deleteVerse = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'memorization', id));
      toast.success("Verse removed.");
    } catch (error) {
      console.error("Error deleting verse:", error);
      toast.error("Failed to delete verse.");
    }
  };

  if (!auth.currentUser) {
    return (
      <div className={cn("flex flex-col items-center justify-center h-[60vh] gap-4 transition-colors", isDarkMode ? "text-white/50" : "text-[#1A1A1A]/50")}>
        <Brain className="w-16 h-16 opacity-20" />
        <p className="text-xl font-bold">Please sign in to save verses.</p>
      </div>
    );
  }

  return (
    <div className={cn("min-h-screen flex flex-col p-8 lg:p-12 transition-colors duration-300", isDarkMode ? "bg-[#121212]" : "bg-white")}>
      {/* Header */}
      <div className="mb-12 flex flex-col md:flex-row md:items-center justify-between gap-8">
        <div className="flex items-center gap-4">
          <div className={cn("p-4 rounded-2xl shadow-lg border transition-colors", 
            isDarkMode ? "bg-[#1A1A1A] border-white/10 text-white" : "bg-white border-[#112d60]/5 text-[#112d60]")}>
            <Brain className="w-8 h-8" />
          </div>
          <div>
            <h2 className={cn("text-3xl font-serif font-medium transition-colors", isDarkMode ? "text-white" : "text-[#112d60]")}>Memorization Tool</h2>
            <p className={cn("text-sm italic font-serif transition-colors", isDarkMode ? "text-white/60" : "text-[#1A1A1A]/50")}>"I have hidden your word in my heart..." — Psalm 119:11</p>
          </div>
        </div>

        <div className="flex gap-4 flex-1 max-w-xl">
          <div className="relative flex-1">
            <Search className={cn("absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors", isDarkMode ? "text-white/50" : "text-[#1A1A1A]/30")} />
            <input
              type="text"
              value={newReference}
              onChange={(e) => setNewReference(e.target.value)}
              placeholder="Enter verse reference..."
              className={cn(
                "w-full border rounded-[24px] pl-14 pr-8 py-4 text-base font-serif shadow-xl transition-all outline-none",
                isDarkMode 
                  ? "bg-[#1A1A1A] border-white/10 text-white shadow-black/20 focus:ring-white/5" 
                  : "bg-white border-[#112d60]/10 text-[#1A1A1A] shadow-[#112d60]/5 focus:ring-[#112d60]/5"
              )}
            />
          </div>
          <button
            onClick={handleAddVerse}
            disabled={!newReference.trim() || isAdding}
            className={cn(
              "px-8 py-4 rounded-[24px] transition-all font-bold flex items-center gap-2 shadow-xl disabled:opacity-50",
              isDarkMode 
                ? "bg-white text-black hover:bg-white/90 shadow-white/10" 
                : "bg-[#112d60] text-white hover:bg-[#112d60]/90 shadow-[#112d60]/20"
            )}
          >
            {isAdding ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
            <span className="text-[11px] uppercase tracking-[0.2em] font-bold">Add</span>
          </button>
        </div>
      </div>

      {/* Verses List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pr-4 custom-scrollbar overflow-y-auto flex-1">
        {verses.length === 0 ? (
          <div className={cn(
            "col-span-full text-center py-32 rounded-[48px] border-2 border-dashed transition-colors",
            isDarkMode ? "bg-white/5 border-white/10" : "bg-white/50 border-[#112d60]/10"
          )}>
            <p className={cn("font-serif italic text-xl transition-colors", isDarkMode ? "text-white/40" : "text-[#112d60]/30")}>Your memory list is empty.</p>
          </div>
        ) : (
          verses.map((verse) => (
            <motion.div 
              key={verse.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className={cn(
                "p-8 lg:p-10 rounded-[40px] shadow-xl border flex flex-col justify-between space-y-6 group transition-colors",
                isDarkMode ? "bg-[#1A1A1A] border-white/10 shadow-black/20" : "bg-white border-[#112d60]/5 shadow-[#112d60]/5"
              )}
            >
              <div className="flex justify-between items-start">
                <h3 className={cn("text-2xl font-serif font-medium transition-colors", isDarkMode ? "text-white" : "text-[#112d60]")}>{verse.reference}</h3>
                <div className="flex gap-2">
                  <button
                    onClick={() => toggleStatus(verse)}
                    className={cn(
                      "p-3 rounded-2xl transition-all",
                      verse.status === 'mastered' 
                        ? (isDarkMode ? "bg-white text-black shadow-lg shadow-white/10" : "bg-[#112d60] text-white shadow-lg shadow-[#112d60]/20")
                        : (isDarkMode ? "bg-white/5 text-white hover:bg-white/10" : "bg-[#112d60]/5 text-[#112d60] hover:bg-[#112d60]/10")
                    )}
                  >
                    <CheckCircle className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => deleteVerse(verse.id)}
                    className="p-3 bg-red-500/10 text-red-500 rounded-2xl hover:bg-red-500/20 transition-all"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
              
              <p className={cn("text-lg leading-relaxed italic font-serif transition-colors", isDarkMode ? "text-white/80" : "text-[#1A1A1A]/80")}>
                "{verse.text}"
              </p>
              
              <div className="flex items-center justify-between pt-4">
                <span className={cn(
                  "px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest transition-colors",
                  verse.status === 'mastered' 
                    ? (isDarkMode ? "bg-white/30 text-white" : "bg-[#112d60]/10 text-[#112d60]") 
                    : (isDarkMode ? "bg-white/10 text-white/60" : "bg-[#1A1A1A]/5 text-[#1A1A1A]/40")
                )}>
                  {verse.status}
                </span>
                <span className={cn("text-[10px] font-bold uppercase tracking-widest transition-colors", isDarkMode ? "text-white/40" : "text-[#1A1A1A]/20")}>
                  {new Date(verse.createdAt).toLocaleDateString()}
                </span>
              </div>
            </motion.div>
          ))
        )}
      </div>
      
      <div className="mt-12 flex justify-center">
        <p className={cn("text-[10px] uppercase tracking-[0.3em] font-bold transition-colors", isDarkMode ? "text-white/40" : "text-[#1A1A1A]/20")}>
          Sola Scriptura • Only the Bible
        </p>
      </div>
    </div>
  );
}
