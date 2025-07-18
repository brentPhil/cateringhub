-- Create catering_providers table to store business information
CREATE TABLE public.catering_providers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  
  -- Business Information (Step 1)
  business_name TEXT NOT NULL,
  business_address TEXT,
  logo_url TEXT,
  
  -- Service Details (Step 2)
  description TEXT NOT NULL,
  service_areas TEXT[] NOT NULL DEFAULT '{}',
  sample_menu_url TEXT,
  
  -- Contact Information (Step 3)
  contact_person_name TEXT NOT NULL,
  mobile_number TEXT NOT NULL,
  social_media_links JSONB DEFAULT '{}',
  
  -- Onboarding status
  onboarding_completed BOOLEAN DEFAULT false,
  onboarding_step INTEGER DEFAULT 1,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.catering_providers ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own provider profile"
  ON public.catering_providers FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own provider profile"
  ON public.catering_providers FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own provider profile"
  ON public.catering_providers FOR UPDATE
  USING (auth.uid() = user_id);

-- Allow admins to view all provider profiles
CREATE POLICY "Admins can view all provider profiles"
  ON public.catering_providers FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() 
      AND role = 'admin'
    )
  );

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_catering_providers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER update_catering_providers_updated_at
  BEFORE UPDATE ON public.catering_providers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_catering_providers_updated_at();

-- Create index for faster lookups
CREATE INDEX idx_catering_providers_user_id ON public.catering_providers(user_id);
CREATE INDEX idx_catering_providers_business_name ON public.catering_providers(business_name);
CREATE INDEX idx_catering_providers_service_areas ON public.catering_providers USING GIN(service_areas);
