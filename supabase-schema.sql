-- Document Tracking System Database Schema
-- Run this SQL in your Supabase SQL Editor

-- Create enums for type safety
CREATE TYPE user_role AS ENUM ('admin', 'mail', 'approver', 'recipient');
CREATE TYPE workflow_type AS ENUM ('flow', 'drop');
CREATE TYPE document_status AS ENUM (
  'Ready for Pickup',
  'In Transit', 
  'With Approver for Review',
  'Approved by Approver. Pending pickup for next step',
  'Approval Complete. Pending return to Originator',
  'Rejected. Awaiting Revision',
  'Delivered',
  'Completed and Archived'
);

-- Users table (for demo purposes - in production you'd use Supabase Auth)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  role user_role NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Documents table
CREATE TABLE documents (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  type TEXT NOT NULL,
  description TEXT,
  workflow workflow_type NOT NULL,
  status document_status NOT NULL DEFAULT 'Ready for Pickup',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by TEXT NOT NULL,
  current_step_index INTEGER DEFAULT 0,
  recipient TEXT,
  rejection_reason TEXT,
  qr_data JSONB NOT NULL,
  approval_steps JSONB,
  action_history JSONB NOT NULL DEFAULT '[]'::jsonb
);

-- Create indexes for better performance
CREATE INDEX idx_documents_created_by ON documents(created_by);
CREATE INDEX idx_documents_status ON documents(status);
CREATE INDEX idx_documents_workflow ON documents(workflow);
CREATE INDEX idx_documents_created_at ON documents(created_at);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);

-- Enable Row Level Security (RLS)
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- RLS Policies for documents
-- Allow all operations for now (you can make this more restrictive based on user roles)
CREATE POLICY "Allow all document operations" ON documents
  FOR ALL USING (true);

-- RLS Policies for users  
CREATE POLICY "Allow all user operations" ON users
  FOR ALL USING (true);

-- Insert demo users
INSERT INTO users (email, role) VALUES
  ('admin@company.com', 'admin'),
  ('mail@company.com', 'mail'),
  ('manager@company.com', 'approver'),
  ('recipient@company.com', 'recipient')
ON CONFLICT (email) DO NOTHING;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers to automatically update updated_at
CREATE TRIGGER update_documents_updated_at 
  BEFORE UPDATE ON documents 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at 
  BEFORE UPDATE ON users 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create a function to get documents by role (for efficient queries)
CREATE OR REPLACE FUNCTION get_documents_by_role(user_email TEXT, user_role user_role)
RETURNS TABLE(
  id TEXT,
  title TEXT,
  type TEXT,
  description TEXT,
  workflow workflow_type,
  status document_status,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  created_by TEXT,
  current_step_index INTEGER,
  recipient TEXT,
  rejection_reason TEXT,
  qr_data JSONB,
  approval_steps JSONB,
  action_history JSONB
) AS $$
BEGIN
  CASE user_role
    WHEN 'admin' THEN
      RETURN QUERY
      SELECT d.* FROM documents d WHERE d.created_by = user_email;
    
    WHEN 'mail' THEN
      RETURN QUERY
      SELECT d.* FROM documents d 
      WHERE d.status IN (
        'Ready for Pickup',
        'In Transit',
        'Approved by Approver. Pending pickup for next step',
        'Approval Complete. Pending return to Originator'
      );
    
    WHEN 'approver' THEN
      RETURN QUERY
      SELECT d.* FROM documents d 
      WHERE d.workflow = 'flow' 
      AND d.approval_steps IS NOT NULL
      AND jsonb_path_exists(
        d.approval_steps, 
        '$[*] ? (@.approverEmail == $email && @.status == "pending")',
        jsonb_build_object('email', user_email)
      );
    
    WHEN 'recipient' THEN
      RETURN QUERY
      SELECT d.* FROM documents d 
      WHERE d.workflow = 'drop' AND d.recipient = user_email;
    
    ELSE
      RETURN;
  END CASE;
END;
$$ LANGUAGE plpgsql; 