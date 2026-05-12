-- Create navigation_labels table to store customizable navigation item labels
CREATE TABLE IF NOT EXISTS navigation_labels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dashboard TEXT DEFAULT 'Dashboard',
  about TEXT DEFAULT 'About',
  library TEXT DEFAULT 'Library',
  community TEXT DEFAULT 'Community',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default values if table is empty
INSERT INTO navigation_labels (dashboard, about, library, community)
SELECT 'Dashboard', 'About', 'Library', 'Community'
WHERE NOT EXISTS (SELECT 1 FROM navigation_labels);

-- Enable RLS
ALTER TABLE navigation_labels ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read navigation labels
CREATE POLICY "navigation_labels_select" ON navigation_labels
  FOR SELECT USING (true);

-- Allow only admins to update navigation labels
CREATE POLICY "navigation_labels_update" ON navigation_labels
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );
