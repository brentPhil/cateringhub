-- ============================================================================
-- CREATE FUNCTION TO GET USER METADATA FROM AUTH.USERS
-- ============================================================================
-- This function allows querying auth.users table from the public schema
-- to retrieve user metadata for team member displays
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_user_metadata(user_id UUID)
RETURNS TABLE (
  id UUID,
  email TEXT,
  raw_user_meta_data JSONB
) 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    au.id,
    au.email::TEXT,
    au.raw_user_meta_data
  FROM auth.users au
  WHERE au.id = user_id;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_user_metadata(UUID) TO authenticated;

-- Add comment
COMMENT ON FUNCTION public.get_user_metadata IS 'Retrieves user metadata from auth.users for a given user ID. Used for displaying team member information.';

