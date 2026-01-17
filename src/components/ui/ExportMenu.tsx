/**
 * Export Menu Component
 *
 * Reusable dropdown menu for PDF and CSV exports.
 * Integrates with organization context for branding.
 */

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, FileText, FileSpreadsheet, ChevronDown, Check, Loader2 } from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

export interface ExportOption {
  id: string;
  label: string;
  description?: string;
  format: 'pdf' | 'csv';
  icon?: React.ReactNode;
  disabled?: boolean;
}

export interface ExportMenuProps {
  /** Export options to display */
  options: ExportOption[];
  /** Callback when export is triggered */
  onExport: (option: ExportOption) => Promise<void> | void;
  /** Button label */
  label?: string;
  /** Button variant */
  variant?: 'primary' | 'secondary' | 'ghost';
  /** Button size */
  size?: 'sm' | 'md' | 'lg';
  /** Disabled state */
  disabled?: boolean;
  /** Custom class name */
  className?: string;
  /** Alignment of dropdown */
  align?: 'left' | 'right';
}

// ============================================================================
// COMPONENT
// ============================================================================

export const ExportMenu: React.FC<ExportMenuProps> = ({
  options,
  onExport,
  label = 'Export',
  variant = 'primary',
  size = 'md',
  disabled = false,
  className = '',
  align = 'right',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isExporting, setIsExporting] = useState<string | null>(null);
  const [exportSuccess, setExportSuccess] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close menu on escape
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, []);

  const handleExport = async (option: ExportOption) => {
    if (option.disabled || isExporting) return;

    setIsExporting(option.id);
    try {
      await onExport(option);
      setExportSuccess(option.id);
      setTimeout(() => setExportSuccess(null), 2000);
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(null);
      setIsOpen(false);
    }
  };

  // Button styles based on variant
  const buttonStyles = {
    primary: 'btn-primary',
    secondary: 'btn-secondary',
    ghost: 'btn-ghost',
  };

  // Size styles
  const sizeStyles = {
    sm: 'px-3 py-1.5 text-sm gap-1.5',
    md: 'px-4 py-2 text-sm gap-2',
    lg: 'px-5 py-2.5 text-base gap-2',
  };

  const iconSize = {
    sm: 'w-3.5 h-3.5',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  };

  return (
    <div ref={menuRef} className={`relative inline-block ${className}`}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`
          ${buttonStyles[variant]}
          ${sizeStyles[size]}
          inline-flex items-center justify-center
          disabled:opacity-50 disabled:cursor-not-allowed
        `}
      >
        <Download className={iconSize[size]} />
        <span>{label}</span>
        <ChevronDown
          className={`${iconSize[size]} transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Dropdown Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className={`
              absolute z-50 mt-2 w-64
              bg-white dark:bg-steel-800
              border border-slate-200 dark:border-steel-700
              rounded-xl shadow-lg
              overflow-hidden
              ${align === 'right' ? 'right-0' : 'left-0'}
            `}
          >
            <div className="p-2">
              <div className="px-3 py-2 text-xs font-semibold text-secondary uppercase tracking-wider">
                Export Options
              </div>

              {options.map((option) => {
                const isLoading = isExporting === option.id;
                const isSuccess = exportSuccess === option.id;

                return (
                  <button
                    key={option.id}
                    onClick={() => handleExport(option)}
                    disabled={option.disabled || isLoading}
                    className={`
                      w-full flex items-start gap-3 px-3 py-2.5 rounded-lg
                      text-left transition-colors
                      ${
                        option.disabled
                          ? 'opacity-50 cursor-not-allowed'
                          : 'hover:bg-slate-100 dark:hover:bg-steel-700 cursor-pointer'
                      }
                    `}
                  >
                    <div
                      className={`
                      p-2 rounded-lg flex-shrink-0
                      ${option.format === 'pdf' ? 'bg-red-100 dark:bg-red-900/30' : 'bg-green-100 dark:bg-green-900/30'}
                    `}
                    >
                      {isLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin text-slate-500" />
                      ) : isSuccess ? (
                        <Check className="w-4 h-4 text-status-success" />
                      ) : option.format === 'pdf' ? (
                        <FileText
                          className={`w-4 h-4 ${option.format === 'pdf' ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}
                        />
                      ) : (
                        <FileSpreadsheet className="w-4 h-4 text-green-600 dark:text-green-400" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-primary text-sm">{option.label}</span>
                        <span
                          className={`
                          px-1.5 py-0.5 text-[10px] font-semibold uppercase rounded
                          ${option.format === 'pdf' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'}
                        `}
                        >
                          {option.format}
                        </span>
                      </div>
                      {option.description && (
                        <p className="text-xs text-secondary mt-0.5 truncate">
                          {option.description}
                        </p>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Footer hint */}
            <div className="px-4 py-2 bg-slate-50 dark:bg-steel-900/50 border-t border-slate-200 dark:border-steel-700">
              <p className="text-[10px] text-secondary">
                PDF exports include your company branding
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ============================================================================
// PRESET OPTIONS
// ============================================================================

export const COMPLIANCE_EXPORT_OPTIONS: ExportOption[] = [
  {
    id: 'compliance-pdf',
    label: 'Compliance Report',
    description: 'Full report with charts and findings',
    format: 'pdf',
  },
  {
    id: 'compliance-csv',
    label: 'Framework Scores',
    description: 'Score data for spreadsheet analysis',
    format: 'csv',
  },
];

export const CONTROLS_EXPORT_OPTIONS: ExportOption[] = [
  {
    id: 'controls-pdf',
    label: 'Controls Assessment',
    description: 'Professional PDF with status breakdown',
    format: 'pdf',
  },
  {
    id: 'controls-csv',
    label: 'Controls Data',
    description: 'All control details for analysis',
    format: 'csv',
  },
];

export const VENDOR_EXPORT_OPTIONS: ExportOption[] = [
  {
    id: 'vendor-pdf',
    label: 'Vendor Risk Report',
    description: 'Summary with risk tiers and scores',
    format: 'pdf',
  },
  {
    id: 'vendor-csv',
    label: 'Vendor Data',
    description: 'Complete vendor list for analysis',
    format: 'csv',
  },
];

export const EVIDENCE_EXPORT_OPTIONS: ExportOption[] = [
  {
    id: 'evidence-csv',
    label: 'Evidence Inventory',
    description: 'Full evidence list with metadata',
    format: 'csv',
  },
];

export default ExportMenu;
