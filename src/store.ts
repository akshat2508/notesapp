// src/store.ts
import { configureStore, createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthState, NotesState, User, Note  } from './types';
import { 
  signIn, 
  signUp, 
  signOut, 
  getCurrentUser, 
  createNote, 
  fetchNotes, 
  deleteNote,
  syncOfflineNotes 
} from './supabase';

// Async thunks for auth
export const loginUser = createAsyncThunk(
  'auth/login',
  async ({ email, password }: { email: string; password: string }) => {
    const { data, error } = await signIn(email, password);
    if (error) throw new Error(error.message);
    return data.user;
  }
);

export const registerUser = createAsyncThunk(
  'auth/register',
  async ({ email, password }: { email: string; password: string }) => {
    const { data, error } = await signUp(email, password);
    if (error) throw new Error(error.message);
    return data.user;
  }
);

export const logoutUser = createAsyncThunk('auth/logout', async () => {
  const { error } = await signOut();
  if (error) throw new Error(error.message);
  await AsyncStorage.removeItem('notes');
});

export const checkAuthStatus = createAsyncThunk('auth/checkStatus', async () => {
  const { user, error } = await getCurrentUser();
  if (error) throw new Error(error.message);
  return user;
});

// Async thunks for notes
export const loadNotes = createAsyncThunk('notes/load', async (_, { getState }) => {
  const state = getState() as any;
  const user = state.auth.user;
  
  if (!user) {
    // Load offline notes only
    const stored = await AsyncStorage.getItem('notes');
    return stored ? JSON.parse(stored) : [];
  }
  
  try {
    // Try to fetch from Supabase
    const { data, error } = await fetchNotes();
    if (error) throw new Error(error.message);
    
    // Merge with offline notes
    const stored = await AsyncStorage.getItem('notes');
    const offlineNotes = stored ? JSON.parse(stored) : [];
    const onlineNotes = data || [];
    
    // Filter out offline notes that might have been synced
    const filteredOfflineNotes = offlineNotes.filter((note: Note) => note.isOffline);
    
    return [...onlineNotes, ...filteredOfflineNotes];
  } catch (error) {
    // If online fetch fails, return offline notes
    const stored = await AsyncStorage.getItem('notes');
    return stored ? JSON.parse(stored) : [];
  }
});

export const addNote = createAsyncThunk(
  'notes/add',
  async (noteData: { title: string; description: string; tags: string }, { getState }) => {
    const state = getState() as any;
    const user = state.auth.user;

    const note: Note = {
      id: '',
      user_id: user?.id || 'offline',
      title: noteData.title,
      description: noteData.description,
      tags: noteData.tags,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (user) {
      try {
        const { data, error } = await createNote(note);
        if (error) throw new Error(error.message);
        return data;
      } catch (error) {
        console.log('🟠 Saving offline due to error:');
      }
    }

    // Fallback to offline
    const timestamp = `offline_${Date.now()}`;
    return {
      ...note,
      id: timestamp,
      localId: timestamp,
      isOffline: true,
    };
  }
);


export const removeNote = createAsyncThunk(
  'notes/remove',
  async (noteId: string, { getState }) => {
    const state = getState() as any;
    const note = state.notes.notes.find((n: Note) => n.id === noteId);
    
    if (note && !note.isOffline) {
      try {
        const { error } = await deleteNote(noteId);
        if (error) throw new Error(error.message);
      } catch (error) {
        // If online delete fails, still remove locally
        console.log('Failed to delete online, removing locally');
      }
    }
    
    return noteId;
  }
);


// export const syncNotes = createAsyncThunk('notes/sync', async (_, { getState }) => {
//   const state = getState() as any;
//   const user = state.auth.user;
//   const notes = state.notes.notes;

//   if (!user) throw new Error('User not authenticated');

//   const offlineNotes = notes
//   .filter((note: Note) => note.isOffline)
//   .map((note: Note) => ({
//     ...note,
//     user_id: user.id, // fix user_id before syncing
//   }));

// const syncedNotes = await syncOfflineNotes(offlineNotes);
// const syncedIds = syncedNotes.map((n) => n.localId);

// const unsyncedNotes = notes.filter(
//   (n: Note) => n.isOffline && !syncedIds.includes(n.localId)
// );


//   const { data: onlineNotes, error } = await fetchNotes();
//   if (error) throw new Error();

//   return [...(onlineNotes || []), ...unsyncedNotes];
// });

export const syncNotes = createAsyncThunk('notes/sync', async (_, { getState, rejectWithValue }) => {
  try {
    const state = getState() as any;
    const user = state.auth.user;
    const notes = state.notes.notes;

    if (!user) throw new Error('User not authenticated');

    const offlineNotes = notes
      .filter((note: Note) => note.isOffline)
      .map((note: Note) => ({
        ...note,
        user_id: user.id,
      }));

    const syncedNotes = await syncOfflineNotes(offlineNotes);

    const syncedIds = syncedNotes.map((n) => n.localId);
    const unsyncedNotes = notes.filter(
      (n: Note) => n.isOffline && !syncedIds.includes(n.localId)
    );

    const { data: onlineNotes, error } = await fetchNotes();
    if (error) throw new Error(error.message);

    return [...(onlineNotes || []), ...unsyncedNotes];
  } catch (err: any) {
    // 👇 Prevent red box: return rejected value
    return rejectWithValue(err.message || 'Sync failed');
  }
});



// Auth slice
const authSlice = createSlice({
  name: 'auth',
  initialState: {
    user: null,
    isLoading: false,
    error: null,
  } as AuthState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loginUser.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.isLoading = false;
        // Ensure the user object has all required properties with proper types
        if (action.payload) {
          state.user = {
            ...action.payload,
            email: action.payload.email || '',
          };
        } else {
          state.user = null;
        }
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Login failed';
      })
      .addCase(registerUser.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(registerUser.fulfilled, (state, action) => {
        state.isLoading = false;
        // Ensure the user object has all required properties with proper types
        if (action.payload) {
          state.user = {
            ...action.payload,
            email: action.payload.email || '',
          };
        } else {
          state.user = null;
        }
      })
      .addCase(registerUser.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Registration failed';
      })
      .addCase(logoutUser.fulfilled, (state) => {
        state.user = null;
        state.error = null;
      })
      .addCase(checkAuthStatus.fulfilled, (state, action) => {
        // Ensure the user object has all required properties with proper types
        if (action.payload) {
          state.user = {
            ...action.payload,
            email: action.payload.email || '',
          };
        } else {
          state.user = null;
        }
        state.isLoading = false;
      })
      .addCase(checkAuthStatus.rejected, (state) => {
        state.user = null;
        state.isLoading = false;
      });
  },
});

