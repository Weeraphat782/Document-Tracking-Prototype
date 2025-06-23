import { 
  Document, 
  DocumentAction, 
  DocumentStatus, 
  User, 
  UserRole, 
  WorkflowType,
  ApprovalStep,
  ActionType,
  QRCodeData,
  ScanResult,
  DocumentTemplate,
  CreateTemplateRequest,
  Notification
} from './types'
import { DatabaseService } from './database-service'

export class EnhancedDocumentService {
  
  // Document Templates
  static async getDocumentTemplates(userId?: string): Promise<DocumentTemplate[]> {
    return await DatabaseService.getDocumentTemplates(userId)
  }

  // Create template
  static async createTemplate(request: CreateTemplateRequest, createdBy: string): Promise<DocumentTemplate> {
    return await DatabaseService.createTemplate(request, createdBy)
  }

  // Update template
  static async updateTemplate(template: DocumentTemplate): Promise<void> {
    return await DatabaseService.updateTemplate(template)
  }

  // Delete template
  static async deleteTemplate(templateId: string): Promise<void> {
    return await DatabaseService.deleteTemplate(templateId)
  }

  // Delete document
  static async deleteDocument(documentId: string): Promise<void> {
    return await DatabaseService.deleteDocument(documentId)
  }

  // Create new document
  static async createDocument(
    title: string,
    templateId: string,
    workflow: WorkflowType,
    createdBy: string,
    description?: string,
    approvers?: string[],
    recipient?: string
  ): Promise<Document> {
    console.log("About to create document:", title)
    const document = await DatabaseService.createDocument(
      title,
      templateId,
      workflow,
      createdBy,
      description,
      approvers,
      recipient
    )
    console.log("Document creation completed for:", document.id)
    return document
  }

  // Get all documents
  static async getAllDocuments(): Promise<Document[]> {
    try {
      const docs = await DatabaseService.getAllDocuments()
      console.log("Retrieved documents:", docs.length)
      return docs
    } catch (error) {
      console.error("Error retrieving documents:", error)
      return []
    }
  }

  // Get documents for specific user based on role
  static async getDocumentsForUser(user: User): Promise<Document[]> {
    return await DatabaseService.getDocumentsForUser(user)
  }

  // Get document by ID
  static async getDocumentById(id: string): Promise<Document | null> {
    console.log("EnhancedDocumentService.getDocumentById called with ID:", id)
    const doc = await DatabaseService.getDocumentById(id)
    console.log("Document retrieved:", doc ? `${doc.id} - ${doc.title}` : "null")
    return doc
  }

  // Process QR scan and update document
  static async processScan(
    documentId: string, 
    action: ActionType, 
    user: User,
    comments?: string
  ): Promise<ScanResult> {
    console.log("Processing scan:", action, "on", documentId, "by", user.email)

    try {
      // Get the document
      const document = await this.getDocumentById(documentId)
      if (!document) {
        return {
          success: false,
          message: "Document not found",
          timestamp: new Date().toLocaleString()
        }
      }

      // Check role access
      const accessCheck = this.checkRoleAccess(document, action, user)
      if (!accessCheck.allowed) {
        return {
          success: false,
          message: accessCheck.reason || "Access denied",
          timestamp: new Date().toLocaleString()
        }
      }

      // Execute the action
      const result = this.executeAction(document, action, user, comments)
      if (!result.success) {
        return result
      }

      // Update the document in database
      await DatabaseService.updateDocument(result.document!)
      
      console.log("Scan processed successfully:", action, "on", documentId)
      return result

    } catch (error) {
      console.error("Error processing scan:", error)
      return {
        success: false,
        message: "Error processing scan: " + error,
        timestamp: new Date().toLocaleString()
      }
    }
  }

  // Check if user has permission to perform action on document
  private static checkRoleAccess(
    document: Document, 
    action: ActionType, 
    user: User
  ): { allowed: boolean, reason?: string, warnings?: string[] } {
    const warnings: string[] = []

    // Mail controller actions
    if (user.role === "mail") {
      if (!["pickup", "deliver"].includes(action)) {
        return { 
          allowed: false, 
          reason: "Mail controllers can only pickup or deliver documents" 
        }
      }
      return { allowed: true, warnings }
    }

    // Approver actions
    if (user.role === "approver") {
      if (!["receive", "approve", "reject"].includes(action)) {
        return { 
          allowed: false, 
          reason: "Approvers can only receive, approve, or reject documents" 
        }
      }
      return { allowed: true, warnings }
    }

    // Recipient actions
    if (user.role === "recipient") {
      if (action !== "receive") {
        return { 
          allowed: false, 
          reason: "Recipients can only confirm receipt of documents" 
        }
      }
      return { allowed: true, warnings }
    }

    // Admin actions
    if (user.role === "admin") {
      if (!["close", "revise"].includes(action)) {
        return { 
          allowed: false, 
          reason: "Admins can only close or revise documents they created" 
        }
      }
      return { allowed: true, warnings }
    }

    return { allowed: false, reason: "Invalid user role" }
  }

