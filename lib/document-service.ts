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
  Notification
} from './types'

export class DocumentService {
  private static documentCounter = 0;
  
  // Generate unique document ID
  private static generateDocumentId(): string {
    this.documentCounter++;
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000);
    return `DOC-${timestamp}-${this.documentCounter}-${random}`;
  }

  // Generate unique action ID
  private static generateActionId(): string {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000);
    return `ACTION-${timestamp}-${random}`;
  }
  
  // Document Templates
  static getDocumentTemplates(): DocumentTemplate[] {
    return [
      {
        id: "purchase-request",
        name: "Purchase Request",
        category: "Financial",
        requiredFields: ["amount", "vendor", "justification"],
        defaultApprovers: ["manager@company.com", "finance@company.com"]
      },
      {
        id: "leave-form",
        name: "Leave Form",
        category: "HR",
        requiredFields: ["startDate", "endDate", "reason"],
        defaultApprovers: ["manager@company.com", "hr@company.com"]
      },
      {
        id: "expense-report",
        name: "Expense Report",
        category: "Financial",
        requiredFields: ["totalAmount", "receipts"],
        defaultApprovers: ["manager@company.com", "finance@company.com"]
      },
      {
        id: "contract-review",
        name: "Contract Review",
        category: "Legal",
        requiredFields: ["contractType", "value"],
        defaultApprovers: ["legal@company.com", "ceo@company.com"]
      },
      {
        id: "budget-approval",
        name: "Budget Approval",
        category: "Financial",
        requiredFields: ["budgetPeriod", "amount"],
        defaultApprovers: ["manager@company.com", "cfo@company.com"]
      },
      {
        id: "policy-document",
        name: "Policy Document",
        category: "General",
        requiredFields: ["policyArea", "effectiveDate"],
        defaultApprovers: ["hr@company.com", "legal@company.com"]
      },
      {
        id: "monthly-report",
        name: "Monthly Report",
        category: "Reporting",
        requiredFields: ["reportPeriod", "department"],
        defaultApprovers: []
      }
    ]
  }

  // Create new document
  static createDocument(
    title: string,
    templateId: string,
    workflow: WorkflowType,
    createdBy: string,
    description?: string,
    approvers?: string[],
    recipient?: string
  ): Document {
    const template = this.getDocumentTemplates().find(t => t.id === templateId)
    const docId = this.generateDocumentId()
    const now = new Date().toISOString()

    // Create approval steps for flow workflow
    const approvalSteps: ApprovalStep[] = workflow === "flow" && approvers ? 
      approvers.map((email, index) => ({
        order: index + 1,
        approverEmail: email,
        status: "pending" as const
      })) : []

    // Generate QR code data
    const qrData: QRCodeData = {
      documentId: docId,
      title,
      workflow,
      currentStep: workflow === "flow" ? "Created - Ready for Pickup" : "Created - Ready for Delivery",
      expectedRole: "mail" as UserRole,
      createdAt: now,
      version: "1.0"
    }

    // Create initial action
    const initialAction: DocumentAction = {
      id: this.generateActionId(),
      documentId: docId,
      action: "created",
      performedBy: createdBy,
      performedAt: now,
      newStatus: "Ready for Pickup",
      comments: "Document workflow initiated"
    }

    const document: Document = {
      id: docId,
      title,
      type: template?.name || "Unknown",
      description,
      workflow,
      status: "Ready for Pickup",
      createdAt: now,
      createdBy,
      approvalSteps,
      currentStepIndex: 0,
      recipient: workflow === "drop" ? recipient : undefined,
      qrData,
      actionHistory: [initialAction]
    }

    // Save to localStorage
    console.log("About to save document:", document.id)
    this.saveDocument(document)
    console.log("Document saved successfully")
    
    // Generate notification
    this.createNotification(document, "document_created", 
      workflow === "flow" && approvers ? approvers[0] : recipient || "")

    console.log("Document creation completed for:", document.id)
    return document
  }

  // Get all documents
  static getAllDocuments(): Document[] {
    try {
      const docs = localStorage.getItem("documents")
      const parsedDocs = docs ? JSON.parse(docs) : []
      console.log(`Retrieved ${parsedDocs.length} documents from localStorage`)
      return parsedDocs
    } catch (error) {
      console.error("Error retrieving documents from localStorage:", error)
      return []
    }
  }

  // Get documents for specific user based on role
  static getDocumentsForUser(user: User): Document[] {
    const allDocs = this.getAllDocuments()
    
    switch (user.role) {
      case "admin":
        return allDocs.filter(doc => doc.createdBy === user.email)
      
      case "mail":
        return allDocs.filter(doc => 
          doc.status === "Ready for Pickup" ||
          doc.status === "In Transit" ||
          doc.status === "Approved by Approver. Pending pickup for next step" ||
          doc.status === "Approval Complete. Pending return to Originator" ||
          doc.status.includes("pickup") ||
          doc.status.includes("Transit")
        )
      
      case "approver":
        return allDocs.filter(doc => {
          if (doc.workflow === "flow" && doc.approvalSteps) {
            const currentStep = doc.approvalSteps[doc.currentStepIndex || 0]
            return currentStep?.approverEmail === user.email && currentStep.status === "pending"
          }
          return false
        })
      
      case "recipient":
        return allDocs.filter(doc => 
          doc.workflow === "drop" && doc.recipient === user.email
        )
      
      default:
        return []
    }
  }

  // Get document by ID
  static getDocumentById(id: string): Document | null {
    const docs = this.getAllDocuments()
    return docs.find(doc => doc.id === id) || null
  }

  // Process QR code scan
  static processScan(
    documentId: string, 
    action: ActionType, 
    user: User,
    comments?: string
  ): ScanResult {
    const document = this.getDocumentById(documentId)
    
    if (!document) {
      return {
        success: false,
        message: "Document not found",
        timestamp: new Date().toLocaleString()
      }
    }

    // Role-based access control
    const accessCheck = this.checkRoleAccess(document, action, user)
    if (!accessCheck.allowed) {
      return {
        success: false,
        message: accessCheck.reason || "Access denied",
        timestamp: new Date().toLocaleString(),
        warnings: accessCheck.warnings
      }
    }

    // Process the action
    const result = this.executeAction(document, action, user, comments)
    
    if (result.success) {
      // Save updated document
      this.updateDocument(result.document!)
      
      // Generate notifications if needed
      this.handleNotifications(result.document!, action, user)
    }

    return result
  }

  // Check role-based access
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
      
      if (action === "pickup" && !document.status.includes("pickup") && document.status !== "Ready for Pickup") {
        warnings.push("Document may not be ready for pickup")
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

      if (document.workflow === "flow" && document.approvalSteps) {
        const currentStep = document.approvalSteps[document.currentStepIndex || 0]
        if (currentStep?.approverEmail !== user.email) {
          return { 
            allowed: false, 
            reason: "You are not the current approver for this document" 
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
      
      if (document.workflow === "drop" && document.recipient !== user.email) {
        return { 
          allowed: false, 
          reason: "You are not the intended recipient of this document" 
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
      
      if (document.createdBy !== user.email) {
        return { 
          allowed: false, 
          reason: "You can only manage documents you created" 
        }
      }
      
      if (action === "close" && document.status !== "Approval Complete. Pending return to Originator") {
        return {
          allowed: false,
          reason: "Document can only be closed after all approvals are complete"
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
    let nextStep = ""
    let success = true

    try {
      switch (action) {
        case "pickup":
          if (document.workflow === "flow" && document.approvalSteps) {
            const currentStep = document.approvalSteps[document.currentStepIndex || 0]
            const targetApprover = currentStep?.approverEmail || "Unknown"
            newStatus = "In Transit"
            nextStep = `Deliver to ${targetApprover}`
          } else if (document.workflow === "drop") {
            newStatus = "In Transit"
            nextStep = `Deliver to ${document.recipient}`
          }
          break

        case "deliver":
          newStatus = "With Approver for Review"
          nextStep = "Waiting for approver to receive and review"
          break

        case "receive":
          if (document.workflow === "flow") {
            newStatus = "With Approver for Review"
            nextStep = "Review document and approve or reject"
          } else {
            newStatus = "Delivered"
            nextStep = "Document successfully delivered"
          }
          break

        case "approve":
          if (document.workflow === "flow" && document.approvalSteps) {
            const currentStepIndex = document.currentStepIndex || 0
            document.approvalSteps[currentStepIndex].status = "approved"
            document.approvalSteps[currentStepIndex].timestamp = timestamp
            document.approvalSteps[currentStepIndex].comments = comments
            
            if (currentStepIndex < document.approvalSteps.length - 1) {
              // More approvers remaining
              document.currentStepIndex = currentStepIndex + 1
              newStatus = "Approved by Approver. Pending pickup for next step"
              nextStep = `Pending pickup for next approver: ${document.approvalSteps[currentStepIndex + 1].approverEmail}`
            } else {
              // Final approval
              newStatus = "Approval Complete. Pending return to Originator"
              nextStep = "All approvals complete. Pending return to originator"
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
          nextStep = "Document rejected. Will be returned to originator for revision"
          break

        case "close":
          newStatus = "Completed and Archived"
          nextStep = "Document workflow completed"
          break

        default:
          success = false
          return {
            success: false,
            message: `Unknown action: ${action}`,
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

      // Update QR code data
      document.qrData.currentStep = nextStep
      document.qrData.expectedRole = this.getNextExpectedRole(document, action)

      return {
        success: true,
        document,
        action,
        message: "Action completed successfully",
        nextStep,
        timestamp: now.toLocaleString()
      }

    } catch (error) {
      return {
        success: false,
        message: `Error processing action: ${error}`,
        timestamp: now.toLocaleString()
      }
    }
  }

  // Determine next expected role based on document state and action
  private static getNextExpectedRole(document: Document, lastAction: ActionType): UserRole {
    switch (lastAction) {
      case "created":
      case "approve":
      case "reject":
        return "mail"
      case "pickup":
        return document.workflow === "flow" ? "approver" : "recipient"
      case "deliver":
        return document.workflow === "flow" ? "approver" : "recipient"
      case "receive":
        return document.workflow === "flow" ? "approver" : "admin"
      case "close":
        return "admin"
      default:
        return "mail"
    }
  }

  // Save document to localStorage
  private static saveDocument(document: Document): void {
    try {
      const docs = this.getAllDocuments()
      docs.push(document)
      localStorage.setItem("documents", JSON.stringify(docs))
      console.log(`Document ${document.id} saved successfully. Total documents: ${docs.length}`)
      console.log("Saved document:", document)
    } catch (error) {
      console.error("Error saving document:", error)
      throw new Error("Failed to save document to local storage")
    }
  }

  // Update existing document
  private static updateDocument(updatedDocument: Document): void {
    try {
      const docs = this.getAllDocuments()
      const index = docs.findIndex(doc => doc.id === updatedDocument.id)
      if (index >= 0) {
        docs[index] = updatedDocument
        localStorage.setItem("documents", JSON.stringify(docs))
        console.log(`Document ${updatedDocument.id} updated successfully`)
      } else {
        console.error(`Document ${updatedDocument.id} not found for update`)
        throw new Error("Document not found for update")
      }
    } catch (error) {
      console.error("Error updating document:", error)
      throw new Error("Failed to update document in local storage")
    }
  }

  // Handle notifications (placeholder for email integration)
  private static handleNotifications(document: Document, action: ActionType, user: User): void {
    // This would integrate with an email service in a real implementation
    console.log(`Notification: Document ${document.id} - ${action} by ${user.email}`)
  }

  // Create notification record
  private static createNotification(document: Document, type: string, recipient: string): void {
    // Placeholder for notification system
    console.log(`Creating notification: ${type} for ${recipient} regarding document ${document.id}`)
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

  // Debug functions
  static testLocalStorage(): void {
    try {
      const testData = { test: "localStorage working", timestamp: new Date().toISOString() }
      localStorage.setItem("test", JSON.stringify(testData))
      const retrieved = localStorage.getItem("test")
      const parsed = retrieved ? JSON.parse(retrieved) : null
      console.log("localStorage test successful:", parsed)
      localStorage.removeItem("test")
    } catch (error) {
      console.error("localStorage test failed:", error)
    }
  }

  static clearAllDocuments(): void {
    try {
      localStorage.removeItem("documents")
      console.log("All documents cleared from localStorage")
    } catch (error) {
      console.error("Error clearing documents:", error)
    }
  }

  static getLocalStorageInfo(): void {
    try {
      const docs = localStorage.getItem("documents")
      console.log("Raw localStorage data:", docs)
      if (docs) {
        const parsed = JSON.parse(docs)
        console.log("Parsed documents:", parsed)
        console.log("Number of documents:", parsed.length)
        parsed.forEach((doc: any, index: number) => {
          console.log(`Document ${index + 1}:`, {
            id: doc.id,
            title: doc.title,
            status: doc.status,
            createdBy: doc.createdBy,
            workflow: doc.workflow
          })
        })
      } else {
        console.log("No documents found in localStorage")
      }
      
      // Check localStorage usage
      const used = new Blob([docs || ""]).size
      console.log(`localStorage usage: ${used} bytes`)
      
      // Test localStorage write capability
      const testKey = "test_write_" + Date.now()
      try {
        localStorage.setItem(testKey, "test")
        localStorage.removeItem(testKey)
        console.log("localStorage write test: PASSED")
      } catch (e) {
        console.error("localStorage write test: FAILED", e)
      }
    } catch (error) {
      console.error("Error getting localStorage info:", error)
    }
  }

  // Global function for browser console debugging
  static inspectStorage(): void {
    console.log("=== DOCUMENT STORAGE INSPECTION ===")
    this.getLocalStorageInfo()
    console.log("=== END INSPECTION ===")
  }

  // Create sample documents for testing workflow
  static createSampleDocuments(): void {
    console.log("Creating sample documents for testing...")
    
    try {
      // Clear existing documents first
      this.clearAllDocuments()
      
      // Sample Document 1: Flow workflow - Purchase Request
      const doc1 = this.createDocument(
        "Purchase Request - New Office Equipment",
        "purchase-request",
        "flow",
        "admin@company.com",
        "Request for new laptops and office chairs for the development team",
        ["manager@company.com", "finance@company.com"]
      )
      console.log("Created sample document 1:", doc1.id)

      // Sample Document 2: Flow workflow - Leave Form  
      const doc2 = this.createDocument(
        "Annual Leave Request - December 2024",
        "leave-form", 
        "flow",
        "admin@company.com",
        "Annual leave request for holiday period",
        ["manager@company.com", "hr@company.com"]
      )
      console.log("Created sample document 2:", doc2.id)

      // Sample Document 3: Drop workflow - Monthly Report
      const doc3 = this.createDocument(
        "Monthly Sales Report - November 2024",
        "monthly-report",
        "drop", 
        "admin@company.com",
        "Comprehensive sales report for November",
        undefined,
        "recipient@company.com"
      )
      console.log("Created sample document 3:", doc3.id)

      // Sample Document 4: Flow workflow - Contract Review
      const doc4 = this.createDocument(
        "Vendor Contract Review - ABC Supplies",
        "contract-review",
        "flow",
        "admin@company.com", 
        "Review of new vendor contract terms and conditions",
        ["manager@company.com", "legal@company.com", "finance@company.com"]
      )
      console.log("Created sample document 4:", doc4.id)

      console.log("Sample documents created successfully!")
      console.log("Total documents:", this.getAllDocuments().length)
      
    } catch (error) {
      console.error("Error creating sample documents:", error)
    }
  }

  // Get documents visible to each role (for testing)
  static getDocumentsByRole(): void {
    console.log("=== DOCUMENTS BY ROLE ===")
    
    const roles = [
      { role: "admin", email: "admin@company.com" },
      { role: "mail", email: "mail@company.com" }, 
      { role: "approver", email: "manager@company.com" },
      { role: "recipient", email: "recipient@company.com" }
    ]

    roles.forEach(userInfo => {
      const user = { role: userInfo.role, email: userInfo.email } as any
      const docs = this.getDocumentsForUser(user)
      console.log(`${userInfo.role.toUpperCase()} (${userInfo.email}):`, docs.length, "documents")
      docs.forEach(doc => {
        console.log(`  - ${doc.id}: ${doc.title} (${doc.status})`)
      })
    })
    
    console.log("=== END ROLE BREAKDOWN ===")
  }
} 

// Make DocumentService available globally for debugging
if (typeof window !== "undefined") {
  (window as any).DocumentService = DocumentService
} 