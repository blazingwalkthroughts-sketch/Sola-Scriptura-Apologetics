import React, { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { collection, query, where, onSnapshot, addDoc, deleteDoc, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { Note } from '../types';
import { Plus, Trash2, Edit2, FileText, Loader2, Search, Save, X } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';
import { format } from 'date-fns';
import { useUser } from '../contexts/UserContext';
import { wrapBibleReferences } from '../lib/bible';

import { getBibleVerse } from '../services/gemini';

export default function NotesManager({ 
  isDarkMode, 
  isSidePanel = false,
  initialContent = null,
  onNoteCreated = () => {}
}: { 
  isDarkMode: boolean, 
  isSidePanel?: boolean,
  initialContent?: string | null,
  onNoteCreated?: () => void
}) {
  const { profile, preferredTranslation } = useUser();
  const [notes, setNotes] = useState<Note[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [currentNote, setCurrentNote] = useState<Partial<Note>>({ title: '', content: '', verseReference: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [fetchedVerse, setFetchedVerse] = useState<string | null>(null);
  const [isFetchingVerse, setIsFetchingVerse] = useState(false);

  // Handle initial content
  useEffect(() => {
    if (initialContent) {
      setCurrentNote({ 
        title: 'New Study Note', 
        content: initialContent, 
        verseReference: '' 
      });
      setIsEditing(true);
      onNoteCreated();
    }
  }, [initialContent, onNoteCreated]);

  // Auto-fetch verse when reference changes
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (currentNote.verseReference && currentNote.verseReference.length > 3) {
        setIsFetchingVerse(true);
        try {
          const verse = await getBibleVerse(`${currentNote.verseReference} (${preferredTranslation})`);
          setFetchedVerse(verse);
        } catch (error) {
          console.error("Error fetching verse:", error);
        } finally {
          setIsFetchingVerse(false);
        }
      } else {
        setFetchedVerse(null);
      }
    }, 1000); // 1s debounce

    return () => clearTimeout(timer);
  }, [currentNote.verseReference, preferredTranslation]);

  useEffect(() => {
    if (!auth.currentUser) return;

    const q = query(
      collection(db, 'notes'),
      where('uid', '==', auth.currentUser.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Note[];
      setNotes(data.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()));
    });

    return () => unsubscribe();
  }, []);

  const handleSaveNote = async () => {
    if (!currentNote.title?.trim() || !currentNote.content?.trim() || !auth.currentUser) {
      toast.error("Title and content are required.");
      return;
    }

    setIsLoading(true);
    try {
      const now = new Date().toISOString();
      if (currentNote.id) {
        await updateDoc(doc(db, 'notes', currentNote.id), {
          ...currentNote,
          updatedAt: now
        });
        toast.success("Note updated!");
      } else {
        await addDoc(collection(db, 'notes'), {
          ...currentNote,
          uid: auth.currentUser.uid,
          createdAt: now,
          updatedAt: now
        });
        toast.success("Note created!");
      }
      setIsEditing(false);
      setCurrentNote({ title: '', content: '', verseReference: '' });
    } catch (error) {
      console.error("Error saving note:", error);
      toast.error("Failed to save note.");
    } finally {
      setIsLoading(false);
    }
  };

  const deleteNote = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'notes', id));
      toast.success("Note deleted.");
    } catch (error) {
      console.error("Error deleting note:", error);
      toast.error("Failed to delete note.");
    }
  };

  const filteredNotes = notes.filter(note => 
    note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    note.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
    note.verseReference?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!auth.currentUser) {
    return (
      <div className={cn("flex flex-col items-center justify-center h-[60vh] gap-4 transition-colors", isDarkMode ? "text-white/50" : "text-[#1A1A1A]/50")}>
        <FileText className="w-16 h-16 opacity-20" />
        <p className="text-xl font-bold">Please sign in to manage your notes.</p>
      </div>
    );
  }

  return (
    <div className={cn(
      "flex flex-col transition-colors duration-300 relative", 
      isSidePanel ? "h-full p-6" : "min-h-screen p-8 lg:p-12",
      isDarkMode ? "bg-[#121212]" : "bg-white"
    )}>
      {/* Header & Search */}
      <div className={cn("mb-8 flex flex-col gap-6", isSidePanel ? "" : "md:flex-row md:items-center justify-between")}>
        <div className="flex items-center gap-4">
          <div className={cn("p-3 rounded-2xl shadow-lg border transition-colors", 
            isDarkMode ? "bg-[#1A1A1A] border-white/10 text-white" : "bg-white border-[#112d60]/5 text-[#112d60]")}>
            <FileText className={cn(isSidePanel ? "w-6 h-6" : "w-8 h-8")} />
          </div>
          <div>
            <h2 className={cn("font-serif font-medium transition-colors", isSidePanel ? "text-xl" : "text-3xl", isDarkMode ? "text-white" : "text-[#112d60]")}>Study Notes</h2>
            {!isSidePanel && <p className={cn("text-sm italic font-serif transition-colors", isDarkMode ? "text-white/60" : "text-[#1A1A1A]/50")}>"Write the vision, and make it plain..." — Habakkuk 2:2</p>}
          </div>
        </div>

        <div className={cn("flex items-center gap-3", isSidePanel ? "w-full" : "flex-1 max-w-xl")}>
          <div className="relative flex-1">
            <Search className={cn("absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors", isDarkMode ? "text-white/50" : "text-[#1A1A1A]/30")} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search notes..."
              className={cn(
                "w-full border rounded-[20px] pl-11 pr-6 py-3 text-sm font-serif shadow-lg transition-all outline-none",
                isDarkMode 
                  ? "bg-[#1A1A1A] border-white/10 text-white shadow-black/20 focus:ring-white/5" 
                  : "bg-white border-[#112d60]/10 text-[#1A1A1A] shadow-[#112d60]/5 focus:ring-[#112d60]/5"
              )}
            />
          </div>
          <button
            onClick={() => {
              setCurrentNote({ title: '', content: '', verseReference: '' });
              setFetchedVerse(null);
              setIsEditing(true);
            }}
            className={cn(
              "p-3 rounded-[20px] transition-all shadow-lg",
              isDarkMode 
                ? "bg-white text-black hover:bg-white/90 shadow-white/10" 
                : "bg-[#112d60] text-white hover:bg-[#112d60]/90 shadow-[#112d60]/20"
            )}
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Editor */}
      <AnimatePresence>
        {isEditing && (
          <div className={cn(
            isSidePanel 
              ? "absolute inset-0 z-50 flex flex-col" 
              : "fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4"
          )}>
            <motion.div 
              initial={isSidePanel ? { x: '100%' } : { opacity: 0, scale: 0.95, y: 20 }}
              animate={isSidePanel ? { x: 0 } : { opacity: 1, scale: 1, y: 0 }}
              exit={isSidePanel ? { x: '100%' } : { opacity: 0, scale: 0.95, y: 20 }}
              className={cn(
                "w-full rounded-[48px] shadow-2xl overflow-hidden flex flex-col border transition-colors",
                isSidePanel ? "h-full rounded-none border-none" : "max-w-4xl max-h-[90vh]",
                isDarkMode ? "bg-[#1A1A1A] border-white/10 text-white" : "bg-white border-[#112d60]/10 text-[#1A1A1A]"
              )}
            >
              <div className={cn("p-6 flex items-center justify-between transition-colors", isDarkMode ? "bg-white/5" : "bg-[#112d60] text-white")}>
                <h3 className={cn("font-serif font-medium", isSidePanel ? "text-xl" : "text-3xl")}>{currentNote.id ? 'Edit Note' : 'New Note'}</h3>
                <button onClick={() => setIsEditing(false)} className={cn("p-2 rounded-xl transition-colors", isDarkMode ? "hover:bg-white/5" : "hover:bg-white/10")}>
                  <X size={isSidePanel ? 20 : 24} />
                </button>
              </div>
              
              <div className={cn("p-6 space-y-6 overflow-y-auto custom-scrollbar flex-1", isSidePanel ? "" : "p-10 space-y-8")}>
                <div className="space-y-2">
                  <label className={cn("text-[10px] font-bold uppercase tracking-[0.2em] ml-2 transition-colors", isDarkMode ? "text-white/50" : "text-[#1A1A1A]/30")}>Title</label>
                  <input
                    type="text"
                    value={currentNote.title}
                    onChange={(e) => setCurrentNote(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Note title..."
                    className={cn(
                      "w-full border rounded-[20px] px-6 py-4 font-serif font-medium transition-all outline-none",
                      isSidePanel ? "text-lg" : "text-2xl px-8 py-5 rounded-[24px]",
                      isDarkMode 
                        ? "bg-white/5 border-white/10 text-white focus:ring-white/5" 
                        : "bg-white border-[#112d60]/10 text-[#112d60] focus:ring-[#112d60]/5"
                    )}
                  />
                </div>

                <div className="space-y-2">
                  <label className={cn("text-[10px] font-bold uppercase tracking-[0.2em] ml-2 transition-colors", isDarkMode ? "text-white/50" : "text-[#1A1A1A]/30")}>Verse Reference</label>
                  <input
                    type="text"
                    value={currentNote.verseReference}
                    onChange={(e) => setCurrentNote(prev => ({ ...prev, verseReference: e.target.value }))}
                    placeholder="e.g., John 3:16..."
                    className={cn(
                      "w-full border rounded-[20px] px-6 py-3 text-sm font-serif transition-all outline-none",
                      isSidePanel ? "" : "px-8 py-4 rounded-[24px] text-base",
                      isDarkMode 
                        ? "bg-white/5 border-white/10 text-white focus:ring-white/5" 
                        : "bg-white border-[#112d60]/10 text-[#1A1A1A] focus:ring-[#112d60]/5"
                    )}
                  />
                  
                  {/* Fetched Verse Display */}
                  <AnimatePresence>
                    {(isFetchingVerse || fetchedVerse) && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className={cn(
                          "p-4 rounded-[20px] border italic font-serif text-xs transition-colors overflow-hidden",
                          isSidePanel ? "" : "p-6 rounded-[24px] text-sm",
                          isDarkMode ? "bg-white/5 border-white/10 text-white/80" : "bg-[#112d60]/5 border-[#112d60]/10 text-[#112d60]"
                        )}
                      >
                        {isFetchingVerse ? (
                          <div className="flex items-center gap-2">
                            <Loader2 className="w-3 h-3 animate-spin" />
                            <span>Fetching Scripture...</span>
                          </div>
                        ) : (
                          <p>{fetchedVerse}</p>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div className="space-y-2 flex-1 flex flex-col">
                  <label className={cn("text-[10px] font-bold uppercase tracking-[0.2em] ml-2 transition-colors", isDarkMode ? "text-white/50" : "text-[#1A1A1A]/30")}>Content</label>
                  <textarea
                    value={currentNote.content}
                    onChange={(e) => setCurrentNote(prev => ({ ...prev, content: e.target.value }))}
                    placeholder="Write your thoughts here..."
                    className={cn(
                      "w-full border rounded-[24px] px-6 py-5 text-base font-serif transition-all outline-none resize-none flex-1",
                      isSidePanel ? "min-h-[200px]" : "px-8 py-6 rounded-[32px] text-lg min-h-[400px]",
                      isDarkMode 
                        ? "bg-white/5 border-white/10 text-white focus:ring-white/5" 
                        : "bg-white border-[#112d60]/10 text-[#1A1A1A] focus:ring-[#112d60]/5"
                    )}
                  />
                </div>
              </div>

              <div className={cn("p-6 border-t flex justify-end gap-4 transition-colors", isDarkMode ? "bg-white/5 border-white/5" : "bg-[#F5F2ED]/50 border-[#1A1A1A]/5")}>
                <button
                  onClick={() => setIsEditing(false)}
                  className={cn("px-4 py-2 text-[10px] uppercase tracking-[0.2em] font-bold transition-colors", isDarkMode ? "text-white/60 hover:text-white" : "text-[#1A1A1A]/40 hover:text-[#1A1A1A]")}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveNote}
                  disabled={isLoading}
                  className={cn(
                    "px-6 py-3 rounded-[16px] transition-all font-bold flex items-center gap-2 shadow-xl",
                    isDarkMode 
                      ? "bg-white text-black hover:bg-white/90 shadow-white/10" 
                      : "bg-[#112d60] text-white hover:bg-[#112d60]/90 shadow-[#112d60]/20"
                  )}
                >
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  <span className="text-[10px] uppercase tracking-[0.2em] font-bold">Save</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Notes Grid */}
      <div className={cn(
        "grid gap-8 pr-4 custom-scrollbar overflow-y-auto flex-1",
        isSidePanel ? "grid-cols-1" : "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
      )}>
        {filteredNotes.length === 0 ? (
          <div className={cn(
            "col-span-full text-center py-32 rounded-[48px] border-2 border-dashed transition-colors",
            isDarkMode ? "bg-white/5 border-white/10" : "bg-white/50 border-[#112d60]/10"
          )}>
            <p className={cn("font-serif italic text-xl transition-colors", isDarkMode ? "text-white/40" : "text-[#112d60]/30")}>Your study notes are empty.</p>
          </div>
        ) : (
          filteredNotes.map((note) => (
            <motion.div 
              key={note.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className={cn(
                "p-10 rounded-[40px] shadow-xl border flex flex-col justify-between space-y-6 group hover:shadow-2xl transition-all",
                isDarkMode ? "bg-[#1A1A1A] border-white/10 shadow-black/20" : "bg-white border-[#112d60]/5 shadow-[#112d60]/5"
              )}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1 space-y-2">
                  <h3 className={cn("text-2xl font-serif font-medium leading-tight transition-colors", isDarkMode ? "text-white" : "text-[#112d60]")}>{note.title}</h3>
                  {note.verseReference && (
                    <div className="markdown-body">
                      <ReactMarkdown
                        components={{
                          a: ({ node, ...props }) => (
                            <a 
                              {...props} 
                              target="_blank" 
                              rel="noopener noreferrer" 
                              className={cn("inline-block text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest transition-all", 
                                isDarkMode ? "bg-white/10 text-white hover:bg-white/20" : "bg-[#112d60]/5 text-[#112d60] hover:bg-[#112d60]/10")}
                            />
                          )
                        }}
                      >
                        {wrapBibleReferences(note.verseReference, preferredTranslation)}
                      </ReactMarkdown>
                    </div>
                  )}
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => {
                      setCurrentNote(note);
                      setIsEditing(true);
                    }}
                    className={cn("p-2.5 rounded-xl transition-all", isDarkMode ? "text-white/20 hover:text-white hover:bg-white/5" : "text-[#1A1A1A]/20 hover:text-[#112d60] hover:bg-[#112d60]/5")}
                  >
                    <Edit2 size={18} />
                  </button>
                  <button
                    onClick={() => deleteNote(note.id)}
                    className="p-2.5 text-red-500/20 hover:text-red-500 hover:bg-red-500/5 rounded-xl transition-all"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
              
              <div className={cn("flex-1 text-base line-clamp-4 prose prose-sm prose-stone font-serif italic transition-colors", isDarkMode ? "text-white/80" : "text-[#1A1A1A]/60")}>
                <div className="markdown-body">
                  <ReactMarkdown
                    components={{
                      a: ({ node, ...props }) => (
                        <a 
                          {...props} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className={cn("font-bold underline decoration-2 underline-offset-4 transition-colors", isDarkMode ? "text-white hover:text-white/70" : "text-[#112d60] hover:text-[#112d60]/70")}
                        />
                      )
                    }}
                  >
                    {wrapBibleReferences(note.content, preferredTranslation)}
                  </ReactMarkdown>
                </div>
              </div>

              <div className={cn("pt-6 border-t flex items-center justify-between text-[10px] font-bold uppercase tracking-[0.2em] transition-colors", isDarkMode ? "border-white/10 text-white/40" : "border-[#1A1A1A]/5 text-[#1A1A1A]/20")}>
                <span>{format(new Date(note.updatedAt), 'MMM d, yyyy')}</span>
                <span className="flex items-center gap-2">
                  <FileText size={12} />
                  {note.content.split(' ').length} words
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
