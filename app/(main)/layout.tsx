'use client';

import { useState, useEffect } from 'react';
import Sidebar from '../components/layout/Sidebar';
import MobileNavbar from '../components/layout/MobileNavbar';
import { CommandPalette } from '../components/features/CommandPalette';

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);

  // Keyboard shortcut: Cmd+K or Ctrl+K
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setCommandPaletteOpen((open) => !open);
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  return (
    <>
      {/* Main Content Area */}
      <div className="flex h-screen">
        {/* Sidebar */}
        <Sidebar onOpenCommandPalette={() => setCommandPaletteOpen(true)} />

        {/* Main Content */}
        <main className="flex-1 overflow-auto pb-16 md:pb-0">
          {children}
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <MobileNavbar />

      {/* Command Palette */}
      <CommandPalette open={commandPaletteOpen} onOpenChange={setCommandPaletteOpen} />
    </>
  );
}