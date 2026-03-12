import { ReactNode } from 'react';
import NewSidebar from './NewSidebar';
import EmbeddedChat from './EmbeddedChat';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  return (
    <div className="relative min-h-screen w-full bg-[#050505] text-white">
      <NewSidebar />

      <main 
        className="min-h-screen bg-[#050505] transition-all duration-300 sidebar-layout-main"
      >
        <div className="min-h-screen w-full px-6 py-10 sm:px-8 lg:px-12">
          {children}
        </div>
      </main>

      {/* Embedded Chat Widget - Idêntico ao da landing */}
      <EmbeddedChat />
    </div>
  );
}

