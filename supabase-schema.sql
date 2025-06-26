-- Document Tracking System Database Schema
-- Run this SQL in your Supabase SQL Editor

-- Create enums for type safety
CREATE TYPE user_role AS ENUM ('admin', 'mail', 'approver', 'recipient');
CREATE TYPE workflow_type AS ENUM ('flow', 'drop');
CREATE TYPE approval_mode AS ENUM ('sequential', 'flexible');
CREATE TYPE document_status AS ENUM (
  'NEW',
  'Ready for Pick-up (Drop Off)',
  'In Transit (Mail Controller)',
  'In Transit - Rejected Document',
  'Delivered (Drop Off)',
  'Delivered (User)',
  'Delivered (Hand to Hand)',
  'Final Approval - Hand to Hand',
  'Received (User)',
  'Approved by Approver. Pending pickup for next step',
  'Approval Complete. Pending return to Originator',
  'COMPLETED ROUTE',
  'CANCELLED ROUTE',
  'REJECTED ROUTE',
  'REJECTED - Ready for Pickup',
  'REJECTED - Hand to Hand',
  'Closed'
);

-- Users table (for demo purposes - in production you'd use Supabase Auth)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  role user_role NOT NULL,
  drop_off_location TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Document Templates table
CREATE TABLE document_templates (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  template_fields JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  is_public BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  usage_count INTEGER DEFAULT 0
);

-- Documents table
CREATE TABLE documents (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  type TEXT NOT NULL,
  description TEXT,
  workflow workflow_type NOT NULL,
  status document_status NOT NULL DEFAULT 'Ready for Pick-up (Drop Off)',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by TEXT NOT NULL,
  current_step_index INTEGER DEFAULT 0,
  recipient TEXT,
  rejection_reason TEXT,
  qr_data JSONB NOT NULL,
  approval_steps JSONB,
  action_history JSONB NOT NULL DEFAULT '[]'::jsonb,
  template_id TEXT REFERENCES document_templates(id),
  approval_mode approval_mode DEFAULT 'sequential',
  revision_data JSONB
);

-- Create indexes for better performance
CREATE INDEX idx_documents_created_by ON documents(created_by);
CREATE INDEX idx_documents_status ON documents(status);
CREATE INDEX idx_documents_workflow ON documents(workflow);
CREATE INDEX idx_documents_created_at ON documents(created_at);
CREATE INDEX idx_documents_template_id ON documents(template_id);
CREATE INDEX idx_documents_revision_original ON documents USING GIN ((revision_data->>'originalDocumentId'));
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_templates_created_by ON document_templates(created_by);
CREATE INDEX idx_templates_category ON document_templates(category);
CREATE INDEX idx_templates_is_public ON document_templates(is_public);
CREATE INDEX idx_templates_is_active ON document_templates(is_active);

-- Enable Row Level Security (RLS)
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies for documents
-- Allow all operations for now (you can make this more restrictive based on user roles)
CREATE POLICY "Allow all document operations" ON documents
  FOR ALL USING (true);

-- RLS Policies for users  
CREATE POLICY "Allow all user operations" ON users
  FOR ALL USING (true);

-- RLS Policies for templates
CREATE POLICY "Allow all template operations" ON document_templates
  FOR ALL USING (true);

-- Insert demo users
INSERT INTO users (email, role, drop_off_location) VALUES
  ('admin@company.com', 'admin', 'Admin Office - Floor 12'),
  ('mail@company.com', 'mail', 'Mail Room - Ground Floor'),
  ('manager@company.com', 'approver', 'Manager Office - Floor 8'),
  ('recipient@company.com', 'recipient', 'General Office - Floor 5')
ON CONFLICT (email) DO NOTHING;

-- Insert default templates
INSERT INTO document_templates (id, name, description, category, template_fields, created_by, is_public) VALUES
  (
    'financial-template',
    'Financial Document',
    'Template for financial documents and transactions',
    'Finance',
    '[
      {"name": "amount", "type": "number", "label": "Amount", "required": true, "defaultValue": ""},
      {"name": "currency", "type": "select", "label": "Currency", "required": true, "options": ["USD", "EUR", "THB"], "defaultValue": "USD"},
      {"name": "purpose", "type": "textarea", "label": "Purpose", "required": true, "defaultValue": ""},
      {"name": "requestedBy", "type": "text", "label": "Requested By", "required": true, "defaultValue": ""},
      {"name": "dueDate", "type": "date", "label": "Due Date", "required": false, "defaultValue": ""}
    ]'::jsonb,
    'admin@company.com',
    true
  ),
  (
    'hr-template',
    'HR Document',
    'Template for human resources documents',
    'Human Resources',
    '[
      {"name": "employeeId", "type": "text", "label": "Employee ID", "required": true, "defaultValue": ""},
      {"name": "employeeName", "type": "text", "label": "Employee Name", "required": true, "defaultValue": ""},
      {"name": "department", "type": "select", "label": "Department", "required": true, "options": ["HR", "Finance", "IT", "Operations"], "defaultValue": "HR"},
      {"name": "documentType", "type": "select", "label": "Document Type", "required": true, "options": ["Leave Request", "Performance Review", "Contract Amendment"], "defaultValue": "Leave Request"},
      {"name": "effectiveDate", "type": "date", "label": "Effective Date", "required": true, "defaultValue": ""}
    ]'::jsonb,
    'admin@company.com',
    true
  ),
  (
    'legal-template',
    'Legal Document',
    'Template for legal documents and contracts',
    'Legal',
    '[
      {"name": "contractType", "type": "select", "label": "Contract Type", "required": true, "options": ["NDA", "Service Agreement", "Employment Contract"], "defaultValue": "NDA"},
      {"name": "partyA", "type": "text", "label": "Party A", "required": true, "defaultValue": ""},
      {"name": "partyB", "type": "text", "label": "Party B", "required": true, "defaultValue": ""},
      {"name": "jurisdiction", "type": "text", "label": "Jurisdiction", "required": true, "defaultValue": ""},
      {"name": "expirationDate", "type": "date", "label": "Expiration Date", "required": false, "defaultValue": ""}
    ]'::jsonb,
    'admin@company.com',
    true
  )
ON CONFLICT (id) DO NOTHING;

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

CREATE TRIGGER update_templates_updated_at 
  BEFORE UPDATE ON document_templates 
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
  action_history JSONB,
  template_id TEXT,
  approval_mode approval_mode,
  revision_data JSONB
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