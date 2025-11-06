-- ============================================================================
-- CATERINGHUB - PROVIDER TEAM MANAGEMENT SEED DATA
-- ============================================================================
-- This script creates sample data for development and testing
-- 
-- PREREQUISITES:
-- Before running this script, create the following test users via Supabase Auth:
-- 1. owner@test.com (will be provider owner)
-- 2. admin@test.com (will be admin)
-- 3. admin2@test.com (additional admin)
-- 4. staff@test.com (will be staff member)
-- 5. viewer@test.com (will be viewer)
-- 6. customer@test.com (will be customer making bookings)
--
-- After creating users, update the user IDs in the variables below
-- ============================================================================

DO $$
DECLARE
  -- User IDs (UPDATE THESE after creating test users)
  v_owner_id UUID := '63cc10eb-611c-4e76-928e-fb639181e1e6';  -- Replace with actual owner user ID
  v_admin_id UUID := 'afde1174-29ad-4095-b42f-c74168ac8070';  -- Replace with actual admin user ID
  v_admin2_id UUID := 'f09e733f-fb71-45b1-a033-8003d4ad69b0';  -- Replace with actual additional admin user ID
  v_staff_id UUID := '6977ac22-4891-4873-8ba8-3fd0f1981e3d';  -- Replace with actual staff user ID
  v_viewer_id UUID;  -- Will be created or use existing
  v_customer_id UUID;  -- Will be created or use existing
  
  -- Provider and catering provider IDs
  v_provider_id UUID;
  v_catering_provider_id UUID := '6b00a5d5-3908-41b0-afe7-eaa2cb2d1ce4';  -- Existing LeyteCater
  
  -- Invitation IDs
  v_invitation_id UUID;
  
  -- Booking IDs
  v_booking_id UUID;
BEGIN
  RAISE NOTICE 'Starting seed data creation...';
  
  -- ============================================================================
  -- STEP 1: Create Provider Organization
  -- ============================================================================
  
  RAISE NOTICE 'Creating provider organization...';
  
  INSERT INTO public.providers (
    id,
    name,
    description,
    catering_provider_id
  ) VALUES (
    gen_random_uuid(),
    'LeyteCater Team',
    'Professional catering services team serving Eastern Visayas',
    v_catering_provider_id
  )
  RETURNING id INTO v_provider_id;
  
  RAISE NOTICE 'Provider created with ID: %', v_provider_id;
  
  -- Note: The owner membership is automatically created by the trigger
  -- We need to update it to use our designated owner
  
  DELETE FROM public.provider_members WHERE provider_id = v_provider_id;
  
  -- ============================================================================
  -- STEP 2: Create Provider Members with Different Roles
  -- ============================================================================
  
  RAISE NOTICE 'Creating provider members...';
  
  -- Owner (full control)
  INSERT INTO public.provider_members (
    provider_id,
    user_id,
    role,
    status,
    joined_at
  ) VALUES (
    v_provider_id,
    v_owner_id,
    'owner',
    'active',
    NOW() - INTERVAL '90 days'
  );
  RAISE NOTICE 'Created owner member';
  
  -- Admin (can manage team and settings)
  INSERT INTO public.provider_members (
    provider_id,
    user_id,
    role,
    status,
    invited_by,
    invited_at,
    joined_at
  ) VALUES (
    v_provider_id,
    v_admin_id,
    'admin',
    'active',
    v_owner_id,
    NOW() - INTERVAL '60 days',
    NOW() - INTERVAL '59 days'
  );
  RAISE NOTICE 'Created admin member';
  
