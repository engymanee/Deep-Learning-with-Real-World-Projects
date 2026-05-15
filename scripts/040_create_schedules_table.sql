-- Create schedules table and related tables if they don't exist

-- Create schedule_status enum if it doesn't exist
DO $$ BEGIN
    CREATE TYPE schedule_status AS ENUM ('polling', 'scheduled', 'completed');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- Create schedules table
CREATE TABLE IF NOT EXISTS public.schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  event_date DATE NOT NULL,
  start_time TIME,
  end_time TIME,
  location VARCHAR(255),
  meeting_link VARCHAR(500),
  capacity INTEGER,
  status schedule_status DEFAULT 'scheduled',
  is_poll BOOLEAN DEFAULT FALSE,
  voting_closes_at TIMESTAMP WITH TIME ZONE,
  created_by_admin UUID,
  selected_option_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create schedule_options table
CREATE TABLE IF NOT EXISTS public.schedule_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id UUID NOT NULL REFERENCES public.schedules(id) ON DELETE CASCADE,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  order_number INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create schedule_votes table
CREATE TABLE IF NOT EXISTS public.schedule_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.auth.users(id) ON DELETE CASCADE,
  schedule_id UUID NOT NULL REFERENCES public.schedules(id) ON DELETE CASCADE,
  preferred_option_id UUID NOT NULL REFERENCES public.schedule_options(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, schedule_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_schedules_status ON public.schedules(status);
CREATE INDEX IF NOT EXISTS idx_schedule_options_schedule_id ON public.schedule_options(schedule_id);
CREATE INDEX IF NOT EXISTS idx_schedule_votes_user_id ON public.schedule_votes(user_id);
CREATE INDEX IF NOT EXISTS idx_schedule_votes_schedule_id ON public.schedule_votes(schedule_id);
