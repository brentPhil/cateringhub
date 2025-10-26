-- ============================================================================
-- CREATE EXPENSES TABLE FOR FINANCIAL TRACKING
-- ============================================================================
-- Migration: 20251028000000_create_expenses_table.sql
-- Date: October 28, 2025
-- Author: CateringHub Development Team
--
-- Purpose:
--   Create expenses table to track provider business expenses for financial
--   analytics and budget management on the dashboard.
--
-- Features:
--   - Track expenses by category (ingredients, fuel, equipment, etc.)
--   - Link expenses to specific bookings (optional)
--   - Support for recurring expenses
--   - Audit trail with created_by tracking
--   - RLS policies scoped to provider membership
--
-- Changes:
--   1. Create expense_category enum
--   2. Create expenses table with proper schema
--   3. Add RLS policies for provider member access
--   4. Create indexes for query performance
--   5. Add triggers for updated_at timestamp
--
-- Estimated Time: < 1 minute
-- ============================================================================

BEGIN;

-- ============================================================================
-- PHASE 1: CREATE ENUM FOR EXPENSE CATEGORIES
-- ============================================================================

-- Create expense category enum
CREATE TYPE public.expense_category AS ENUM (
  'ingredients',
  'fuel',
  'equipment_rental',
  'equipment_purchase',
  'staff_wages',
  'staff_overtime',
  'utilities',
  'marketing',
  'supplies',
  'maintenance',
  'insurance',
  'licenses',
  'other'
);

COMMENT ON TYPE public.expense_category IS 'Categories for expense tracking';

-- ============================================================================
-- PHASE 2: CREATE EXPENSES TABLE
-- ============================================================================

-- Create expenses table
CREATE TABLE IF NOT EXISTS public.expenses (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Foreign keys
  provider_id UUID NOT NULL REFERENCES public.providers(id) ON DELETE CASCADE,
  booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Expense details
  amount NUMERIC(10, 2) NOT NULL CHECK (amount >= 0),
  category public.expense_category NOT NULL,
  description TEXT NOT NULL,
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  
  -- Optional metadata
  receipt_url TEXT,
  notes TEXT,
  tags TEXT[] DEFAULT '{}',
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_amount CHECK (amount >= 0)
);

-- Add table comment
COMMENT ON TABLE public.expenses IS 'Tracks provider business expenses for financial analytics and budget management';

-- Add column comments
COMMENT ON COLUMN public.expenses.id IS 'Unique identifier for the expense';
COMMENT ON COLUMN public.expenses.provider_id IS 'Reference to the provider this expense belongs to';
COMMENT ON COLUMN public.expenses.booking_id IS 'Optional reference to a specific booking this expense is related to';
COMMENT ON COLUMN public.expenses.created_by IS 'User who created this expense record';
COMMENT ON COLUMN public.expenses.amount IS 'Expense amount in PHP';
COMMENT ON COLUMN public.expenses.category IS 'Category of the expense for reporting and analytics';
COMMENT ON COLUMN public.expenses.description IS 'Description of the expense';
COMMENT ON COLUMN public.expenses.expense_date IS 'Date when the expense occurred';
COMMENT ON COLUMN public.expenses.receipt_url IS 'Optional URL to receipt image stored in Supabase Storage';
COMMENT ON COLUMN public.expenses.notes IS 'Additional notes about the expense';
COMMENT ON COLUMN public.expenses.tags IS 'Optional tags for additional categorization';

-- ============================================================================
-- PHASE 3: CREATE INDEXES
-- ============================================================================

-- Index for querying expenses by provider
CREATE INDEX IF NOT EXISTS idx_expenses_provider_id 
ON public.expenses(provider_id);

-- Index for querying expenses by booking
CREATE INDEX IF NOT EXISTS idx_expenses_booking_id 
ON public.expenses(booking_id) 
WHERE booking_id IS NOT NULL;

-- Index for querying expenses by category
CREATE INDEX IF NOT EXISTS idx_expenses_category 
ON public.expenses(category);

