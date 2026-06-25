-- Add push delivery tracking columns to notifications table
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS push_delivery_status TEXT DEFAULT 'pending';
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS push_delivery_error TEXT;
