import { NavLink } from 'react-router-dom';
import {
  Home,
  FileText,
  Bot,
  MessageSquare,
  BarChart3,
  Settings,
  LogOut,
  ChevronDown,
  ChevronRight,
  Users,
  Key,
  ChevronLeft,
  Sparkles,
  UserCircle,
  CalendarDays,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { CloudinaryImage } from './CloudinaryImage';

interface MenuItem {
  title: string;
  path?: string;
  icon: React.ElementType;
  children?: MenuItem[];
}

const menuItems: MenuItem[] = [
  { title: 'Dashboard', path: '/dashboard', icon: Home },
  { title: 'Evolução IA', path: '/ai-maturity', icon: Sparkles },
  { title: 'Chat', path: '/chat', icon: MessageSquare },
  { title: 'Leads', path: '/leads', icon: UserCircle },
  { title: 'Agenda', path: '/agenda', icon: CalendarDays },
  {
    title: 'Documentos',
    icon: FileText,
    children: [
      { title: 'Lista', path: '/documents', icon: FileText },
      { title: 'Upload', path: '/documents/upload', icon: FileText },
    ],
  },
  {
    title: 'Configuração IA',
    icon: Bot,
    children: [
      { title: 'Prompt', path: '/ai/prompt', icon: Bot },
      { title: 'Modelo', path: '/ai/model', icon: Bot },
      { title: 'Few-shot', path: '/ai/examples', icon: Bot },
    ],
  },
  { title: 'Conversas', path: '/conversations', icon: MessageSquare },
  { title: 'Analytics', path: '/analytics', icon: BarChart3 },
  { title: 'Usuários', path: '/users', icon: Users },
  { title: 'API Keys', path: '/api-keys', icon: Key },
  { title: 'Configurações', path: '/settings', icon: Settings },
];

export default function Sidebar() {
  const [expanded, setExpanded] = useState<string[]>(['Documentos', 'Configuração IA']);
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const saved = localStorage.getItem('sidebar_collapsed');
    return saved ? JSON.parse(saved) : false;
  });
  const { logout } = useAuth();

  useEffect(() => {
    localStorage.setItem('sidebar_collapsed', JSON.stringify(isCollapsed));
  }, [isCollapsed]);

  const toggleExpand = (title: string) => {
    setExpanded((prev) =>
      prev.includes(title) ? prev.filter((t) => t !== title) : [...prev, title]
    );
  };

  const handleLogout = () => {
    logout();
    window.location.href = '/login';
  };

  const sidebarWidth = isCollapsed ? 'w-20' : 'w-64';

  return (
    <div className="relative">
      <aside className={`fixed left-0 top-0 flex h-screen flex-col border-r border-white/10 bg-black/80 backdrop-blur-xl transition-all duration-300 ${sidebarWidth} z-40`}>
      {/* Logo Section */}
      <div className="border-b border-white/10 p-6">
        <div className={`mb-5 flex items-center gap-0 ${isCollapsed ? 'justify-center' : ''}`}>
          <CloudinaryImage
            publicId="logo_arisara_gkkkb7"
            alt="Arisara"
            className={isCollapsed ? 'h-12 w-auto' : 'h-16 w-auto'}
          />
          {!isCollapsed && (
            <CloudinaryImage
              publicId="logo_arisara_lettering_gvdyuz"
              alt="Arisara Lettering"
              className="h-9 w-auto"
            />
          )}
        </div>
        {!isCollapsed && (
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-gray-500">
            Admin Console
          </p>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto space-y-1 p-4">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const hasChildren = !!item.children;
          const isExpanded = expanded.includes(item.title);

          return (
            <div key={item.title}>
              {hasChildren ? (
                <button
                  onClick={() => toggleExpand(item.title)}
                  className={`flex w-full items-center ${isCollapsed ? 'justify-center' : 'justify-between'} rounded-2xl px-4 py-3 text-sm font-medium text-white/70 transition-smooth hover:bg-white/5 relative group`}
                  title={isCollapsed ? item.title : undefined}
                >
                  <div className="flex items-center gap-3">
                    <Icon className="h-5 w-5" />
                    {!isCollapsed && <span className="text-sm font-medium">{item.title}</span>}
                  </div>
                  {!isCollapsed && (
                    isExpanded ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )
                  )}
                  {isCollapsed && (
                    <div className="absolute left-full ml-2 px-3 py-2 bg-black/90 border border-white/10 rounded-xl text-sm text-white whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
                      {item.title}
                    </div>
                  )}
                </button>
              ) : (
                <NavLink
                  to={item.path || '#'}
                  end={item.path === '/dashboard'}
                  className={({ isActive }) =>
                    `flex items-center ${isCollapsed ? 'justify-center' : ''} gap-3 rounded-2xl px-4 py-3 text-sm transition-smooth relative group ${
                      isActive
                        ? 'bg-[#EC4899] text-white shadow-[0_15px_45px_-30px_rgba(236,72,153,0.8)]'
                        : 'text-white/60 hover:bg-white/5 hover:text-white'
                    }`
                  }
                  title={isCollapsed ? item.title : undefined}
                >
                  <Icon className="h-5 w-5" />
                  {!isCollapsed && <span className="text-sm font-medium">{item.title}</span>}
                  {isCollapsed && (
                    <div className="absolute left-full ml-2 px-3 py-2 bg-black/90 border border-white/10 rounded-xl text-sm text-white whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
                      {item.title}
                    </div>
                  )}
                </NavLink>
              )}

              {hasChildren && isExpanded && !isCollapsed && (
                <div className="ml-4 mt-1 space-y-1 border-l border-[#EC4899]/30 pl-3">
                  {item.children?.map((child) => {
                    const ChildIcon = child.icon;
                    return (
                      <NavLink
                        key={child.path}
                        to={child.path || '#'}
                        className={({ isActive }) =>
                          `flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition-smooth ${
                            isActive
                              ? 'border-l-2 border-[#EC4899] bg-[#EC4899]/10 text-white'
                              : 'text-white/50 hover:bg-white/5 hover:text-white'
                          }`
                        }
                      >
                        <ChildIcon className="h-4 w-4" />
                        <span>{child.title}</span>
                      </NavLink>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Logout Button */}
      <div className="border-t border-white/10 p-4">
        <button
          onClick={handleLogout}
          className={`flex w-full items-center ${isCollapsed ? 'justify-center' : ''} gap-3 rounded-2xl px-4 py-3 text-sm font-medium text-white/60 transition-smooth hover:bg-rose-500/10 hover:text-rose-300 relative group`}
          title={isCollapsed ? 'Logout' : undefined}
        >
          <LogOut className="h-5 w-5" />
          {!isCollapsed && <span>Logout</span>}
          {isCollapsed && (
            <div className="absolute left-full ml-2 px-3 py-2 bg-black/90 border border-white/10 rounded-xl text-sm text-white whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
              Logout
            </div>
          )}
        </button>
      </div>

    </aside>
    
    {/* Botão Protuberante na Borda */}
    <button
      onClick={() => setIsCollapsed(!isCollapsed)}
      className={`fixed top-24 z-30 h-14 w-3.5 rounded-r-xl bg-white/[0.08] border border-l-0 border-white/10 flex items-center justify-center text-white/60 hover:bg-white/[0.15] hover:text-white transition-all shadow-[2px_0_10px_rgba(0,0,0,0.5)]`}
      style={{ 
        left: isCollapsed ? '80px' : '256px',
        transition: 'left 300ms ease-in-out',
      }}
      title={isCollapsed ? 'Expandir' : 'Retrair'}
    >
      {isCollapsed ? (
        <ChevronRight className="w-3 h-3" />
      ) : (
        <ChevronLeft className="w-3 h-3" />
      )}
    </button>
    </div>
  );
}

