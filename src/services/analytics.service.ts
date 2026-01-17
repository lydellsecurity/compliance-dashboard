/**
 * Analytics Service
 *
 * Provides dashboard analytics, trend analysis, and historical tracking
 * for compliance metrics across organizations.
 */

import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { MASTER_CONTROLS, FRAMEWORKS, COMPLIANCE_DOMAINS } from '../constants/controls';
import type { FrameworkId, ComplianceDomain } from '../constants/controls';

// ============================================================================
// TYPES
// ============================================================================

export interface ComplianceSnapshot {
  id: string;
  organizationId: string;
  snapshotDate: string;
  overallScore: number;
  totalControls: number;
  implementedControls: number;
  partialControls: number;
  notImplementedControls: number;
  notApplicableControls: number;
  notStartedControls: number;
  frameworkScores: Record<FrameworkId, number>;
  domainScores: Record<ComplianceDomain, number>;
}

export interface TrendDataPoint {
  date: string;
  score: number;
  implemented: number;
  partial: number;
  notImplemented: number;
}

export interface FrameworkTrend {
  frameworkId: FrameworkId;
  frameworkName: string;
  color: string;
  dataPoints: TrendDataPoint[];
  currentScore: number;
  change30d: number;
  change90d: number;
}

export interface DomainAnalysis {
  domain: ComplianceDomain;
  title: string;
  totalControls: number;
  implemented: number;
  partial: number;
  notImplemented: number;
  notStarted: number;
  score: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  topGaps: { controlId: string; title: string; riskLevel: string }[];
}

export interface DashboardMetrics {
  overallScore: number;
  scoreChange7d: number;
  scoreChange30d: number;
  controlsImplemented: number;
  controlsTotal: number;
  criticalGaps: number;
  highGaps: number;
  upcomingDeadlines: number;
  recentActivity: number;
  frameworkReadiness: Record<FrameworkId, number>;
}

export interface ActivityLogEntry {
  id: string;
  timestamp: string;
  action: string;
  resourceType: string;
  resourceId: string;
  userId: string;
  userName: string;
  details: Record<string, unknown>;
}

export interface GapAnalysis {
  totalGaps: number;
  criticalGaps: { controlId: string; title: string; domain: string }[];
  highGaps: { controlId: string; title: string; domain: string }[];
  mediumGaps: { controlId: string; title: string; domain: string }[];
  byFramework: Record<FrameworkId, number>;
  byDomain: Record<ComplianceDomain, number>;
}

// ============================================================================
// ANALYTICS SERVICE CLASS
// ============================================================================

