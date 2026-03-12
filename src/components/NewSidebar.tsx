import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { getMyProfile } from '../services/profileService';
import SidebarTree, { TreeGroup, TreeItem } from './SidebarTree';
import SidebarLanguageSelector from './SidebarLanguageSelector';
import {
  Home,
  FileText,
  Bot,
  MessageSquare,
  BarChart3,
  Settings,
  LogOut,
  Users,
  Key,
  Sparkles,
  Search,
  Menu,
  X,
  Share2,
  Compass,
  PanelLeftOpen,
  PanelLeftClose,
  UserCircle,
  CalendarDays,
} from 'lucide-react';

// Estrutura de navegação com chaves i18n (traduzida no componente)
interface NavItemRaw {
  id: string;
  labelKey: string;
  href?: string;
  icon?: React.ElementType;
}
interface NavGroupRaw {
  titleKey: string;
  items: NavItemRaw[];
}
const NAVIGATION_TREE_RAW: NavGroupRaw[] = [
  {
    titleKey: 'principal',
    items: [
      { id: 'dashboard', labelKey: 'dashboard', href: '/dashboard', icon: Home },
      { id: 'ai-maturity', labelKey: 'evolutionIA', href: '/ai-maturity', icon: Sparkles },
      { id: 'chat', labelKey: 'chat', href: '/chat', icon: MessageSquare },
    ],
  },
  {
    titleKey: 'modules',
    items: [
      { id: 'documents', labelKey: 'documents', href: '/documents', icon: FileText },
      { id: 'ai-config', labelKey: 'aiConfig', href: '/ai/prompt', icon: Bot },
      { id: 'channels', labelKey: 'channels', href: '/channels', icon: Share2 },
      { id: 'discovery', labelKey: 'discovery', href: '/discovery', icon: Compass },
      { id: 'leads', labelKey: 'leads', href: '/leads', icon: UserCircle },
      { id: 'agenda', labelKey: 'agenda', href: '/agenda', icon: CalendarDays },
      { id: 'analytics', labelKey: 'analytics', href: '/analytics', icon: BarChart3 },
      { id: 'users', labelKey: 'users', href: '/users', icon: Users },
      { id: 'api-keys', labelKey: 'apiKeys', href: '/api-keys', icon: Key },
    ],
  },
];

