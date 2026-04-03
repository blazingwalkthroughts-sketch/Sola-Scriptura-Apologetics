import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth, db } from '../firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';

export type AISourceMode = 'scripture-only' | 'theology' | 'web-search';

interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  preferredTranslation: string;
  isDarkMode: boolean;
  aiSourceMode: AISourceMode;
  customInstructions: string;
  createdAt: string;
  role: string;
}

interface UserContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  isDarkMode: boolean;
  setIsDarkMode: (isDark: boolean) => void;
  preferredTranslation: string;
  setPreferredTranslation: (translation: string) => void;
  aiSourceMode: AISourceMode;
  setAiSourceMode: (mode: AISourceMode) => void;
  customInstructions: string;
  setCustomInstructions: (instructions: string) => void;
}

const UserContext = createContext<UserContextType>({
  user: null,
  profile: null,
  loading: true,
  isDarkMode: false,
  setIsDarkMode: () => {},
  preferredTranslation: 'NIV',
  setPreferredTranslation: () => {},
  aiSourceMode: 'scripture-only',
  setAiSourceMode: () => {},
  customInstructions: '',
  setCustomInstructions: () => {},
});

export const useUser = () => useContext(UserContext);

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDarkMode, setIsDarkModeState] = useState(() => {
    const saved = localStorage.getItem('sola_dark_mode');
    return saved === 'true';
  });
  const [preferredTranslation, setPreferredTranslationState] = useState(() => {
    return localStorage.getItem('sola_preferred_translation') || 'NIV';
  });
  const [aiSourceMode, setAiSourceModeState] = useState<AISourceMode>(() => {
    return (localStorage.getItem('sola_ai_source_mode') as AISourceMode) || 'scripture-only';
  });
  const [customInstructions, setCustomInstructionsState] = useState(() => {
    return localStorage.getItem('sola_custom_instructions') || '';
  });

  const setIsDarkMode = (isDark: boolean) => {
    setIsDarkModeState(isDark);
    localStorage.setItem('sola_dark_mode', String(isDark));
    if (user) {
      const profileRef = doc(db, 'users', user.uid);
      setDoc(profileRef, { isDarkMode: isDark }, { merge: true });
    }
  };

  const setPreferredTranslation = (translation: string) => {
    setPreferredTranslationState(translation);
    localStorage.setItem('sola_preferred_translation', translation);
    if (user) {
      const profileRef = doc(db, 'users', user.uid);
      setDoc(profileRef, { preferredTranslation: translation }, { merge: true });
    }
  };

  const setAiSourceMode = (mode: AISourceMode) => {
    setAiSourceModeState(mode);
    localStorage.setItem('sola_ai_source_mode', mode);
    if (user) {
      const profileRef = doc(db, 'users', user.uid);
      setDoc(profileRef, { aiSourceMode: mode }, { merge: true });
    }
  };

  const setCustomInstructions = (instructions: string) => {
    setCustomInstructionsState(instructions);
    localStorage.setItem('sola_custom_instructions', instructions);
    if (user) {
      const profileRef = doc(db, 'users', user.uid);
      setDoc(profileRef, { customInstructions: instructions }, { merge: true });
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      if (!user) {
        setProfile(null);
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;

    const profileRef = doc(db, 'users', user.uid);
    const unsubscribe = onSnapshot(profileRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data() as UserProfile;
        setProfile(data);
        
        // Sync from cloud to local if they differ
        if (data.isDarkMode !== undefined && data.isDarkMode !== isDarkMode) {
          setIsDarkModeState(data.isDarkMode);
          localStorage.setItem('sola_dark_mode', String(data.isDarkMode));
        }
        if (data.preferredTranslation && data.preferredTranslation !== preferredTranslation) {
          setPreferredTranslationState(data.preferredTranslation);
          localStorage.setItem('sola_preferred_translation', data.preferredTranslation);
        }
        if (data.aiSourceMode && data.aiSourceMode !== aiSourceMode) {
          setAiSourceModeState(data.aiSourceMode);
          localStorage.setItem('sola_ai_source_mode', data.aiSourceMode);
        }
        if (data.customInstructions !== undefined && data.customInstructions !== customInstructions) {
          setCustomInstructionsState(data.customInstructions);
          localStorage.setItem('sola_custom_instructions', data.customInstructions);
        }
      } else {
        const newProfile: UserProfile = {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL,
          preferredTranslation: preferredTranslation,
          isDarkMode: isDarkMode,
          aiSourceMode: aiSourceMode,
          customInstructions: customInstructions,
          createdAt: new Date().toISOString(),
          role: 'user',
        };
        setDoc(profileRef, newProfile);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  return (
    <UserContext.Provider value={{ 
      user, 
      profile, 
      loading, 
      isDarkMode, 
      setIsDarkMode, 
      preferredTranslation, 
      setPreferredTranslation,
      aiSourceMode,
      setAiSourceMode,
      customInstructions,
      setCustomInstructions
    }}>
      {children}
    </UserContext.Provider>
  );
};
