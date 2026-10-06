-- Create app_role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  email TEXT,
  full_name TEXT,
  company_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'user',
  UNIQUE (user_id, role)
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function for role checking
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Handle new user creation - create profile and assign default role
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data ->> 'full_name');
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  
  RETURN NEW;
END;
$$;

-- Trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Update profiles updated_at trigger
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Profiles RLS policies
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = user_id);

-- User roles RLS policies
CREATE POLICY "Users can view own roles"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

-- Update existing tables RLS to be user-specific
-- Drop old permissive policies
DROP POLICY IF EXISTS "Allow public read access to shipments" ON public.shipments;
DROP POLICY IF EXISTS "Allow public insert to shipments" ON public.shipments;
DROP POLICY IF EXISTS "Allow public update to shipments" ON public.shipments;
DROP POLICY IF EXISTS "Allow public delete from shipments" ON public.shipments;

DROP POLICY IF EXISTS "Allow public read access to compliance_checks" ON public.compliance_checks;
DROP POLICY IF EXISTS "Allow public insert to compliance_checks" ON public.compliance_checks;
DROP POLICY IF EXISTS "Allow public update to compliance_checks" ON public.compliance_checks;
DROP POLICY IF EXISTS "Allow public delete from compliance_checks" ON public.compliance_checks;

DROP POLICY IF EXISTS "Allow public read access to route_optimizations" ON public.route_optimizations;
DROP POLICY IF EXISTS "Allow public insert to route_optimizations" ON public.route_optimizations;
DROP POLICY IF EXISTS "Allow public update to route_optimizations" ON public.route_optimizations;
DROP POLICY IF EXISTS "Allow public delete from route_optimizations" ON public.route_optimizations;

-- Create user-specific policies for shipments
CREATE POLICY "Users can view own shipments"
  ON public.shipments FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own shipments"
  ON public.shipments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own shipments"
  ON public.shipments FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own shipments"
  ON public.shipments FOR DELETE
  USING (auth.uid() = user_id);

-- Create user-specific policies for compliance_checks
CREATE POLICY "Users can view own compliance_checks"
  ON public.compliance_checks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own compliance_checks"
  ON public.compliance_checks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own compliance_checks"
  ON public.compliance_checks FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own compliance_checks"
  ON public.compliance_checks FOR DELETE
  USING (auth.uid() = user_id);

-- Create user-specific policies for route_optimizations
CREATE POLICY "Users can view own route_optimizations"
  ON public.route_optimizations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own route_optimizations"
  ON public.route_optimizations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own route_optimizations"
  ON public.route_optimizations FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own route_optimizations"
  ON public.route_optimizations FOR DELETE
  USING (auth.uid() = user_id);

-- Create storage bucket for documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', false);

-- Storage policies for documents bucket
CREATE POLICY "Users can upload own documents"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view own documents"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete own documents"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1]);