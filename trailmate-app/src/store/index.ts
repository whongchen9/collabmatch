import { create } from 'zustand';
import type { User, Group } from '@/types';
import { authApi, groupsApi } from '@/api';

interface AppState {
  // Auth
  user: User | null;
  isLoggedIn: boolean;
  loginLoading: boolean;

  // Data
  groups: Group[];

  // Actions
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => void;
  loadUser: () => Promise<void>;
  loadGroups: () => Promise<void>;
  loadAll: () => Promise<void>;
}

export const useStore = create<AppState>((set, get) => ({
  user: null,
  isLoggedIn: !!authApi.getToken(),
  loginLoading: false,
  groups: [],

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
    set({ user: null, isLoggedIn: false, groups: [] });
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

  loadAll: async () => {
    const state = get();
    if (!state.isLoggedIn) return;
    await Promise.all([
      state.loadUser(),
      state.loadGroups(),
    ]);
  },
}));
