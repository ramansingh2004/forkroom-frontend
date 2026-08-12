import { create } from "zustand";
import { persist } from "zustand/middleware";

type MobileDecisionTab = "outline" | "document" | "vote" | "discussion";
type DecisionRoomFocus = "outline" | "document" | "collaboration" | null;

interface UiState {
  navigationOpen: boolean;
  sidebarCollapsed: boolean;
  mobileDecisionTab: MobileDecisionTab;
  decisionRoomLeftCollapsed: boolean;
  decisionRoomRightCollapsed: boolean;
  decisionRoomFocus: DecisionRoomFocus;
  setNavigationOpen: (open: boolean) => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setMobileDecisionTab: (tab: MobileDecisionTab) => void;
  setDecisionRoomLeftCollapsed: (collapsed: boolean) => void;
  setDecisionRoomRightCollapsed: (collapsed: boolean) => void;
  setDecisionRoomFocus: (focus: DecisionRoomFocus) => void;
  resetDecisionRoomLayout: () => void;
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      navigationOpen: false,
      sidebarCollapsed: false,
      mobileDecisionTab: "document",
      decisionRoomLeftCollapsed: false,
      decisionRoomRightCollapsed: false,
      decisionRoomFocus: null,
      setNavigationOpen: (navigationOpen) => set({ navigationOpen }),
      setSidebarCollapsed: (sidebarCollapsed) => set({ sidebarCollapsed }),
      setMobileDecisionTab: (mobileDecisionTab) => set({ mobileDecisionTab }),
      setDecisionRoomLeftCollapsed: (decisionRoomLeftCollapsed) =>
        set({ decisionRoomLeftCollapsed }),
      setDecisionRoomRightCollapsed: (decisionRoomRightCollapsed) =>
        set({ decisionRoomRightCollapsed }),
      setDecisionRoomFocus: (decisionRoomFocus) => set({ decisionRoomFocus }),
      resetDecisionRoomLayout: () =>
        set({
          decisionRoomLeftCollapsed: false,
          decisionRoomRightCollapsed: false,
          decisionRoomFocus: null,
        }),
    }),
    {
      name: "forkroom-ui",
      partialize: (state) => ({
        sidebarCollapsed: state.sidebarCollapsed,
        mobileDecisionTab: state.mobileDecisionTab,
        decisionRoomLeftCollapsed: state.decisionRoomLeftCollapsed,
        decisionRoomRightCollapsed: state.decisionRoomRightCollapsed,
      }),
    },
  ),
);