import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface UnreadMessagesContextType {
  totalUnread: number;
  setTotalUnread: (n: number) => void;
}

const UnreadMessagesContext = createContext<UnreadMessagesContextType | undefined>(undefined);

export function UnreadMessagesProvider({ children }: { children: ReactNode }) {
  const [totalUnread, setTotalUnread] = useState(0);
  return (
    <UnreadMessagesContext.Provider value={{ totalUnread, setTotalUnread }}>
      {children}
    </UnreadMessagesContext.Provider>
  );
}

export function useUnreadMessages() {
  const ctx = useContext(UnreadMessagesContext);
  if (ctx === undefined) throw new Error('useUnreadMessages must be used within UnreadMessagesProvider');
  return ctx;
}
