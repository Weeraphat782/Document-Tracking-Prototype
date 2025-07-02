-- Migration: Add default_approvers column to document_templates table
-- Run this SQL in your Supabase SQL Editor

-- Add default_approvers column to document_templates table
ALTER TABLE document_templates 
ADD COLUMN default_approvers TEXT[] DEFAULT '{}';

-- Update existing templates with default approvers
-- Financial Document Template
UPDATE document_templates 
SET default_approvers = ARRAY['manager@company.com', 'finance@company.com']
WHERE id = 'financial-template';

-- HR Document Template  
UPDATE document_templates
SET default_approvers = ARRAY['manager@company.com', 'hr@company.com']
WHERE id = 'hr-template';

-- Legal Document Template
UPDATE document_templates
SET default_approvers = ARRAY['legal@company.com', 'ceo@company.com']
WHERE id = 'legal-template';

-- Add some missing approver users to users table (if they don't exist)
INSERT INTO users (email, role, drop_off_location) VALUES
  ('finance@company.com', 'approver', 'Finance Department - Floor 10'),
  ('hr@company.com', 'approver', 'HR Department - Floor 7'),
  ('legal@company.com', 'approver', 'Legal Department - Floor 9'),
  ('ceo@company.com', 'approver', 'Executive Office - Floor 15')
ON CONFLICT (email) DO NOTHING;

-- Verify the changes
SELECT id, name, default_approvers 
FROM document_templates 
WHERE default_approvers IS NOT NULL AND array_length(default_approvers, 1) > 0; 