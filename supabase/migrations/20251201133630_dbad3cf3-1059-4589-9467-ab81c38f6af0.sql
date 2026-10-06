-- Create shipments table
CREATE TABLE IF NOT EXISTS public.shipments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  origin TEXT NOT NULL,
  destination TEXT NOT NULL,
  cargo_type TEXT NOT NULL,
  weight NUMERIC NOT NULL,
  volume NUMERIC NOT NULL,
  transport_mode TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create compliance_checks table
CREATE TABLE IF NOT EXISTS public.compliance_checks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shipment_id UUID REFERENCES public.shipments(id) ON DELETE SET NULL,
  user_id UUID,
  document_text TEXT NOT NULL,
  red_flags JSONB DEFAULT '[]'::jsonb,
  hs_code_issues JSONB DEFAULT '[]'::jsonb,
  tariff_risks JSONB DEFAULT '[]'::jsonb,
  missing_docs JSONB DEFAULT '[]'::jsonb,
  country_regulations JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create route_optimizations table
CREATE TABLE IF NOT EXISTS public.route_optimizations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shipment_id UUID REFERENCES public.shipments(id) ON DELETE SET NULL,
  user_id UUID,
  origin TEXT NOT NULL,
  destination TEXT NOT NULL,
  cargo_type TEXT NOT NULL,
  weight NUMERIC NOT NULL,
  volume NUMERIC NOT NULL,
  transport_mode TEXT NOT NULL,
  recommended_route JSONB NOT NULL,
  alternative_routes JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.shipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compliance_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.route_optimizations ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for shipments (public access for now, ready for auth)
CREATE POLICY "Allow public read access to shipments" 
ON public.shipments FOR SELECT 
USING (true);

CREATE POLICY "Allow public insert to shipments" 
ON public.shipments FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Allow public update to shipments" 
ON public.shipments FOR UPDATE 
USING (true);

CREATE POLICY "Allow public delete from shipments" 
ON public.shipments FOR DELETE 
USING (true);

-- Create RLS policies for compliance_checks
CREATE POLICY "Allow public read access to compliance_checks" 
ON public.compliance_checks FOR SELECT 
USING (true);

CREATE POLICY "Allow public insert to compliance_checks" 
ON public.compliance_checks FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Allow public update to compliance_checks" 
ON public.compliance_checks FOR UPDATE 
USING (true);

CREATE POLICY "Allow public delete from compliance_checks" 
ON public.compliance_checks FOR DELETE 
USING (true);

-- Create RLS policies for route_optimizations
CREATE POLICY "Allow public read access to route_optimizations" 
ON public.route_optimizations FOR SELECT 
USING (true);

CREATE POLICY "Allow public insert to route_optimizations" 
ON public.route_optimizations FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Allow public update to route_optimizations" 
ON public.route_optimizations FOR UPDATE 
USING (true);

CREATE POLICY "Allow public delete from route_optimizations" 
ON public.route_optimizations FOR DELETE 
USING (true);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for automatic timestamp updates on shipments
CREATE TRIGGER update_shipments_updated_at
BEFORE UPDATE ON public.shipments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better query performance
CREATE INDEX idx_shipments_user_id ON public.shipments(user_id);
CREATE INDEX idx_shipments_status ON public.shipments(status);
CREATE INDEX idx_shipments_created_at ON public.shipments(created_at DESC);

CREATE INDEX idx_compliance_checks_user_id ON public.compliance_checks(user_id);
CREATE INDEX idx_compliance_checks_shipment_id ON public.compliance_checks(shipment_id);
CREATE INDEX idx_compliance_checks_created_at ON public.compliance_checks(created_at DESC);

CREATE INDEX idx_route_optimizations_user_id ON public.route_optimizations(user_id);
CREATE INDEX idx_route_optimizations_shipment_id ON public.route_optimizations(shipment_id);
CREATE INDEX idx_route_optimizations_created_at ON public.route_optimizations(created_at DESC);