import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type MobileDecisionTab = 'outline' | 'document' | 'discussion';

interface UiState {
  navigationOpen: boolean;
  mobileDecisionTab: MobileDecisionTab;
  setNavigationOpen: (open: boolean) => void;
  setMobileDecisionTab: (tab: MobileDecisionTab) => void;
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      navigationOpen: false,
      mobileDecisionTab: 'document',
      setNavigationOpen: (navigationOpen) => set({ navigationOpen }),
      setMobileDecisionTab: (mobileDecisionTab) => set({ mobileDecisionTab }),
    }),
    {
      name: 'forkroom-ui',
      partialize: (state) => ({ mobileDecisionTab: state.mobileDecisionTab }),
    },
  ),
);