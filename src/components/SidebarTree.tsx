import { useEffect, useRef, useState, useCallback } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Plus } from 'lucide-react';

export interface TreeItem {
  id: string;
  label: string;
  href?: string;
  icon?: React.ElementType;
  items?: TreeItem[];
}

export interface TreeGroup {
  title: string;
  items: TreeItem[];
}

interface SidebarTreeProps {
  groups: TreeGroup[];
  searchTerm?: string;
  onInteract?: () => void;
}

export default function SidebarTree({ groups, searchTerm = '', onInteract }: SidebarTreeProps) {
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [focusedItemId, setFocusedItemId] = useState<string | null>(null);
  const treeRef = useRef<HTMLUListElement>(null);
  const location = useLocation();

  // Expand parent items of current page on mount
  useEffect(() => {
    const currentPath = location.pathname;
    const itemsToExpand = new Set<string>();

    const findAndExpandParents = (items: TreeItem[], parentIds: string[] = []) => {
      items.forEach(item => {
        const currentParents = [...parentIds, item.id];
        
        if (item.href === currentPath) {
          // Found current page, expand all parents
          parentIds.forEach(id => itemsToExpand.add(id));
        }
        
        if (item.items) {
          findAndExpandParents(item.items, currentParents);
        }
      });
    };

    groups.forEach(group => findAndExpandParents(group.items));
    setExpandedItems(itemsToExpand);
  }, [location.pathname, groups]);

  // Auto-expand items when searching
  useEffect(() => {
    if (searchTerm.length >= 3) {
      const itemsToExpand = new Set<string>();

      const findMatches = (items: TreeItem[], parentIds: string[] = []) => {
        items.forEach(item => {
          const currentParents = [...parentIds, item.id];
          const matchesLabel = item.label.toLowerCase().includes(searchTerm.toLowerCase());
          
          if (matchesLabel) {
            // Expand all parents of matched item
            parentIds.forEach(id => itemsToExpand.add(id));
          }
          
          if (item.items) {
            const childHasMatch = item.items.some(child => 
              child.label.toLowerCase().includes(searchTerm.toLowerCase())
            );
            if (childHasMatch) {
              itemsToExpand.add(item.id);
            }
            findMatches(item.items, currentParents);
          }
        });
      };

      groups.forEach(group => findMatches(group.items));
      setExpandedItems(itemsToExpand);
    }
  }, [searchTerm, groups]);

  const toggleExpanded = useCallback((itemId: string) => {
    setExpandedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  }, []);

  const isExpanded = (itemId: string) => expandedItems.has(itemId);

  // Filter tree based on search
  const filterMatches = useCallback((item: TreeItem, term: string): boolean => {
    if (!term || term.length < 3) return true;
    
    const matchesCurrent = item.label.toLowerCase().includes(term.toLowerCase());
    const matchesChildren = item.items?.some(child => filterMatches(child, term)) || false;
    
    return matchesCurrent || matchesChildren;
  }, []);

  // Render tree items recursively
  const renderTreeItem = (item: TreeItem, level: number = 1, setSize: number, posInSet: number) => {
    const hasChildren = item.items && item.items.length > 0;
    const isItemExpanded = isExpanded(item.id);
    const isActive = location.pathname === item.href;
    const Icon = item.icon;

    // Filter logic
    const matchesSearch = !searchTerm || searchTerm.length < 3 || filterMatches(item, searchTerm);
    if (!matchesSearch && searchTerm.length >= 3) return null;

    const isMatch = searchTerm.length >= 3 && item.label.toLowerCase().includes(searchTerm.toLowerCase());

    return (
      <li key={item.id} role="none">
        {item.href ? (
          <NavLink
            to={item.href}
            id={`tree-item-${item.id}`}
            role="treeitem"
            tabIndex={isActive ? 0 : -1}
            aria-level={level}
            aria-setsize={setSize}
            aria-posinset={posInSet}
            aria-current={isActive ? 'page' : undefined}
            aria-expanded={hasChildren ? isItemExpanded : undefined}
            aria-owns={hasChildren ? `tree-group-${item.id}` : undefined}
            onFocus={() => setFocusedItemId(item.id)}
            onClick={() => onInteract?.()}
            data-search-match={isMatch || undefined}
            className={`sidebar-tree-item ${isActive ? 'active' : ''}`}
          >
            {Icon && <Icon className="w-4 h-4" />}
            <span>{item.label}</span>
            {hasChildren && (
              <span 
                className="tree-icon" 
                aria-hidden="true"
                onClick={(e) => {
                  e.preventDefault();
                  toggleExpanded(item.id);
                }}
              >
                <Plus className="w-4 h-4" style={{ rotate: isItemExpanded ? '135deg' : '0deg' }} />
              </span>
            )}
          </NavLink>
        ) : (
          <button
            id={`tree-item-${item.id}`}
            role="treeitem"
            tabIndex={-1}
            aria-level={level}
            aria-setsize={setSize}
            aria-posinset={posInSet}
            aria-expanded={hasChildren ? isItemExpanded : undefined}
            aria-owns={hasChildren ? `tree-group-${item.id}` : undefined}
            onClick={() => {
              onInteract?.();
              if (hasChildren) {
                toggleExpanded(item.id);
              }
            }}
            onFocus={() => setFocusedItemId(item.id)}
            data-search-match={isMatch || undefined}
            className="sidebar-tree-item"
          >
            {Icon && <Icon className="w-4 h-4" />}
            <span>{item.label}</span>
            {hasChildren && (
              <span className="tree-icon" aria-hidden="true">
                <Plus className="w-4 h-4" style={{ rotate: isItemExpanded ? '135deg' : '0deg' }} />
              </span>
            )}
          </button>
        )}

        {hasChildren && (
          <div className={`tree-group-wrapper ${!isItemExpanded ? 'collapsed' : ''}`}>
            <ul id={`tree-group-${item.id}`} role="group">
              {item.items!.map((child, idx) => 
                renderTreeItem(child, level + 1, item.items!.length, idx + 1)
              )}
            </ul>
          </div>
        )}
      </li>
    );
  };

  return (
    <div className="sidebar-tree-container">
      <ul
        ref={treeRef}
        role="tree"
        aria-label="Arisara Navigation"
        data-filtering={searchTerm.length >= 3 || undefined}
        className="sidebar-tree"
      >
        {groups.map((group, groupIdx) => (
          <li key={groupIdx} role="none" className="tree-group-container">
            <ul role="group" id={`tree-group-toplevel-${groupIdx}`}>
              {group.items.map((item, idx) => 
                renderTreeItem(item, 1, group.items.length, idx + 1)
              )}
            </ul>
          </li>
        ))}
      </ul>
    </div>
  );
}