  // Execute the action and update document state
  private static executeAction(
    document: Document, 
    action: ActionType, 
    user: User,
    comments?: string
  ): ScanResult {
    const now = new Date()
    const timestamp = now.toISOString()
    const previousStatus = document.status
    let newStatus: DocumentStatus = document.status

    try {
      switch (action) {
        case "pickup":
          newStatus = "In Transit"
          break
        case "deliver":
          newStatus = "With Approver for Review"
          break
        case "receive":
          newStatus = document.workflow === "flow" ? "With Approver for Review" : "Delivered"
          break
        case "approve":
          if (document.workflow === "flow" && document.approvalSteps) {
            const currentStepIndex = document.currentStepIndex || 0
            document.approvalSteps[currentStepIndex].status = "approved"
            document.approvalSteps[currentStepIndex].timestamp = timestamp
            document.approvalSteps[currentStepIndex].comments = comments
            
            if (currentStepIndex < document.approvalSteps.length - 1) {
              document.currentStepIndex = currentStepIndex + 1
              newStatus = "Approved by Approver. Pending pickup for next step"
            } else {
              newStatus = "Approval Complete. Pending return to Originator"
            }
          }
          break
        case "reject":
          if (document.workflow === "flow" && document.approvalSteps) {
            const currentStepIndex = document.currentStepIndex || 0
            document.approvalSteps[currentStepIndex].status = "rejected"
            document.approvalSteps[currentStepIndex].timestamp = timestamp
            document.approvalSteps[currentStepIndex].comments = comments
            document.rejectionReason = comments
          }
          newStatus = "Rejected. Awaiting Revision"
          break
        case "close":
          newStatus = "Completed and Archived"
          break
        default:
          return {
            success: false,
            message: "Unknown action: " + action,
            timestamp: now.toLocaleString()
          }
      }

      // Update document
      document.status = newStatus
      document.updatedAt = timestamp

      // Add action to history
      const actionRecord: DocumentAction = {
        id: this.generateActionId(),
        documentId: document.id,
        action,
        performedBy: user.email,
        performedAt: timestamp,
        previousStatus,
        newStatus,
        comments
      }
      document.actionHistory.push(actionRecord)

      return {
        success: true,
        document,
        action,
        message: "Action completed successfully",
        timestamp: now.toLocaleString()
      }

    } catch (error) {
      return {
        success: false,
        message: "Error processing action: " + error,
        timestamp: now.toLocaleString()
      }
    }
  }

  // Generate unique action ID
  private static generateActionId(): string {
    const timestamp = Date.now()
    const random = Math.floor(Math.random() * 1000)
    return `ACTION-${timestamp}-${random}`
  }

  // Get workflow status display
  static getStatusDisplay(status: DocumentStatus): { text: string, color: string, icon: string } {
    const statusMap: Record<DocumentStatus, { text: string, color: string, icon: string }> = {
      "Ready for Pickup": { text: "Ready for Pickup", color: "bg-blue-100 text-blue-800", icon: "package" },
      "In Transit": { text: "In Transit", color: "bg-yellow-100 text-yellow-800", icon: "truck" },
      "With Approver for Review": { text: "Under Review", color: "bg-orange-100 text-orange-800", icon: "clock" },
      "Approved by Approver. Pending pickup for next step": { text: "Approved - Next Step", color: "bg-green-100 text-green-800", icon: "check" },
      "Approval Complete. Pending return to Originator": { text: "Approved - Returning", color: "bg-green-100 text-green-800", icon: "check-double" },
      "Rejected. Awaiting Revision": { text: "Rejected", color: "bg-red-100 text-red-800", icon: "x" },
      "Delivered": { text: "Delivered", color: "bg-purple-100 text-purple-800", icon: "check-circle" },
      "Completed and Archived": { text: "Completed", color: "bg-gray-100 text-gray-800", icon: "archive" }
    }
    
    return statusMap[status] || { text: status, color: "bg-gray-100 text-gray-800", icon: "file" }
  }

  // Debug and utility functions
  static async clearAllDocuments(): Promise<void> {
    await DatabaseService.clearAllDocuments()
  }

  static async getStorageStatus() {
    return await DatabaseService.getStorageStatus()
  }

  static async createSampleDocuments(): Promise<void> {
    console.log("Creating sample documents...")
    
    try {
      await this.clearAllDocuments()
      
      const doc1 = await this.createDocument(
        "Purchase Request - New Office Equipment",
        "purchase-request",
        "flow",
        "admin@company.com",
        "Request for new laptops and office chairs",
        ["manager@company.com", "finance@company.com"]
      )
      
      const doc2 = await this.createDocument(
        "Monthly Sales Report",
        "monthly-report",
        "drop", 
        "admin@company.com",
        "Sales report for November",
        undefined,
        "recipient@company.com"
      )

      console.log("Sample documents created successfully!")
      
    } catch (error) {
      console.error("Error creating sample documents:", error)
    }
  }
}

// Make available globally for debugging
if (typeof window !== "undefined") {
  (window as any).EnhancedDocumentService = EnhancedDocumentService
} 