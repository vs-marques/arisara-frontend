/**
 * AppLayout Component
 * Layout para páginas com tabs
 */
import { ReactNode } from 'react';
import { LucideIcon } from 'lucide-react';

interface Tab {
  id: string;
  label: string;
  icon: LucideIcon;
}

interface AppLayoutProps {
  title: string;
  subtitle: string;
  icon: LucideIcon;
  tabs: Tab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  children: ReactNode;
}

export default function AppLayout({
  title,
  subtitle,
  icon: Icon,
  tabs,
  activeTab,
  onTabChange,
  children,
}: AppLayoutProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-orange-50">
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-6">
          <div className="flex items-center gap-4 mb-2">
            <div className="p-2 rounded-lg bg-gray-100">
              <Icon className="w-6 h-6 text-gray-700" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900">{title}</h1>
          </div>
          <p className="text-sm text-gray-600 ml-12">{subtitle}</p>
        </div>

        <div className="mb-6 flex gap-3">
          {tabs.map((tab) => {
            const TabIcon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`
                  flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all
                  ${
                    isActive
                      ? 'bg-white text-gray-900 shadow-md border border-gray-200'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }
                `}
              >
                <TabIcon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="bg-white rounded-3xl shadow-sm border border-gray-200 p-8 min-h-[600px]">
          {children}
        </div>
      </div>
    </div>
  );
}
