// User types and roles
export type UserRole = "admin" | "mail" | "approver" | "recipient"

export interface User {
  email: string
  role: UserRole
  department?: string
  name?: string
  dropOffLocation?: string
}

// Workflow types
export type WorkflowType = "flow" | "drop"

// NEW: Dual Status System
// Document Status - represents the approval/business state of the document
export type DocumentStatusNew = 
  | null              // No approval action yet (shown as "–")
  | "PENDING"         // Waiting for approval decision
  | "ACCEPTED"        // Document has been accepted/approved
  | "REJECTED"        // Document has been rejected

// Tracking Status - represents the physical/logistical state  
export type TrackingStatus = 
  | "NEW"                 // Document just created, can edit details
  | "READY_FOR_PICKUP"    // Released for pickup, no more editing
  | "PICKED_UP"           // Document has been picked up
  | "DELIVERED"           // Document has been delivered
  | "RECEIVED"            // Document has been received by recipient
  | "COMPLETED"           // All approvers accepted (workflow complete)
  | "REJECTED"            // Document was rejected (workflow terminated)

// Legacy Document status types (for backward compatibility)
export type DocumentStatus = 
  | "NEW"
  | "Ready for Pick-up (Drop Off)"
  | "In Transit (Mail Controller)"
  | "In Transit - Rejected Document"
  | "Delivered (Drop Off)"
  | "Delivered (User)"
  | "Delivered (Hand to Hand)"
  | "Final Approval - Hand to Hand"
  | "Final Approval - Delivered to Originator"
  | "Received (User)"
  | "Approved by Approver. Pending pickup for next step"
  | "Approval Complete. Pending return to Originator"
  | "COMPLETED ROUTE"
  | "CANCELLED ROUTE"
  | "REJECTED ROUTE"
  | "REJECTED - Ready for Pickup"
  | "REJECTED - Hand to Hand"
  | "REJECTED - Returned to Originator"
  | "Closed"

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
  defaultApprovers: string[]  // ชื่อคนที่ต้องเซ็นเอกสารกำหนดไว้ล่วงหน้า
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
  defaultApprovers: string[]  // ชื่อคนที่ต้องเซ็นเอกสาร
  isPublic?: boolean
}

// Approval hierarchy
export interface ApprovalStep {
  order: number
  approverEmail: string
  approverName?: string
  department?: string
  dropOffLocation?: string
  status: "pending" | "approved" | "rejected" | "skipped"
  timestamp?: string
  comments?: string
}

// Approval mode types
export type ApprovalMode = "sequential" | "flexible"

// Document interface
export interface Document {
  id: string
  title: string
  type: string
  description?: string
  workflow: WorkflowType
  
  // NEW: Dual Status System
  documentStatus?: DocumentStatusNew  // Business/approval status
  trackingStatus?: TrackingStatus     // Physical/logistical status
  
  // Legacy status (for backward compatibility)
  status: DocumentStatus
  
  createdAt: string
  createdBy: string
  createdByDropOffLocation?: string
  updatedAt?: string
  
  // Flow workflow specific
  approvalSteps?: ApprovalStep[]
  currentStepIndex?: number
  rejectionReason?: string
  approvalMode?: ApprovalMode // sequential (default) or flexible
  
  // Drop workflow specific
  recipient?: string
  recipientDepartment?: string
  
  // Revision system
  revision?: DocumentRevision
  
  // QR Code data
  qrData: QRCodeData
  
  // Tracking history
  actionHistory: DocumentAction[]
  
  // Drop off locations (can be overridden by mail controller)
  dropOffLocations?: {
    [stepIndex: string]: {
      defaultLocation: string
      currentLocation: string
      updatedBy?: string
      updatedAt?: string
    }
  }
  
  // File attachments (for future implementation)
  attachments?: FileAttachment[]
}

// Document revision system
export interface DocumentRevision {
  revisionNumber: number
  originalDocumentId: string
  previousRevisionId?: string
  revisionReason: string
  revisedBy: string
  revisedAt: string
  preservedApprovals: PreservedApproval[]
}

export interface PreservedApproval {
  approverEmail: string
  approverName?: string
  approvedAt: string
  comments?: string
  originalDocumentId: string
  preservedFromRevision: number
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
  deliveryMethod?: "drop_off" | "hand_to_hand"
  
  // Legacy status tracking
  previousStatus?: DocumentStatus
  newStatus: DocumentStatus
  
