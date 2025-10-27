import { create } from "zustand";

interface State {
  user: { name: string; role: string } | null;
  metrics: Record<string, number>;
  aiops: Record<string, number>;
  setUser: (user: { name: string; role: string }) => void;
}

export const useStore = create<State>((set) => ({
  user: null,
  metrics: {},
  aiops: {},
  setUser: (user) => set({ user }),
}));
