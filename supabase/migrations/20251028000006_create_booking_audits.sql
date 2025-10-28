-- Create booking_audits table for audit trail
CREATE TABLE IF NOT EXISTS public.booking_audits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('insert', 'update', 'delete')),
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_booking_audits_booking_id ON public.booking_audits(booking_id);
CREATE INDEX IF NOT EXISTS idx_booking_audits_created_at ON public.booking_audits(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_booking_audits_actor_id ON public.booking_audits(actor_id);

-- Enable RLS
ALTER TABLE public.booking_audits ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Provider members can view audit logs for their provider's bookings
CREATE POLICY "Provider members can view booking audits"
  ON public.booking_audits
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.bookings b
      WHERE b.id = booking_audits.booking_id
        AND public.is_provider_member(b.provider_id, auth.uid(), 'viewer'::public.provider_role)
    )
  );

-- Function to mask PII in audit payload (supports nested objects for UPDATE operations)
CREATE OR REPLACE FUNCTION public.mask_pii_in_payload(payload JSONB)
RETURNS JSONB
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_result JSONB;
  v_old JSONB;
  v_new JSONB;
BEGIN
  -- Handle NULL payload
  IF payload IS NULL THEN
    RETURN NULL;
  END IF;

  -- Check if this is an UPDATE payload with 'old' and 'new' nested objects
  IF payload ? 'old' AND payload ? 'new' THEN
    -- Recursively mask PII in both old and new objects
    v_old := public.mask_pii_in_single_record(payload->'old');
    v_new := public.mask_pii_in_single_record(payload->'new');

    -- Rebuild the payload with masked nested objects
    v_result := jsonb_build_object(
      'old', v_old,
      'new', v_new
    );

    RETURN v_result;
  ELSE
    -- This is a single record (INSERT or DELETE), mask directly
    RETURN public.mask_pii_in_single_record(payload);
  END IF;
END;
$$;

-- Helper function to mask PII fields in a single record
CREATE OR REPLACE FUNCTION public.mask_pii_in_single_record(record JSONB)
RETURNS JSONB
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  IF record IS NULL THEN
    RETURN NULL;
  END IF;

  -- Mask customer_name, customer_phone, customer_email
  RETURN jsonb_set(
    jsonb_set(
      jsonb_set(
        record,
        '{customer_name}',
        CASE
          WHEN record->>'customer_name' IS NOT NULL
          THEN to_jsonb('***REDACTED***'::text)
          ELSE record->'customer_name'
        END
      ),
      '{customer_phone}',
      CASE
        WHEN record->>'customer_phone' IS NOT NULL
        THEN to_jsonb('***REDACTED***'::text)
        ELSE record->'customer_phone'
      END
    ),
    '{customer_email}',
    CASE
      WHEN record->>'customer_email' IS NOT NULL
      THEN to_jsonb('***REDACTED***'::text)
      ELSE record->'customer_email'
    END
  );
END;
$$;

-- Trigger function to create audit log on booking changes
CREATE OR REPLACE FUNCTION public.audit_booking_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_action TEXT;
  v_payload JSONB;
BEGIN
  -- Determine action
  IF TG_OP = 'INSERT' THEN
    v_action := 'insert';
    v_payload := to_jsonb(NEW);
  ELSIF TG_OP = 'UPDATE' THEN
    v_action := 'update';
    -- Store both old and new values for updates
    v_payload := jsonb_build_object(
      'old', to_jsonb(OLD),
      'new', to_jsonb(NEW)
    );
  ELSIF TG_OP = 'DELETE' THEN
    v_action := 'delete';
    v_payload := to_jsonb(OLD);
  END IF;

  -- Mask PII in payload
  v_payload := public.mask_pii_in_payload(v_payload);

  -- Insert audit record
  INSERT INTO public.booking_audits (
    booking_id,
    action,
    actor_id,
    payload
  ) VALUES (
    COALESCE(NEW.id, OLD.id),
    v_action,
    auth.uid(),
    v_payload
  );

  -- Return appropriate value based on operation
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$;

-- Create trigger on bookings table
DROP TRIGGER IF EXISTS trigger_audit_booking_changes ON public.bookings;
CREATE TRIGGER trigger_audit_booking_changes
  AFTER INSERT OR UPDATE OR DELETE ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_booking_changes();

-- Comment on table and columns
COMMENT ON TABLE public.booking_audits IS 'Audit trail for all booking changes';
COMMENT ON COLUMN public.booking_audits.booking_id IS 'Reference to bookings.id (no FK constraint to preserve audit trail after deletion)';
COMMENT ON COLUMN public.booking_audits.action IS 'Type of change: insert, update, or delete';
COMMENT ON COLUMN public.booking_audits.actor_id IS 'User who performed the action';
COMMENT ON COLUMN public.booking_audits.payload IS 'Masked booking data (PII redacted)';

