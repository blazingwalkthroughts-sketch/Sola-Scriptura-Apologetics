import React, { useState, useRef, useEffect, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import { getApologeticsResponse, generateChatTitle } from '../services/gemini';
import NotesManager from './NotesManager';
import { ChatMessage } from '../types';
import { Send, BookOpen, Search, Save, Loader2, Info, X as CloseIcon, FileText } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { db, auth } from '../firebase';
import { collection, addDoc, updateDoc, doc, getDoc, serverTimestamp } from 'firebase/firestore';
import { toast } from 'sonner';
import { useUser } from '../contexts/UserContext';
import { wrapBibleReferences, getBibleGatewayLink } from '../lib/bible';

const VerseLink = ({ children, href, isDarkMode, onVerseClick }: { children?: React.ReactNode, href?: string, isDarkMode: boolean, onVerseClick?: (ref: string, link: string, x: number, y: number) => void }) => (
  <a 
    href={href}
    onClick={(e) => {
      e.preventDefault();
      const rect = (e.target as HTMLElement).getBoundingClientRect();
      onVerseClick?.(String(children), href || '', rect.left + rect.width / 2, rect.top - 10);
    }}
    className={cn("font-bold underline decoration-2 underline-offset-4 transition-colors cursor-pointer", isDarkMode ? "text-white hover:text-white/70" : "text-[#112d60] hover:text-[#112d60]/70")}
  >
    {children}
  </a>
);

const TypewriterText = ({ text, isDarkMode, speed = 5, translation = 'NIV', onVerseClick }: { text: string, isDarkMode: boolean, speed?: number, translation?: string, onVerseClick?: (ref: string, link: string, x: number, y: number) => void }) => {
  const [displayedText, setDisplayedText] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (currentIndex < text.length) {
      const timeout = setTimeout(() => {
        setDisplayedText(prev => prev + text[currentIndex]);
        setCurrentIndex(prev => prev + 1);
      }, speed);
      return () => clearTimeout(timeout);
    }
  }, [currentIndex, text, speed]);

  const processedText = wrapBibleReferences(displayedText, translation);

  return (
    <div className={cn("text-lg leading-relaxed font-serif markdown-body", isDarkMode ? "text-white/90" : "text-[#1A1A1A]/80")}>
      <ReactMarkdown
        components={{
          a: ({ node, ...props }) => <VerseLink {...props} isDarkMode={isDarkMode} onVerseClick={onVerseClick} />,
          p: ({ node, ...props }) => <p {...props} className="mb-4 last:mb-0" />
        }}
      >
        {processedText}
      </ReactMarkdown>
    </div>
  );
};

