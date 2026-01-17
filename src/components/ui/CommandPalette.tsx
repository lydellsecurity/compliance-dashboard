/**
 * Command Palette Component
 *
 * A Spotlight/Alfred-style command palette for quick navigation and actions.
 * Activated with Cmd+K (Mac) or Ctrl+K (Windows/Linux).
 *
 * Features:
 * - Fuzzy search across all commands
 * - Keyboard navigation (up/down arrows, enter to select)
 * - Grouped commands by category
 * - Recent commands tracking
 * - Extensible command system
 */

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  LayoutDashboard,
  ClipboardCheck,
  AlertTriangle,
  FileText,
  FolderOpen,
  Plug,
  ShoppingBag,
  Shield,
  Award,
  CheckCircle,
  Building2,
  Settings,
  LogOut,
  Moon,
  HelpCircle,
  Command,
  ArrowRight,
} from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

export interface CommandItem {
  id: string;
  title: string;
  description?: string;
  icon?: React.ReactNode;
  category: CommandCategory;
  keywords?: string[];
  shortcut?: string;
  action: () => void;
  disabled?: boolean;
}

export type CommandCategory =
  | 'navigation'
  | 'actions'
  | 'settings'
  | 'help';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  commands: CommandItem[];
  placeholder?: string;
}

// ============================================================================
// CATEGORY CONFIG
// ============================================================================

const CATEGORY_CONFIG: Record<CommandCategory, { label: string; order: number }> = {
  navigation: { label: 'Navigation', order: 1 },
  actions: { label: 'Actions', order: 2 },
  settings: { label: 'Settings', order: 3 },
  help: { label: 'Help', order: 4 },
};

// ============================================================================
// FUZZY SEARCH
// ============================================================================

function fuzzyMatch(query: string, text: string): boolean {
  const lowerQuery = query.toLowerCase();
  const lowerText = text.toLowerCase();

  // Direct substring match
  if (lowerText.includes(lowerQuery)) return true;

  // Fuzzy match - all query chars appear in order
  let queryIndex = 0;
  for (let i = 0; i < lowerText.length && queryIndex < lowerQuery.length; i++) {
    if (lowerText[i] === lowerQuery[queryIndex]) {
      queryIndex++;
    }
  }
  return queryIndex === lowerQuery.length;
}

function searchCommands(commands: CommandItem[], query: string): CommandItem[] {
  if (!query.trim()) return commands;

  return commands.filter((cmd) => {
    const searchText = [
      cmd.title,
      cmd.description || '',
      ...(cmd.keywords || []),
    ].join(' ');

    return fuzzyMatch(query, searchText);
  });
}

