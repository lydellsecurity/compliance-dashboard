/**
 * AI Playbook Generator
 *
 * Generates a response playbook based on the incident type.
 * Uses simulated AI to create step-by-step response procedures.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  X,
  BookOpen,
  Loader2,
  CheckCircle2,
  Shield,
  Zap,
  Clock,
  Users,
  RefreshCw,
  Download,
  Copy,
  ChevronDown,
  ChevronRight,
  Target,
} from 'lucide-react';
import type { Incident, ThreatCategory } from '../../types/incident.types';
import { SEVERITY_CONFIG, THREAT_LABELS } from './index';

// ============================================================================
// TYPES
// ============================================================================

interface AIPlaybookGeneratorProps {
  incident: Incident;
  onClose: () => void;
}

interface PlaybookStep {
  id: string;
  phase: 'immediate' | 'containment' | 'eradication' | 'recovery' | 'lessons_learned';
  title: string;
  description: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  estimatedTime: string;
  assignee: string;
  completed: boolean;
  substeps?: string[];
}

interface PlaybookSection {
  phase: string;
  title: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  steps: PlaybookStep[];
}

// ============================================================================
// PLAYBOOK TEMPLATES
// ============================================================================

const generatePlaybook = (incident: Incident): PlaybookSection[] => {
  const basePlaybook: PlaybookSection[] = [
    {
      phase: 'immediate',
      title: 'Immediate Actions (0-1 hour)',
      icon: <Zap className="w-5 h-5" />,
      color: '#DC2626',
      bgColor: '#FEE2E2',
      steps: [
        {
          id: 'imm-1',
          phase: 'immediate',
          title: 'Activate Incident Response Team',
          description: 'Notify all IR team members and establish communication channels.',
          priority: 'critical',
          estimatedTime: '5 minutes',
          assignee: 'Incident Commander',
          completed: false,
          substeps: [
            'Send emergency notification to IR team',
            'Establish war room (physical or virtual)',
            'Begin incident log documentation',
          ],
        },
        {
          id: 'imm-2',
          phase: 'immediate',
          title: 'Initial Assessment',
          description: 'Gather preliminary information about the scope and impact.',
          priority: 'critical',
          estimatedTime: '15 minutes',
          assignee: 'Security Analyst',
          completed: false,
          substeps: [
            'Identify affected systems and users',
            'Determine initial attack vector',
            'Assess data exposure risk',
          ],
        },
      ],
    },
    {
      phase: 'containment',
      title: 'Containment (1-4 hours)',
      icon: <Shield className="w-5 h-5" />,
      color: '#0066FF',
      bgColor: '#EFF6FF',
      steps: [],
    },
    {
      phase: 'eradication',
      title: 'Eradication (4-24 hours)',
      icon: <Target className="w-5 h-5" />,
      color: '#7C3AED',
      bgColor: '#F5F3FF',
      steps: [],
    },
    {
      phase: 'recovery',
      title: 'Recovery (1-7 days)',
      icon: <RefreshCw className="w-5 h-5" />,
      color: '#059669',
      bgColor: '#ECFDF5',
      steps: [],
    },
    {
      phase: 'lessons_learned',
      title: 'Lessons Learned (Post-Incident)',
      icon: <BookOpen className="w-5 h-5" />,
      color: '#0891B2',
      bgColor: '#ECFEFF',
      steps: [
        {
          id: 'll-1',
          phase: 'lessons_learned',
          title: 'Conduct Post-Incident Review',
          description: 'Schedule and conduct a thorough review of the incident response.',
          priority: 'medium',
          estimatedTime: '2 hours',
          assignee: 'Incident Commander',
          completed: false,
          substeps: [
            'Schedule post-incident meeting with all stakeholders',
            'Review incident timeline and response effectiveness',
            'Identify gaps in detection and response',
          ],
        },
        {
          id: 'll-2',
          phase: 'lessons_learned',
          title: 'Update Documentation',
          description: 'Update runbooks, procedures, and control documentation.',
          priority: 'medium',
          estimatedTime: '4 hours',
          assignee: 'Security Team',
          completed: false,
        },
        {
          id: 'll-3',
          phase: 'lessons_learned',
          title: 'Implement Improvements',
          description: 'Create action items for identified improvements.',
          priority: 'high',
          estimatedTime: '1-2 weeks',
          assignee: 'Security Manager',
          completed: false,
        },
      ],
    },
  ];

  // Add threat-specific containment steps
  const containmentSteps = getContainmentSteps(incident.threatCategory);
  basePlaybook[1].steps = containmentSteps;

  // Add threat-specific eradication steps
  const eradicationSteps = getEradicationSteps(incident.threatCategory);
  basePlaybook[2].steps = eradicationSteps;

  // Add threat-specific recovery steps
  const recoverySteps = getRecoverySteps(incident.threatCategory, incident);
  basePlaybook[3].steps = recoverySteps;

  return basePlaybook;
};

const getContainmentSteps = (threatCategory: ThreatCategory): PlaybookStep[] => {
  const commonSteps: PlaybookStep[] = [
    {
      id: 'cont-1',
      phase: 'containment',
      title: 'Isolate Affected Systems',
      description: 'Prevent further spread by isolating compromised systems from the network.',
      priority: 'critical',
      estimatedTime: '30 minutes',
      assignee: 'Network Team',
      completed: false,
      substeps: [
        'Identify all affected endpoints',
        'Implement network segmentation/isolation',
        'Document isolation actions taken',
      ],
    },
  ];

  const threatSpecific: Record<ThreatCategory, PlaybookStep[]> = {
    ransomware: [
      ...commonSteps,
      {
        id: 'cont-r1',
        phase: 'containment',
        title: 'Disable File Sharing',
        description: 'Stop ransomware spread by disabling SMB and other file sharing protocols.',
        priority: 'critical',
        estimatedTime: '15 minutes',
        assignee: 'System Admin',
        completed: false,
      },
      {
        id: 'cont-r2',
        phase: 'containment',
        title: 'Preserve Encryption Keys',
        description: 'If possible, capture running processes that may contain decryption keys.',
        priority: 'high',
        estimatedTime: '30 minutes',
        assignee: 'Forensics Team',
        completed: false,
      },
    ],
    credential_compromise: [
      ...commonSteps,
      {
        id: 'cont-c1',
        phase: 'containment',
        title: 'Reset Compromised Credentials',
        description: 'Immediately reset passwords for all affected accounts.',
        priority: 'critical',
        estimatedTime: '30 minutes',
        assignee: 'Identity Team',
        completed: false,
        substeps: [
          'Force password reset for compromised accounts',
          'Revoke active sessions and tokens',
          'Review and revoke OAuth/API tokens',
        ],
      },
      {
        id: 'cont-c2',
        phase: 'containment',
        title: 'Enable Additional MFA',
        description: 'Implement or strengthen multi-factor authentication.',
        priority: 'high',
        estimatedTime: '1 hour',
        assignee: 'Identity Team',
        completed: false,
      },
    ],
    data_exfiltration: [
      ...commonSteps,
      {
        id: 'cont-d1',
        phase: 'containment',
        title: 'Block Egress Channels',
        description: 'Identify and block data exfiltration channels.',
        priority: 'critical',
        estimatedTime: '30 minutes',
        assignee: 'Network Team',
        completed: false,
        substeps: [
          'Review firewall logs for unusual outbound traffic',
          'Block suspicious IP addresses and domains',
          'Implement emergency DLP rules',
        ],
      },
      {
        id: 'cont-d2',
        phase: 'containment',
        title: 'Preserve Evidence',
        description: 'Capture network traffic and logs before they rotate.',
        priority: 'high',
        estimatedTime: '1 hour',
        assignee: 'Forensics Team',
        completed: false,
      },
    ],
    phishing: [
      ...commonSteps,
      {
        id: 'cont-p1',
        phase: 'containment',
        title: 'Block Malicious URLs/Domains',
        description: 'Add phishing domains to email and web filters.',
        priority: 'critical',
        estimatedTime: '15 minutes',
        assignee: 'Security Team',
        completed: false,
      },
      {
        id: 'cont-p2',
        phase: 'containment',
        title: 'Quarantine Phishing Emails',
        description: 'Remove phishing emails from all user inboxes.',
        priority: 'high',
        estimatedTime: '30 minutes',
        assignee: 'Email Admin',
        completed: false,
      },
    ],
    malware: [
      ...commonSteps,
      {
        id: 'cont-m1',
        phase: 'containment',
        title: 'Update Antivirus Signatures',
        description: 'Push updated signatures to detect the specific malware variant.',
        priority: 'high',
        estimatedTime: '30 minutes',
        assignee: 'Security Team',
        completed: false,
      },
      {
        id: 'cont-m2',
        phase: 'containment',
        title: 'Block Malware C2 Communications',
        description: 'Identify and block command & control infrastructure.',
        priority: 'critical',
        estimatedTime: '1 hour',
        assignee: 'Network Team',
        completed: false,
      },
    ],
    insider_threat: [
      ...commonSteps,
      {
        id: 'cont-i1',
        phase: 'containment',
        title: 'Revoke Insider Access',
        description: 'Immediately disable all access for the suspected insider.',
        priority: 'critical',
        estimatedTime: '15 minutes',
        assignee: 'Identity Team',
        completed: false,
      },
      {
        id: 'cont-i2',
        phase: 'containment',
        title: 'Coordinate with HR/Legal',
        description: 'Engage HR and Legal for proper handling procedures.',
        priority: 'high',
        estimatedTime: '30 minutes',
        assignee: 'Incident Commander',
        completed: false,
      },
    ],
    ddos: [
      ...commonSteps,
      {
        id: 'cont-dd1',
        phase: 'containment',
        title: 'Activate DDoS Mitigation',
        description: 'Enable DDoS protection services and scrubbing.',
        priority: 'critical',
        estimatedTime: '15 minutes',
        assignee: 'Network Team',
        completed: false,
      },
      {
        id: 'cont-dd2',
        phase: 'containment',
        title: 'Implement Rate Limiting',
        description: 'Apply aggressive rate limiting to protect services.',
        priority: 'high',
        estimatedTime: '30 minutes',
        assignee: 'Network Team',
        completed: false,
      },
    ],
    lateral_movement: commonSteps,
    privilege_escalation: commonSteps,
    supply_chain: commonSteps,
    zero_day: commonSteps,
    apt: commonSteps,
    cryptojacking: commonSteps,
    other: commonSteps,
  };

  return threatSpecific[threatCategory] || commonSteps;
};

const getEradicationSteps = (_threatCategory: ThreatCategory): PlaybookStep[] => {
  return [
    {
      id: 'erad-1',
      phase: 'eradication',
      title: 'Remove Malicious Artifacts',
      description: 'Identify and remove all traces of the threat from affected systems.',
      priority: 'high',
      estimatedTime: '2-4 hours',
      assignee: 'Security Team',
      completed: false,
      substeps: [
        'Scan all systems with updated signatures',
        'Remove identified malware/backdoors',
        'Clear browser caches and temporary files',
      ],
    },
    {
      id: 'erad-2',
      phase: 'eradication',
      title: 'Patch Vulnerabilities',
      description: 'Apply patches for any vulnerabilities exploited during the attack.',
      priority: 'high',
      estimatedTime: '2-8 hours',
      assignee: 'System Admin',
      completed: false,
    },
    {
      id: 'erad-3',
      phase: 'eradication',
      title: 'Verify Clean State',
      description: 'Confirm all systems are free of compromise.',
      priority: 'high',
      estimatedTime: '1-2 hours',
      assignee: 'Forensics Team',
      completed: false,
    },
  ];
};

const getRecoverySteps = (_threatCategory: ThreatCategory, incident: Incident): PlaybookStep[] => {
  const steps: PlaybookStep[] = [
    {
      id: 'rec-1',
      phase: 'recovery',
      title: 'Restore from Backups',
      description: 'Restore affected systems from known-good backups.',
      priority: 'high',
      estimatedTime: '4-24 hours',
      assignee: 'System Admin',
      completed: false,
      substeps: [
        'Verify backup integrity',
        'Restore systems in priority order',
        'Validate restored data and functionality',
      ],
    },
    {
      id: 'rec-2',
      phase: 'recovery',
      title: 'Gradual Network Reconnection',
      description: 'Carefully reconnect systems to the network with enhanced monitoring.',
      priority: 'medium',
      estimatedTime: '2-4 hours',
      assignee: 'Network Team',
      completed: false,
    },
    {
      id: 'rec-3',
      phase: 'recovery',
      title: 'Monitor for Reinfection',
      description: 'Implement enhanced monitoring to detect any recurrence.',
      priority: 'high',
      estimatedTime: 'Ongoing',
      assignee: 'SOC Team',
      completed: false,
    },
  ];

  // Add regulatory notification if data was exposed
  if (incident.dataExposed) {
    steps.push({
      id: 'rec-4',
      phase: 'recovery',
      title: 'Regulatory Notifications',
      description: 'Prepare and send required breach notifications.',
      priority: 'critical',
      estimatedTime: '1-3 days',
      assignee: 'Legal/Compliance',
      completed: false,
      substeps: [
        'Determine notification requirements by jurisdiction',
        'Draft notification letters',
        'Submit to regulatory bodies within required timeframes',
        'Notify affected individuals',
      ],
    });
  }

  return steps;
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const AIPlaybookGenerator: React.FC<AIPlaybookGeneratorProps> = ({
  incident,
  onClose,
}) => {
  const [isGenerating, setIsGenerating] = useState(true);
  const [generationStep, setGenerationStep] = useState(0);
  const [playbook, setPlaybook] = useState<PlaybookSection[]>([]);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['immediate']));
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());

  const generationSteps = [
    'Analyzing incident type...',
    'Mapping affected controls...',
    'Generating containment procedures...',
    'Creating eradication steps...',
    'Building recovery playbook...',
    'Finalizing recommendations...',
  ];

  // Simulate AI generation
  useEffect(() => {
    if (!isGenerating) return;

    const stepInterval = setInterval(() => {
      setGenerationStep(prev => {
        if (prev >= generationSteps.length - 1) {
          clearInterval(stepInterval);
          setIsGenerating(false);
          setPlaybook(generatePlaybook(incident));
          return prev;
        }
        return prev + 1;
      });
    }, 500);

    return () => clearInterval(stepInterval);
  }, [isGenerating, incident]);

  const toggleSection = useCallback((phase: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(phase)) {
        next.delete(phase);
      } else {
        next.add(phase);
      }
      return next;
    });
  }, []);

  const toggleStepComplete = useCallback((stepId: string) => {
    setCompletedSteps(prev => {
      const next = new Set(prev);
      if (next.has(stepId)) {
        next.delete(stepId);
      } else {
        next.add(stepId);
      }
      return next;
    });
  }, []);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return { bg: '#FEE2E2', color: '#DC2626' };
      case 'high': return { bg: '#FFEDD5', color: '#EA580C' };
      case 'medium': return { bg: '#FEF3C7', color: '#D97706' };
      case 'low': return { bg: '#DCFCE7', color: '#16A34A' };
      default: return { bg: '#F1F5F9', color: '#64748B' };
    }
  };

  const totalSteps = playbook.reduce((acc, section) => acc + section.steps.length, 0);
  const completedCount = completedSteps.size;
  const progress = totalSteps > 0 ? (completedCount / totalSteps) * 100 : 0;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={e => e.stopPropagation()}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-indigo-600 to-violet-600">
          <div className="flex items-center gap-3 text-white">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">AI Response Playbook</h2>
              <p className="text-sm text-white/80">{incident.incidentNumber} - {THREAT_LABELS[incident.threatCategory]}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {!isGenerating && (
              <button
                onClick={() => {
                  // Copy playbook to clipboard
                  const text = playbook.map(section =>
                    `${section.title}\n${section.steps.map(step =>
                      `  - ${step.title}: ${step.description}`
                    ).join('\n')}`
                  ).join('\n\n');
                  navigator.clipboard.writeText(text);
                }}
                className="flex items-center gap-2 px-3 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors text-sm"
              >
                <Copy className="w-4 h-4" />
                Copy
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {isGenerating ? (
            <div className="flex flex-col items-center justify-center py-16 px-8">
              <div className="w-16 h-16 rounded-2xl bg-indigo-100 flex items-center justify-center mb-6">
                <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-2">Generating Playbook</h3>
              <p className="text-slate-500 mb-8">AI is analyzing the incident and creating a response plan...</p>

              <div className="w-full max-w-md space-y-3">
                {generationSteps.map((step, index) => (
                  <div
                    key={index}
                    className={`flex items-center gap-3 p-3 rounded-xl transition-all ${
                      index < generationStep
                        ? 'bg-emerald-50'
                        : index === generationStep
                        ? 'bg-indigo-50'
                        : 'bg-slate-50'
                    }`}
                  >
                    {index < generationStep ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                    ) : index === generationStep ? (
                      <Loader2 className="w-5 h-5 text-indigo-500 animate-spin" />
                    ) : (
                      <div className="w-5 h-5 rounded-full border-2 border-slate-300" />
                    )}
                    <span className={`text-sm ${
                      index <= generationStep ? 'text-slate-900' : 'text-slate-400'
                    }`}>
                      {step}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="p-6 space-y-4">
              {/* Progress Bar */}
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-slate-700">Response Progress</span>
                  <span className="text-sm text-slate-500">{completedCount} of {totalSteps} steps</span>
                </div>
                <div className="h-3 bg-slate-200 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full"
                  />
                </div>
              </div>

              {/* Playbook Sections */}
              {playbook.map(section => (
                <div
                  key={section.phase}
                  className="bg-white rounded-xl border border-slate-200 overflow-hidden"
                >
                  <button
                    onClick={() => toggleSection(section.phase)}
                    className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center"
                        style={{ backgroundColor: section.bgColor, color: section.color }}
                      >
                        {section.icon}
                      </div>
                      <div className="text-left">
                        <h4 className="font-semibold text-slate-900">{section.title}</h4>
                        <p className="text-sm text-slate-500">
                          {section.steps.filter(s => completedSteps.has(s.id)).length} of {section.steps.length} completed
                        </p>
                      </div>
                    </div>
                    {expandedSections.has(section.phase) ? (
                      <ChevronDown className="w-5 h-5 text-slate-400" />
                    ) : (
                      <ChevronRight className="w-5 h-5 text-slate-400" />
                    )}
                  </button>

                  {expandedSections.has(section.phase) && section.steps.length > 0 && (
                    <div className="border-t border-slate-200 divide-y divide-slate-100">
                      {section.steps.map(step => {
                        const priorityColors = getPriorityColor(step.priority);
                        const isCompleted = completedSteps.has(step.id);

                        return (
                          <div
                            key={step.id}
                            className={`p-4 transition-colors ${isCompleted ? 'bg-emerald-50/50' : ''}`}
                          >
                            <div className="flex items-start gap-4">
                              <button
                                onClick={() => toggleStepComplete(step.id)}
                                className={`mt-1 w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                                  isCompleted
                                    ? 'bg-emerald-500 border-emerald-500'
                                    : 'border-slate-300 hover:border-indigo-500'
                                }`}
                              >
                                {isCompleted && <CheckCircle2 className="w-3 h-3 text-white" />}
                              </button>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <h5 className={`font-medium ${isCompleted ? 'text-slate-500 line-through' : 'text-slate-900'}`}>
                                    {step.title}
                                  </h5>
                                  <span
                                    className="px-2 py-0.5 text-xs font-medium rounded"
                                    style={{ backgroundColor: priorityColors.bg, color: priorityColors.color }}
                                  >
                                    {step.priority}
                                  </span>
                                </div>
                                <p className={`text-sm ${isCompleted ? 'text-slate-400' : 'text-slate-600'}`}>
                                  {step.description}
                                </p>
                                {step.substeps && (
                                  <ul className="mt-2 space-y-1">
                                    {step.substeps.map((substep, idx) => (
                                      <li
                                        key={idx}
                                        className={`text-sm flex items-start gap-2 ${
                                          isCompleted ? 'text-slate-400' : 'text-slate-500'
                                        }`}
                                      >
                                        <span className="text-slate-300 mt-1.5">•</span>
                                        {substep}
                                      </li>
                                    ))}
                                  </ul>
                                )}
                                <div className="flex items-center gap-4 mt-3 text-xs text-slate-400">
                                  <span className="flex items-center gap-1">
                                    <Clock className="w-3.5 h-3.5" />
                                    {step.estimatedTime}
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <Users className="w-3.5 h-3.5" />
                                    {step.assignee}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {!isGenerating && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 bg-slate-50">
            <div className="text-sm text-slate-500">
              Generated for {SEVERITY_CONFIG[incident.severity].label} severity {THREAT_LABELS[incident.threatCategory]} incident
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  // Export as PDF would go here
                  console.log('Export playbook');
                }}
                className="flex items-center gap-2 px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                <Download className="w-4 h-4" />
                Export PDF
              </button>
              <button
                onClick={onClose}
                className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
};

export default AIPlaybookGenerator;
