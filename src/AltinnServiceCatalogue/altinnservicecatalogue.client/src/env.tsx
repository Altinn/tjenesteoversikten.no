import { createContext, useContext, useState, type ReactNode } from 'react';

export type Env = 'tt02' | 'prod';

interface EnvContextValue {
  env: Env;
  setEnv: (env: Env) => void;
}

const EnvContext = createContext<EnvContextValue | null>(null);

export function EnvProvider({ children }: { children: ReactNode }) {
  const [env, setEnvState] = useState<Env>(() => {
    const saved = localStorage.getItem('env');
    return saved === 'tt02' ? 'tt02' : 'prod';
  });

  const setEnv = (newEnv: Env) => {
    setEnvState(newEnv);
    localStorage.setItem('env', newEnv);
  };

  return (
    <EnvContext.Provider value={{ env, setEnv }}>
      {children}
    </EnvContext.Provider>
  );
}

export function useEnv() {
  const ctx = useContext(EnvContext);
  if (!ctx) throw new Error('useEnv must be used within EnvProvider');
  return ctx;
}