// ============================================================================
// COMMAND PALETTE COMPONENT
// ============================================================================

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  commands,
  placeholder = 'Search commands...',
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Filter and group commands
  const filteredCommands = useMemo(() => {
    return searchCommands(commands, query).filter((cmd) => !cmd.disabled);
  }, [commands, query]);

  const groupedCommands = useMemo(() => {
    const groups: Record<CommandCategory, CommandItem[]> = {
      navigation: [],
      actions: [],
      settings: [],
      help: [],
    };

    filteredCommands.forEach((cmd) => {
      groups[cmd.category].push(cmd);
    });

    return Object.entries(groups)
      .filter(([, items]) => items.length > 0)
      .sort(([a], [b]) => CATEGORY_CONFIG[a as CommandCategory].order - CATEGORY_CONFIG[b as CommandCategory].order)
      .map(([category, items]) => ({
        category: category as CommandCategory,
        label: CATEGORY_CONFIG[category as CommandCategory].label,
        items,
      }));
  }, [filteredCommands]);

  // Flatten for keyboard navigation
  const flatCommands = useMemo(() => {
    return groupedCommands.flatMap((g) => g.items);
  }, [groupedCommands]);

  // Reset state when opening
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Reset selection when query changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Scroll selected item into view
  useEffect(() => {
    if (listRef.current && flatCommands.length > 0) {
      const selectedEl = listRef.current.querySelector(`[data-index="${selectedIndex}"]`);
      selectedEl?.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex, flatCommands.length]);

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex((i) => Math.min(i + 1, flatCommands.length - 1));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex((i) => Math.max(i - 1, 0));
          break;
        case 'Enter':
          e.preventDefault();
          if (flatCommands[selectedIndex]) {
            flatCommands[selectedIndex].action();
            onClose();
          }
          break;
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
      }
    },
    [flatCommands, selectedIndex, onClose]
  );

  // Execute command
  const executeCommand = useCallback(
    (cmd: CommandItem) => {
      cmd.action();
      onClose();
    },
    [onClose]
  );

  // Get flat index for an item
  let currentIndex = -1;
  const getItemIndex = () => {
    currentIndex++;
    return currentIndex;
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
            onClick={onClose}
          />

          {/* Palette */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="fixed top-[20%] left-1/2 -translate-x-1/2 w-full max-w-xl z-50"
          >
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
              {/* Search input */}
              <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-200 dark:border-slate-700">
                <Search className="w-5 h-5 text-slate-400" />
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={placeholder}
                  className="flex-1 bg-transparent text-slate-900 dark:text-white placeholder-slate-400 outline-none text-sm"
                />
                <kbd className="hidden sm:inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-slate-400 bg-slate-100 dark:bg-slate-700 rounded">
                  ESC
                </kbd>
              </div>

              {/* Command list */}
              <div
                ref={listRef}
                className="max-h-80 overflow-y-auto py-2"
              >
                {groupedCommands.length === 0 ? (
                  <div className="px-4 py-8 text-center text-slate-500 dark:text-slate-400">
                    <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No commands found</p>
                  </div>
                ) : (
                  groupedCommands.map((group) => (
                    <div key={group.category}>
                      <div className="px-4 py-2">
                        <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                          {group.label}
                        </span>
                      </div>
                      {group.items.map((cmd) => {
                        const itemIndex = getItemIndex();
                        const isSelected = itemIndex === selectedIndex;

                        return (
                          <button
                            key={cmd.id}
                            data-index={itemIndex}
                            onClick={() => executeCommand(cmd)}
                            onMouseEnter={() => setSelectedIndex(itemIndex)}
                            className={`
                              w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors
                              ${isSelected
                                ? 'bg-violet-50 dark:bg-violet-900/20 text-violet-900 dark:text-violet-100'
                                : 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/50'
                              }
                            `}
                          >
                            <div className={`flex-shrink-0 ${isSelected ? 'text-violet-500' : 'text-slate-400'}`}>
                              {cmd.icon || <ArrowRight className="w-4 h-4" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium truncate">{cmd.title}</div>
                              {cmd.description && (
                                <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                                  {cmd.description}
                                </div>
                              )}
                            </div>
                            {cmd.shortcut && (
                              <kbd className="flex-shrink-0 px-2 py-1 text-xs font-medium text-slate-400 bg-slate-100 dark:bg-slate-700 rounded">
                                {cmd.shortcut}
                              </kbd>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  ))
                )}
              </div>

              {/* Footer hint */}
              <div className="px-4 py-2 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                <div className="flex items-center gap-4 text-xs text-slate-400">
                  <span className="flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 bg-slate-200 dark:bg-slate-700 rounded">↑</kbd>
                    <kbd className="px-1.5 py-0.5 bg-slate-200 dark:bg-slate-700 rounded">↓</kbd>
                    to navigate
                  </span>
                  <span className="flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 bg-slate-200 dark:bg-slate-700 rounded">↵</kbd>
                    to select
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

// ============================================================================
// HOOK FOR COMMAND PALETTE
// ============================================================================

interface UseCommandPaletteOptions {
  onNavigate?: (tab: string) => void;
  onToggleTheme?: () => void;
  onSignOut?: () => void;
}

export function useCommandPalette(options: UseCommandPaletteOptions = {}) {
  const [isOpen, setIsOpen] = useState(false);

  // Global keyboard shortcut (Cmd+K / Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Build default commands
  const commands: CommandItem[] = useMemo(() => {
    const navCommands: CommandItem[] = [
      {
        id: 'nav-dashboard',
        title: 'Go to Dashboard',
        description: 'View compliance overview',
        icon: <LayoutDashboard className="w-4 h-4" />,
        category: 'navigation',
        keywords: ['home', 'overview', 'main'],
        shortcut: 'G D',
        action: () => options.onNavigate?.('dashboard'),
      },
      {
        id: 'nav-assessment',
        title: 'Go to Assessment',
        description: 'Answer compliance questions',
        icon: <ClipboardCheck className="w-4 h-4" />,
        category: 'navigation',
        keywords: ['questions', 'controls', 'audit'],
        shortcut: 'G A',
        action: () => options.onNavigate?.('assessment'),
      },
      {
        id: 'nav-incidents',
        title: 'Go to Incidents',
        description: 'Manage security incidents',
        icon: <AlertTriangle className="w-4 h-4" />,
        category: 'navigation',
        keywords: ['security', 'breach', 'alert'],
        shortcut: 'G I',
        action: () => options.onNavigate?.('incidents'),
      },
      {
        id: 'nav-reporting',
        title: 'Go to Reporting',
        description: 'Generate compliance reports',
        icon: <FileText className="w-4 h-4" />,
        category: 'navigation',
        keywords: ['reports', 'export', 'pdf'],
        shortcut: 'G R',
        action: () => options.onNavigate?.('reporting'),
      },
      {
        id: 'nav-evidence',
        title: 'Go to Evidence',
        description: 'Manage audit evidence',
        icon: <FolderOpen className="w-4 h-4" />,
        category: 'navigation',
        keywords: ['documents', 'files', 'proof'],
        shortcut: 'G E',
        action: () => options.onNavigate?.('evidence'),
      },
      {
        id: 'nav-integrations',
        title: 'Go to Integrations',
        description: 'Connect third-party services',
        icon: <Plug className="w-4 h-4" />,
        category: 'navigation',
        keywords: ['connect', 'api', 'sync'],
        action: () => options.onNavigate?.('integrations'),
      },
      {
        id: 'nav-vendors',
        title: 'Go to Vendors',
        description: 'Manage vendor risk',
        icon: <ShoppingBag className="w-4 h-4" />,
        category: 'navigation',
        keywords: ['third-party', 'suppliers', 'risk'],
        action: () => options.onNavigate?.('vendors'),
      },
      {
        id: 'nav-trust-center',
        title: 'Go to Trust Center',
        description: 'Public compliance portal',
        icon: <Shield className="w-4 h-4" />,
        category: 'navigation',
        keywords: ['public', 'portal', 'customers'],
        action: () => options.onNavigate?.('trust-center'),
      },
      {
        id: 'nav-certificate',
        title: 'Go to Certificates',
        description: 'Generate compliance certificates',
        icon: <Award className="w-4 h-4" />,
        category: 'navigation',
        keywords: ['badge', 'seal', 'attestation'],
        action: () => options.onNavigate?.('certificate'),
      },
      {
        id: 'nav-verify',
        title: 'Go to Verification',
        description: 'Auditor verification portal',
        icon: <CheckCircle className="w-4 h-4" />,
        category: 'navigation',
        keywords: ['auditor', 'check', 'validate'],
        action: () => options.onNavigate?.('verify'),
      },
      {
        id: 'nav-company',
        title: 'Go to Custom Controls',
        description: 'Manage company-specific controls',
        icon: <Building2 className="w-4 h-4" />,
        category: 'navigation',
        keywords: ['custom', 'organization', 'specific'],
        action: () => options.onNavigate?.('company'),
      },
      {
        id: 'nav-settings',
        title: 'Go to Settings',
        description: 'Configure application settings',
        icon: <Settings className="w-4 h-4" />,
        category: 'navigation',
        keywords: ['preferences', 'config', 'options'],
        shortcut: 'G S',
        action: () => options.onNavigate?.('settings'),
      },
    ];

    const settingsCommands: CommandItem[] = [
      {
        id: 'toggle-theme',
        title: 'Toggle Dark Mode',
        description: 'Switch between light and dark theme',
        icon: <Moon className="w-4 h-4" />,
        category: 'settings',
        keywords: ['dark', 'light', 'theme', 'mode'],
        action: () => options.onToggleTheme?.(),
      },
      {
        id: 'sign-out',
        title: 'Sign Out',
        description: 'Log out of your account',
        icon: <LogOut className="w-4 h-4" />,
        category: 'settings',
        keywords: ['logout', 'exit'],
        action: () => options.onSignOut?.(),
      },
    ];

    const helpCommands: CommandItem[] = [
      {
        id: 'help-shortcuts',
        title: 'Keyboard Shortcuts',
        description: 'View all keyboard shortcuts',
        icon: <Command className="w-4 h-4" />,
        category: 'help',
        keywords: ['keys', 'hotkeys', 'bindings'],
        shortcut: '?',
        action: () => {
          // Could open a shortcuts modal
          console.log('Show keyboard shortcuts');
        },
      },
      {
        id: 'help-docs',
        title: 'Documentation',
        description: 'Open help documentation',
        icon: <HelpCircle className="w-4 h-4" />,
        category: 'help',
        keywords: ['help', 'guide', 'manual'],
        action: () => {
          window.open('https://docs.lydellsecurity.com', '_blank');
        },
      },
    ];

    return [...navCommands, ...settingsCommands, ...helpCommands];
  }, [options]);

  return {
    isOpen,
    setIsOpen,
    open: () => setIsOpen(true),
    close: () => setIsOpen(false),
    toggle: () => setIsOpen((prev) => !prev),
    commands,
  };
}

export default CommandPalette;
