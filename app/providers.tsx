'use client';
import { SessionProvider } from "next-auth/react";
import { TestResultsProvider } from '@/app/contexts/TestResultsContext';

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <TestResultsProvider>
        {children}
      </TestResultsProvider>
    </SessionProvider>
  );
}