export default function ApologeticsAssistant({ 
  isDarkMode, 
  activeChatId, 
  onChatSaved,
  initialMessage,
  onInitialMessageProcessed
}: { 
  isDarkMode: boolean, 
  activeChatId?: string | null, 
  onChatSaved?: (id: string) => void,
  initialMessage?: string | null,
  onInitialMessageProcessed?: () => void
}) {
  const { profile, preferredTranslation, aiSourceMode, customInstructions } = useUser();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [quotedText, setQuotedText] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showSourceInfo, setShowSourceInfo] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);

  const allSuggestions = [
    "Who wrote the Gospel of John?",
    "The Sermon on the Mount",
    "Who were the Pharisees?",
    "Prophecies about Jesus",
    "Paul's conversion story",
    "Covenants in the Bible",
    "The life of King David",
    "The Creation Story",
    "The Exodus from Egypt",
    "The Parables of Jesus",
    "The Fruit of the Spirit",
    "The Armor of God",
    "The Ten Commandments",
    "The Great Commission",
    "The Beatitudes",
    "The Story of Joseph",
    "The Wisdom of Solomon",
    "The Book of Revelation",
    "The Day of Pentecost",
    "The Miracles of Jesus"
  ];

  useEffect(() => {
    if (messages.length === 0) {
      const shuffled = [...allSuggestions].sort(() => 0.5 - Math.random());
      setSuggestions(shuffled.slice(0, 3));
    }
  }, [messages.length]);

  const isSendingRef = useRef(false);
  const [chatId, setChatId] = useState<string | null>(null);
  const [showNotes, setShowNotes] = useState(false);
  const [initialNoteContent, setInitialNoteContent] = useState<string | null>(null);
  const [displayTitle, setDisplayTitle] = useState("Apologetics Assistant");
  const [targetTitle, setTargetTitle] = useState("Apologetics Assistant");
  const [selectionData, setSelectionData] = useState<{ text: string, x: number, y: number } | null>(null);
  const [verseSelectionData, setVerseSelectionData] = useState<{ reference: string, link: string, x: number, y: number } | null>(null);
  const justSavedChatId = useRef<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Title Animation Logic
  useEffect(() => {
    if (displayTitle === targetTitle) return;

    let timeout: NodeJS.Timeout;

    const animate = async () => {
      // If we need to backspace
      if (displayTitle.length > 0 && !targetTitle.startsWith(displayTitle)) {
        timeout = setTimeout(() => {
          setDisplayTitle(prev => prev.slice(0, -1));
        }, 30);
      } 
      // If we need to type
      else if (displayTitle.length < targetTitle.length) {
        timeout = setTimeout(() => {
          setDisplayTitle(targetTitle.slice(0, displayTitle.length + 1));
        }, 50);
      }
    };

    animate();
    return () => clearTimeout(timeout);
  }, [displayTitle, targetTitle]);

  const handleTextSelection = () => {
    // If we just clicked a verse link, don't show the general selection popup
    if (verseSelectionData) return;

    const selection = window.getSelection();
    if (selection && selection.toString().trim().length > 0) {
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      
      // Only show if selection is within the messages area
      const scrollEl = scrollRef.current;
      if (scrollEl) {
        const scrollRect = scrollEl.getBoundingClientRect();
        if (rect.top >= scrollRect.top && rect.bottom <= scrollRect.bottom) {
          setSelectionData({
            text: selection.toString().trim(),
            x: rect.left + rect.width / 2,
            y: rect.top - 10
          });
          return;
        }
      }
    }
    setSelectionData(null);
  };

  useEffect(() => {
    const handleClickOutside = () => {
      setVerseSelectionData(null);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('mouseup', handleTextSelection);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('mouseup', handleTextSelection);
    };
  }, []);

  const handleAskSola = () => {
    if (selectionData) {
      setQuotedText(selectionData.text);
      setSelectionData(null);
      inputRef.current?.focus();
    }
  };

  const handleAddToNote = () => {
    if (selectionData) {
      setInitialNoteContent(selectionData.text);
      setShowNotes(true);
      setSelectionData(null);
    }
  };

  const handleVerseClick = (ref: string, link: string, x: number, y: number) => {
    setVerseSelectionData({ reference: ref, link, x, y });
    setSelectionData(null);
  };

  const handleGetContext = (reference: string) => {
    const contextPrompt = `Regarding: "${reference}"\n\nPlease provide the historical and cultural context for this verse based on the Bible and widely accepted biblical authorship/history. Who wrote this, what was happening in the biblical narrative at that time, and what is the background that would be useful for a believer to know? Start by quoting the verse, then say "Here is the context for ${reference}:" and then provide the details. Do NOT give a disclaimer about being a Sola Scriptura assistant or having limited knowledge; just provide the biblical context directly.`;
    const displayMsg = `Context for ${reference}`;
    handleSend(contextPrompt, displayMsg);
    setQuotedText(null);
    setVerseSelectionData(null);
  };
  useEffect(() => {
    if (activeChatId) {
      // Only reload if the chat ID is different from what we're currently showing
      // and it's not the one we just saved locally
      if (activeChatId !== chatId && activeChatId !== justSavedChatId.current) {
        setMessages([]); 
        loadChat(activeChatId);
      }
      setChatId(activeChatId);
    } else {
      // If activeChatId is null, it's a new conversation
      if (chatId !== null) {
        setMessages([]);
        setChatId(null);
        setTargetTitle("Apologetics Assistant");
        justSavedChatId.current = null;
      }
    }
  }, [activeChatId]);

  const loadChat = async (id: string) => {
    setIsLoading(true);
    try {
      const docRef = doc(db, 'chats', id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        setMessages(data.messages.map((m: any) => ({
          role: m.role,
          text: m.content,
          isHistory: true
        })));
        setChatId(id);
        setTargetTitle(data.title || "Apologetics Assistant");
      }
    } catch (error) {
      console.error("Error loading chat:", error);
      toast.error("Failed to load chat history.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = useCallback(async (overrideInput?: string, displayMessage?: string) => {
    const messageText = overrideInput || (quotedText ? `Regarding: "${quotedText}"\n\n${input}` : input);
    if (!messageText.trim() || isLoading || isSendingRef.current) return;

    isSendingRef.current = true;
    const userMessage: ChatMessage = { role: 'user', text: displayMessage || messageText };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    if (!overrideInput) {
      setInput('');
      setQuotedText(null);
    }
    setIsLoading(true);

    try {
      const response = await getApologeticsResponse(messageText, messages, preferredTranslation);
      const assistantMessage: ChatMessage = { role: 'model', text: response };
      const updatedMessages = [...newMessages, assistantMessage];
      setMessages(updatedMessages);

      // Save to Firestore if user is logged in
      if (auth.currentUser) {
        if (chatId) {
          // Update existing chat
          await updateDoc(doc(db, 'chats', chatId), {
            messages: updatedMessages.map(m => ({
              role: m.role,
              content: m.text,
              timestamp: new Date().toISOString()
            })),
            updatedAt: new Date().toISOString()
          });
        } else {
          // Create new chat
          const title = await generateChatTitle(messageText);
          setTargetTitle(title);
          const docRef = await addDoc(collection(db, 'chats'), {
            uid: auth.currentUser.uid,
            title: title,
            messages: updatedMessages.map(m => ({
              role: m.role,
              content: m.text,
              timestamp: new Date().toISOString()
            })),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          });
          justSavedChatId.current = docRef.id;
          setChatId(docRef.id);
          onChatSaved?.(docRef.id);
        }
      }
    } catch (error) {
      console.error("Error in handleSend:", error);
      setMessages(prev => [...prev, { role: 'model', text: "I'm sorry, I encountered an error. Please try again." }]);
    } finally {
      setIsLoading(false);
      isSendingRef.current = false;
    }
  }, [input, isLoading, messages, chatId, onChatSaved]);

  useEffect(() => {
    if (initialMessage && !activeChatId && !isLoading && messages.length === 0) {
      handleSend(initialMessage);
      onInitialMessageProcessed?.();
    }
  }, [initialMessage, activeChatId, isLoading, messages.length, handleSend, onInitialMessageProcessed]);

  return (
    <div className="flex h-full overflow-hidden relative">
      <div className={cn(
        "flex-1 flex flex-col p-8 lg:p-12 transition-all duration-500",
        showNotes ? "lg:mr-[450px]" : "",
        isDarkMode ? "bg-[#121212]" : "bg-white"
      )}>
        {/* Ask Sola Popup */}
      <AnimatePresence>
        {selectionData && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 10 }}
            style={{ 
              position: 'fixed', 
              left: selectionData.x, 
              top: selectionData.y,
              transform: 'translateX(-50%) translateY(-100%)',
              zIndex: 100
            }}
            className="flex gap-2"
          >
            <button
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                const link = getBibleGatewayLink(selectionData.text, preferredTranslation);
                window.open(link, '_blank');
                setSelectionData(null);
              }}
              className={cn(
                "px-4 py-2 rounded-full shadow-2xl border flex items-center gap-2 text-xs font-bold uppercase tracking-wider transition-all hover:scale-105 active:scale-95 whitespace-nowrap",
                isDarkMode 
                  ? "bg-white text-black border-white/20" 
                  : "bg-[#112d60] text-white border-[#112d60]/10"
              )}
            >
              <BookOpen size={12} />
              Read the Bible
            </button>
            <button
              onMouseDown={(e) => e.preventDefault()}
              onClick={handleAskSola}
              className={cn(
                "px-4 py-2 rounded-full shadow-2xl border flex items-center gap-2 text-xs font-bold uppercase tracking-wider transition-all hover:scale-105 active:scale-95 whitespace-nowrap",
                isDarkMode 
                  ? "bg-white/10 text-white border-white/20 backdrop-blur-md" 
                  : "bg-white text-[#112d60] border-[#112d60]/10"
              )}
            >
              <Search size={12} />
              Ask Sola
            </button>
            <button
              onMouseDown={(e) => e.preventDefault()}
              onClick={handleAddToNote}
              className={cn(
                "px-4 py-2 rounded-full shadow-2xl border flex items-center gap-2 text-xs font-bold uppercase tracking-wider transition-all hover:scale-105 active:scale-95 whitespace-nowrap",
                isDarkMode 
                  ? "bg-white/10 text-white border-white/20 backdrop-blur-md" 
                  : "bg-white text-[#112d60] border-[#112d60]/10"
              )}
            >
              <FileText size={12} />
              Add to Note
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Verse Action Popup */}
      <AnimatePresence>
        {verseSelectionData && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 10 }}
            style={{ 
              position: 'fixed', 
              left: verseSelectionData.x, 
              top: verseSelectionData.y,
              transform: 'translateX(-50%) translateY(-100%)',
              zIndex: 100
            }}
            className="flex gap-2"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <button
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                window.open(verseSelectionData.link, '_blank');
                setVerseSelectionData(null);
              }}
              className={cn(
                "px-4 py-2 rounded-full shadow-2xl border flex items-center gap-2 text-xs font-bold uppercase tracking-wider transition-all hover:scale-105 active:scale-95 whitespace-nowrap",
                isDarkMode 
                  ? "bg-white text-black border-white/20" 
                  : "bg-[#112d60] text-white border-[#112d60]/10"
              )}
            >
              <BookOpen size={12} />
              Read the Bible
            </button>
            <button
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => handleGetContext(verseSelectionData.reference)}
              className={cn(
                "px-4 py-2 rounded-full shadow-2xl border flex items-center gap-2 text-xs font-bold uppercase tracking-wider transition-all hover:scale-105 active:scale-95 whitespace-nowrap",
                isDarkMode 
                  ? "bg-white/10 text-white border-white/20 backdrop-blur-md" 
                  : "bg-white text-[#112d60] border-[#112d60]/10"
              )}
            >
              <Info size={12} />
              Context
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="mb-12 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className={cn("p-4 rounded-2xl shadow-lg border transition-colors", 
            isDarkMode ? "bg-[#1A1A1A] border-white/10 text-white" : "bg-white border-[#112d60]/5 text-[#112d60]")}>
            <BookOpen className="w-8 h-8" />
          </div>
          <div className="min-h-[4rem] flex flex-col justify-center">
            <h2 className={cn("text-3xl font-serif font-medium transition-colors", isDarkMode ? "text-white" : "text-[#112d60]")}>
              {displayTitle}
            </h2>
            <p className={cn("text-sm italic font-serif transition-colors", isDarkMode ? "text-white/60" : "text-[#1A1A1A]/50")}>"Always be ready to give a defense..." — 1 Peter 3:15</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setShowNotes(!showNotes)}
            className={cn(
              "p-3 rounded-xl transition-all flex items-center gap-2",
              showNotes 
                ? (isDarkMode ? "bg-white text-black" : "bg-[#112d60] text-white")
                : (isDarkMode ? "text-white/40 hover:text-white hover:bg-white/5" : "text-[#1A1A1A]/20 hover:text-[#112d60] hover:bg-[#112d60]/5")
            )}
            title="Study Notes"
          >
            <FileText size={20} />
            <span className="text-xs font-bold uppercase tracking-wider hidden sm:inline">Notes</span>
          </button>

          <div className="relative">
            <button 
              onClick={() => setShowSourceInfo(!showSourceInfo)}
              className={cn(
                "p-3 rounded-xl transition-all hover:bg-white/5",
                isDarkMode ? "text-white/40 hover:text-white" : "text-[#1A1A1A]/20 hover:text-[#112d60]"
              )}
              title="Source Information"
            >
              <Info size={20} />
            </button>

          <AnimatePresence>
            {showSourceInfo && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                className={cn(
                  "absolute right-0 mt-4 w-80 p-6 rounded-3xl shadow-2xl border z-50",
                  isDarkMode ? "bg-[#1A1A1A] border-white/10 text-white" : "bg-white border-[#112d60]/10 text-[#1A1A1A]"
                )}
              >
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-bold uppercase tracking-widest text-xs">Source Transparency</h4>
                  <button onClick={() => setShowSourceInfo(false)} className="opacity-40 hover:opacity-100">
                    <CloseIcon size={14} />
                  </button>
                </div>
                <p className="text-sm font-serif leading-relaxed opacity-80">
                  This assistant is strictly instructed to use the <strong>Holy Bible</strong> as its primary and final authority. 
                  <br /><br />
                  While the underlying AI model (Gemini) has been trained on a vast dataset of human knowledge, its behavior in this app is restricted to <strong>Sola Scriptura</strong>. It will prioritize Scripture references and avoid secular philosophy or outside traditions.
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>

    {/* Messages */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto space-y-12 pr-4 custom-scrollbar"
      >
        {messages.length === 0 && !isLoading ? (
          <div className={cn("h-full flex flex-col items-center justify-center text-center space-y-12 transition-colors", isDarkMode ? "bg-[#121212]" : "bg-white")}>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="max-w-3xl w-full"
            >
              <h1 className={cn("text-6xl lg:text-8xl font-serif font-medium mb-4 tracking-tight", isDarkMode ? "text-white" : "text-[#112d60]")}>
                Sola Scriptura
              </h1>
              <p className={cn("text-lg lg:text-xl font-serif italic opacity-40 mb-12", isDarkMode ? "text-white" : "text-[#1A1A1A]")}>
                "The word of our God will stand forever." — Isaiah 40:8
              </p>

              <div className="relative group max-w-2xl mx-auto mb-8">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  placeholder="Ask a biblical question..."
                  className={cn(
                    "w-full border rounded-[32px] px-10 py-6 text-xl font-serif shadow-2xl transition-all outline-none pr-20",
                    isDarkMode 
                      ? "bg-[#1A1A1A] border-white/10 text-white shadow-black/40 focus:ring-white/5 focus:border-white/20" 
                      : "bg-white border-[#112d60]/10 text-[#1A1A1A] shadow-[#112d60]/10 focus:ring-[#112d60]/5 focus:border-[#112d60]/20"
                  )}
                />
                <button
                  onClick={() => handleSend()}
                  disabled={!input.trim()}
                  className={cn(
                    "absolute right-3 top-1/2 -translate-y-1/2 p-4 rounded-[24px] transition-all disabled:opacity-0",
                    isDarkMode 
                      ? "bg-white text-black hover:bg-white/90" 
                      : "bg-[#112d60] text-white hover:bg-[#112d60]/90"
                  )}
                >
                  <Search size={28} />
                </button>
              </div>

              {/* Dynamic Suggestions */}
              <div className="flex flex-wrap justify-center gap-3 mb-12">
                {suggestions.map((suggestion, idx) => (
                  <motion.button
                    key={suggestion}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.2 + idx * 0.1 }}
                    onClick={() => handleSend(suggestion)}
                    className={cn(
                      "px-6 py-3 rounded-full text-sm font-serif italic transition-all hover:scale-105 active:scale-95 border",
                      isDarkMode
                        ? "bg-white/5 border-white/10 text-white/60 hover:bg-white/10 hover:text-white"
                        : "bg-[#112d60]/5 border-[#112d60]/10 text-[#112d60]/60 hover:bg-[#112d60]/10 hover:text-[#112d60]"
                    )}
                  >
                    {suggestion}
                  </motion.button>
                ))}
              </div>

              <div className="mt-12 flex flex-wrap justify-center gap-6 opacity-30 hover:opacity-60 transition-opacity">
                {['Theology', 'Apologetics', 'Scripture', 'History'].map((tag) => (
                  <span key={tag} className="text-[10px] uppercase tracking-[0.4em] font-bold">
                    {tag}
                  </span>
                ))}
              </div>
            </motion.div>
          </div>
        ) : (
          <>
            <AnimatePresence initial={false}>
            {messages.map((msg, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col space-y-4"
            >
              <div className="flex items-center gap-4">
                <div className={cn("w-2 h-2 rounded-full", 
                  msg.role === 'user' ? (isDarkMode ? "bg-white" : "bg-[#112d60]") : (isDarkMode ? "bg-white/20" : "bg-[#1A1A1A]/10"))} />
                <div className={cn("h-px flex-1", isDarkMode ? "bg-white/10" : "bg-[#1A1A1A]/5")} />
              </div>
              
              {msg.role === 'model' ? (
                msg.isHistory ? (
                  <div className={cn("text-lg leading-relaxed font-serif markdown-body", isDarkMode ? "text-white/90" : "text-[#1A1A1A]/80")}>
                    <ReactMarkdown
                      components={{
                        a: ({ node, ...props }) => <VerseLink {...props} isDarkMode={isDarkMode} onVerseClick={handleVerseClick} />,
                        p: ({ node, ...props }) => <p {...props} className="mb-4 last:mb-0" />
                      }}
                    >
                      {wrapBibleReferences(msg.text, preferredTranslation)}
                    </ReactMarkdown>
                  </div>
                ) : (
                  <TypewriterText text={msg.text} isDarkMode={isDarkMode} translation={preferredTranslation} onVerseClick={handleVerseClick} />
                )
              ) : (
                <div className={cn("text-lg leading-relaxed font-serif font-medium", isDarkMode ? "text-white" : "text-[#112d60]")}>
                  <ReactMarkdown
                    components={{
                      a: ({ node, ...props }) => <VerseLink {...props} isDarkMode={isDarkMode} onVerseClick={handleVerseClick} />,
                      p: ({ node, ...props }) => <p {...props} className="mb-4 last:mb-0" />
                    }}
                  >
                    {wrapBibleReferences(msg.text, preferredTranslation)}
                  </ReactMarkdown>
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
        {isLoading && (
          <div className="flex flex-col space-y-4 animate-pulse">
            <div className="flex items-center gap-4">
              <div className={cn("w-2 h-2 rounded-full", isDarkMode ? "bg-white/20" : "bg-[#1A1A1A]/10")} />
              <div className={cn("h-px flex-1", isDarkMode ? "bg-white/10" : "bg-[#1A1A1A]/5")} />
            </div>
            <div className={cn("h-4 w-3/4 rounded-full", isDarkMode ? "bg-white/10" : "bg-[#1A1A1A]/5")} />
            <div className={cn("h-4 w-1/2 rounded-full", isDarkMode ? "bg-white/10" : "bg-[#1A1A1A]/5")} />
          </div>
        )}
          </>
        )}
      </div>

      {/* Input */}
      {messages.length > 0 && (
        <div className="mt-8">
          <AnimatePresence>
            {quotedText && (
              <motion.div
                initial={{ opacity: 0, y: 10, height: 0 }}
                animate={{ opacity: 1, y: 0, height: 'auto' }}
                exit={{ opacity: 0, y: 10, height: 0 }}
                className="mb-4"
              >
                <div className={cn(
                  "relative p-4 rounded-2xl border flex items-start gap-3 group",
                  isDarkMode 
                    ? "bg-white/5 border-white/10 text-white/80" 
                    : "bg-[#112d60]/5 border-[#112d60]/10 text-[#112d60]/80"
                )}>
                  <div className={cn("w-1 h-full absolute left-0 top-0 rounded-l-2xl", isDarkMode ? "bg-white/20" : "bg-[#112d60]/20")} />
                  <div className="flex-1 text-sm italic font-serif line-clamp-2">
                    "{quotedText}"
                  </div>
                  <button 
                    onClick={() => setQuotedText(null)}
                    className="p-1 hover:bg-white/10 rounded-lg transition-colors"
                  >
                    <CloseIcon size={14} />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="relative flex items-center gap-4">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Ask for a verse or topic..."
              className={cn(
                "flex-1 border rounded-[24px] px-8 py-5 text-base font-serif shadow-xl transition-all outline-none",
                isDarkMode 
                  ? "bg-[#1A1A1A] border-white/10 text-white shadow-black/20 focus:ring-white/5" 
                  : "bg-white border-[#112d60]/10 text-[#1A1A1A] shadow-[#112d60]/5 focus:ring-[#112d60]/5"
              )}
            />
            <button
              onClick={() => handleSend()}
              disabled={!input.trim() || isLoading}
              className={cn(
                "p-5 rounded-[24px] transition-all shadow-xl disabled:opacity-50 disabled:cursor-not-allowed",
                isDarkMode 
                  ? "bg-white text-black hover:bg-white/90 shadow-white/10" 
                  : "bg-[#112d60] text-white hover:bg-[#112d60]/90 shadow-[#112d60]/20"
              )}
            >
              {isLoading ? <Loader2 className="animate-spin" size={24} /> : <Send size={24} />}
            </button>
          </div>
          <p className={cn("text-[10px] text-center mt-6 uppercase tracking-[0.3em] font-bold transition-colors", isDarkMode ? "text-white/40" : "text-[#1A1A1A]/20")}>
            Sola Scriptura • Only the Bible
          </p>
        </div>
      )}

      {/* Notes Side Panel */}
      <AnimatePresence>
        {showNotes && (
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className={cn(
              "fixed right-0 top-0 bottom-0 w-full lg:w-[450px] z-40 border-l shadow-2xl overflow-hidden",
              isDarkMode ? "bg-[#121212] border-white/10" : "bg-white border-[#112d60]/10"
            )}
          >
            <div className="h-full flex flex-col">
              <div className={cn("p-6 border-b flex items-center justify-between", isDarkMode ? "border-white/10" : "border-[#112d60]/10")}>
                <div className="flex items-center gap-3">
                  <FileText className={cn("w-5 h-5", isDarkMode ? "text-white" : "text-[#112d60]")} />
                  <span className={cn("font-serif font-bold", isDarkMode ? "text-white" : "text-[#112d60]")}>Study Notes</span>
                </div>
                <button 
                  onClick={() => setShowNotes(false)}
                  className={cn("p-2 rounded-lg transition-colors", isDarkMode ? "hover:bg-white/5 text-white/40" : "hover:bg-[#112d60]/5 text-[#1A1A1A]/40")}
                >
                  <CloseIcon size={20} />
                </button>
              </div>
              <div className="flex-1 overflow-hidden">
                <NotesManager 
                  isDarkMode={isDarkMode} 
                  isSidePanel={true} 
                  initialContent={initialNoteContent}
                  onNoteCreated={() => setInitialNoteContent(null)}
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  </div>
  );
}
