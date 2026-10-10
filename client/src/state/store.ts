// Tiny on-device store for things the user adds in-session (scans, check-ins). Persisted to localStorage only.
import { useSyncExternalStore } from "react";
import type { Strip, Drsp } from "../data/synth";

export type ScanRecord = Strip & { cycle: number; day: number; ts: string };
export type CheckInRecord = Omit<Drsp, "depressed"> & { cycle: number; day: number; ts: string };
export type Settings = { contribute: boolean; contraception: boolean; noWearable: boolean };

type State = { scans: ScanRecord[]; checkins: CheckInRecord[]; settings: Settings };

const KEY = "awarelle.state";
const initial: State = { scans: [], checkins: [], settings: { contribute: false, contraception: false, noWearable: false } };

function load(): State {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...initial, ...JSON.parse(raw) } : initial;
  } catch {
    return initial;
  }
}

let state: State = load();
const listeners = new Set<() => void>();

function set(next: State) {
  state = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* storage unavailable: keep in memory */
  }
  for (const l of listeners) l();
}

export const store = {
  get: () => state,
  subscribe: (fn: () => void) => {
    listeners.add(fn);
    return () => {
      listeners.delete(fn);
    };
  },
  addScan: (s: ScanRecord) => set({ ...state, scans: [...state.scans, s] }),
  addCheckIn: (c: CheckInRecord) => set({ ...state, checkins: [...state.checkins, c] }),
  setSettings: (patch: Partial<Settings>) => set({ ...state, settings: { ...state.settings, ...patch } }),
  clear: () => {
    try {
      localStorage.clear();
    } catch {
      /* ignore */
    }
    set(initial);
  },
};

export function useStore(): State {
  return useSyncExternalStore(store.subscribe, store.get);
}
