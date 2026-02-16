import React, { createContext, useContext, useState, ReactNode } from 'react';

interface UnreadMessagesContextType {
  totalUnread: number;
  setTotalUnread: (n: number) => void;
  pendingRequestsCount: number;
  setPendingRequestsCount: (n: number) => void;
  meetingsBadgeCount: number;
  setMeetingsBadgeCount: (n: number) => void;
}

const UnreadMessagesContext = createContext<UnreadMessagesContextType | undefined>(undefined);

export function UnreadMessagesProvider({ children }: { children: ReactNode }) {
  const [totalUnread, setTotalUnread] = useState(0);
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);
  const [meetingsBadgeCount, setMeetingsBadgeCount] = useState(0);
  return (
    <UnreadMessagesContext.Provider value={{
      totalUnread, setTotalUnread,
      pendingRequestsCount, setPendingRequestsCount,
      meetingsBadgeCount, setMeetingsBadgeCount,
    }}>
      {children}
    </UnreadMessagesContext.Provider>
  );
}

export function useUnreadMessages() {
  const ctx = useContext(UnreadMessagesContext);
  if (ctx === undefined) throw new Error('useUnreadMessages must be used within UnreadMessagesProvider');
  return ctx;
}
