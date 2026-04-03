export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  createdAt: string;
}

export interface Note {
  id: string;
  uid: string;
  title: string;
  content: string;
  verseReference?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MemorizationVerse {
  id: string;
  uid: string;
  reference: string;
  text: string;
  status: 'learning' | 'mastered';
  createdAt: string;
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  isHistory?: boolean;
}
