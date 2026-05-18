import { createContext, ReactNode, useContext, useState } from 'react';

interface AppStateContextValue {
  onboardingDone: boolean;
  setOnboardingDone: (value: boolean) => void;
  triggerReset: () => void;
}

const AppStateContext = createContext<AppStateContextValue | undefined>(undefined);

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [onboardingDone, setOnboardingDone] = useState(false);

  const triggerReset = () => {
    setOnboardingDone(false);
  };

  return (
    <AppStateContext.Provider value={{ onboardingDone, setOnboardingDone, triggerReset }}>
      {children}
    </AppStateContext.Provider>
  );
}

export function useAppState() {
  const ctx = useContext(AppStateContext);
  if (!ctx) throw new Error('useAppState must be used inside AppStateProvider');
  return ctx;
}
