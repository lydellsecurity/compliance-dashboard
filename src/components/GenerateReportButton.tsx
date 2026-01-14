/**
 * ============================================================================
 * GENERATE REPORT BUTTON COMPONENT
 * ============================================================================
 * 
 * Button component for generating and downloading compliance reports.
 * Features loading state, progress indicator, and error handling.
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, Download, Loader2, ChevronDown, AlertCircle, X, CheckCircle } from 'lucide-react';
import { useReportGeneration, type ReportType, type ReportData } from '../hooks/useReportGeneration';

interface GenerateReportButtonProps {
  data: ReportData;
  organizationName?: string;
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  showDropdown?: boolean;
}

const GenerateReportButton: React.FC<GenerateReportButtonProps> = ({
  data,
  organizationName = 'Organization',
  variant = 'primary',
  size = 'md',
  showDropdown = true,
}) => {
  const { generating, error, progress, generateReport, clearError } = useReportGeneration();
  const [showMenu, setShowMenu] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const reportTypes: Array<{ type: ReportType; label: string; description: string }> = [
    { 
      type: 'full', 
      label: 'Full Compliance Report', 
      description: 'Complete assessment with all sections' 
    },
    { 
      type: 'gaps', 
      label: 'Gap Analysis Report', 
      description: 'Focus on non-compliant controls' 
    },
    { 
      type: 'evidence', 
      label: 'Evidence Summary', 
      description: 'Evidence records and documentation' 
    },
  ];

  const handleGenerate = async (reportType: ReportType) => {
    setShowMenu(false);
    await generateReport(
      { reportType, organizationName },
      data
    );
    if (!error) {
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    }
  };

  // Styles based on variant
  const baseStyles = 'inline-flex items-center justify-center gap-2 font-medium rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2';
  
  const variantStyles = {
    primary: 'bg-gradient-to-r from-blue-500 via-violet-500 to-purple-500 text-white hover:shadow-lg hover:shadow-violet-500/25 focus:ring-violet-500',
    secondary: 'bg-white/10 border border-white/20 text-white hover:bg-white/20 focus:ring-white/50',
    ghost: 'text-slate-300 hover:text-white hover:bg-white/10 focus:ring-white/30',
  };

  const sizeStyles = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
  };

  const buttonClass = `${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]}`;

  return (
    <div className="relative inline-block">
      {/* Main Button */}
      <button
        onClick={() => showDropdown ? setShowMenu(!showMenu) : handleGenerate('full')}
        disabled={generating}
        className={`${buttonClass} ${generating ? 'opacity-75 cursor-not-allowed' : ''}`}
      >
        {generating ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Generating... {progress > 0 && `${progress}%`}</span>
          </>
        ) : showSuccess ? (
          <>
            <CheckCircle className="w-4 h-4 text-emerald-400" />
            <span>Downloaded!</span>
          </>
        ) : (
          <>
            <FileText className="w-4 h-4" />
            <span>Generate Report</span>
            {showDropdown && <ChevronDown className="w-4 h-4" />}
          </>
        )}
      </button>

      {/* Progress Bar */}
      {generating && progress > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute -bottom-2 left-0 right-0 h-1 bg-steel-700 rounded-full overflow-hidden"
        >
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            className="h-full bg-gradient-to-r from-blue-500 to-violet-500"
          />
        </motion.div>
      )}

      {/* Dropdown Menu */}
      <AnimatePresence>
        {showMenu && !generating && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 mt-2 w-72 bg-steel-800 dark:bg-steel-800 light:bg-white backdrop-blur-xl rounded-xl border border-steel-700 dark:border-steel-700 light:border-slate-200 shadow-xl z-50 overflow-hidden"
          >
            <div className="p-2">
              {reportTypes.map((report) => (
                <button
                  key={report.type}
                  onClick={() => handleGenerate(report.type)}
                  className="w-full flex items-start gap-3 p-3 rounded-lg hover:bg-steel-700 dark:hover:bg-steel-700 light:hover:bg-slate-100 transition-colors text-left"
                >
                  <div className="p-2 bg-framework-hipaa/20 rounded-lg">
                    <Download className="w-4 h-4 text-framework-hipaa" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-primary">{report.label}</div>
                    <div className="text-xs text-steel-400 mt-0.5">{report.description}</div>
                  </div>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Click outside to close */}
      {showMenu && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowMenu(false)}
        />
      )}

      {/* Error Toast */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute top-full mt-2 left-0 right-0 p-3 bg-red-500/20 border border-red-500/30 rounded-xl flex items-start gap-2"
          >
            <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm text-red-200">{error}</p>
            </div>
            <button
              onClick={clearError}
              className="text-red-400 hover:text-red-300"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default GenerateReportButton;
