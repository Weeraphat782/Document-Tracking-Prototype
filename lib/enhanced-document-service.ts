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
  Notification,
  ApprovalMode,
  DocumentRevision,
  PreservedApproval
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
    recipient?: string,
    approvalMode?: ApprovalMode
  ): Promise<Document> {
    console.log("About to create document:", title)
    const document = await DatabaseService.createDocument(
      title,
      templateId,
      workflow,
      createdBy,
      description,
      approvers,
      recipient,
      approvalMode
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
    comments?: string,
    deliveryMethod?: "drop_off" | "hand_to_hand"
  ): Promise<ScanResult> {
    console.log("Processing scan:", action, "on", documentId, "by", user.email, "delivery:", deliveryMethod)

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
        // If there's a forced action, use it instead
        if (accessCheck.forceAction) {
          console.log(`Forcing action from ${action} to ${accessCheck.forceAction}`)
          const result = this.executeAction(document, accessCheck.forceAction, user, comments, deliveryMethod)
          if (result.success) {
            result.message = `Action automatically changed to ${accessCheck.forceAction}: ${accessCheck.reason}`
          }
          if (result.success) {
            await DatabaseService.updateDocument(result.document!)
          }
          return result
        }
        
        return {
          success: false,
          message: accessCheck.reason || "Access denied",
          timestamp: new Date().toLocaleString()
        }
      }

      // Execute the action
      const result = this.executeAction(document, action, user, comments, deliveryMethod)
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
  ): { allowed: boolean, reason?: string, warnings?: string[], forceAction?: ActionType } {
    const warnings: string[] = []

    // Mail controller actions
    if (user.role === "mail") {
      if (!["pickup", "deliver"].includes(action)) {
        return { 
          allowed: false, 
          reason: "Mail controllers can only pickup or deliver documents" 
        }
      }

      // Get mail controller's action history for this document
      const mailActions = document.actionHistory.filter(a => 
        a.performedBy === user.email && 
        ["pickup", "deliver"].includes(a.action)
      )

      // Get the last action by this mail controller
      const lastMailAction = mailActions[mailActions.length - 1]

      // Check if there's been an approval/rejection after the last mail action
      const hasApprovalAfterLastMail = lastMailAction ? 
        document.actionHistory.some(a => 
          ["approve", "reject"].includes(a.action) && 
          new Date(a.performedAt) > new Date(lastMailAction.performedAt)
        ) : false

      // Determine expected action based on workflow state
      let expectedAction: ActionType

      if (mailActions.length === 0) {
        // First scan ever - must pickup
        expectedAction = "pickup"
      } else if (lastMailAction.action === "pickup" && !hasApprovalAfterLastMail) {
        // Last action was pickup and no approval yet - must deliver
        expectedAction = "deliver"
      } else if (hasApprovalAfterLastMail) {
        // There's been approval/rejection after last mail action - must pickup again
        expectedAction = "pickup"
      } else if (lastMailAction.action === "deliver") {
        // Last action was deliver - wait for approval/rejection
        return {
          allowed: false,
          reason: "Document has been delivered. Waiting for approver action."
        }
      } else {
        // Default to pickup
        expectedAction = "pickup"
      }

      // Force the expected action
      if (action !== expectedAction) {
        return {
          allowed: false,
          reason: `Expected action is ${expectedAction}`,
          forceAction: expectedAction
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

      // For flow workflow, check if this approver is in the approval list
      if (document.workflow === "flow" && document.approvalSteps && ["approve", "reject"].includes(action)) {
        const approverStep = document.approvalSteps.find(step => step.approverEmail === user.email)
        
        if (!approverStep) {
          return {
            allowed: false,
            reason: "You are not in the approval list for this document"
          }
        }

        // Check if already processed
        if (approverStep.status !== "pending") {
          return {
            allowed: false,
            reason: `You have already ${approverStep.status} this document`
          }
        }

        // Check approval mode
        if (document.approvalMode === "sequential") {
          // Sequential mode: only current step approver can act
          const currentStepIndex = document.currentStepIndex || 0
          const currentStep = document.approvalSteps[currentStepIndex]
          
          if (currentStep?.approverEmail !== user.email) {
            return {
              allowed: false,
              reason: `Document is currently with ${currentStep?.approverEmail}. Sequential approval required.`
            }
          }
        } else if (document.approvalMode === "flexible") {
          // Flexible mode: any pending approver can act
          warnings.push("Flexible approval mode: You can approve out of order")
        }
      }

      // For approvers, also allow receiving hand-to-hand delivered documents
      if (action === "receive") {
        // Check if this is a hand-to-hand delivery waiting for confirmation
        if (document.status === "Delivered (Hand to Hand)" || document.status === "REJECTED - Hand to Hand") {
          // Check if this approver is the intended recipient
          if (document.workflow === "flow" && document.approvalSteps) {
            const approverStep = document.approvalSteps.find(step => step.approverEmail === user.email)
            if (approverStep) {
              return { allowed: true, warnings: ["Confirming hand-to-hand delivery receipt"] }
            }
          }
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
      if (!["close", "revise", "cancel"].includes(action)) {
        return { 
          allowed: false, 
          reason: "Admins can only close, revise, or cancel documents they created" 
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
    comments?: string,
    deliveryMethod?: "drop_off" | "hand_to_hand"
  ): ScanResult {
    const now = new Date()
    const timestamp = now.toISOString()
    const previousStatus = document.status
    let newStatus: DocumentStatus = document.status

    try {
      switch (action) {
        case "pickup":
          // Check if this is a rejected document being picked up
          if (document.status === "REJECTED - Ready for Pickup") {
            newStatus = "In Transit - Rejected Document"
          } else {
            newStatus = "In Transit (Mail Controller)"
          }
          break
        case "deliver":
          // Check if this is a rejected document being delivered back to creator
          if (document.status === "In Transit - Rejected Document") {
            newStatus = deliveryMethod === "hand_to_hand" ? "REJECTED - Hand to Hand" : "Delivered (Drop Off)"
          } else {
            newStatus = deliveryMethod === "hand_to_hand" ? "Delivered (Hand to Hand)" : "Delivered (Drop Off)"
          }
          break
        case "receive":
          newStatus = "Received (User)"
          break
        case "approve":
          if (document.workflow === "flow" && document.approvalSteps) {
            // Find the approver's step
            const approverStepIndex = document.approvalSteps.findIndex(step => step.approverEmail === user.email)
            
            if (approverStepIndex !== -1) {
              // Mark this approver's step as approved
              document.approvalSteps[approverStepIndex].status = "approved"
              document.approvalSteps[approverStepIndex].timestamp = timestamp
              document.approvalSteps[approverStepIndex].comments = comments
              
              // Check if all approvals are complete
              const allApproved = document.approvalSteps.every(step => step.status === "approved")
              const pendingSteps = document.approvalSteps.filter(step => step.status === "pending")
              
              if (allApproved) {
                // All approvers have approved
                newStatus = deliveryMethod === "hand_to_hand" ? "Final Approval - Hand to Hand" : "Approval Complete. Pending return to Originator"
              } else if (document.approvalMode === "sequential") {
                // Sequential mode: move to next pending step
                const nextPendingIndex = document.approvalSteps.findIndex(step => step.status === "pending")
                if (nextPendingIndex !== -1) {
                  document.currentStepIndex = nextPendingIndex
                }
                if (deliveryMethod === "hand_to_hand") {
                  newStatus = "Delivered (Hand to Hand)"
                } else {
                  newStatus = "Approved by Approver. Pending pickup for next step"
                }
              } else {
                // Flexible mode: document can continue to any remaining approver
                if (deliveryMethod === "hand_to_hand") {
                  newStatus = pendingSteps.length > 0 ? "Delivered (Hand to Hand)" : "Final Approval - Hand to Hand"
                } else {
                  newStatus = pendingSteps.length > 0 
                    ? "Approved by Approver. Pending pickup for next step"
                    : "Approval Complete. Pending return to Originator"
                }
              }
            }
          }
          break
        case "reject":
          if (document.workflow === "flow" && document.approvalSteps) {
            // Find the approver's step
            const approverStepIndex = document.approvalSteps.findIndex(step => step.approverEmail === user.email)
            
            if (approverStepIndex !== -1) {
              document.approvalSteps[approverStepIndex].status = "rejected"
              document.approvalSteps[approverStepIndex].timestamp = timestamp
              document.approvalSteps[approverStepIndex].comments = comments
              document.rejectionReason = comments
            }
          }
          newStatus = deliveryMethod === "hand_to_hand" ? "REJECTED - Hand to Hand" : "REJECTED - Ready for Pickup"
          break
        case "close":
          newStatus = "COMPLETED ROUTE"
          break
        case "cancel":
          newStatus = "CANCELLED ROUTE"
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
        comments,
        deliveryMethod
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
      "NEW": { text: "NEW", color: "bg-blue-600 text-white font-semibold", icon: "file-plus" },
      "Ready for Pick-up (Drop Off)": { text: "Ready for Pick-up (Drop Off)", color: "bg-cyan-600 text-white font-semibold", icon: "package" },
      "In Transit (Mail Controller)": { text: "In Transit (Mail Controller)", color: "bg-yellow-600 text-white font-semibold", icon: "truck" },
      "In Transit - Rejected Document": { text: "In Transit - Rejected Document", color: "bg-red-500 text-white font-semibold", icon: "truck-x" },
      "Delivered (Drop Off)": { text: "Delivered (Drop Off)", color: "bg-purple-600 text-white font-semibold", icon: "building" },
      "Delivered (User)": { text: "Delivered (User)", color: "bg-indigo-600 text-white font-semibold", icon: "user-check" },
      "Delivered (Hand to Hand)": { text: "Delivered (Hand to Hand) - Awaiting Confirmation", color: "bg-indigo-500 text-white font-semibold", icon: "hand" },
      "Final Approval - Hand to Hand": { text: "Final Approval - Ready to Close", color: "bg-green-500 text-white font-semibold", icon: "check-hand" },
      "Received (User)": { text: "Received (User)", color: "bg-orange-600 text-white font-semibold", icon: "clock" },
      "Approved by Approver. Pending pickup for next step": { text: "Approved - Ready for Drop-off", color: "bg-green-600 text-white font-semibold", icon: "check" },
      "Approval Complete. Pending return to Originator": { text: "Approved - Returning", color: "bg-emerald-600 text-white font-semibold", icon: "check-double" },
      "COMPLETED ROUTE": { text: "COMPLETED ROUTE", color: "bg-green-700 text-white font-bold", icon: "check-circle" },
      "CANCELLED ROUTE": { text: "CANCELLED ROUTE", color: "bg-red-600 text-white font-bold", icon: "ban" },
      "REJECTED ROUTE": { text: "REJECTED ROUTE", color: "bg-red-700 text-white font-bold", icon: "x-circle" },
      "REJECTED - Ready for Pickup": { text: "REJECTED - Ready for Pickup", color: "bg-red-700 text-white font-bold", icon: "x-circle" },
      "REJECTED - Hand to Hand": { text: "REJECTED - Hand to Hand - Awaiting Confirmation", color: "bg-red-600 text-white font-bold", icon: "x-hand" },
      "Closed": { text: "Closed", color: "bg-gray-600 text-white font-semibold", icon: "archive" }
    }
    
    return statusMap[status] || { text: status, color: "bg-gray-600 text-white font-semibold", icon: "file" }
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
  // USER MANAGEMENT FUNCTIONS

  // Get all users
  static async getAllUsers(): Promise<User[]> {
    return await DatabaseService.getAllUsers()
  }

  // Get user by email
  static async getUserByEmail(email: string): Promise<User | null> {
    return await DatabaseService.getUserByEmail(email)
  }

  // Get users by role
  static async getUsersByRole(role: UserRole): Promise<User[]> {
    return await DatabaseService.getUsersByRole(role)
  }

  // Update user drop off location
  static async updateUserDropOffLocation(email: string, dropOffLocation: string): Promise<void> {
    return await DatabaseService.updateUserDropOffLocation(email, dropOffLocation)
  }

  // Create revision from rejected document
  static async createRevision(
    originalDocumentId: string,
    revisionReason: string,
    revisedBy: string
  ): Promise<Document> {
    console.log("Creating revision for document:", originalDocumentId)

    try {
      // Get the original document
      const originalDocument = await this.getDocumentById(originalDocumentId)
      if (!originalDocument) {
        throw new Error("Original document not found")
      }

      // Validate that document can be revised (use same logic as canCreateRevision)
      if (!this.canCreateRevision(originalDocument)) {
        throw new Error("Can only create revision from rejected documents")
      }

      // Get approved steps from original document
      const preservedApprovals: PreservedApproval[] = []
      const newApprovalSteps: ApprovalStep[] = []

      if (originalDocument.approvalSteps) {
        originalDocument.approvalSteps.forEach((step, index) => {
          if (step.status === "approved") {
            // Preserve this approval
            preservedApprovals.push({
              approverEmail: step.approverEmail,
              approverName: step.approverName,
              approvedAt: step.timestamp!,
              comments: step.comments,
              originalDocumentId: originalDocumentId,
              preservedFromRevision: originalDocument.revision?.revisionNumber || 1
            })

            // Keep approved status in new document (preserve the approval)
            newApprovalSteps.push({
              ...step,
              status: "approved", // Keep as approved, not skipped
              timestamp: step.timestamp, // Preserve original timestamp
              comments: step.comments ? `${step.comments} [Preserved from revision ${originalDocument.revision?.revisionNumber || 1}]` : `Preserved from revision ${originalDocument.revision?.revisionNumber || 1}`
            })
          } else {
            // Reset pending/rejected steps
            newApprovalSteps.push({
              ...step,
              status: "pending",
              timestamp: undefined,
              comments: undefined
            })
          }
        })
      }

      // Find first pending step for currentStepIndex
      const firstPendingIndex = newApprovalSteps.findIndex(step => step.status === "pending")
      const allApproved = firstPendingIndex === -1

      // Determine document status and current step
      let documentStatus: DocumentStatus
      let currentStepIndex: number
      let qrCurrentStep: string

      if (allApproved) {
        documentStatus = "Approval Complete. Pending return to Originator"
        currentStepIndex = newApprovalSteps.length
        qrCurrentStep = "All Approved - Ready for Completion"
      } else {
        // Check if we're in sequential mode and need to wait for mail pickup
        if (originalDocument.approvalMode === "sequential") {
          const approvedCount = newApprovalSteps.filter(step => step.status === "approved").length
          if (approvedCount > 0) {
            // There are approved steps, so mail needs to pickup for next step
            documentStatus = "Approved by Approver. Pending pickup for next step"
            currentStepIndex = firstPendingIndex
            qrCurrentStep = "Approved - Ready for Pickup to Next Step"
          } else {
            // No approvals yet, ready for initial pickup
            documentStatus = "Ready for Pick-up (Drop Off)"
            currentStepIndex = 0
            qrCurrentStep = "Ready for Pickup"
          }
        } else {
          // Flexible mode - ready for pickup to any pending approver
          documentStatus = "Ready for Pick-up (Drop Off)"
          currentStepIndex = firstPendingIndex
          qrCurrentStep = "Ready for Pickup"
        }
      }

      // Create revision data
      const revisionNumber = (originalDocument.revision?.revisionNumber || 1) + 1
      const revision: DocumentRevision = {
        revisionNumber,
        originalDocumentId,
        previousRevisionId: originalDocument.id,
        revisionReason,
        revisedBy,
        revisedAt: new Date().toISOString(),
        preservedApprovals
      }

      // Generate new document ID
      const newDocumentId = this.generateDocumentId()

      // Create new QR data
      const qrData: QRCodeData = {
        documentId: newDocumentId,
        title: originalDocument.title,
        workflow: originalDocument.workflow,
        currentStep: qrCurrentStep,
        expectedRole: "mail" as UserRole,
        createdAt: new Date().toISOString(),
        version: "1.0"
      }

      // Create revision action
      const revisionAction: DocumentAction = {
        id: this.generateActionId(),
        documentId: newDocumentId,
        action: "create_revision",
        performedBy: revisedBy,
        performedAt: new Date().toISOString(),
        newStatus: documentStatus,
        comments: `Document revised: ${revisionReason}. Preserved ${preservedApprovals.length} approvals.`
      }

      // Create new document
      const newDocument: Document = {
        ...originalDocument,
        id: newDocumentId,
        status: documentStatus,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        approvalSteps: newApprovalSteps,
        currentStepIndex: currentStepIndex,
        rejectionReason: undefined,
        revision,
        qrData,
        actionHistory: [revisionAction]
      }

             // Save new document directly to database
      await DatabaseService.saveRevisionDocument(newDocument)

      // Update original document status to indicate it has been revised
      const originalUpdateAction: DocumentAction = {
        id: this.generateActionId(),
        documentId: originalDocumentId,
        action: "revise",
        performedBy: revisedBy,
        performedAt: new Date().toISOString(),
        previousStatus: originalDocument.status,
        newStatus: "CANCELLED ROUTE",
        comments: `Document revised as ${newDocumentId}`
      }

      const updatedOriginal: Document = {
        ...originalDocument,
        status: "CANCELLED ROUTE",
        updatedAt: new Date().toISOString(),
        actionHistory: [...originalDocument.actionHistory, originalUpdateAction]
      }

      await DatabaseService.updateDocument(updatedOriginal)

      console.log("Revision created successfully:", newDocumentId)
      return newDocument

    } catch (error) {
      console.error("Error creating revision:", error)
      throw error
    }
  }

  // Create editable revision (allows editing approvers and details)
  static async createEditableRevision(
    originalDocumentId: string,
    revisionReason: string,
    revisedBy: string,
    newTitle?: string,
    newDescription?: string,
    newApprovers?: string[],
    newApprovalMode?: ApprovalMode,
    resetAllApprovals?: boolean
  ): Promise<Document> {
    console.log("Creating editable revision for document:", originalDocumentId)

    try {
      // Get the original document
      const originalDocument = await this.getDocumentById(originalDocumentId)
      if (!originalDocument) {
        throw new Error("Original document not found")
      }

      // Validate that document can be revised (use same logic as canCreateRevision)
      if (!this.canCreateRevision(originalDocument)) {
        throw new Error("Can only create revision from rejected documents")
      }

      // Handle approval preservation based on resetAllApprovals flag
      const preservedApprovals: PreservedApproval[] = []
      const originalApprovedEmails = new Set<string>()

      // If not resetting all approvals, preserve existing approved ones
      if (!resetAllApprovals && originalDocument.approvalSteps) {
        originalDocument.approvalSteps.forEach(step => {
          if (step.status === "approved") {
            preservedApprovals.push({
              approverEmail: step.approverEmail,
              approverName: step.approverName,
              approvedAt: step.timestamp!,
              comments: step.comments,
              originalDocumentId: originalDocumentId,
              preservedFromRevision: originalDocument.revision?.revisionNumber || 1
            })
            originalApprovedEmails.add(step.approverEmail)
          }
        })
      }

      // Create new approval steps
      const finalApprovers = newApprovers || (originalDocument.approvalSteps?.map(step => step.approverEmail) || [])
      const newApprovalSteps: ApprovalStep[] = []

      for (let i = 0; i < finalApprovers.length; i++) {
        const approverEmail = finalApprovers[i]
        const approverUser = await this.getUserByEmail(approverEmail)
        
        // Check if this approver was previously approved and we're not resetting all
        const wasApproved = !resetAllApprovals && originalApprovedEmails.has(approverEmail)
        
        if (wasApproved) {
          // Preserve the approval
          const originalApproval = preservedApprovals.find(p => p.approverEmail === approverEmail)
          newApprovalSteps.push({
            order: i + 1,
            approverEmail: approverEmail,
            approverName: originalApproval?.approverName || approverUser?.name || approverEmail,
            status: "approved",
            timestamp: originalApproval?.approvedAt,
            comments: originalApproval?.comments ? 
              `${originalApproval.comments} [Preserved from revision ${originalDocument.revision?.revisionNumber || 1}]` : 
              `Preserved from revision ${originalDocument.revision?.revisionNumber || 1}`
          })
        } else {
          // New approver or reset approval
          newApprovalSteps.push({
            order: i + 1,
            approverEmail: approverEmail,
            approverName: approverUser?.name || approverEmail,
            status: "pending",
            timestamp: undefined,
            comments: undefined
          })
        }
      }

      // Calculate document status based on approval states
      const finalApprovalMode = newApprovalMode || originalDocument.approvalMode || "sequential"
      
      // Find first pending step for currentStepIndex
      const firstPendingIndex = newApprovalSteps.findIndex(step => step.status === "pending")
      const allApproved = firstPendingIndex === -1

      // Determine document status and current step
      let documentStatus: DocumentStatus
      let currentStepIndex: number
      let qrCurrentStep: string

      if (allApproved) {
        documentStatus = "Approval Complete. Pending return to Originator"
        currentStepIndex = newApprovalSteps.length
        qrCurrentStep = "All Approved - Ready for Completion"
      } else {
        // Check if we're in sequential mode and need to wait for mail pickup
        if (finalApprovalMode === "sequential") {
          const approvedCount = newApprovalSteps.filter(step => step.status === "approved").length
          if (approvedCount > 0) {
            // There are approved steps, so mail needs to pickup for next step
            documentStatus = "Approved by Approver. Pending pickup for next step"
            currentStepIndex = firstPendingIndex
            qrCurrentStep = "Approved - Ready for Pickup to Next Step"
          } else {
            // No approvals yet, ready for initial pickup
            documentStatus = "Ready for Pick-up (Drop Off)"
            currentStepIndex = 0
            qrCurrentStep = "Ready for Pickup"
          }
        } else {
          // Flexible mode - ready for pickup to any pending approver
          documentStatus = "Ready for Pick-up (Drop Off)"
          currentStepIndex = firstPendingIndex
          qrCurrentStep = "Ready for Pickup"
        }
      }

      // Create revision data
      const revisionNumber = (originalDocument.revision?.revisionNumber || 1) + 1
      const revision: DocumentRevision = {
        revisionNumber,
        originalDocumentId,
        previousRevisionId: originalDocument.id,
        revisionReason,
        revisedBy,
        revisedAt: new Date().toISOString(),
        preservedApprovals
      }

      // Generate new document ID
      const newDocumentId = this.generateDocumentId()

      // Create new QR data
      const qrData: QRCodeData = {
        documentId: newDocumentId,
        title: newTitle || originalDocument.title,
        workflow: originalDocument.workflow,
        currentStep: qrCurrentStep,
        expectedRole: "mail" as UserRole,
        createdAt: new Date().toISOString(),
        version: "1.0"
      }

      // Create revision action
      const revisionAction: DocumentAction = {
        id: this.generateActionId(),
        documentId: newDocumentId,
        action: "create_revision",
        performedBy: revisedBy,
        performedAt: new Date().toISOString(),
        newStatus: documentStatus,
        comments: `Document revised with edits: ${revisionReason}. ${resetAllApprovals ? 'All approvals reset - all approvers must approve again' : `Preserved ${preservedApprovals.length} approvals`}. Total approvers: ${finalApprovers.length}.`
      }

      // Create new document with edits
      const newDocument: Document = {
        ...originalDocument,
        id: newDocumentId,
        title: newTitle || originalDocument.title,
        description: newDescription || originalDocument.description,
        status: documentStatus,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        approvalSteps: newApprovalSteps,
        approvalMode: finalApprovalMode,
        currentStepIndex: currentStepIndex,
        rejectionReason: undefined,
        revision,
        qrData,
        actionHistory: [revisionAction]
      }

      // Save new document directly to database
      await DatabaseService.saveRevisionDocument(newDocument)

      // Update original document status to indicate it has been revised
      const originalUpdateAction: DocumentAction = {
        id: this.generateActionId(),
        documentId: originalDocumentId,
        action: "revise",
        performedBy: revisedBy,
        performedAt: new Date().toISOString(),
        previousStatus: originalDocument.status,
        newStatus: "CANCELLED ROUTE",
        comments: `Document revised with edits as ${newDocumentId}`
      }

      const updatedOriginal: Document = {
        ...originalDocument,
        status: "CANCELLED ROUTE",
        updatedAt: new Date().toISOString(),
        actionHistory: [...originalDocument.actionHistory, originalUpdateAction]
      }

      await DatabaseService.updateDocument(updatedOriginal)

      console.log("Editable revision created successfully:", newDocumentId)
      return newDocument

    } catch (error) {
      console.error("Error creating editable revision:", error)
      throw error
    }
  }

  // Get revision history for a document
  static async getRevisionHistory(documentId: string): Promise<Document[]> {
    const allDocuments = await this.getAllDocuments()
    const revisionChain: Document[] = []

    // Find the original document
    let currentDoc = allDocuments.find(doc => doc.id === documentId)
    if (!currentDoc) return []

    // Follow the revision chain backwards
    while (currentDoc) {
      revisionChain.unshift(currentDoc)
      
      if (currentDoc.revision?.previousRevisionId) {
        currentDoc = allDocuments.find(doc => doc.id === currentDoc!.revision!.previousRevisionId)
      } else {
        break
      }
    }

    // Find all forward revisions
    let latestDoc = allDocuments.find(doc => doc.id === documentId)
    if (latestDoc) {
      const forwardRevisions = allDocuments.filter(doc => 
        doc.revision?.originalDocumentId === latestDoc!.revision?.originalDocumentId ||
        doc.revision?.originalDocumentId === latestDoc!.id
      ).sort((a, b) => (a.revision?.revisionNumber || 0) - (b.revision?.revisionNumber || 0))

      // Add forward revisions that aren't already included
      forwardRevisions.forEach(doc => {
        if (!revisionChain.find(existing => existing.id === doc.id)) {
          revisionChain.push(doc)
        }
      })
    }

    return revisionChain
  }

  // Check if document can be revised
  static canCreateRevision(document: Document): boolean {
    // Check if document has been rejected at some point
    const hasBeenRejected = document.actionHistory.some(action => action.action === "reject")
    
    // Allow revision if:
    // 1. Document has been rejected at some point, AND
    // 2. Document is flow workflow, AND  
    // 3. Document has approval steps, AND
    // 4. Some approvers have already approved (so we can preserve approvals), AND
    // 5. Document is not completed/cancelled/archived
    const notFinalStatus = !["COMPLETED ROUTE", "CANCELLED ROUTE", "Closed"].includes(document.status)
    
    return hasBeenRejected && 
           document.workflow === "flow" &&
           !!document.approvalSteps &&
           document.approvalSteps.some(step => step.status === "approved") &&
           notFinalStatus
  }

  private static generateDocumentId(): string {
    const timestamp = Date.now().toString()
    const random = Math.random().toString(36).substring(2, 8)
    return `DOC-${timestamp}-${random}`.toUpperCase()
  }

  // Check if mail controller should be forced to pickup
  static shouldForcePickup(document: Document, user: User): boolean {
    if (user.role !== "mail") return false
    
    // Force pickup for specific statuses
    const forcePickupStatuses = [
      "Ready for Pick-up (Drop Off)",
      "Approved by Approver. Pending pickup for next step", 
      "Approval Complete. Pending return to Originator",
      "REJECTED - Ready for Pickup"
    ]
    
    if (forcePickupStatuses.includes(document.status)) {
      return true
    }
    
    // Get mail controller's action history for this document
    const mailActions = document.actionHistory.filter(a => 
      a.performedBy === user.email && 
      ["pickup", "deliver"].includes(a.action)
    )

    // Get the last action by this mail controller
    const lastMailAction = mailActions[mailActions.length - 1]

    // Check if there's been an approval/rejection after the last mail action
    const hasApprovalAfterLastMail = lastMailAction ? 
      document.actionHistory.some(a => 
        ["approve", "reject"].includes(a.action) && 
        new Date(a.performedAt) > new Date(lastMailAction.performedAt)
      ) : false

    // Should force pickup if:
    // 1. First scan ever, OR
    // 2. There's been approval/rejection after last mail action
    return mailActions.length === 0 || hasApprovalAfterLastMail
  }

  // Check if mail controller should be forced to deliver
  static shouldForceDeliver(document: Document, user: User): boolean {
    if (user.role !== "mail") return false
    
    // Get mail controller's action history for this document
    const mailActions = document.actionHistory.filter(a => 
      a.performedBy === user.email && 
      ["pickup", "deliver"].includes(a.action)
    )

    // Get the last action by this mail controller
    const lastMailAction = mailActions[mailActions.length - 1]

    // Check if there's been an approval/rejection after the last mail action
    const hasApprovalAfterLastMail = lastMailAction ? 
      document.actionHistory.some(a => 
        ["approve", "reject"].includes(a.action) && 
        new Date(a.performedAt) > new Date(lastMailAction.performedAt)
      ) : false

    // Should force deliver if last action was pickup and no approval yet
    return lastMailAction?.action === "pickup" && !hasApprovalAfterLastMail
  }

  // Get available actions for user on document
  static getAvailableActions(document: Document, user: User): ActionType[] {
    const availableActions: ActionType[] = []

    if (user.role === "mail") {
      // Determine which action should be forced
      if (this.shouldForcePickup(document, user)) {
        return ["pickup"]
      } else if (this.shouldForceDeliver(document, user)) {
        return ["deliver"]
      } else {
        // This shouldn't happen with current logic, but fallback
        return ["pickup", "deliver"]
      }
    }

    if (user.role === "approver") {
      return ["receive", "approve", "reject"]
    }

    if (user.role === "recipient") {
      return ["receive"]
    }

    if (user.role === "admin") {
      return ["close", "cancel"]
    }

    return availableActions
  }
}

// Make available globally for debugging
if (typeof window !== "undefined") {
  (window as any).EnhancedDocumentService = EnhancedDocumentService
} 