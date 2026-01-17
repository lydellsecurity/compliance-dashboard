/**
 * Framework Requirements View Component
 *
 * Displays ALL requirements for a specific compliance framework in a hierarchical view.
 * Shows the framework's native structure (not control-centric) and indicates which
 * controls map to each requirement.
 */

import React, { useState, useMemo } from 'react';
import { ChevronDown, ChevronRight, CheckCircle2, Circle, AlertCircle, Shield } from 'lucide-react';
import type { FrameworkId, MasterControl } from '../constants/controls';
import { FRAMEWORKS } from '../constants/controls';
import { PCI_DSS_V4_REQUIREMENTS, countPCIDSSRequirements } from '../constants/pci-dss-requirements';
import { SOC2_TRUST_SERVICES_CRITERIA, countSOC2Criteria } from '../constants/soc2-requirements';
import { ISO27001_2022_CONTROLS, countISO27001Controls } from '../constants/iso27001-requirements';
import { HIPAA_SECURITY_RULE, countHIPAASpecifications } from '../constants/hipaa-requirements';
import { NIST_CSF_2_0, countNISTSubcategories } from '../constants/nist-csf-requirements';
import { GDPR_REQUIREMENTS, countGDPRProvisions } from '../constants/gdpr-requirements';

type ControlAnswer = 'yes' | 'no' | 'partial' | 'na' | null;

interface FrameworkRequirementsViewProps {
  frameworkId: FrameworkId;
  controls: MasterControl[];
  getControlAnswer: (controlId: string) => ControlAnswer;
  onControlClick?: (controlId: string) => void;
}

// Color configuration for framework styling
const FRAMEWORK_COLORS: Record<FrameworkId, string> = {
  'PCIDSS': '#DC2626',
  'SOC2': '#3B82F6',
  'ISO27001': '#10B981',
  'HIPAA': '#8B5CF6',
  'NIST': '#F59E0B',
  'GDPR': '#2563EB',
};

// Generic requirement item for display
interface RequirementItem {
  id: string;
  title: string;
  description?: string;
  required?: boolean;
  children?: RequirementItem[];
}

// Get control status for a requirement
function getRequirementStatus(
  requirementId: string,
  frameworkId: FrameworkId,
  controls: MasterControl[],
  getControlAnswer: (controlId: string) => ControlAnswer
): { status: 'implemented' | 'partial' | 'not_started' | 'unmapped'; mappedControls: MasterControl[] } {
  // Find controls mapped to this requirement
  const mappedControls = controls.filter(c =>
    c.frameworkMappings.some((m: { frameworkId: string; clauseId: string }) =>
      m.frameworkId === frameworkId &&
      (m.clauseId === requirementId || m.clauseId.startsWith(requirementId + '.'))
    )
  );

  if (mappedControls.length === 0) {
    return { status: 'unmapped', mappedControls: [] };
  }

  // Check answers for each mapped control
  const implementedCount = mappedControls.filter(c => {
    const answer = getControlAnswer(c.id);
    return answer === 'yes';
  }).length;
  const partialCount = mappedControls.filter(c => {
    const answer = getControlAnswer(c.id);
    return answer === 'partial';
  }).length;
  const totalCount = mappedControls.length;

  if (implementedCount === totalCount) {
    return { status: 'implemented', mappedControls };
  } else if (implementedCount > 0 || partialCount > 0) {
    return { status: 'partial', mappedControls };
  }
  return { status: 'not_started', mappedControls };
}

// Status icon component
const StatusIcon: React.FC<{ status: 'implemented' | 'partial' | 'not_started' | 'unmapped' }> = ({ status }) => {
  switch (status) {
    case 'implemented':
      return <CheckCircle2 className="w-4 h-4 text-green-500" />;
    case 'partial':
      return <AlertCircle className="w-4 h-4 text-amber-500" />;
    case 'not_started':
      return <Circle className="w-4 h-4 text-slate-400" />;
    case 'unmapped':
      return <Circle className="w-4 h-4 text-slate-300 dark:text-steel-600" />;
  }
};

