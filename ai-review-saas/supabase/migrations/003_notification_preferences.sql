-- Notification Preferences Migration
-- Adds table for user notification settings and email digest preferences

-- Create notification_preferences table
CREATE TABLE IF NOT EXISTS public.notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email_enabled BOOLEAN DEFAULT true,
  email_for_new_reviews BOOLEAN DEFAULT true,
  email_for_responses_needed BOOLEAN DEFAULT true,
  email_for_negative_reviews BOOLEAN DEFAULT true,
  email_digest TEXT CHECK (email_digest IN ('none', 'daily', 'weekly')) DEFAULT 'none',
  digest_send_day INTEGER CHECK (digest_send_day >= 0 AND digest_send_day <= 6),
  digest_send_time TIME DEFAULT '09:00',
  last_digest_sent TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Create indexes for notification_preferences
CREATE INDEX IF NOT EXISTS idx_notification_preferences_user_id ON public.notification_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_preferences_digest ON public.notification_preferences(email_digest) WHERE email_digest IN ('daily', 'weekly');

-- Enable RLS on notification_preferences
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policies for notification_preferences
DROP POLICY IF EXISTS "Users can view own notification preferences" ON public.notification_preferences;
CREATE POLICY "Users can view own notification preferences" ON public.notification_preferences FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage own notification preferences" ON public.notification_preferences;
CREATE POLICY "Users can manage own notification preferences" ON public.notification_preferences FOR ALL USING (auth.uid() = user_id);

-- Helper function to get user notification preferences
CREATE OR REPLACE FUNCTION public.get_notification_preferences(user_uuid UUID)
RETURNS TABLE (
  id UUID,
  email_enabled BOOLEAN,
  email_for_new_reviews BOOLEAN,
  email_for_responses_needed BOOLEAN,
  email_for_negative_reviews BOOLEAN,
  email_digest TEXT,
  digest_send_day INTEGER,
  digest_send_time TIME
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    np.id,
    np.email_enabled,
    np.email_for_new_reviews,
    np.email_for_responses_needed,
    np.email_for_negative_reviews,
    np.email_digest,
    np.digest_send_day,
    np.digest_send_time
  FROM public.notification_preferences np
  WHERE np.user_id = user_uuid;
END;
$$;

-- Helper function to get users eligible for digest
CREATE OR REPLACE FUNCTION public.get_users_for_digest(p_digest_type TEXT, p_day_of_week INTEGER DEFAULT 0)
RETURNS TABLE (
  user_id UUID,
  email TEXT,
  digest_send_time TIME
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF p_digest_type = 'daily' THEN
    RETURN QUERY
    SELECT 
      np.user_id,
      p.email,
      np.digest_send_time
    FROM public.notification_preferences np
    JOIN public.profiles p ON p.id = np.user_id
    WHERE np.email_enabled = true
      AND np.email_digest = 'daily'
      AND (np.last_digest_sent IS NULL OR np.last_digest_sent < NOW() - INTERVAL '1 day');
  ELSIF p_digest_type = 'weekly' THEN
    RETURN QUERY
    SELECT 
      np.user_id,
      p.email,
      np.digest_send_time
    FROM public.notification_preferences np
    JOIN public.profiles p ON p.id = np.user_id
    WHERE np.email_enabled = true
      AND np.email_digest = 'weekly'
      AND np.digest_send_day = p_day_of_week
      AND (np.last_digest_sent IS NULL OR np.last_digest_sent < NOW() - INTERVAL '7 days');
  END IF;
END;
$$;