export default function NewSidebar() {
  const { t } = useTranslation();
  const [searchValue, setSearchValue] = useState('');
  const [userFullName, setUserFullName] = useState<string | null>(null);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isPinned, setIsPinned] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const saved = localStorage.getItem('nyoka_sidebar_pinned');
    const pinned = saved ? JSON.parse(saved) : false;
    if (typeof document !== 'undefined') {
      document.body.dataset.sidebarPinned = pinned ? 'true' : 'false';
    }
    return pinned;
  });
  const [isPeeking, setIsPeeking] = useState(false);
  const [isDesktop, setIsDesktop] = useState(() => {
    if (typeof window === 'undefined') return true;
    return window.innerWidth >= 768;
  });
  const sidebarRef = useRef<HTMLElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const hoverTimeoutRef = useRef<number | null>(null);
  const keepOpenTimeoutRef = useRef<number | null>(null);
  const { logout, user } = useAuth();

  // Buscar nome completo do perfil
  useEffect(() => {
    if (user) {
      getMyProfile()
        .then((profile) => {
          if (profile.name) {
            setUserFullName(profile.name);
          }
        })
        .catch(() => {
          // Silenciosamente falha, mantém null
        });
    }
  }, [user]);

  const clearHoverTimeout = () => {
    if (hoverTimeoutRef.current) {
      window.clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
  };

  const clearKeepOpenTimeout = () => {
    if (keepOpenTimeoutRef.current) {
      window.clearTimeout(keepOpenTimeoutRef.current);
      keepOpenTimeoutRef.current = null;
    }
  };

  const beginHover = () => {
    if (!isDesktop || isPinned) return;
    clearHoverTimeout();
    setIsPeeking(true);
  };

  const endHover = () => {
    if (!isDesktop || isPinned) return;
    clearHoverTimeout();
    hoverTimeoutRef.current = window.setTimeout(() => {
      setIsPeeking(false);
    }, 200);
  };

  const keepFloatingOpen = useCallback(() => {
    if (!isPinned && isDesktop) {
      clearHoverTimeout();
      clearKeepOpenTimeout();
      setIsPeeking(true);
      keepOpenTimeoutRef.current = window.setTimeout(() => {
        setIsPeeking(false);
      }, 1100);
    }
  }, [isPinned, isDesktop]);

  // Persist pinned state and sync layout
  useEffect(() => {
    localStorage.setItem('nyoka_sidebar_pinned', JSON.stringify(isPinned));
    document.body.dataset.sidebarPinned = isPinned ? 'true' : 'false';

    return () => {
      delete document.body.dataset.sidebarPinned;
    };
  }, [isPinned]);

  useEffect(() => {
    const handleResize = () => {
      const desktop = window.innerWidth >= 768;
      setIsDesktop(desktop);
      if (!desktop) {
        setIsPeeking(false);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    return () => {
      clearHoverTimeout();
      clearKeepOpenTimeout();
    };
  }, []);

  useEffect(() => {
    if (typeof document === 'undefined') {
      return;
    }

    const body = document.body;

    if (isMobileOpen) {
      body.dataset.sidebarExpanded = 'mobile';
    } else if (isPinned) {
      body.dataset.sidebarExpanded = 'pinned';
    } else if (isPeeking) {
      body.dataset.sidebarExpanded = 'floating';
    } else {
      delete body.dataset.sidebarExpanded;
    }

    return () => {
      delete body.dataset.sidebarExpanded;
    };
  }, [isPinned, isPeeking, isMobileOpen]);

  // Close sidebar on outside click (mobile)
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (window.innerWidth <= 768 && 
          sidebarRef.current && 
          !sidebarRef.current.contains(event.target as Node)) {
        setIsMobileOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus search with "/" key
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      const tagName = (e.target as HTMLElement).tagName.toLowerCase();
      const isInput = tagName === 'input' || tagName === 'textarea' || tagName === 'select';
      
      if (e.key === '/' && !isInput) {
        e.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, []);

  const handleLogout = () => {
    logout();
    window.location.href = '/login';
  };

  const handleToggleClick = () => {
    if (!isDesktop) {
      setIsMobileOpen(prev => !prev);
      return;
    }
    // clearHoverTimeout(); // Removed as per new logic
    const nextPinned = !isPinned;
    setIsPinned(nextPinned);
    if (!nextPinned) {
      setIsPeeking(false);
    }
  };

  const showExpandedContent = isMobileOpen || isPinned || isPeeking;
  const ToggleIcon = isPinned ? PanelLeftClose : PanelLeftOpen;

  const navigationTree: TreeGroup[] = useMemo(
    () =>
      NAVIGATION_TREE_RAW.map((group) => ({
        title: t(`nav.${group.titleKey}`),
        items: group.items.map(
          (item): TreeItem => ({
            id: item.id,
            label: t(`nav.${item.labelKey}`),
            href: item.href,
            icon: item.icon,
          })
        ),
      })),
    [t]
  );

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        className="mobile-menu-button"
        onClick={() => setIsMobileOpen(!isMobileOpen)}
        aria-label={t('nav.openMenu')}
      >
        <Menu className="w-6 h-6" />
      </button>

      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div 
          className="mobile-backdrop"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        ref={sidebarRef}
        className={`nyoka-sidebar ${isMobileOpen ? 'mobile-open' : ''} ${isPinned ? 'pinned' : ''} ${
          showExpandedContent ? 'expanded' : 'compact'
        } ${isPeeking && !isPinned ? 'peek' : ''}`}
        onMouseEnter={beginHover}
        onMouseLeave={endHover}
        onFocusCapture={beginHover}
      >
        {/* Header */}
        <header className="sidebar-header">
          {/* Mobile Close Button */}
          <button
            className="mobile-close-button"
            onClick={() => setIsMobileOpen(false)}
            aria-label={t('nav.closeMenu')}
          >
            <X className="w-5 h-5" style={{ rotate: '45deg' }} />
          </button>

          {!showExpandedContent && (
            <div className="sidebar-collapsed-indicator" aria-hidden="true">
              <span />
            </div>
          )}

          {/* Admin Console Label */}
          {showExpandedContent && (
            <p className="sidebar-subtitle">{t('nav.adminConsole')}</p>
          )}

          {/* Search Input */}
          {showExpandedContent && (
            <div className="tree-search-container">
              <Search className="search-icon" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder={t('nav.searchPlaceholder')}
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                className="tree-search-input"
                aria-label={t('nav.searchAriaLabel')}
              />
              <kbd className="search-kbd">/</kbd>
            </div>
          )}
        </header>

        {/* Navigation Tree */}
        <nav className="sidebar-nav">
          <SidebarTree 
            groups={navigationTree} 
            searchTerm={searchValue} 
            onInteract={keepFloatingOpen}
          />
        </nav>

        {/* Footer */}
        <footer className="sidebar-footer">
          {/* User Info */}
          <div className="sidebar-user" title={!showExpandedContent ? (userFullName || user?.username || 'Admin') : undefined}>
            <div className="user-avatar">
              {(userFullName || user?.username || 'A').charAt(0).toUpperCase()}
            </div>
            {showExpandedContent && (
              <div className="user-info">
                <span className="user-name">{userFullName || user?.username || 'Admin'}</span>
                <span className="user-badge">Pro</span>
              </div>
            )}
          </div>

          {/* Language Selector */}
          <SidebarLanguageSelector showLabel={showExpandedContent} />

          {/* Settings Button */}
          <button 
            className="sidebar-footer-button" 
            onClick={() => window.location.href = '/settings'}
            title={!showExpandedContent ? t('nav.settings') : undefined}
          >
            <Settings className="w-5 h-5" />
            {showExpandedContent && <span>{t('nav.settings')}</span>}
          </button>

          {/* Logout Button */}
          <button 
            className="sidebar-footer-button logout" 
            onClick={handleLogout}
            title={!showExpandedContent ? t('nav.logout') : undefined}
          >
            <LogOut className="w-5 h-5" />
            {showExpandedContent && <span>{t('nav.logout')}</span>}
          </button>
        </footer>
      </aside>

      {/* Floating Toggle Button */}
      <button
        className={`sidebar-pin-button ${showExpandedContent ? 'expanded' : 'collapsed'} ${
          isPinned ? 'pinned' : 'floating'
        }`}
        onClick={handleToggleClick}
        onMouseEnter={beginHover}
        onMouseLeave={endHover}
        onFocus={beginHover}
        onBlur={endHover}
        aria-label={isPinned ? t('nav.collapseNav') : t('nav.pinNav')}
        aria-pressed={isPinned}
        title={isPinned ? t('nav.collapse') : t('nav.pin')}
      >
        <ToggleIcon className="h-5 w-5" />
      </button>
    </>
  );
}

