/**
 * Skeleton Loading Components
 *
 * Provides shimmer loading states for various UI elements.
 * Features:
 * - Animated shimmer effect
 * - Pre-built component skeletons
 * - Customizable dimensions
 * - Dark mode support
 */

import React from 'react';

// ============================================================================
// BASE SKELETON
// ============================================================================

interface SkeletonProps {
  className?: string;
  width?: string | number;
  height?: string | number;
  rounded?: 'none' | 'sm' | 'md' | 'lg' | 'xl' | 'full';
  animate?: boolean;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  className = '',
  width,
  height,
  rounded = 'md',
  animate = true,
}) => {
  const roundedClass = {
    none: 'rounded-none',
    sm: 'rounded-sm',
    md: 'rounded-md',
    lg: 'rounded-lg',
    xl: 'rounded-xl',
    full: 'rounded-full',
  }[rounded];

  const style: React.CSSProperties = {
    width: typeof width === 'number' ? `${width}px` : width,
    height: typeof height === 'number' ? `${height}px` : height,
  };

  return (
    <div
      className={`
        bg-slate-200 dark:bg-slate-700
        ${roundedClass}
        ${animate ? 'animate-pulse' : ''}
        ${className}
      `}
      style={style}
    />
  );
};

// ============================================================================
// TEXT SKELETON
// ============================================================================

interface TextSkeletonProps {
  lines?: number;
  className?: string;
  lastLineWidth?: string;
}

export const TextSkeleton: React.FC<TextSkeletonProps> = ({
  lines = 3,
  className = '',
  lastLineWidth = '75%',
}) => {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          height={16}
          width={i === lines - 1 ? lastLineWidth : '100%'}
          rounded="sm"
        />
      ))}
    </div>
  );
};

// ============================================================================
// CARD SKELETON
// ============================================================================

interface CardSkeletonProps {
  className?: string;
  hasImage?: boolean;
  imageHeight?: number;
  lines?: number;
}

export const CardSkeleton: React.FC<CardSkeletonProps> = ({
  className = '',
  hasImage = false,
  imageHeight = 120,
  lines = 2,
}) => {
  return (
    <div className={`bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden ${className}`}>
      {hasImage && (
        <Skeleton height={imageHeight} rounded="none" className="w-full" />
      )}
      <div className="p-4 space-y-3">
        <Skeleton height={20} width="60%" rounded="sm" />
        <TextSkeleton lines={lines} />
      </div>
    </div>
  );
};

// ============================================================================
// TABLE SKELETON
// ============================================================================

interface TableSkeletonProps {
  rows?: number;
  columns?: number;
  className?: string;
  showHeader?: boolean;
}

export const TableSkeleton: React.FC<TableSkeletonProps> = ({
  rows = 5,
  columns = 4,
  className = '',
  showHeader = true,
}) => {
  return (
    <div className={`overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700 ${className}`}>
      <div className="divide-y divide-slate-200 dark:divide-slate-700">
        {/* Header */}
        {showHeader && (
          <div className="bg-slate-50 dark:bg-slate-800/50 px-4 py-3">
            <div className="flex gap-4">
              {Array.from({ length: columns }).map((_, i) => (
                <Skeleton
                  key={`header-${i}`}
                  height={16}
                  className="flex-1"
                  rounded="sm"
                />
              ))}
            </div>
          </div>
        )}

        {/* Rows */}
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div key={rowIndex} className="bg-white dark:bg-slate-800 px-4 py-4">
            <div className="flex gap-4 items-center">
              {Array.from({ length: columns }).map((_, colIndex) => (
                <Skeleton
                  key={`cell-${rowIndex}-${colIndex}`}
                  height={14}
                  className="flex-1"
                  rounded="sm"
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ============================================================================
// STAT CARD SKELETON
// ============================================================================

interface StatCardSkeletonProps {
  className?: string;
}

export const StatCardSkeleton: React.FC<StatCardSkeletonProps> = ({ className = '' }) => {
  return (
    <div className={`bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 ${className}`}>
      <div className="flex items-start justify-between">
        <div className="space-y-2 flex-1">
          <Skeleton height={14} width="40%" rounded="sm" />
          <Skeleton height={32} width="60%" rounded="md" />
          <div className="flex items-center gap-2 pt-1">
            <Skeleton height={20} width={50} rounded="full" />
            <Skeleton height={12} width={80} rounded="sm" />
          </div>
        </div>
        <Skeleton height={40} width={40} rounded="lg" />
      </div>
    </div>
  );
};

// ============================================================================
// LIST SKELETON
// ============================================================================

interface ListSkeletonProps {
  items?: number;
  className?: string;
  showAvatar?: boolean;
  showActions?: boolean;
}

export const ListSkeleton: React.FC<ListSkeletonProps> = ({
  items = 5,
  className = '',
  showAvatar = true,
  showActions = true,
}) => {
  return (
    <div className={`divide-y divide-slate-200 dark:divide-slate-700 ${className}`}>
      {Array.from({ length: items }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 py-4">
          {showAvatar && (
            <Skeleton height={40} width={40} rounded="full" />
          )}
          <div className="flex-1 space-y-2">
            <Skeleton height={16} width="50%" rounded="sm" />
            <Skeleton height={12} width="30%" rounded="sm" />
          </div>
          {showActions && (
            <Skeleton height={32} width={80} rounded="md" />
          )}
        </div>
      ))}
    </div>
  );
};

// ============================================================================
// DASHBOARD SKELETON
// ============================================================================

interface DashboardSkeletonProps {
  className?: string;
}

export const DashboardSkeleton: React.FC<DashboardSkeletonProps> = ({ className = '' }) => {
  return (
    <div className={`space-y-6 ${className}`}>
      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <StatCardSkeleton key={i} />
        ))}
      </div>

      {/* Main content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart area */}
        <div className="lg:col-span-2">
          <CardSkeleton hasImage imageHeight={300} lines={0} />
        </div>

        {/* Side panel */}
        <div className="space-y-4">
          <CardSkeleton lines={4} />
          <CardSkeleton lines={3} />
        </div>
      </div>

      {/* Table */}
      <TableSkeleton rows={5} columns={5} />
    </div>
  );
};

// ============================================================================
// FORM SKELETON
// ============================================================================

interface FormSkeletonProps {
  fields?: number;
  className?: string;
}

export const FormSkeleton: React.FC<FormSkeletonProps> = ({
  fields = 4,
  className = '',
}) => {
  return (
    <div className={`space-y-6 ${className}`}>
      {Array.from({ length: fields }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton height={14} width={100} rounded="sm" />
          <Skeleton height={40} width="100%" rounded="md" />
        </div>
      ))}
      <div className="flex justify-end gap-3 pt-4">
        <Skeleton height={40} width={100} rounded="md" />
        <Skeleton height={40} width={120} rounded="md" />
      </div>
    </div>
  );
};

// ============================================================================
// PROFILE SKELETON
// ============================================================================

interface ProfileSkeletonProps {
  className?: string;
}

export const ProfileSkeleton: React.FC<ProfileSkeletonProps> = ({ className = '' }) => {
  return (
    <div className={`flex items-center gap-4 ${className}`}>
      <Skeleton height={64} width={64} rounded="full" />
      <div className="space-y-2 flex-1">
        <Skeleton height={20} width="40%" rounded="sm" />
        <Skeleton height={14} width="60%" rounded="sm" />
        <Skeleton height={12} width="30%" rounded="sm" />
      </div>
    </div>
  );
};

export default Skeleton;
