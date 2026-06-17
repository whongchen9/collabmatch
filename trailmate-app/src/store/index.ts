import { create } from 'zustand';
import type { User, Group, Intent } from '@/types';
import { authApi, groupsApi, intentApi } from '@/api';

interface MatchingState {
  status: 'idle' | 'matching' | 'done';
  prompts: string[];
  intent: Intent | null;
  rawInput: string;
}

interface AppState {
  // Auth
  user: User | null;
  isLoggedIn: boolean;
  loginLoading: boolean;

  // Data
  groups: Group[];
  intents: Intent[];

  // Global matching state
  matching: MatchingState;

  // Actions
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => void;
  loadUser: () => Promise<void>;
  loadGroups: () => Promise<void>;
  loadIntents: () => Promise<void>;
  loadAll: () => Promise<void>;
  setMatching: (state: Partial<MatchingState>) => void;
  resetMatching: () => void;
  showToast: (message: string) => void;
  // Track
  track: { lat: number; lng: number; timestamp: number }[];
  addTrackPoint: (point: { lat: number; lng: number; timestamp: number }) => void;
  clearTrack: () => void;
}

const defaultMatching: MatchingState = {
  status: 'idle',
  prompts: [],
  intent: null,
  rawInput: '',
};

export const useStore = create<AppState>((set, get) => ({
  user: null,
  isLoggedIn: !!authApi.getToken(),
  loginLoading: false,
  groups: [],
  intents: [],
  matching: { ...defaultMatching },
  track: [],

  login: async (email, password) => {
    set({ loginLoading: true });
    try {
      const { token, user } = await authApi.emailLogin(email, password);
      authApi.setToken(token);
      set({ user, isLoggedIn: true, loginLoading: false });
    } catch (e) {
      set({ loginLoading: false });
      throw e;
    }
  },

  register: async (email, password, name) => {
    set({ loginLoading: true });
    try {
      const { token, user } = await authApi.register(email, password, name);
      authApi.setToken(token);
      set({ user, isLoggedIn: true, loginLoading: false });
    } catch (e) {
      set({ loginLoading: false });
      throw e;
    }
  },

  logout: () => {
    authApi.setToken(null);
    localStorage.removeItem('trailmate_guest');
    set({ user: null, isLoggedIn: false, groups: [], intents: [], matching: { ...defaultMatching }, track: [] });
  },

  loadUser: async () => {
    try {
      const { user } = await authApi.getMe();
      set({ user, isLoggedIn: true });
    } catch {
      set({ user: null, isLoggedIn: false });
    }
  },

  loadGroups: async () => {
    try {
      const groups = await groupsApi.list();
      set({ groups });
    } catch (e) {
      console.error('Failed to load groups:', e);
    }
  },

  loadIntents: async () => {
    try {
      const intents = await intentApi.mine();
      set({ intents });
    } catch (e) {
      console.error('Failed to load intents:', e);
    }
  },

  loadAll: async () => {
    const state = get();
    if (!state.isLoggedIn) return;
    await Promise.all([
      state.loadUser(),
      state.loadGroups(),
      state.loadIntents(),
    ]);
  },

  setMatching: (partial) => {
    set({ matching: { ...get().matching, ...partial } });
  },

  resetMatching: () => {
    set({ matching: { ...defaultMatching } });
  },

  showToast: (message: string) => {
    window.dispatchEvent(new CustomEvent('toast', { detail: message }));
  },

  addTrackPoint: (point) => {
    set(state => ({ track: [...state.track, point] }));
  },

  clearTrack: () => {
    set({ track: [] });
  },
}));
