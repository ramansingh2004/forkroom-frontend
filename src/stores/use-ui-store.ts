import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type MobileDecisionTab = 'outline' | 'document' | 'discussion';

interface UiState {
  navigationOpen: boolean;
  sidebarCollapsed: boolean;
  mobileDecisionTab: MobileDecisionTab;
  setNavigationOpen: (open: boolean) => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setMobileDecisionTab: (tab: MobileDecisionTab) => void;
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      navigationOpen: false,
      sidebarCollapsed: false,
      mobileDecisionTab: 'document',
      setNavigationOpen: (navigationOpen) => set({ navigationOpen }),
      setSidebarCollapsed: (sidebarCollapsed) => set({ sidebarCollapsed }),
      setMobileDecisionTab: (mobileDecisionTab) => set({ mobileDecisionTab }),
    }),
    {
      name: 'forkroom-ui',
      partialize: (state) => ({
        sidebarCollapsed: state.sidebarCollapsed,
        mobileDecisionTab: state.mobileDecisionTab,
      }),
    },
  ),
);