/**
 * Supabase Row Level Security (RLS) Policies
 * Ensures only authorized clinicians can access sensitive data
 * This is the LIABILITY SHIELD - no public access allowed
 */

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE serviceRequests ENABLE ROW LEVEL SECURITY;
ALTER TABLE observations ENABLE ROW LEVEL SECURITY;
ALTER TABLE auditLogs ENABLE ROW LEVEL SECURITY;
ALTER TABLE timelineEvents ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- USERS TABLE POLICIES
-- ============================================================================

-- Users can only read their own record
CREATE POLICY "Users can read own record" ON users
  FOR SELECT
  USING (auth.uid()::text = openId);

-- Only admins can update user roles
CREATE POLICY "Admins can update users" ON users
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE auth.uid()::text = openId AND role = 'admin'
    )
  );

-- ============================================================================
-- PATIENTS TABLE POLICIES
-- ============================================================================

-- Only physicians can read patient records
CREATE POLICY "Physicians can read patients" ON patients
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE auth.uid()::text = openId AND role IN ('admin', 'physician')
    )
  );

-- Only physicians can create patient records
CREATE POLICY "Physicians can create patients" ON patients
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE auth.uid()::text = openId AND role IN ('admin', 'physician')
    )
  );

-- Only physicians can update patient records
CREATE POLICY "Physicians can update patients" ON patients
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE auth.uid()::text = openId AND role IN ('admin', 'physician')
    )
  );

-- ============================================================================
-- SERVICE REQUESTS (REFERRALS) TABLE POLICIES
-- ============================================================================

-- Only physicians can read service requests
CREATE POLICY "Physicians can read service requests" ON serviceRequests
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE auth.uid()::text = openId AND role IN ('admin', 'physician')
    )
  );

-- Only physicians can create service requests
CREATE POLICY "Physicians can create service requests" ON serviceRequests
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE auth.uid()::text = openId AND role IN ('admin', 'physician')
    )
  );

-- Only physicians can update service request status
CREATE POLICY "Physicians can update service requests" ON serviceRequests
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE auth.uid()::text = openId AND role IN ('admin', 'physician')
    )
  );

-- ============================================================================
-- OBSERVATIONS (LABS) TABLE POLICIES
-- ============================================================================

-- Only physicians can read lab results
CREATE POLICY "Physicians can read observations" ON observations
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE auth.uid()::text = openId AND role IN ('admin', 'physician')
    )
  );

-- Only physicians can create lab orders
CREATE POLICY "Physicians can create observations" ON observations
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE auth.uid()::text = openId AND role IN ('admin', 'physician')
    )
  );

-- Only physicians can update lab status
CREATE POLICY "Physicians can update observations" ON observations
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE auth.uid()::text = openId AND role IN ('admin', 'physician')
    )
  );

-- ============================================================================
-- AUDIT LOGS TABLE POLICIES
-- ============================================================================

-- Only physicians can read audit logs (for compliance)
CREATE POLICY "Physicians can read audit logs" ON auditLogs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE auth.uid()::text = openId AND role IN ('admin', 'physician')
    )
  );

-- Only the system can insert audit logs (via triggers or app logic)
CREATE POLICY "System can insert audit logs" ON auditLogs
  FOR INSERT
  WITH CHECK (true);

-- ============================================================================
-- TIMELINE EVENTS TABLE POLICIES
-- ============================================================================

-- Only physicians can read timeline events
CREATE POLICY "Physicians can read timeline events" ON timelineEvents
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE auth.uid()::text = openId AND role IN ('admin', 'physician')
    )
  );

-- Only physicians can create timeline events
CREATE POLICY "Physicians can create timeline events" ON timelineEvents
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE auth.uid()::text = openId AND role IN ('admin', 'physician')
    )
  );

-- ============================================================================
-- AUDIT TRIGGER: Log all critical actions automatically
-- ============================================================================

CREATE OR REPLACE FUNCTION audit_trigger()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO auditLogs (id, actorId, action, resourceType, resourceId, details, timestamp)
  VALUES (
    gen_random_uuid()::text,
    (SELECT id FROM users WHERE openId = auth.uid()::text LIMIT 1),
    TG_ARGV[0],
    TG_ARGV[1],
    COALESCE(NEW.id::text, OLD.id::text),
    jsonb_build_object(
      'old', to_jsonb(OLD),
      'new', to_jsonb(NEW),
      'timestamp', NOW()
    )::text,
    NOW()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on service request creation
CREATE TRIGGER audit_service_request_create
AFTER INSERT ON serviceRequests
FOR EACH ROW
EXECUTE FUNCTION audit_trigger('CREATE_REFERRAL', 'referral');

-- Trigger on service request status update
CREATE TRIGGER audit_service_request_update
AFTER UPDATE ON serviceRequests
FOR EACH ROW
WHEN (OLD.status IS DISTINCT FROM NEW.status)
EXECUTE FUNCTION audit_trigger('UPDATE_REFERRAL_STATUS', 'referral');

-- Trigger on observation creation
CREATE TRIGGER audit_observation_create
AFTER INSERT ON observations
FOR EACH ROW
EXECUTE FUNCTION audit_trigger('CREATE_LAB_ORDER', 'lab');

-- Trigger on observation status update
CREATE TRIGGER audit_observation_update
AFTER UPDATE ON observations
FOR EACH ROW
WHEN (OLD.status IS DISTINCT FROM NEW.status)
EXECUTE FUNCTION audit_trigger('UPDATE_LAB_STATUS', 'lab');

-- ============================================================================
-- ENCRYPTION HELPERS (Optional - for app-level encryption)
-- ============================================================================

-- Function to hash health card numbers (one-way)
CREATE OR REPLACE FUNCTION hash_health_card(card_number TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN encode(digest(card_number, 'sha256'), 'hex');
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to validate health card format before hashing
CREATE OR REPLACE FUNCTION validate_and_hash_health_card(card_number TEXT)
RETURNS TEXT AS $$
BEGIN
  IF card_number ~ '^\d{4}-?\d{3}-?\d{3}$' THEN
    RETURN hash_health_card(card_number);
  ELSE
    RAISE EXCEPTION 'Invalid health card format';
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;
