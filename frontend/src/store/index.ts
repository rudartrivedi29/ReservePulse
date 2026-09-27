import { createContext, useContext } from 'react';
import type { SystemStatus } from '../types';

/**
 * Foundation Application State
 * Serves as state management blueprint (ready for Context API, Zustand, or Redux Toolkit).
 */

export interface AppState {
  systemStatus: SystemStatus | null;
  isLoading: boolean;
  error: string | null;
}

export const initialAppState: AppState = {
  systemStatus: null,
  isLoading: false,
  error: null,
};

export const AppContext = createContext<{
  state: AppState;
  dispatch?: (action: unknown) => void;
}>({
  state: initialAppState,
});

export const useAppState = () => useContext(AppContext);
