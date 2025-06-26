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
  | "NEW"             // Document just created, awaiting delivery method selection
  | "ACTIVE"          // Document is in active workflow (includes draft, approved steps)
  | "REJECTED"        // Document has been rejected
  | "COMPLETED"       // Document workflow is complete
  | "CANCELLED"       // Document has been cancelled

// Tracking Status - represents the physical/logistical state
export type TrackingStatus = 
  | "PENDING_PICKUP"      // Waiting to be picked up
  | "IN_TRANSIT"          // Being transported
  | "IN_TRANSIT_REJECTED" // Being transported back (rejected)
  | "DELIVERED"           // Has been delivered
  | "RECEIVED"            // Has been received/confirmed
  | "AWAITING_APPROVAL"   // Waiting for approval action
  | "READY_FOR_NEXT_STEP" // Ready to move to next approval step
  | "HAND_TO_HAND_PENDING" // Hand-to-hand delivery pending confirmation
  | "FINAL_APPROVAL_PENDING" // Final approver hand-to-hand pending admin closure
  | "REJECTED_RETURNED"   // Rejected document returned to originator
  | "CANCELLED_ROUTE"     // Document workflow cancelled
  | "COMPLETED_ROUTE"     // Document workflow completed

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
    documentStatus: "NEW",
    trackingStatus: undefined as any
  },
  "Ready for Pick-up (Drop Off)": {
    documentStatus: "ACTIVE",
    trackingStatus: "PENDING_PICKUP"
  },
  "In Transit (Mail Controller)": {
    documentStatus: "ACTIVE",
    trackingStatus: "IN_TRANSIT"
  },
  "In Transit - Rejected Document": {
    documentStatus: "REJECTED",
    trackingStatus: "IN_TRANSIT_REJECTED"
  },
  "Delivered (Drop Off)": {
    documentStatus: "ACTIVE",
    trackingStatus: "DELIVERED"
  },
  "Delivered (User)": {
    documentStatus: "ACTIVE",
    trackingStatus: "DELIVERED"
  },
  "Delivered (Hand to Hand)": {
    documentStatus: "ACTIVE",
    trackingStatus: "HAND_TO_HAND_PENDING"
  },
  "Final Approval - Hand to Hand": {
    documentStatus: "ACTIVE",
    trackingStatus: "FINAL_APPROVAL_PENDING"
  },
  "Final Approval - Delivered to Originator": {
    documentStatus: "ACTIVE",
    trackingStatus: "FINAL_APPROVAL_PENDING"
  },
  "Received (User)": {
    documentStatus: "ACTIVE",
    trackingStatus: "RECEIVED"
  },
  "Approved by Approver. Pending pickup for next step": {
    documentStatus: "ACTIVE",
    trackingStatus: "PENDING_PICKUP"
  },
  "Approval Complete. Pending return to Originator": {
    documentStatus: "ACTIVE",
    trackingStatus: "PENDING_PICKUP"
  },
  "COMPLETED ROUTE": {
    documentStatus: "COMPLETED",
    trackingStatus: "COMPLETED_ROUTE"
  },
  "CANCELLED ROUTE": {
    documentStatus: "CANCELLED",
    trackingStatus: "CANCELLED_ROUTE"
  },
  "REJECTED ROUTE": {
    documentStatus: "REJECTED",
    trackingStatus: "RECEIVED"
  },
  "REJECTED - Ready for Pickup": {
    documentStatus: "REJECTED",
    trackingStatus: "PENDING_PICKUP"
  },
  "REJECTED - Hand to Hand": {
    documentStatus: "REJECTED",
    trackingStatus: "HAND_TO_HAND_PENDING"
  },
  "REJECTED - Returned to Originator": {
    documentStatus: "REJECTED",
    trackingStatus: "REJECTED_RETURNED"
  },
  "Closed": {
    documentStatus: "COMPLETED",
    trackingStatus: "RECEIVED"
  }
}

// Display configurations for new status system
export const DOCUMENT_STATUS_DISPLAY: Record<DocumentStatusNew, StatusDisplay> = {
  "NEW": {
    text: "New",
    color: "bg-purple-500",
    icon: "📄"
  },
  "ACTIVE": {
    text: "Active",
    color: "bg-blue-500",
    icon: "🔄"
  },
  "REJECTED": {
    text: "Rejected",
    color: "bg-red-500",
    icon: "❌"
  },
  "COMPLETED": {
    text: "Completed",
    color: "bg-emerald-500",
    icon: "🏁"
  },
  "CANCELLED": {
    text: "Cancelled",
    color: "bg-gray-600",
    icon: "🚫"
  }
}

export const TRACKING_STATUS_DISPLAY: Record<TrackingStatus, StatusDisplay> = {
  "PENDING_PICKUP": {
    text: "Pending Pickup",
    color: "bg-yellow-500",
    icon: "📦"
  },
  "IN_TRANSIT": {
    text: "In Transit",
    color: "bg-blue-500",
    icon: "🚚"
  },
  "IN_TRANSIT_REJECTED": {
    text: "Returning to Originator",
    color: "bg-red-500",
    icon: "↩️"
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
  "AWAITING_APPROVAL": {
    text: "Awaiting Approval",
    color: "bg-orange-500",
    icon: "⏳"
  },
  "READY_FOR_NEXT_STEP": {
    text: "Ready for Next Step",
    color: "bg-indigo-500",
    icon: "➡️"
  },
  "HAND_TO_HAND_PENDING": {
    text: "Hand-to-Hand Pending",
    color: "bg-purple-500",
    icon: "🤝"
  },
  "FINAL_APPROVAL_PENDING": {
    text: "Final Approval Pending",
    color: "bg-teal-500",
    icon: "🏆"
  },
  "REJECTED_RETURNED": {
    text: "Rejected - Returned to Originator",
    color: "bg-red-600",
    icon: "🔙"
  },
  "CANCELLED_ROUTE": {
    text: "Cancelled Route",
    color: "bg-gray-600",
    icon: "🚫"
  },
  "COMPLETED_ROUTE": {
    text: "Completed Route",
    color: "bg-emerald-600",
    icon: "🏁"
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
  // Special handling for NEW status - always show as NEW with no tracking status
  if (document.status === "NEW" || document.documentStatus === "NEW") {
    return {
      documentStatus: "NEW",           // Show as "New"
      trackingStatus: undefined as any // Will show as blank
    }
  }
  
  // If dual status is already set, use it
  if (document.documentStatus && document.trackingStatus) {
    return {
      documentStatus: document.documentStatus,
      trackingStatus: document.trackingStatus
    }
  }
  
  // Otherwise convert from legacy status
  return convertLegacyToDualStatus(document.status)
} 