-- Index for querying expenses by date
CREATE INDEX IF NOT EXISTS idx_expenses_date 
ON public.expenses(expense_date DESC);

-- Composite index for provider + date range queries (most common)
CREATE INDEX IF NOT EXISTS idx_expenses_provider_date 
ON public.expenses(provider_id, expense_date DESC);

-- Composite index for provider + category analytics
CREATE INDEX IF NOT EXISTS idx_expenses_provider_category 
ON public.expenses(provider_id, category);

-- GIN index for tags array
CREATE INDEX IF NOT EXISTS idx_expenses_tags 
ON public.expenses USING GIN(tags);

-- ============================================================================
-- PHASE 4: CREATE TRIGGERS
-- ============================================================================

-- Create trigger function for updated_at
CREATE OR REPLACE FUNCTION public.update_expenses_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER update_expenses_updated_at
  BEFORE UPDATE ON public.expenses
  FOR EACH ROW
  EXECUTE FUNCTION public.update_expenses_updated_at();

COMMENT ON FUNCTION public.update_expenses_updated_at() IS 
'Automatically updates the updated_at timestamp when an expense record is modified';

-- ============================================================================
-- PHASE 5: ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

-- Policy: Provider members can view expenses for their provider
CREATE POLICY "Provider members can view expenses"
ON public.expenses
FOR SELECT
TO authenticated
USING (
  provider_id IN (
    SELECT pm.provider_id
    FROM public.provider_members pm
    WHERE pm.user_id = auth.uid()
      AND pm.status = 'active'
  )
);

-- Policy: Managers, admins, and owners can insert expenses
CREATE POLICY "Managers and above can create expenses"
ON public.expenses
FOR INSERT
TO authenticated
WITH CHECK (
  provider_id IN (
    SELECT pm.provider_id
    FROM public.provider_members pm
    WHERE pm.user_id = auth.uid()
      AND pm.status = 'active'
      AND pm.role IN ('owner', 'admin', 'manager')
  )
  AND created_by = auth.uid()
);

-- Policy: Managers, admins, and owners can update expenses
CREATE POLICY "Managers and above can update expenses"
ON public.expenses
FOR UPDATE
TO authenticated
USING (
  provider_id IN (
    SELECT pm.provider_id
    FROM public.provider_members pm
    WHERE pm.user_id = auth.uid()
      AND pm.status = 'active'
      AND pm.role IN ('owner', 'admin', 'manager')
  )
)
WITH CHECK (
  provider_id IN (
    SELECT pm.provider_id
    FROM public.provider_members pm
    WHERE pm.user_id = auth.uid()
      AND pm.status = 'active'
      AND pm.role IN ('owner', 'admin', 'manager')
  )
);

-- Policy: Owners and admins can delete expenses
CREATE POLICY "Owners and admins can delete expenses"
ON public.expenses
FOR DELETE
TO authenticated
USING (
  provider_id IN (
    SELECT pm.provider_id
    FROM public.provider_members pm
    WHERE pm.user_id = auth.uid()
      AND pm.status = 'active'
      AND pm.role IN ('owner', 'admin')
  )
);

-- ============================================================================
-- PHASE 6: GRANT PERMISSIONS
-- ============================================================================

-- Grant usage on expense_category enum
GRANT USAGE ON TYPE public.expense_category TO authenticated;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

RAISE NOTICE 'Expenses table created successfully';
RAISE NOTICE 'RLS policies enabled for provider member access';
RAISE NOTICE 'Indexes created for optimal query performance';

COMMIT;

-- ============================================================================
-- ROLLBACK INSTRUCTIONS
-- ============================================================================
-- To rollback this migration, run:
--
-- BEGIN;
-- DROP TABLE IF EXISTS public.expenses CASCADE;
-- DROP FUNCTION IF EXISTS public.update_expenses_updated_at() CASCADE;
-- DROP TYPE IF EXISTS public.expense_category CASCADE;
-- COMMIT;

