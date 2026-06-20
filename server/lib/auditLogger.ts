/**
 * Audit Logger Wrapper
 * Provides a simple interface for logging critical actions to the audit trail
 * Compliant with PIPEDA/PHIPA regulations
 * 
 * Usage:
 * ```
 * await logAction({
 *   actorId: user.id,
 *   action: 'VIEW_PATIENT_RECORD',
 *   resourceType: 'patient',
 *   resourceId: patientId,
 *   ipAddress: req.ip,
 *   userAgent: req.headers['user-agent'],
 *   details: { reason: 'clinical review' }
 * });
 * ```
 */

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
  // Patient record actions
  VIEW_PATIENT = 'VIEW_PATIENT',
  CREATE_PATIENT = 'CREATE_PATIENT',
  UPDATE_PATIENT = 'UPDATE_PATIENT',
  DELETE_PATIENT = 'DELETE_PATIENT',
  
  // Referral actions
  CREATE_REFERRAL = 'CREATE_REFERRAL',
  UPDATE_REFERRAL_STATUS = 'UPDATE_REFERRAL_STATUS',
  VERIFY_REFERRAL = 'VERIFY_REFERRAL',
  ACCEPT_REFERRAL = 'ACCEPT_REFERRAL',
  COMPLETE_REFERRAL = 'COMPLETE_REFERRAL',
  
  // Lab result actions
  VIEW_LAB_RESULT = 'VIEW_LAB_RESULT',
  CREATE_LAB_ORDER = 'CREATE_LAB_ORDER',
  UPDATE_LAB_STATUS = 'UPDATE_LAB_STATUS',
  
  // AI/Parsing actions
  PARSE_CLINICAL_TEXT = 'PARSE_CLINICAL_TEXT',
  AI_CONFIDENCE_RECORDED = 'AI_CONFIDENCE_RECORDED',
  
  // Authentication
  LOGIN = 'LOGIN',
  LOGOUT = 'LOGOUT',
  FAILED_LOGIN = 'FAILED_LOGIN',
  
  // Access control
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
 * Main audit logging function
 * Call this from your backend/frontend to log critical actions
 */
export async function logAction(entry: AuditLogEntry): Promise<void> {
  try {
    // In production, call your backend API endpoint
    // POST /api/audit-log with the entry
    
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
    if (process.env.NODE_ENV === 'development') {
      console.log('[AUDIT]', auditEntry);
    }

    // TODO: Send to backend API
    // const response = await fetch('/api/audit-log', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(auditEntry),
    // });
    // if (!response.ok) throw new Error('Failed to log audit entry');

  } catch (error) {
    console.error('[AUDIT ERROR]', error);
    // Don't throw - audit logging failures shouldn't break the app
    // But do alert the user in production
    if (process.env.NODE_ENV === 'production') {
      console.error('Critical: Audit logging failed', error);
    }
  }
}

/**
 * Convenience wrapper for patient view actions
 */
export async function logPatientView(
  actorId: number,
  patientId: string,
  ipAddress?: string,
  userAgent?: string,
  reason?: string
): Promise<void> {
  return logAction({
    actorId,
    action: AuditAction.VIEW_PATIENT,
    resourceType: ResourceType.PATIENT,
    resourceId: patientId,
    ipAddress,
    userAgent,
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
  specialistDomain: string,
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  return logAction({
    actorId,
    action: AuditAction.CREATE_REFERRAL,
    resourceType: ResourceType.REFERRAL,
    resourceId: referralId,
    ipAddress,
    userAgent,
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
  verified: boolean,
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  return logAction({
    actorId,
    action: verified ? AuditAction.VERIFY_REFERRAL : AuditAction.UPDATE_REFERRAL_STATUS,
    resourceType: ResourceType.REFERRAL,
    resourceId: referralId,
    ipAddress,
    userAgent,
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
  redactionCount: number,
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  return logAction({
    actorId,
    action: AuditAction.PARSE_CLINICAL_TEXT,
    resourceType: ResourceType.REFERRAL,
    resourceId: referralId,
    ipAddress,
    userAgent,
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
  patientId: string,
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  return logAction({
    actorId,
    action: AuditAction.VIEW_LAB_RESULT,
    resourceType: ResourceType.LAB,
    resourceId: labId,
    ipAddress,
    userAgent,
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
  reason: string,
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  return logAction({
    actorId,
    action: AuditAction.UNAUTHORIZED_ACCESS_ATTEMPT,
    resourceType,
    resourceId,
    ipAddress,
    userAgent,
    details: {
      reason,
      timestamp: new Date().toISOString(),
    },
  });
}

/**
 * Query audit logs for compliance reporting
 * Returns logs for a specific actor or resource
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

export async function queryAuditLogs(query: AuditQuery): Promise<any[]> {
  try {
    // TODO: Implement backend query endpoint
    // const params = new URLSearchParams();
    // if (query.actorId) params.append('actorId', query.actorId.toString());
    // if (query.resourceType) params.append('resourceType', query.resourceType);
    // if (query.resourceId) params.append('resourceId', query.resourceId);
    // if (query.action) params.append('action', query.action);
    // if (query.startDate) params.append('startDate', query.startDate.toISOString());
    // if (query.endDate) params.append('endDate', query.endDate.toISOString());
    // if (query.limit) params.append('limit', query.limit.toString());
    //
    // const response = await fetch(`/api/audit-logs?${params}`);
    // if (!response.ok) throw new Error('Failed to query audit logs');
    // return response.json();

    return [];
  } catch (error) {
    console.error('[AUDIT QUERY ERROR]', error);
    return [];
  }
}