// Notes slice
const notesSlice = createSlice({
  name: 'notes',
  initialState: {
    notes: [],
    isLoading: false,
    error: null,
    searchQuery: '',
    syncStatus: 'idle',
  } as NotesState,
  reducers: {
    setSearchQuery: (state, action: PayloadAction<string>) => {
      state.searchQuery = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
    setSyncStatus: (state, action: PayloadAction<NotesState['syncStatus']>) => {
      state.syncStatus = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadNotes.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(loadNotes.fulfilled, (state, action) => {
        state.isLoading = false;
        state.notes = action.payload;
        // Save to AsyncStorage
        AsyncStorage.setItem('notes', JSON.stringify(action.payload));
      })
      .addCase(loadNotes.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to load notes';
      })
      .addCase(addNote.fulfilled, (state, action) => {
        state.notes.unshift(action.payload);
        // Save to AsyncStorage
        AsyncStorage.setItem('notes', JSON.stringify(state.notes));
      })
      .addCase(addNote.rejected, (state, action) => {
        state.error = action.error.message || 'Failed to add note';
      })
      .addCase(removeNote.fulfilled, (state, action) => {
        state.notes = state.notes.filter(note => note.id !== action.payload);
        // Save to AsyncStorage
        AsyncStorage.setItem('notes', JSON.stringify(state.notes));
      })
      .addCase(syncNotes.pending, (state) => {
        state.syncStatus = 'syncing';
      })
      .addCase(syncNotes.fulfilled, (state, action) => {
        state.syncStatus = 'success';
        state.notes = action.payload;
        // Save to AsyncStorage
        AsyncStorage.setItem('notes', JSON.stringify(action.payload));
      })
    //   .addCase(syncNotes.rejected, (state, action) => {
    //     state.syncStatus = 'error';
    //     state.error = action.error.message || 'Sync failed';
    //   });
    .addCase(syncNotes.rejected, (state, action) => {
  state.syncStatus = 'error';

  // Show error only if available
  if (action.error && action.error.message) {
    state.error = action.error.message;
  } else {
    state.error = null; // ✅ suppress red box by clearing it
  }
});

  },
});

export const { clearError: clearAuthError } = authSlice.actions;
export const { setSearchQuery, clearError: clearNotesError, setSyncStatus } = notesSlice.actions;

export const store = configureStore({
  reducer: {
    auth: authSlice.reducer,
    notes: notesSlice.reducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;