class AnalyticsService {
  /**
   * Get current dashboard metrics for an organization
   */
  async getDashboardMetrics(organizationId: string): Promise<DashboardMetrics> {
    if (!isSupabaseConfigured() || !supabase) {
      return this.getEmptyMetrics();
    }

    try {
      // Get all control responses
      const { data: responses } = await supabase
        .from('control_responses')
        .select('control_id, answer, updated_at')
        .eq('organization_id', organizationId);

      const controlResponses = responses || [];

      // Calculate current metrics
      const implemented = controlResponses.filter(r => r.answer === 'yes').length;
      const partial = controlResponses.filter(r => r.answer === 'partial').length;
      const notApplicable = controlResponses.filter(r => r.answer === 'na').length;
      const total = controlResponses.length;
      const applicable = total - notApplicable;

      const overallScore = applicable > 0
        ? Math.round(((implemented + partial * 0.5) / applicable) * 100)
        : 0;

      // Get gap counts by risk level
      const controlMap = new Map(MASTER_CONTROLS.map(c => [c.id, c]));
      let criticalGaps = 0;
      let highGaps = 0;

      controlResponses.forEach(r => {
        if (r.answer === 'no' || r.answer === null) {
          const control = controlMap.get(r.control_id);
          if (control?.riskLevel === 'critical') criticalGaps++;
          else if (control?.riskLevel === 'high') highGaps++;
        }
      });

      // Get historical scores for trend calculation
      const { data: snapshots } = await supabase
        .from('compliance_snapshots')
        .select('snapshot_date, overall_score')
        .eq('organization_id', organizationId)
        .order('snapshot_date', { ascending: false })
        .limit(30);

      const snapshotList = snapshots || [];
      const score7dAgo = this.getScoreFromDaysAgo(snapshotList, 7);
      const score30dAgo = this.getScoreFromDaysAgo(snapshotList, 30);

      // Get recent activity count
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { count: activityCount } = await supabase
        .from('audit_log')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organizationId)
        .gte('created_at', sevenDaysAgo.toISOString());

      // Calculate framework readiness
      const frameworkReadiness = this.calculateFrameworkReadiness(controlResponses);

      // Calculate upcoming deadlines (within next 30 days)
      const upcomingDeadlines = await this.getUpcomingDeadlinesCount(organizationId);

      return {
        overallScore,
        scoreChange7d: score7dAgo !== null ? overallScore - score7dAgo : 0,
        scoreChange30d: score30dAgo !== null ? overallScore - score30dAgo : 0,
        controlsImplemented: implemented,
        controlsTotal: total,
        criticalGaps,
        highGaps,
        upcomingDeadlines,
        recentActivity: activityCount || 0,
        frameworkReadiness,
      };
    } catch (error) {
      console.error('Failed to get dashboard metrics:', error);
      return this.getEmptyMetrics();
    }
  }

  /**
   * Get compliance trend data over time
   */
  async getComplianceTrends(
    organizationId: string,
    days = 90
  ): Promise<TrendDataPoint[]> {
    if (!isSupabaseConfigured() || !supabase) {
      return [];
    }

    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const { data: snapshots } = await supabase
        .from('compliance_snapshots')
        .select('snapshot_date, overall_score, implemented_controls, partial_controls, not_implemented_controls')
        .eq('organization_id', organizationId)
        .gte('snapshot_date', startDate.toISOString())
        .order('snapshot_date', { ascending: true });

      return (snapshots || []).map(s => ({
        date: s.snapshot_date,
        score: s.overall_score,
        implemented: s.implemented_controls,
        partial: s.partial_controls,
        notImplemented: s.not_implemented_controls,
      }));
    } catch (error) {
      console.error('Failed to get compliance trends:', error);
      return [];
    }
  }

  /**
   * Get framework-specific trends
   */
  async getFrameworkTrends(
    organizationId: string,
    days = 90
  ): Promise<FrameworkTrend[]> {
    if (!isSupabaseConfigured() || !supabase) {
      return [];
    }

    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const { data: snapshots } = await supabase
        .from('compliance_snapshots')
        .select('snapshot_date, framework_scores')
        .eq('organization_id', organizationId)
        .gte('snapshot_date', startDate.toISOString())
        .order('snapshot_date', { ascending: true });

      const snapshotList = snapshots || [];

      return FRAMEWORKS.map(fw => {
        const dataPoints = snapshotList.map(s => ({
          date: s.snapshot_date,
          score: (s.framework_scores as Record<FrameworkId, number>)?.[fw.id] || 0,
          implemented: 0,
          partial: 0,
          notImplemented: 0,
        }));

        const currentScore = dataPoints.length > 0
          ? dataPoints[dataPoints.length - 1].score
          : 0;

        const score30dAgo = this.getScoreFromDaysAgo(
          dataPoints.map(d => ({ snapshot_date: d.date, overall_score: d.score })),
          30
        );

        const score90dAgo = this.getScoreFromDaysAgo(
          dataPoints.map(d => ({ snapshot_date: d.date, overall_score: d.score })),
          90
        );

        return {
          frameworkId: fw.id,
          frameworkName: fw.name,
          color: fw.color,
          dataPoints,
          currentScore,
          change30d: score30dAgo !== null ? currentScore - score30dAgo : 0,
          change90d: score90dAgo !== null ? currentScore - score90dAgo : 0,
        };
      });
    } catch (error) {
      console.error('Failed to get framework trends:', error);
      return [];
    }
  }

  /**
   * Get domain-level analysis
   */
  async getDomainAnalysis(organizationId: string): Promise<DomainAnalysis[]> {
    if (!isSupabaseConfigured() || !supabase) {
      return [];
    }

    try {
      const { data: responses } = await supabase
        .from('control_responses')
        .select('control_id, answer')
        .eq('organization_id', organizationId);

      const controlResponses = responses || [];
      const responseMap = new Map(controlResponses.map(r => [r.control_id, r.answer]));

      // Group controls by domain
      const domainGroups = new Map<ComplianceDomain, typeof MASTER_CONTROLS>();

      MASTER_CONTROLS.forEach(control => {
        if (!domainGroups.has(control.domain)) {
          domainGroups.set(control.domain, []);
        }
        domainGroups.get(control.domain)!.push(control);
      });

      return COMPLIANCE_DOMAINS.map(domainMeta => {
        const controls = domainGroups.get(domainMeta.id) || [];

        let implemented = 0;
        let partial = 0;
        let notImplemented = 0;
        let notStarted = 0;
        const gaps: { controlId: string; title: string; riskLevel: string }[] = [];

        controls.forEach(control => {
          const answer = responseMap.get(control.id);
          if (answer === 'yes') implemented++;
          else if (answer === 'partial') partial++;
          else if (answer === 'no') {
            notImplemented++;
            gaps.push({
              controlId: control.id,
              title: control.title,
              riskLevel: control.riskLevel,
            });
          } else if (answer === null || answer === undefined) {
            notStarted++;
            gaps.push({
              controlId: control.id,
              title: control.title,
              riskLevel: control.riskLevel,
            });
          }
        });

        const total = controls.length;
        const score = total > 0
          ? Math.round(((implemented + partial * 0.5) / total) * 100)
          : 0;

        // Determine risk level based on score and gap severity
        let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';
        const criticalGapCount = gaps.filter(g => g.riskLevel === 'critical').length;
        const highGapCount = gaps.filter(g => g.riskLevel === 'high').length;

        if (criticalGapCount > 0 || score < 30) riskLevel = 'critical';
        else if (highGapCount > 2 || score < 50) riskLevel = 'high';
        else if (score < 70) riskLevel = 'medium';

        // Sort gaps by risk level
        const riskOrder = { critical: 0, high: 1, medium: 2, low: 3 };
        gaps.sort((a, b) => riskOrder[a.riskLevel as keyof typeof riskOrder] - riskOrder[b.riskLevel as keyof typeof riskOrder]);

        return {
          domain: domainMeta.id,
          title: domainMeta.title,
          totalControls: total,
          implemented,
          partial,
          notImplemented,
          notStarted,
          score,
          riskLevel,
          topGaps: gaps.slice(0, 5),
        };
      });
    } catch (error) {
      console.error('Failed to get domain analysis:', error);
      return [];
    }
  }

  /**
   * Get gap analysis summary
   */
  async getGapAnalysis(organizationId: string): Promise<GapAnalysis> {
    if (!isSupabaseConfigured() || !supabase) {
      return this.getEmptyGapAnalysis();
    }

    try {
      const { data: responses } = await supabase
        .from('control_responses')
        .select('control_id, answer')
        .eq('organization_id', organizationId);

      const controlResponses = responses || [];
      const responseMap = new Map(controlResponses.map(r => [r.control_id, r.answer]));

      const criticalGaps: GapAnalysis['criticalGaps'] = [];
      const highGaps: GapAnalysis['highGaps'] = [];
      const mediumGaps: GapAnalysis['mediumGaps'] = [];
      const byFramework: Record<FrameworkId, number> = {} as Record<FrameworkId, number>;
      const byDomain: Record<ComplianceDomain, number> = {} as Record<ComplianceDomain, number>;

      // Initialize counters
      FRAMEWORKS.forEach(fw => { byFramework[fw.id] = 0; });
      COMPLIANCE_DOMAINS.forEach(d => { byDomain[d.id] = 0; });

      MASTER_CONTROLS.forEach(control => {
        const answer = responseMap.get(control.id);
        const isGap = answer === 'no' || answer === null;

        if (isGap) {
          const gapEntry = {
            controlId: control.id,
            title: control.title,
            domain: control.domain,
          };

          if (control.riskLevel === 'critical') {
            criticalGaps.push(gapEntry);
          } else if (control.riskLevel === 'high') {
            highGaps.push(gapEntry);
          } else if (control.riskLevel === 'medium') {
            mediumGaps.push(gapEntry);
          }

          // Count by domain
          byDomain[control.domain]++;

          // Count by framework (control can map to multiple frameworks)
          control.frameworkMappings.forEach(mapping => {
            byFramework[mapping.frameworkId]++;
          });
        }
      });

      return {
        totalGaps: criticalGaps.length + highGaps.length + mediumGaps.length,
        criticalGaps,
        highGaps,
        mediumGaps,
        byFramework,
        byDomain,
      };
    } catch (error) {
      console.error('Failed to get gap analysis:', error);
      return this.getEmptyGapAnalysis();
    }
  }

  /**
   * Create a compliance snapshot for historical tracking
   */
  async createSnapshot(organizationId: string): Promise<ComplianceSnapshot | null> {
    if (!isSupabaseConfigured() || !supabase) {
      return null;
    }

    try {
      const { data: responses } = await supabase
        .from('control_responses')
        .select('control_id, answer')
        .eq('organization_id', organizationId);

      const controlResponses = responses || [];
      const responseMap = new Map(controlResponses.map(r => [r.control_id, r.answer]));

      // Calculate overall metrics
      const implemented = controlResponses.filter(r => r.answer === 'yes').length;
      const partial = controlResponses.filter(r => r.answer === 'partial').length;
      const notImplemented = controlResponses.filter(r => r.answer === 'no').length;
      const notApplicable = controlResponses.filter(r => r.answer === 'na').length;
      const notStarted = controlResponses.filter(r => r.answer === null).length;
      const total = controlResponses.length;
      const applicable = total - notApplicable;

      const overallScore = applicable > 0
        ? Math.round(((implemented + partial * 0.5) / applicable) * 100)
        : 0;

      // Calculate framework scores
      const frameworkScores = this.calculateFrameworkReadiness(controlResponses);

      // Calculate domain scores
      const domainScores: Record<ComplianceDomain, number> = {} as Record<ComplianceDomain, number>;
      COMPLIANCE_DOMAINS.forEach(domain => {
        const domainControls = MASTER_CONTROLS.filter(c => c.domain === domain.id);
        let domainImplemented = 0;
        let domainPartial = 0;
        let domainTotal = 0;

        domainControls.forEach(control => {
          const answer = responseMap.get(control.id);
          if (answer !== 'na') {
            domainTotal++;
            if (answer === 'yes') domainImplemented++;
            else if (answer === 'partial') domainPartial++;
          }
        });

        domainScores[domain.id] = domainTotal > 0
          ? Math.round(((domainImplemented + domainPartial * 0.5) / domainTotal) * 100)
          : 0;
      });

      // Insert snapshot
      const snapshotDate = new Date().toISOString();
      const { data: snapshot, error } = await supabase
        .from('compliance_snapshots')
        .insert({
          organization_id: organizationId,
          snapshot_date: snapshotDate,
          overall_score: overallScore,
          total_controls: total,
          implemented_controls: implemented,
          partial_controls: partial,
          not_implemented_controls: notImplemented,
          not_applicable_controls: notApplicable,
          not_started_controls: notStarted,
          framework_scores: frameworkScores,
          domain_scores: domainScores,
        })
        .select()
        .single();

      if (error) {
        console.error('Failed to create snapshot:', error);
        return null;
      }

      return {
        id: snapshot.id,
        organizationId: snapshot.organization_id,
        snapshotDate: snapshot.snapshot_date,
        overallScore: snapshot.overall_score,
        totalControls: snapshot.total_controls,
        implementedControls: snapshot.implemented_controls,
        partialControls: snapshot.partial_controls,
        notImplementedControls: snapshot.not_implemented_controls,
        notApplicableControls: snapshot.not_applicable_controls,
        notStartedControls: snapshot.not_started_controls,
        frameworkScores: snapshot.framework_scores as Record<FrameworkId, number>,
        domainScores: snapshot.domain_scores as Record<ComplianceDomain, number>,
      };
    } catch (error) {
      console.error('Failed to create snapshot:', error);
      return null;
    }
  }

  /**
   * Get recent activity for an organization
   */
  async getRecentActivity(
    organizationId: string,
    limit = 20
  ): Promise<ActivityLogEntry[]> {
    if (!isSupabaseConfigured() || !supabase) {
      return [];
    }

    try {
      const { data: logs } = await supabase
        .from('audit_log')
        .select(`
          id,
          created_at,
          action,
          resource_type,
          resource_id,
          user_id,
          details
        `)
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false })
        .limit(limit);

      // Get user names for the activity entries
      const userIds = [...new Set((logs || []).map(l => l.user_id).filter(Boolean))];
      const userMap = new Map<string, string>();

      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .in('id', userIds);

        (profiles || []).forEach(p => {
          userMap.set(p.id, p.full_name || p.email || 'Unknown User');
        });
      }

      return (logs || []).map(log => ({
        id: log.id,
        timestamp: log.created_at,
        action: log.action,
        resourceType: log.resource_type,
        resourceId: log.resource_id,
        userId: log.user_id,
        userName: userMap.get(log.user_id) || 'Unknown User',
        details: log.details as Record<string, unknown> || {},
      }));
    } catch (error) {
      console.error('Failed to get recent activity:', error);
      return [];
    }
  }

  /**
   * Get count of upcoming deadlines within the next 30 days
   * Includes: questionnaire due dates, vendor assessments, contract expirations
   */
  private async getUpcomingDeadlinesCount(organizationId: string): Promise<number> {
    if (!isSupabaseConfigured() || !supabase) {
      return 0;
    }

    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    const thirtyDaysStr = thirtyDaysFromNow.toISOString();
    const nowStr = new Date().toISOString();

    let totalDeadlines = 0;

    try {
      // Count questionnaires with upcoming due dates
      const { count: questionnaireCount } = await supabase
        .from('questionnaires')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organizationId)
        .in('status', ['draft', 'in_progress'])
        .gte('due_date', nowStr)
        .lte('due_date', thirtyDaysStr);

      totalDeadlines += questionnaireCount || 0;

      // Count vendor assessments due
      const { count: assessmentCount } = await supabase
        .from('vendors')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organizationId)
        .eq('status', 'active')
        .gte('next_assessment_at', nowStr)
        .lte('next_assessment_at', thirtyDaysStr);

      totalDeadlines += assessmentCount || 0;

      // Count vendor contracts expiring
      const { count: contractCount } = await supabase
        .from('vendors')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organizationId)
        .eq('status', 'active')
        .gte('contract_end_date', nowStr.split('T')[0])
        .lte('contract_end_date', thirtyDaysStr.split('T')[0]);

      totalDeadlines += contractCount || 0;

      return totalDeadlines;
    } catch (error) {
      console.error('Failed to get upcoming deadlines:', error);
      return 0;
    }
  }

  // ============================================================================
  // PRIVATE HELPERS
  // ============================================================================

  private calculateFrameworkReadiness(
    responses: { control_id: string; answer: string | null }[]
  ): Record<FrameworkId, number> {
    const responseMap = new Map(responses.map(r => [r.control_id, r.answer]));
    const frameworkScores: Record<FrameworkId, number> = {} as Record<FrameworkId, number>;

    FRAMEWORKS.forEach(fw => {
      // Get all controls that map to this framework
      const frameworkControls = MASTER_CONTROLS.filter(c =>
        c.frameworkMappings.some(m => m.frameworkId === fw.id)
      );

      let implemented = 0;
      let partial = 0;
      let applicable = 0;

      frameworkControls.forEach(control => {
        const answer = responseMap.get(control.id);
        if (answer !== 'na') {
          applicable++;
          if (answer === 'yes') implemented++;
          else if (answer === 'partial') partial++;
        }
      });

      frameworkScores[fw.id] = applicable > 0
        ? Math.round(((implemented + partial * 0.5) / applicable) * 100)
        : 0;
    });

    return frameworkScores;
  }

  private getScoreFromDaysAgo(
    snapshots: { snapshot_date: string; overall_score: number }[],
    days: number
  ): number | null {
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() - days);
    const targetStr = targetDate.toISOString().split('T')[0];

    // Find the snapshot closest to the target date
    let closestScore: number | null = null;
    let minDiff = Infinity;

    snapshots.forEach(s => {
      const snapshotDate = s.snapshot_date.split('T')[0];
      const diff = Math.abs(new Date(snapshotDate).getTime() - new Date(targetStr).getTime());
      if (diff < minDiff && snapshotDate <= targetStr) {
        minDiff = diff;
        closestScore = s.overall_score;
      }
    });

    return closestScore;
  }

  private getEmptyMetrics(): DashboardMetrics {
    return {
      overallScore: 0,
      scoreChange7d: 0,
      scoreChange30d: 0,
      controlsImplemented: 0,
      controlsTotal: 0,
      criticalGaps: 0,
      highGaps: 0,
      upcomingDeadlines: 0,
      recentActivity: 0,
      frameworkReadiness: {} as Record<FrameworkId, number>,
    };
  }

  private getEmptyGapAnalysis(): GapAnalysis {
    return {
      totalGaps: 0,
      criticalGaps: [],
      highGaps: [],
      mediumGaps: [],
      byFramework: {} as Record<FrameworkId, number>,
      byDomain: {} as Record<ComplianceDomain, number>,
    };
  }
}

// Export singleton instance
export const analyticsService = new AnalyticsService();

export default analyticsService;
