/**
 * Audit Logger with Supabase Integration
 * Logs all critical actions to the audit_logs table
 * Compliant with PIPEDA/PHIPA regulations
 */

import { supabase } from './supabaseClient';

// Simple UUID v4 generation - no external dependency needed
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export interface AuditLogEntry {
  actorId: number;
  action: string;
  resourceType: string;
  resourceId?: string;
  ipAddress?: string;
  userAgent?: string;
  details?: Record<string, unknown>;
}

/**
 * Standard audit action types for healthcare operations
 */
export enum AuditAction {
  VIEW_PATIENT = 'VIEW_PATIENT',
  CREATE_PATIENT = 'CREATE_PATIENT',
  UPDATE_PATIENT = 'UPDATE_PATIENT',
  DELETE_PATIENT = 'DELETE_PATIENT',
  
  CREATE_REFERRAL = 'CREATE_REFERRAL',
  UPDATE_REFERRAL_STATUS = 'UPDATE_REFERRAL_STATUS',
  VERIFY_REFERRAL = 'VERIFY_REFERRAL',
  ACCEPT_REFERRAL = 'ACCEPT_REFERRAL',
  COMPLETE_REFERRAL = 'COMPLETE_REFERRAL',
  
  VIEW_LAB_RESULT = 'VIEW_LAB_RESULT',
  CREATE_LAB_ORDER = 'CREATE_LAB_ORDER',
  UPDATE_LAB_STATUS = 'UPDATE_LAB_STATUS',
  
  PARSE_CLINICAL_TEXT = 'PARSE_CLINICAL_TEXT',
  AI_CONFIDENCE_RECORDED = 'AI_CONFIDENCE_RECORDED',
  
  LOGIN = 'LOGIN',
  LOGOUT = 'LOGOUT',
  FAILED_LOGIN = 'FAILED_LOGIN',
  
  UNAUTHORIZED_ACCESS_ATTEMPT = 'UNAUTHORIZED_ACCESS_ATTEMPT',
}

/**
 * Resource types for audit logging
 */
export enum ResourceType {
  PATIENT = 'patient',
  REFERRAL = 'referral',
  LAB = 'lab',
  USER = 'user',
  AUDIT_LOG = 'audit_log',
}

/**
 * Main audit logging function - inserts directly to Supabase
 * This happens synchronously so clinician sees it in real-time
 */
export async function logAction(entry: AuditLogEntry): Promise<void> {
  try {
    const auditEntry = {
      id: generateUUID(),
      actorId: entry.actorId,
      action: entry.action,
      resourceType: entry.resourceType,
      resourceId: entry.resourceId || null,
      ipAddress: entry.ipAddress || null,
      userAgent: entry.userAgent || null,
      details: entry.details ? JSON.stringify(entry.details) : null,
      timestamp: new Date().toISOString(),
    };

    // Log to console in development
    console.log('[AUDIT]', auditEntry);

    // Insert into Supabase audit_logs table
    const { error } = await supabase
      .from('auditLogs')
      .insert([auditEntry]);

    if (error) {
      console.error('[AUDIT ERROR]', error);
      // Don't throw - audit logging failures shouldn't break the app
      // But do alert in production
      if (process.env.NODE_ENV === 'production') {
        console.error('Critical: Audit logging failed', error);
      }
    }

  } catch (error) {
    console.error('[AUDIT ERROR]', error);
  }
}

/**
 * Convenience wrapper for patient view actions
 */
export async function logPatientView(
  actorId: number,
  patientId: string,
  reason?: string
): Promise<void> {
  return logAction({
    actorId,
    action: AuditAction.VIEW_PATIENT,
    resourceType: ResourceType.PATIENT,
    resourceId: patientId,
    userAgent: navigator.userAgent,
    details: { reason: reason || 'clinical review' },
  });
}

/**
 * Convenience wrapper for referral creation
 */
export async function logReferralCreation(
  actorId: number,
  referralId: string,
  patientId: string,
  specialistDomain: string
): Promise<void> {
  return logAction({
    actorId,
    action: AuditAction.CREATE_REFERRAL,
    resourceType: ResourceType.REFERRAL,
    resourceId: referralId,
    userAgent: navigator.userAgent,
    details: {
      patientId,
      specialistDomain,
      timestamp: new Date().toISOString(),
    },
  });
}

/**
 * Convenience wrapper for referral verification
 */
export async function logReferralVerification(
  actorId: number,
  referralId: string,
  verified: boolean
): Promise<void> {
  return logAction({
    actorId,
    action: verified ? AuditAction.VERIFY_REFERRAL : AuditAction.UPDATE_REFERRAL_STATUS,
    resourceType: ResourceType.REFERRAL,
    resourceId: referralId,
    userAgent: navigator.userAgent,
    details: {
      verified,
      timestamp: new Date().toISOString(),
    },
  });
}

/**
 * Convenience wrapper for AI parsing actions
 */
export async function logAIParse(
  actorId: number,
  referralId: string,
  confidenceScore: number,
  redactionCount: number
): Promise<void> {
  return logAction({
    actorId,
    action: AuditAction.PARSE_CLINICAL_TEXT,
    resourceType: ResourceType.REFERRAL,
    resourceId: referralId,
    userAgent: navigator.userAgent,
    details: {
      confidenceScore,
      redactionCount,
      deidentified: redactionCount > 0,
      timestamp: new Date().toISOString(),
    },
  });
}

/**
 * Convenience wrapper for lab result access
 */
export async function logLabAccess(
  actorId: number,
  labId: string,
  patientId: string
): Promise<void> {
  return logAction({
    actorId,
    action: AuditAction.VIEW_LAB_RESULT,
    resourceType: ResourceType.LAB,
    resourceId: labId,
    userAgent: navigator.userAgent,
    details: {
      patientId,
      timestamp: new Date().toISOString(),
    },
  });
}

/**
 * Convenience wrapper for failed access attempts
 */
export async function logUnauthorizedAccess(
  actorId: number,
  resourceType: string,
  resourceId: string,
  reason: string
): Promise<void> {
  return logAction({
    actorId,
    action: AuditAction.UNAUTHORIZED_ACCESS_ATTEMPT,
    resourceType,
    resourceId,
    userAgent: navigator.userAgent,
    details: {
      reason,
      timestamp: new Date().toISOString(),
    },
  });
}

/**
 * Query audit logs for compliance reporting
 */
export interface AuditQuery {
  actorId?: number;
  resourceType?: string;
  resourceId?: string;
  action?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
}

export async function queryAuditLogs(query: AuditQuery) {
  try {
    let q = supabase.from('auditLogs').select('*');

    if (query.actorId) {
      q = q.eq('actorId', query.actorId);
    }
    if (query.resourceType) {
      q = q.eq('resourceType', query.resourceType);
    }
    if (query.resourceId) {
      q = q.eq('resourceId', query.resourceId);
    }
    if (query.action) {
      q = q.eq('action', query.action);
    }
    if (query.startDate) {
      q = q.gte('timestamp', query.startDate.toISOString());
    }
    if (query.endDate) {
      q = q.lte('timestamp', query.endDate.toISOString());
    }

    q = q.order('timestamp', { ascending: false });

    if (query.limit) {
      q = q.limit(query.limit);
    } else {
      q = q.limit(50);
    }

    const { data, error } = await q;

    if (error) {
      console.error('[AUDIT QUERY ERROR]', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('[AUDIT QUERY ERROR]', error);
    return [];
  }
}
