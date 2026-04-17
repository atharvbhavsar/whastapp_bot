-- Create WhatsApp Logs Table
CREATE TABLE public.whatsapp_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_phone VARCHAR(50) NOT NULL,
    message_received TEXT,
    ai_reply TEXT,
    media_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    city_slug VARCHAR(50)
);

-- Enable RLS
ALTER TABLE public.whatsapp_logs ENABLE ROW LEVEL SECURITY;

-- Create policy for Admin (Assume bypassing or specific admin auth based policy)
-- For now we just create unrestricted insert/select since our backend uses Service Role
CREATE POLICY "Allow Service Role Full Access" 
ON public.whatsapp_logs 
FOR ALL 
USING (true);
