-- Update the handle_new_user function to capture profile images from OAuth providers
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
DECLARE
  avatar_url TEXT;
BEGIN
  -- Check for avatar_url in user metadata (from OAuth providers)
  -- For Google, the avatar URL is in the user's metadata
  IF NEW.raw_user_meta_data->>'avatar_url' IS NOT NULL THEN
    avatar_url := NEW.raw_user_meta_data->>'avatar_url';
  -- For Google specifically, it might also be in the identity provider data
  ELSIF NEW.identities IS NOT NULL AND jsonb_array_length(NEW.identities) > 0 THEN
    -- Check if the identity is from Google
    IF NEW.identities[0]->>'provider' = 'google' THEN
      -- Try to get the picture URL from identity data
      avatar_url := NEW.identities[0]->'identity_data'->>'picture';
    -- Check if the identity is from Facebook
    ELSIF NEW.identities[0]->>'provider' = 'facebook' THEN
      -- Try to get the picture URL from identity data
      avatar_url := NEW.identities[0]->'identity_data'->>'picture';
    END IF;
  ELSE
    avatar_url := NULL;
  END IF;

  -- Insert into public.profiles
  INSERT INTO public.profiles (id, full_name, avatar_url, updated_at)
  VALUES (
    NEW.id, 
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.identities[0]->'identity_data'->>'full_name', NEW.identities[0]->'identity_data'->>'name'), 
    avatar_url, 
    NOW()
  );
  
  -- Assign default 'user' role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
