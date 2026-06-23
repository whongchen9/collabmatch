import { create } from 'zustand';
import type { User, Group, Intent, Signal, BlockedUser } from '@/types';
import { authApi, groupsApi, intentApi, usersApi } from '@/api';

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
  isGuest: boolean;
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

  // Signals
  signals: Signal[];
  myActiveSignal: Signal | null;
  signalRange: number;
  setSignals: (signals: Signal[]) => void;
  addSignal: (signal: Signal) => void;
  setMyActiveSignal: (signal: Signal | null) => void;
  clearExpiredSignals: () => void;

  // Blocked users
  blockedUsers: BlockedUser[];
  blockUser: (userId: string, userName: string, avatarColor?: string) => void;
  unblockUser: (userId: string) => void;
  isBlocked: (userId: string) => boolean;
}

const defaultMatching: MatchingState = {
  status: 'idle',
  prompts: [],
  intent: null,
  rawInput: '',
};

/** 认证流程公共逻辑：设置 loading、调用认证 API、保存 token、更新状态 */
async function authenticate(
  set: (partial: Partial<AppState>) => void,
  authCall: () => Promise<{ token: string; user: User }>
): Promise<void> {
  set({ loginLoading: true });
  try {
    const { token, user } = await authCall();
    authApi.setToken(token);
    set({ user, isLoggedIn: true, loginLoading: false });
  } catch (e) {
    set({ loginLoading: false });
    throw e;
  }
}

export const useStore = create<AppState>((set, get) => ({
  user: null,
  isLoggedIn: !!authApi.getToken(),
  isGuest: !!localStorage.getItem('trailmate_guest'),
  loginLoading: false,
  groups: [],
  intents: [],
  matching: { ...defaultMatching },
  track: [],
  signals: [],
  myActiveSignal: null,
  signalRange: 5,
  blockedUsers: usersApi.getBlockedUsers(),

  login: async (email, password) => {
    await authenticate(set, () => authApi.emailLogin(email, password));
    localStorage.removeItem('trailmate_guest');
    set({ isGuest: false });
  },

  register: async (email, password, name) => {
    await authenticate(set, () => authApi.register(email, password, name));
    localStorage.removeItem('trailmate_guest');
    set({ isGuest: false });
  },

  logout: () => {
    authApi.setToken(null);
    localStorage.removeItem('trailmate_guest');
    set({ user: null, isLoggedIn: false, isGuest: false, groups: [], intents: [], matching: { ...defaultMatching }, track: [] });
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

  setSignals: (signals) => set({ signals }),
  addSignal: (signal) => set((s) => ({ signals: [...s.signals.filter(x => x.userId !== signal.userId), signal] })),
  setMyActiveSignal: (signal) => set({ myActiveSignal: signal }),
  clearExpiredSignals: () => set((s) => ({
    signals: s.signals.filter(x => x.expiresAt > Date.now()),
    myActiveSignal: s.myActiveSignal && s.myActiveSignal.expiresAt > Date.now() ? s.myActiveSignal : null
  })),

  blockUser: (userId, userName, avatarColor) => {
    const list = usersApi.blockUser(userId, userName, avatarColor);
    set({ blockedUsers: list });
  },
  unblockUser: (userId) => {
    const list = usersApi.unblockUser(userId);
    set({ blockedUsers: list });
  },
  isBlocked: (userId) => get().blockedUsers.some(u => u.userId === userId),
}));
