import React, { useState, useEffect } from 'react';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import ApologeticsAssistant from './components/ApologeticsAssistant';
import MemorizationTool from './components/MemorizationTool';
import NotesManager from './components/NotesManager';
import { useUser } from './contexts/UserContext';

export default function App() {
  const { isDarkMode, setIsDarkMode } = useUser();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [initialMessage, setInitialMessage] = useState<string | null>(null);

  useEffect(() => {
    if (activeChatId) {
      localStorage.setItem('sola_active_chat_id', activeChatId);
    } else {
      localStorage.removeItem('sola_active_chat_id');
    }
  }, [activeChatId]);

  const handleNavigate = (tab: string, message?: string) => {
    if (message) {
      setInitialMessage(message);
      setActiveChatId(null);
    } else if (tab === 'apologetics') {
      setActiveChatId(null);
      setInitialMessage(null);
    }
    setActiveTab(tab);
  };

  const handleChatSelect = (id: string) => {
    setActiveChatId(id);
    setInitialMessage(null);
    setActiveTab('apologetics');
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard isDarkMode={isDarkMode} onNavigate={handleNavigate} />;
      case 'apologetics':
        return (
          <ApologeticsAssistant 
            isDarkMode={isDarkMode} 
            activeChatId={activeChatId} 
            onChatSaved={setActiveChatId}
            initialMessage={initialMessage}
            onInitialMessageProcessed={() => setInitialMessage(null)}
          />
        );
      case 'memorization':
        return <MemorizationTool isDarkMode={isDarkMode} />;
      case 'notes':
        return <NotesManager isDarkMode={isDarkMode} />;
      default:
        return <Dashboard isDarkMode={isDarkMode} onNavigate={handleNavigate} />;
    }
  };

  return (
    <Layout 
      activeTab={activeTab} 
      setActiveTab={handleNavigate} 
      activeChatId={activeChatId}
      onChatSelect={handleChatSelect}
    >
      {renderContent()}
    </Layout>
  );
}
