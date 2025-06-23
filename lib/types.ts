// User types and roles
export type UserRole = "admin" | "mail" | "approver" | "recipient"

export interface User {
  email: string
  role: UserRole
  department?: string
  name?: string
}

// Workflow types
export type WorkflowType = "flow" | "drop"

// Document status types
export type DocumentStatus = 
  | "Ready for Pickup"
  | "In Transit"
  | "With Approver for Review"
  | "Approved by Approver. Pending pickup for next step"
  | "Approval Complete. Pending return to Originator"
  | "Rejected. Awaiting Revision"
  | "Delivered"
  | "Completed and Archived"

// Template field types
export interface TemplateField {
  name: string
  type: 'text' | 'textarea' | 'select' | 'date' | 'number' | 'email'
  label: string
  required: boolean
  defaultValue?: string
  options?: string[] // for select fields
  placeholder?: string
  validation?: {
    min?: number
    max?: number
    pattern?: string
    message?: string
  }
}

// Document templates
export interface DocumentTemplate {
  id: string
  name: string
  description?: string
  category: string
  templateFields: TemplateField[]
  createdBy: string
  createdAt: string
  updatedAt: string
  isPublic: boolean
  isActive: boolean
  usageCount: number
}

export interface CreateTemplateRequest {
  name: string
  description?: string
  category: string
  templateFields: TemplateField[]
  isPublic?: boolean
}

// Approval hierarchy
export interface ApprovalStep {
  order: number
  approverEmail: string
  approverName?: string
  department?: string
  status: "pending" | "approved" | "rejected" | "skipped"
  timestamp?: string
  comments?: string
}

// Document interface
export interface Document {
  id: string
  title: string
  type: string
  description?: string
  workflow: WorkflowType
  status: DocumentStatus
  createdAt: string
  createdBy: string
  updatedAt?: string
  
  // Flow workflow specific
  approvalSteps?: ApprovalStep[]
  currentStepIndex?: number
  rejectionReason?: string
  
  // Drop workflow specific
  recipient?: string
  recipientDepartment?: string
  
  // QR Code data
  qrData: QRCodeData
  
  // Tracking history
  actionHistory: DocumentAction[]
  
  // File attachments (for future implementation)
  attachments?: FileAttachment[]
}

// QR Code data structure
export interface QRCodeData {
  documentId: string
  title: string
  workflow: WorkflowType
  currentStep: string
  expectedRole: UserRole
  expectedUser?: string
  createdAt: string
  version: string // For QR code versioning
}

// Document actions for tracking
export interface DocumentAction {
  id: string
  documentId: string
  action: ActionType
  performedBy: string
  performedAt: string
  location?: string
  comments?: string
  previousStatus?: DocumentStatus
  newStatus: DocumentStatus
}

export type ActionType = 
  | "created"
  | "pickup"
  | "deliver"
  | "receive"
  | "approve"
  | "reject"
  | "return"
  | "close"
  | "revise"

// File attachment interface
export interface FileAttachment {
  id: string
  filename: string
  size: number
  type: string
  uploadedAt: string
  uploadedBy: string
  url?: string
}

// Notification types
export interface Notification {
  id: string
  documentId: string
  recipientEmail: string
  type: NotificationType
  title: string
  message: string
  sentAt: string
  readAt?: string
  urgent?: boolean
}

export type NotificationType = 
  | "document_created"
  | "in_transit"
  | "ready_for_review"
  | "approved"
  | "rejected"
  | "completed"
  | "overdue"

// System settings
export interface SystemSettings {
  emailNotifications: boolean
  autoReminders: boolean
  reminderIntervalHours: number
  maxApprovalDays: number
  allowSelfApproval: boolean
  requireComments: boolean
}

// Cover sheet data
export interface CoverSheetData {
  documentId: string
  title: string
  type: string
  workflow: WorkflowType
  from: string
  fromDepartment?: string
  to: string
  toDepartment?: string
  createdAt: string
  qrCodeBase64: string
  approvalHierarchy?: string[]
  instructions?: string
}

// Scan result interface
export interface ScanResult {
  success: boolean
  document?: Document
  action?: ActionType
  message: string
  nextStep?: string
  timestamp: string
  warnings?: string[]
} 