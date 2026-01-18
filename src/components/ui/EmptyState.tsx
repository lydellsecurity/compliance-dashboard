/**
 * Empty State Component
 *
 * Reusable component for displaying helpful empty states
 * with illustrations and call-to-action buttons.
 */

import React from 'react';
import { motion } from 'framer-motion';
import {
  FolderOpen,
  FileText,
  Shield,
  Users,
  Package,
  CheckCircle,
  Sparkles,
} from 'lucide-react';

interface EmptyStateProps {
  type?: 'incidents' | 'evidence' | 'vendors' | 'questionnaires' | 'controls' | 'generic';
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
    icon?: React.ReactNode;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  customIllustration?: React.ReactNode;
}

const ILLUSTRATIONS: Record<string, React.ReactNode> = {
  incidents: (
    <div className="relative">
      <div className="w-24 h-24 bg-gradient-to-br from-emerald-100 to-emerald-50 dark:from-emerald-900/30 dark:to-emerald-800/20 rounded-full flex items-center justify-center">
        <Shield className="w-12 h-12 text-emerald-500" />
      </div>
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.2, type: 'spring' }}
        className="absolute -bottom-1 -right-1 w-10 h-10 bg-emerald-500 rounded-full flex items-center justify-center shadow-lg"
      >
        <CheckCircle className="w-5 h-5 text-white" />
      </motion.div>
    </div>
  ),
  evidence: (
    <div className="relative">
      <div className="w-24 h-24 bg-gradient-to-br from-indigo-100 to-indigo-50 dark:from-indigo-900/30 dark:to-indigo-800/20 rounded-full flex items-center justify-center">
        <FolderOpen className="w-12 h-12 text-indigo-500" />
      </div>
      <motion.div
        initial={{ y: 10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="absolute -bottom-2 left-1/2 -translate-x-1/2"
      >
        <div className="flex gap-1">
          {[1, 2, 3].map((i) => (
            <motion.div
              key={i}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.3 + i * 0.1 }}
              className="w-6 h-8 bg-white dark:bg-steel-700 rounded shadow-md border border-slate-200 dark:border-steel-600"
            />
          ))}
        </div>
      </motion.div>
    </div>
  ),
  vendors: (
    <div className="relative">
      <div className="w-24 h-24 bg-gradient-to-br from-pink-100 to-pink-50 dark:from-pink-900/30 dark:to-pink-800/20 rounded-full flex items-center justify-center">
        <Package className="w-12 h-12 text-pink-500" />
      </div>
      <motion.div
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ delay: 0.2, type: 'spring' }}
        className="absolute -top-1 -right-1 w-8 h-8 bg-pink-500 rounded-lg flex items-center justify-center shadow-lg"
      >
        <Users className="w-4 h-4 text-white" />
      </motion.div>
    </div>
  ),
  questionnaires: (
    <div className="relative">
      <div className="w-24 h-24 bg-gradient-to-br from-amber-100 to-amber-50 dark:from-amber-900/30 dark:to-amber-800/20 rounded-full flex items-center justify-center">
        <FileText className="w-12 h-12 text-amber-500" />
      </div>
      <motion.div
        initial={{ x: 20, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="absolute -right-2 top-1/2 -translate-y-1/2"
      >
        <div className="space-y-1">
          {[1, 2, 3].map((i) => (
            <motion.div
              key={i}
              initial={{ width: 0 }}
              animate={{ width: 24 + (i * 8) }}
              transition={{ delay: 0.4 + i * 0.1 }}
              className="h-2 bg-amber-300 dark:bg-amber-600 rounded-full"
            />
          ))}
        </div>
      </motion.div>
    </div>
  ),
  controls: (
    <div className="relative">
      <div className="w-24 h-24 bg-gradient-to-br from-violet-100 to-violet-50 dark:from-violet-900/30 dark:to-violet-800/20 rounded-full flex items-center justify-center">
        <Shield className="w-12 h-12 text-violet-500" />
      </div>
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
        className="absolute inset-0"
      >
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1 w-2 h-2 bg-violet-400 rounded-full" />
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1 w-2 h-2 bg-violet-400 rounded-full" />
        <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1 w-2 h-2 bg-violet-400 rounded-full" />
        <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1 w-2 h-2 bg-violet-400 rounded-full" />
      </motion.div>
    </div>
  ),
  generic: (
    <div className="w-24 h-24 bg-gradient-to-br from-slate-100 to-slate-50 dark:from-steel-800 dark:to-steel-700 rounded-full flex items-center justify-center">
      <FolderOpen className="w-12 h-12 text-slate-400 dark:text-steel-500" />
    </div>
  ),
};

const EmptyState: React.FC<EmptyStateProps> = ({
  type = 'generic',
  title,
  description,
  action,
  secondaryAction,
  customIllustration,
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-16 px-4 text-center"
    >
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="mb-6"
      >
        {customIllustration || ILLUSTRATIONS[type]}
      </motion.div>

      <motion.h3
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="text-xl font-semibold text-slate-900 dark:text-steel-100 mb-2"
      >
        {title}
      </motion.h3>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="text-slate-500 dark:text-steel-400 max-w-md mb-6"
      >
        {description}
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="flex items-center gap-3"
      >
        {action && (
          <button
            onClick={action.onClick}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors"
          >
            {action.icon || <Sparkles className="w-4 h-4" />}
            {action.label}
          </button>
        )}

        {secondaryAction && (
          <button
            onClick={secondaryAction.onClick}
            className="px-5 py-2.5 text-slate-600 dark:text-steel-300 font-medium rounded-lg hover:bg-slate-100 dark:hover:bg-steel-800 transition-colors"
          >
            {secondaryAction.label}
          </button>
        )}
      </motion.div>
    </motion.div>
  );
};

export default EmptyState;
