-- Run this SQL in your Supabase SQL Editor to create the floor_plans table

CREATE TABLE floor_plans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  school_id TEXT NOT NULL,
  created_by TEXT,
  data JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Ensure one floor plan per school
CREATE UNIQUE INDEX floor_plans_school_id_idx ON floor_plans (school_id);

-- Enable RLS (Row Level Security)
ALTER TABLE floor_plans ENABLE ROW LEVEL SECURITY;

-- Allow anonymous read access
CREATE POLICY "Allow public read access"
  ON floor_plans
  FOR SELECT
  USING (true);

-- Allow anonymous insert/update access for development (adjust for production)
CREATE POLICY "Allow public insert"
  ON floor_plans
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow public update"
  ON floor_plans
  FOR UPDATE
  USING (true);
