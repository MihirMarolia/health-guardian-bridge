import { eq, and, desc } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { 
  InsertUser, 
  users, 
  patients, 
  serviceRequests, 
  observations, 
  auditLogs, 
  timelineEvents,
  type Patient,
  type ServiceRequest,
  type Observation,
  type AuditLog,
  type TimelineEvent,
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// Healthcare-specific queries

export async function getPatientById(patientId: string): Promise<Patient | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(patients).where(eq(patients.id, patientId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getServiceRequestsByPatient(patientId: string): Promise<ServiceRequest[]> {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(serviceRequests)
    .where(eq(serviceRequests.patientId, patientId))
    .orderBy(desc(serviceRequests.createdAt));
}

export async function getServiceRequestById(id: string): Promise<ServiceRequest | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(serviceRequests).where(eq(serviceRequests.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createServiceRequest(data: {
  id: string;
  patientId: string;
  requesterId: number;
  specialistDomain: string;
  encryptedClinicalNotes: string;
  aiConfidenceScore?: number;
  aiReasoningJson?: string;
}): Promise<ServiceRequest> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const insertData: any = {
    id: data.id,
    patientId: data.patientId,
    requesterId: data.requesterId,
    specialistDomain: data.specialistDomain,
    encryptedClinicalNotes: data.encryptedClinicalNotes,
    aiReasoningJson: data.aiReasoningJson || null,
    status: "draft",
    verifiedByPhysician: false,
  };

  if (data.aiConfidenceScore !== undefined) {
    insertData.aiConfidenceScore = data.aiConfidenceScore;
  }

  await db.insert(serviceRequests).values(insertData);

  const result = await getServiceRequestById(data.id);
  if (!result) throw new Error("Failed to create service request");
  return result;
}

export async function updateServiceRequestStatus(
  id: string,
  status: "draft" | "pending" | "accepted" | "completed",
  verifiedByPhysician?: boolean
): Promise<ServiceRequest> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const updates: any = { status };
  if (verifiedByPhysician !== undefined) {
    updates.verifiedByPhysician = verifiedByPhysician;
  }

  await db.update(serviceRequests).set(updates).where(eq(serviceRequests.id, id));

  const result = await getServiceRequestById(id);
  if (!result) throw new Error("Failed to update service request");
  return result;
}

export async function getObservationsByPatient(patientId: string): Promise<Observation[]> {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(observations)
    .where(eq(observations.patientId, patientId))
    .orderBy(desc(observations.orderedDate));
}

export async function getTimelineByPatient(patientId: string): Promise<TimelineEvent[]> {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(timelineEvents)
    .where(eq(timelineEvents.patientId, patientId))
    .orderBy(desc(timelineEvents.timestamp));
}

export async function createTimelineEvent(data: {
  id: string;
  patientId: string;
  type: string;
  description: string;
}): Promise<TimelineEvent> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const insertData: any = data;
  await db.insert(timelineEvents).values(insertData);

  const result = await db
    .select()
    .from(timelineEvents)
    .where(eq(timelineEvents.id, data.id))
    .limit(1);

  if (result.length === 0) throw new Error("Failed to create timeline event");
  return result[0];
}

export async function logAuditEvent(data: {
  id: string;
  actorId: number;
  action: string;
  resourceType: string;
  resourceId?: string;
  ipAddress?: string;
  userAgent?: string;
  details?: string;
}): Promise<AuditLog> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.insert(auditLogs).values(data);

  const result = await db
    .select()
    .from(auditLogs)
    .where(eq(auditLogs.id, data.id))
    .limit(1);

  if (result.length === 0) throw new Error("Failed to create audit log");
  return result[0];
}

export async function getAuditLogsByActor(actorId: number, limit: number = 50): Promise<AuditLog[]> {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(auditLogs)
    .where(eq(auditLogs.actorId, actorId))
    .orderBy(desc(auditLogs.timestamp))
    .limit(limit);
}

export async function getAuditLogsByResource(
  resourceType: string,
  resourceId: string
): Promise<AuditLog[]> {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(auditLogs)
    .where(and(eq(auditLogs.resourceType, resourceType), eq(auditLogs.resourceId, resourceId)))
    .orderBy(desc(auditLogs.timestamp));
}
