/**
 * Email Service
 *
 * Frontend service for sending emails via Netlify functions.
 * Supports organization invitations, compliance alerts, and notifications.
 *
 * Features:
 * - Organization team invitations
 * - Compliance alert notifications
 * - Contract renewal reminders
 * - Assessment due date notifications
 */

import { supabase, isSupabaseConfigured } from '../lib/supabase';

// ============================================================================
// TYPES
// ============================================================================

export interface SendInviteRequest {
  organizationId: string;
  email: string;
  role: 'admin' | 'member' | 'viewer';
}

export interface SendInviteResponse {
  success: boolean;
  inviteId?: string;
  email?: string;
  role?: string;
  expiresAt?: string;
  emailSent?: boolean;
  inviteLink?: string;
  error?: string;
}

export interface NotificationRequest {
  type: 'compliance_alert' | 'contract_renewal' | 'assessment_due' | 'custom';
  organizationId: string;
  recipients: string[]; // email addresses
  subject: string;
  data: Record<string, unknown>;
}

export interface NotificationResponse {
  success: boolean;
  sent: number;
  failed: number;
  errors?: string[];
}

export interface AlertNotificationData {
  alertTitle: string;
  alertDescription: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  framework?: string;
  controlId?: string;
  actionRequired?: string;
  dueDate?: string;
}

export interface ContractRenewalData {
  vendorName: string;
  contractEndDate: string;
  daysUntilExpiry: number;
  contractValue?: number;
  autoRenewal?: boolean;
}

export interface AssessmentDueData {
  vendorName: string;
  assessmentType: string;
  dueDate: string;
  daysUntilDue: number;
  lastAssessmentDate?: string;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get auth token from Supabase session
 */
async function getAuthToken(): Promise<string | null> {
  if (!isSupabaseConfigured() || !supabase) {
    return null;
  }

  try {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token || null;
  } catch {
    return null;
  }
}

/**
 * Get the base URL for Netlify functions
 */
function getNetlifyFunctionUrl(functionName: string): string {
  // In production, use relative path
  // In development, might need to use full URL
  return `/.netlify/functions/${functionName}`;
}

// ============================================================================
// EMAIL SERVICE
// ============================================================================

class EmailService {
  /**
   * Send organization invitation email
   */
  async sendInvite(request: SendInviteRequest): Promise<SendInviteResponse> {
    const token = await getAuthToken();
    if (!token) {
      return { success: false, error: 'Not authenticated' };
    }

    try {
      const response = await fetch(getNetlifyFunctionUrl('send-invite'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(request),
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.error || `Failed with status ${response.status}`,
        };
      }

      return data;
    } catch (error) {
      console.error('Send invite error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to send invitation',
      };
    }
  }

  /**
   * Send notification emails (compliance alerts, reminders, etc.)
   * This calls the notification Netlify function
   */
  async sendNotification(request: NotificationRequest): Promise<NotificationResponse> {
    const token = await getAuthToken();
    if (!token) {
      return { success: false, sent: 0, failed: request.recipients.length, errors: ['Not authenticated'] };
    }

    try {
      const response = await fetch(getNetlifyFunctionUrl('send-notification'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(request),
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          sent: 0,
          failed: request.recipients.length,
          errors: [data.error || `Failed with status ${response.status}`],
        };
      }

      return data;
    } catch (error) {
      console.error('Send notification error:', error);
      return {
        success: false,
        sent: 0,
        failed: request.recipients.length,
        errors: [error instanceof Error ? error.message : 'Failed to send notification'],
      };
    }
  }

  /**
   * Send compliance alert notification
   */
  async sendComplianceAlert(
    organizationId: string,
    recipients: string[],
    alertData: AlertNotificationData
  ): Promise<NotificationResponse> {
    return this.sendNotification({
      type: 'compliance_alert',
      organizationId,
      recipients,
      subject: `[${alertData.severity.toUpperCase()}] Compliance Alert: ${alertData.alertTitle}`,
      data: alertData as unknown as Record<string, unknown>,
    });
  }

  /**
   * Send contract renewal reminder
   */
  async sendContractRenewalReminder(
    organizationId: string,
    recipients: string[],
    renewalData: ContractRenewalData
  ): Promise<NotificationResponse> {
    return this.sendNotification({
      type: 'contract_renewal',
      organizationId,
      recipients,
      subject: `Contract Renewal Reminder: ${renewalData.vendorName} expires in ${renewalData.daysUntilExpiry} days`,
      data: renewalData as unknown as Record<string, unknown>,
    });
  }

  /**
   * Send assessment due reminder
   */
  async sendAssessmentDueReminder(
    organizationId: string,
    recipients: string[],
    assessmentData: AssessmentDueData
  ): Promise<NotificationResponse> {
    return this.sendNotification({
      type: 'assessment_due',
      organizationId,
      recipients,
      subject: `Assessment Due: ${assessmentData.vendorName} ${assessmentData.assessmentType} due in ${assessmentData.daysUntilDue} days`,
      data: assessmentData as unknown as Record<string, unknown>,
    });
  }

  /**
   * Send custom notification email
   */
  async sendCustomNotification(
    organizationId: string,
    recipients: string[],
    subject: string,
    data: Record<string, unknown>
  ): Promise<NotificationResponse> {
    return this.sendNotification({
      type: 'custom',
      organizationId,
      recipients,
      subject,
      data,
    });
  }

  /**
   * Validate email address format
   */
  isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email) && email.length <= 255;
  }

  /**
   * Validate multiple email addresses
   */
  validateEmails(emails: string[]): { valid: string[]; invalid: string[] } {
    const valid: string[] = [];
    const invalid: string[] = [];

    for (const email of emails) {
      if (this.isValidEmail(email.trim())) {
        valid.push(email.trim().toLowerCase());
      } else {
        invalid.push(email);
      }
    }

    return { valid, invalid };
  }
}

// Export singleton instance
export const emailService = new EmailService();

export default emailService;