  // NEW: Dual status tracking
  previousDocumentStatus?: DocumentStatusNew
  newDocumentStatus?: DocumentStatusNew
  previousTrackingStatus?: TrackingStatus
  newTrackingStatus?: TrackingStatus
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
  | "cancel"
  | "create_revision"
  | "clone_created"

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

// NEW: Dual Status System Utilities
export interface StatusMapping {
  documentStatus: DocumentStatusNew
  trackingStatus: TrackingStatus
}

export interface StatusDisplay {
  text: string
  color: string
  icon?: string
}

// Status mapping from legacy to new dual status system
export const LEGACY_TO_DUAL_STATUS_MAP: Record<DocumentStatus, StatusMapping> = {
  "NEW": {
    documentStatus: null,  // No approval action yet (–)
    trackingStatus: "NEW"
  },
  "Ready for Pick-up (Drop Off)": {
    documentStatus: null,  // No approval action yet (–)
    trackingStatus: "READY_FOR_PICKUP"
  },
  "In Transit (Mail Controller)": {
    documentStatus: null,  // No approval action yet (–)
    trackingStatus: "PICKED_UP"
  },
  "In Transit - Rejected Document": {
    documentStatus: "REJECTED",
    trackingStatus: "PICKED_UP"
  },
  "Delivered (Drop Off)": {
    documentStatus: null,  // No approval action yet (–)
    trackingStatus: "DELIVERED"
  },
  "Delivered (User)": {
    documentStatus: null,  // No approval action yet (–)  
    trackingStatus: "DELIVERED"
  },
  "Delivered (Hand to Hand)": {
    documentStatus: null,  // No approval action yet (–)
    trackingStatus: "DELIVERED"
  },
  "Final Approval - Hand to Hand": {
    documentStatus: null,  // No approval action yet (–)
    trackingStatus: "COMPLETED"
  },
  "Final Approval - Delivered to Originator": {
    documentStatus: null,  // No approval action yet (–)
    trackingStatus: "COMPLETED"
  },
  "Received (User)": {
    documentStatus: "PENDING",  // Waiting for approval decision
    trackingStatus: "RECEIVED"
  },
  "Approved by Approver. Pending pickup for next step": {
    documentStatus: "ACCEPTED",  // Approved by current approver
    trackingStatus: "READY_FOR_PICKUP"
  },
  "Approval Complete. Pending return to Originator": {
    documentStatus: null,  // All approved, no current pending action (–)
    trackingStatus: "READY_FOR_PICKUP"
  },
  "COMPLETED ROUTE": {
    documentStatus: null,  // Workflow complete (–)
    trackingStatus: "COMPLETED"
  },
  "CANCELLED ROUTE": {
    documentStatus: null,  // Cancelled (–)
    trackingStatus: "REJECTED"
  },
  "REJECTED ROUTE": {
    documentStatus: "REJECTED",
    trackingStatus: "REJECTED"
  },
  "REJECTED - Ready for Pickup": {
    documentStatus: "REJECTED",
    trackingStatus: "READY_FOR_PICKUP"
  },
  "REJECTED - Hand to Hand": {
    documentStatus: "REJECTED",
    trackingStatus: "READY_FOR_PICKUP"
  },
  "REJECTED - Returned to Originator": {
    documentStatus: "REJECTED",
    trackingStatus: "REJECTED"
  },
  "Closed": {
    documentStatus: null,  // Closed/Complete (–)
    trackingStatus: "COMPLETED"
  }
}

// Display configurations for new status system
export const DOCUMENT_STATUS_DISPLAY: Record<string, StatusDisplay> = {
  "null": {
    text: "–",
    color: "bg-gray-400",
    icon: "–"
  },
  "PENDING": {
    text: "Pending",
    color: "bg-orange-500",
    icon: "⏳"
  },
  "ACCEPTED": {
    text: "Accepted",
    color: "bg-green-500",
    icon: "✅"
  },
  "REJECTED": {
    text: "Rejected",
    color: "bg-red-500",
    icon: "❌"
  }
}

export const TRACKING_STATUS_DISPLAY: Record<TrackingStatus, StatusDisplay> = {
  "NEW": {
    text: "NEW",
    color: "bg-purple-500",
    icon: "📄"
  },
  "READY_FOR_PICKUP": {
    text: "Ready for Pick-up",
    color: "bg-yellow-500",
    icon: "📦"
  },
  "PICKED_UP": {
    text: "Picked up",
    color: "bg-blue-500",
    icon: "🚚"
  },
  "DELIVERED": {
    text: "Delivered",
    color: "bg-green-500",
    icon: "📍"
  },
  "RECEIVED": {
    text: "Received",
    color: "bg-emerald-500",
    icon: "✅"
  },
  "COMPLETED": {
    text: "Completed",
    color: "bg-emerald-600",
    icon: "🏁"
  },
  "REJECTED": {
    text: "Rejected",
    color: "bg-red-600",
    icon: "❌"
  }
}

// Utility functions for dual status system
export const convertLegacyToDualStatus = (legacyStatus: DocumentStatus): StatusMapping => {
  return LEGACY_TO_DUAL_STATUS_MAP[legacyStatus] || {
    documentStatus: "ACTIVE",
    trackingStatus: "PENDING_PICKUP"
  }
}

export const getDualStatusFromDocument = (document: Document): StatusMapping => {
  // Special handling for NEW tracking status 
  if (document.status === "NEW" || document.trackingStatus === "NEW") {
    return {
      documentStatus: null,      // No approval action yet (–)
      trackingStatus: "NEW"      // Show as "NEW"
    }
  }
  
  // If dual status is already set, use it
  if (document.documentStatus !== undefined && document.trackingStatus) {
    return {
      documentStatus: document.documentStatus,
      trackingStatus: document.trackingStatus
    }
  }
  
  // Otherwise convert from legacy status
  return convertLegacyToDualStatus(document.status)
} 