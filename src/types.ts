// src/types.ts
export interface Note {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  tags: string | null;
  created_at: string;
  updated_at: string;
  isOffline?: boolean;
  localId?: string;
}

export interface User {
  id: string;
  email: string;
}

export interface AuthState {
  user: User | null;
  isLoading: boolean;
  error: string | null;
}

export interface NotesState {
  notes: Note[];
  isLoading: boolean;
  error: string | null;
  searchQuery: string;
  syncStatus: 'idle' | 'syncing' | 'success' | 'error';
}

export interface RootState {
  auth: AuthState;
  notes: NotesState;
}

export type AuthMode = 'login' | 'signup';