-- Additional Admin (provider-wide management)
  INSERT INTO public.provider_members (
    provider_id,
    user_id,
    role,
    status,
    invited_by,
    invited_at,
    joined_at
  ) VALUES (
    v_provider_id,
    v_admin2_id,
    'admin',
    'active',
    v_owner_id,
    NOW() - INTERVAL '45 days',
    NOW() - INTERVAL '44 days'
  );
  RAISE NOTICE 'Created additional admin member';
  
  -- Staff (can view assigned bookings only)
  INSERT INTO public.provider_members (
    provider_id,
    user_id,
    role,
    status,
    invited_by,
    invited_at,
    joined_at
  ) VALUES (
    v_provider_id,
    v_staff_id,
    'staff',
    'active',
    v_admin_id,
    NOW() - INTERVAL '30 days',
    NOW() - INTERVAL '29 days'
  );
  RAISE NOTICE 'Created staff member';
  
  -- Viewer (read-only access) - Pending invitation
  -- Note: This will fail if viewer user doesn't exist, which is fine for demo
  BEGIN
    -- Try to get an existing user for viewer role
    SELECT id INTO v_viewer_id FROM auth.users WHERE email LIKE '%viewer%' LIMIT 1;
    
    IF v_viewer_id IS NOT NULL THEN
      INSERT INTO public.provider_members (
        provider_id,
        user_id,
        role,
        status,
        invited_by,
        invited_at
      ) VALUES (
        v_provider_id,
        v_viewer_id,
        'viewer',
        'pending',
        v_admin_id,
        NOW() - INTERVAL '5 days'
      );
      RAISE NOTICE 'Created viewer member (pending)';
    ELSE
      RAISE NOTICE 'Skipping viewer member - no suitable user found';
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Skipping viewer member - error: %', SQLERRM;
  END;
  
  -- ============================================================================
  -- STEP 3: Create Pending Invitations
  -- ============================================================================
  
  RAISE NOTICE 'Creating pending invitations...';
  
  -- Invitation for a new staff member
  INSERT INTO public.provider_invitations (
    provider_id,
    email,
    role,
    invited_by,
    token,
    expires_at
  ) VALUES (
    v_provider_id,
    'newstaff@test.com',
    'staff',
    v_admin_id,
    encode(gen_random_bytes(32), 'hex'),
    NOW() + INTERVAL '7 days'
  );
  RAISE NOTICE 'Created invitation for newstaff@test.com';
  
  -- Invitation for a viewer
  INSERT INTO public.provider_invitations (
    provider_id,
    email,
    role,
    invited_by,
    token,
    expires_at
  ) VALUES (
    v_provider_id,
    'viewer2@test.com',
    'viewer',
    v_owner_id,
    encode(gen_random_bytes(32), 'hex'),
    NOW() + INTERVAL '7 days'
  );
  RAISE NOTICE 'Created invitation for viewer2@test.com';
  
  -- ============================================================================
  -- STEP 4: Create Sample Bookings
  -- ============================================================================
  
  RAISE NOTICE 'Creating sample bookings...';
  
  -- Try to get a customer user
  SELECT id INTO v_customer_id FROM auth.users WHERE email LIKE '%customer%' OR email LIKE '%brent%' LIMIT 1;
  IF v_customer_id IS NULL THEN
    v_customer_id := v_owner_id; -- Fallback to owner
  END IF;
  
  -- Booking 1: Confirmed booking assigned to staff
  INSERT INTO public.bookings (
    provider_id,
    customer_id,
    assigned_to,
    event_date,
    event_time,
    event_type,
    guest_count,
    venue_name,
    venue_address,
    status,
    customer_name,
    customer_email,
    customer_phone,
    estimated_budget,
    confirmed_at
  ) VALUES (
    v_provider_id,
    v_customer_id,
    v_staff_id,
    CURRENT_DATE + INTERVAL '14 days',
    '18:00:00',
    'Wedding Reception',
    150,
    'Grand Ballroom Hotel',
    'Tacloban City, Leyte',
    'confirmed',
    'Juan Dela Cruz',
    'juan@example.com',
    '+63 912 345 6789',
    150000.00,
    NOW() - INTERVAL '3 days'
  );
  RAISE NOTICE 'Created confirmed booking (assigned to staff)';
  
  -- Booking 2: Pending booking (unassigned)
  INSERT INTO public.bookings (
    provider_id,
    customer_id,
    assigned_to,
    event_date,
    event_time,
    event_type,
    guest_count,
    venue_name,
    venue_address,
    status,
    customer_name,
    customer_email,
    customer_phone,
    estimated_budget
  ) VALUES (
    v_provider_id,
    v_customer_id,
    NULL,
    CURRENT_DATE + INTERVAL '21 days',
    '12:00:00',
    'Birthday Party',
    50,
    'Private Residence',
    'Palo, Leyte',
    'pending',
    'Maria Santos',
    'maria@example.com',
    '+63 923 456 7890',
    35000.00
  );
  RAISE NOTICE 'Created pending booking (unassigned)';
  
  -- Booking 3: In progress booking assigned to staff
  INSERT INTO public.bookings (
    provider_id,
    customer_id,
    assigned_to,
    event_date,
    event_time,
    event_type,
    guest_count,
    venue_name,
    venue_address,
    status,
    customer_name,
    customer_email,
    customer_phone,
    estimated_budget,
    confirmed_at
  ) VALUES (
    v_provider_id,
    v_customer_id,
    v_staff_id,
    CURRENT_DATE + INTERVAL '3 days',
    '11:00:00',
    'Corporate Event',
    80,
    'Convention Center',
    'Ormoc City, Leyte',
    'in_progress',
    'ABC Corporation',
    'events@abc.com',
    '+63 934 567 8901',
    75000.00,
    NOW() - INTERVAL '10 days'
  );
  RAISE NOTICE 'Created in-progress booking (assigned to staff)';
  
  -- Booking 4: Completed booking
  INSERT INTO public.bookings (
    provider_id,
    customer_id,
    assigned_to,
    event_date,
    event_time,
    event_type,
    guest_count,
    venue_name,
    venue_address,
    status,
    customer_name,
    customer_email,
    customer_phone,
    estimated_budget,
    confirmed_at,
    completed_at
  ) VALUES (
    v_provider_id,
    v_customer_id,
    v_staff_id,
    CURRENT_DATE - INTERVAL '7 days',
    '19:00:00',
    'Anniversary Celebration',
    100,
    'Garden Venue',
    'Baybay City, Leyte',
    'completed',
    'Pedro & Rosa Martinez',
    'martinez@example.com',
    '+63 945 678 9012',
    95000.00,
    NOW() - INTERVAL '20 days',
    NOW() - INTERVAL '6 days'
  );
  RAISE NOTICE 'Created completed booking';
  
  -- Booking 5: Cancelled booking
  INSERT INTO public.bookings (
    provider_id,
    customer_id,
    assigned_to,
    event_date,
    event_time,
    event_type,
    guest_count,
    venue_name,
    venue_address,
    status,
    customer_name,
    customer_email,
    customer_phone,
    estimated_budget,
    cancelled_at
  ) VALUES (
    v_provider_id,
    v_customer_id,
    NULL,
    CURRENT_DATE + INTERVAL '30 days',
    '17:00:00',
    'Graduation Party',
    60,
    'School Gymnasium',
    'Tanauan, Leyte',
    'cancelled',
    'Teacher Association',
    'teachers@school.edu',
    '+63 956 789 0123',
    45000.00,
    NOW() - INTERVAL '2 days'
  );
  RAISE NOTICE 'Created cancelled booking';
  
  -- ============================================================================
  -- Summary
  -- ============================================================================
  
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Seed data creation completed!';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Provider ID: %', v_provider_id;
  RAISE NOTICE 'Team Members: 4 active (owner, admin, admin, staff)';
  RAISE NOTICE 'Pending Invitations: 2';
  RAISE NOTICE 'Sample Bookings: 5 (1 pending, 1 confirmed, 1 in-progress, 1 completed, 1 cancelled)';
  RAISE NOTICE '========================================';
  
END $$;