// Collapsible requirement item component
const RequirementItemComponent: React.FC<{
  item: RequirementItem;
  depth: number;
  frameworkId: FrameworkId;
  controls: MasterControl[];
  getControlAnswer: (controlId: string) => ControlAnswer;
  onControlClick?: (controlId: string) => void;
  expandedIds: Set<string>;
  toggleExpanded: (id: string) => void;
}> = ({ item, depth, frameworkId, controls, getControlAnswer, onControlClick, expandedIds, toggleExpanded }) => {
  const isExpanded = expandedIds.has(item.id);
  const hasChildren = item.children && item.children.length > 0;
  const { status, mappedControls } = getRequirementStatus(item.id, frameworkId, controls, getControlAnswer);
  const frameworkColor = FRAMEWORK_COLORS[frameworkId];

  return (
    <div className="border-b border-slate-100 dark:border-steel-700 last:border-b-0">
      <div
        className={`flex items-start gap-2 py-2.5 px-3 hover:bg-slate-50 dark:hover:bg-steel-800/50 cursor-pointer transition-colors ${
          hasChildren ? '' : 'pl-8'
        }`}
        style={{ paddingLeft: `${depth * 20 + (hasChildren ? 12 : 28)}px` }}
        onClick={() => hasChildren && toggleExpanded(item.id)}
      >
        {hasChildren && (
          <button className="flex-shrink-0 mt-0.5 text-slate-400 hover:text-slate-600 dark:text-steel-500 dark:hover:text-steel-300">
            {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
        )}

        <StatusIcon status={status} />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className="text-xs font-mono px-1.5 py-0.5 rounded"
              style={{
                backgroundColor: `${frameworkColor}15`,
                color: frameworkColor
              }}
            >
              {item.id}
            </span>
            <span className="text-sm text-slate-700 dark:text-steel-200">{item.title}</span>
            {item.required === false && (
              <span className="text-xs px-1.5 py-0.5 bg-slate-100 dark:bg-steel-700 text-slate-500 dark:text-steel-400 rounded">
                Optional
              </span>
            )}
          </div>
          {item.description && (
            <p className="text-xs text-slate-500 dark:text-steel-400 mt-1">{item.description}</p>
          )}

          {/* Show mapped controls */}
          {mappedControls.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1.5">
              {mappedControls.slice(0, 5).map(c => (
                <button
                  key={c.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    onControlClick?.(c.id);
                  }}
                  className="text-xs px-1.5 py-0.5 bg-indigo-50 dark:bg-accent-500/10 text-indigo-600 dark:text-accent-400 rounded hover:bg-indigo-100 dark:hover:bg-accent-500/20 flex items-center gap-1"
                  title={c.title}
                >
                  <Shield className="w-3 h-3" />
                  {c.id}
                </button>
              ))}
              {mappedControls.length > 5 && (
                <span className="text-xs px-1.5 py-0.5 text-slate-500 dark:text-steel-400">
                  +{mappedControls.length - 5} more
                </span>
              )}
            </div>
          )}
        </div>

        <div className="flex-shrink-0 text-xs text-slate-400 dark:text-steel-500">
          {mappedControls.length > 0 ? (
            <span className={status === 'implemented' ? 'text-green-500' : status === 'partial' ? 'text-amber-500' : ''}>
              {mappedControls.filter(c => getControlAnswer(c.id) === 'yes').length}/{mappedControls.length}
            </span>
          ) : (
            <span className="text-slate-300 dark:text-steel-600">—</span>
          )}
        </div>
      </div>

      {/* Render children when expanded */}
      {hasChildren && isExpanded && (
        <div className="border-t border-slate-50 dark:border-steel-700/50">
          {item.children!.map(child => (
            <RequirementItemComponent
              key={child.id}
              item={child}
              depth={depth + 1}
              frameworkId={frameworkId}
              controls={controls}
              getControlAnswer={getControlAnswer}
              onControlClick={onControlClick}
              expandedIds={expandedIds}
              toggleExpanded={toggleExpanded}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// Transform framework-specific data to generic RequirementItem structure
function getFrameworkRequirements(frameworkId: FrameworkId): { requirements: RequirementItem[]; totalCount: number } {
  switch (frameworkId) {
    case 'PCIDSS':
      return {
        requirements: PCI_DSS_V4_REQUIREMENTS.map(pr => ({
          id: pr.id,
          title: pr.name,
          children: pr.subRequirements.map(sr => ({
            id: sr.id,
            title: sr.name,
            children: sr.requirements.map(r => ({
              id: r.id,
              title: r.title,
              description: r.description,
            })),
          })),
        })),
        totalCount: countPCIDSSRequirements().total,
      };

    case 'SOC2':
      return {
        requirements: SOC2_TRUST_SERVICES_CRITERIA.map(tsc => ({
          id: tsc.id,
          title: tsc.name,
          required: tsc.required,
          children: tsc.categories.map(cat => ({
            id: cat.id,
            title: cat.name,
            description: cat.description,
            children: cat.criteria.map(c => ({
              id: c.id,
              title: c.title,
              description: c.description,
            })),
          })),
        })),
        totalCount: countSOC2Criteria().criteria,
      };

    case 'ISO27001':
      return {
        requirements: ISO27001_2022_CONTROLS.map(theme => ({
          id: theme.id,
          title: theme.name,
          children: theme.controls.map(c => ({
            id: c.id,
            title: c.title,
            description: c.description,
          })),
        })),
        totalCount: countISO27001Controls(),
      };

    case 'HIPAA':
      return {
        requirements: HIPAA_SECURITY_RULE.map(safeguard => ({
          id: safeguard.id,
          title: safeguard.name,
          description: `Section ${safeguard.section}`,
          children: safeguard.standards.map(std => ({
            id: std.id,
            title: std.name,
            children: std.specifications?.map(spec => ({
              id: spec.id,
              title: spec.title,
              required: spec.type === 'required',
            })) || [],
          })),
        })),
        totalCount: countHIPAASpecifications().total,
      };

    case 'NIST':
      return {
        requirements: NIST_CSF_2_0.map(fn => ({
          id: fn.id,
          title: fn.name,
          description: fn.description,
          children: fn.categories.map(cat => ({
            id: cat.id,
            title: cat.name,
            children: cat.subcategories.map(sub => ({
              id: sub.id,
              title: sub.title,
            })),
          })),
        })),
        totalCount: countNISTSubcategories(),
      };

    case 'GDPR':
      return {
        requirements: GDPR_REQUIREMENTS.map(chapter => ({
          id: `Chapter ${chapter.id}`,
          title: chapter.name,
          children: chapter.articles.map(art => ({
            id: art.id,
            title: art.name,
            children: art.provisions.map(p => ({
              id: p.id,
              title: p.title,
              description: p.description,
            })),
          })),
        })),
        totalCount: countGDPRProvisions(),
      };
  }
}

// Calculate overall progress for the framework
function calculateProgress(
  requirements: RequirementItem[],
  frameworkId: FrameworkId,
  controls: MasterControl[],
  getControlAnswer: (controlId: string) => ControlAnswer
): { implemented: number; partial: number; notStarted: number; unmapped: number; total: number } {
  let implemented = 0;
  let partial = 0;
  let notStarted = 0;
  let unmapped = 0;
  let total = 0;

  function countLeaves(items: RequirementItem[]) {
    for (const item of items) {
      if (!item.children || item.children.length === 0) {
        total++;
        const { status } = getRequirementStatus(item.id, frameworkId, controls, getControlAnswer);
        switch (status) {
          case 'implemented': implemented++; break;
          case 'partial': partial++; break;
          case 'not_started': notStarted++; break;
          case 'unmapped': unmapped++; break;
        }
      } else {
        countLeaves(item.children);
      }
    }
  }

  countLeaves(requirements);
  return { implemented, partial, notStarted, unmapped, total };
}

export const FrameworkRequirementsView: React.FC<FrameworkRequirementsViewProps> = ({
  frameworkId,
  controls,
  getControlAnswer,
  onControlClick,
}) => {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [expandAll, setExpandAll] = useState(false);

  const frameworkMeta = FRAMEWORKS.find(f => f.id === frameworkId);
  const frameworkColor = FRAMEWORK_COLORS[frameworkId];
  const { requirements, totalCount } = useMemo(() => getFrameworkRequirements(frameworkId), [frameworkId]);

  const progress = useMemo(
    () => calculateProgress(requirements, frameworkId, controls, getControlAnswer),
    [requirements, frameworkId, controls, getControlAnswer]
  );

  const toggleExpanded = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleExpandAll = () => {
    if (expandAll) {
      setExpandedIds(new Set());
    } else {
      // Collect all IDs that have children
      const allIds = new Set<string>();
      function collectIds(items: RequirementItem[]) {
        for (const item of items) {
          if (item.children && item.children.length > 0) {
            allIds.add(item.id);
            collectIds(item.children);
          }
        }
      }
      collectIds(requirements);
      setExpandedIds(allIds);
    }
    setExpandAll(!expandAll);
  };

  const implementedPercent = progress.total > 0 ? Math.round((progress.implemented / progress.total) * 100) : 0;
  const partialPercent = progress.total > 0 ? Math.round((progress.partial / progress.total) * 100) : 0;

  return (
    <div className="bg-white dark:bg-steel-800 rounded-xl border border-slate-200 dark:border-steel-700 overflow-hidden">
      {/* Header */}
      <div
        className="px-4 py-4 border-b border-slate-200 dark:border-steel-700"
        style={{ backgroundColor: `${frameworkColor}08` }}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{frameworkMeta?.icon}</span>
            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                {frameworkMeta?.fullName}
              </h2>
              <p className="text-sm text-slate-500 dark:text-steel-400">
                {totalCount} requirements • Framework-centric view
              </p>
            </div>
          </div>
          <button
            onClick={handleExpandAll}
            className="text-sm px-3 py-1.5 bg-white dark:bg-steel-700 border border-slate-200 dark:border-steel-600 rounded-lg hover:bg-slate-50 dark:hover:bg-steel-600 text-slate-600 dark:text-steel-300"
          >
            {expandAll ? 'Collapse All' : 'Expand All'}
          </button>
        </div>

        {/* Progress bar */}
        <div className="space-y-2">
          <div className="h-2 bg-slate-100 dark:bg-steel-700 rounded-full overflow-hidden flex">
            <div
              className="h-full bg-green-500 transition-all duration-300"
              style={{ width: `${implementedPercent}%` }}
            />
            <div
              className="h-full bg-amber-400 transition-all duration-300"
              style={{ width: `${partialPercent}%` }}
            />
          </div>
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
              <span className="text-slate-600 dark:text-steel-300">Implemented: {progress.implemented}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
              <span className="text-slate-600 dark:text-steel-300">Partial: {progress.partial}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Circle className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-slate-600 dark:text-steel-300">Not Started: {progress.notStarted}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Circle className="w-3.5 h-3.5 text-slate-300 dark:text-steel-600" />
              <span className="text-slate-500 dark:text-steel-400">Unmapped: {progress.unmapped}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Requirements list */}
      <div className="max-h-[600px] overflow-y-auto">
        {requirements.map(item => (
          <RequirementItemComponent
            key={item.id}
            item={item}
            depth={0}
            frameworkId={frameworkId}
            controls={controls}
            getControlAnswer={getControlAnswer}
            onControlClick={onControlClick}
            expandedIds={expandedIds}
            toggleExpanded={toggleExpanded}
          />
        ))}
      </div>
    </div>
  );
};

export default FrameworkRequirementsView;
