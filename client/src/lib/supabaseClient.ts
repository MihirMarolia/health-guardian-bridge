/**
 * Supabase Client Configuration
 * Initializes the Supabase client with environment variables
 * All database operations go through this client
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables. ' +
    'Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Helper to get current user from Supabase Auth
 */
export async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

/**
 * Helper to get current session
 */
export async function getCurrentSession() {
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

/**
 * Type definitions for database tables
 */
export interface User {
  id: number;
  openId: string;
  name: string | null;
  email: string | null;
  loginMethod: string | null;
  role: 'admin' | 'physician' | 'specialist';
  licenseNumber: string | null;
  twoFactorEnabled: boolean;
  createdAt: string;
  updatedAt: string;
  lastSignedIn: string;
}

export interface Patient {
  id: string;
  healthCardHash: string;
  encryptedName: string;
  dob: string;
  primaryPhysicianId: number;
  createdAt: string;
  updatedAt: string;
}

export interface ServiceRequest {
  id: string;
  patientId: string;
  requesterId: number;
  specialistDomain: string;
  status: 'draft' | 'pending' | 'accepted' | 'completed';
  encryptedClinicalNotes: string;
  aiConfidenceScore: number | null;
  aiReasoningJson: string | null;
  verifiedByPhysician: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Observation {
  id: string;
  patientId: string;
  testType: string;
  resultValue: string | null;
  status: 'ordered' | 'resulted';
  orderedDate: string;
  resultedDate: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AuditLog {
  id: string;
  actorId: number;
  action: string;
  resourceType: string;
  resourceId: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  details: string | null;
  timestamp: string;
}

export interface TimelineEvent {
  id: string;
  patientId: string;
  type: string;
  description: string;
  timestamp: string;
  createdAt: string;
}
