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
  TemplateField,
  CreateTemplateRequest,
  Notification
} from './types'
import { supabase, SupabaseService } from './supabase'
import { Database } from './database.types'

export class DatabaseService {
  private static isSupabaseConfigured: boolean | null = null
  private static documentCounter = 0

  // Check if Supabase is properly configured
  private static async checkSupabaseConfig(): Promise<boolean> {
    if (this.isSupabaseConfigured !== null) {
      return this.isSupabaseConfigured
    }

    try {
      // Check if environment variables are set
      if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
        console.log('Supabase environment variables not configured, using localStorage')
        this.isSupabaseConfigured = false
        return false
      }

      // Test the connection
      const connected = await SupabaseService.testConnection()
      this.isSupabaseConfigured = connected

      if (connected) {
        console.log('✅ Supabase connected successfully')
        await SupabaseService.initializeTables()
      } else {
        console.log('❌ Supabase connection failed, falling back to localStorage')
      }

      return connected
    } catch (error) {
      console.error('Error checking Supabase configuration:', error)
      this.isSupabaseConfigured = false
      return false
    }
  }

  // Generate unique document ID
  private static generateDocumentId(): string {
    this.documentCounter++
    const timestamp = Date.now()
    const random = Math.floor(Math.random() * 1000)
    return `DOC-${timestamp}-${this.documentCounter}-${random}`
  }

  // Generate unique action ID
  private static generateActionId(): string {
    const timestamp = Date.now()
    const random = Math.floor(Math.random() * 1000)
    return `ACTION-${timestamp}-${random}`
  }

  // Convert database row to Document object
  private static mapRowToDocument(row: Database['public']['Tables']['documents']['Row']): Document {
    return {
      id: row.id,
      title: row.title,
      type: row.type,
      description: row.description || undefined,
      workflow: row.workflow,
      status: row.status as DocumentStatus,
      createdAt: row.created_at,
      updatedAt: row.updated_at || undefined,
      createdBy: row.created_by,
      currentStepIndex: row.current_step_index || undefined,
      recipient: row.recipient || undefined,
      rejectionReason: row.rejection_reason || undefined,
      qrData: row.qr_data as unknown as QRCodeData,
      approvalSteps: row.approval_steps as unknown as ApprovalStep[] || undefined,
      actionHistory: row.action_history as unknown as DocumentAction[]
    }
  }

  // Convert Document object to database row
  private static mapDocumentToRow(document: Document): Database['public']['Tables']['documents']['Insert'] {
    return {
      id: document.id,
      title: document.title,
      type: document.type,
      description: document.description,
      workflow: document.workflow,
      status: document.status,
      created_at: document.createdAt,
      updated_at: document.updatedAt,
      created_by: document.createdBy,
      current_step_index: document.currentStepIndex,
      recipient: document.recipient,
      rejection_reason: document.rejectionReason,
      qr_data: document.qrData as unknown as Database['public']['Tables']['documents']['Insert']['qr_data'],
      approval_steps: document.approvalSteps as unknown as Database['public']['Tables']['documents']['Insert']['approval_steps'],
      action_history: document.actionHistory as unknown as Database['public']['Tables']['documents']['Insert']['action_history']
    }
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
    const templates = await this.getDocumentTemplates()
    const template = templates.find(t => t.id === templateId)
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

    console.log("Creating document:", document.id)

    // Try Supabase first, fallback to localStorage
    const useSupabase = await this.checkSupabaseConfig()
    
    if (useSupabase) {
      try {
        const row = this.mapDocumentToRow(document)
        const { data, error } = await supabase
          .from('documents')
          .insert([row])
          .select()
          .single()

        if (error) throw error

        console.log("✅ Document saved to Supabase:", document.id)
        return this.mapRowToDocument(data)
      } catch (error) {
        console.error("❌ Supabase save failed, falling back to localStorage:", error)
        // Fall through to localStorage
      }
    }

    // localStorage fallback
    this.saveToLocalStorage(document)
    console.log("✅ Document saved to localStorage:", document.id)
    return document
  }

  // Get all documents
  static async getAllDocuments(): Promise<Document[]> {
    const useSupabase = await this.checkSupabaseConfig()
    
    if (useSupabase) {
      try {
        const { data, error } = await supabase
          .from('documents')
          .select('*')
          .order('created_at', { ascending: false })

        if (error) throw error

        console.log(`✅ Retrieved ${data.length} documents from Supabase`)
        return data.map(row => this.mapRowToDocument(row))
      } catch (error) {
        console.error("❌ Supabase fetch failed, falling back to localStorage:", error)
      }
    }

    // localStorage fallback
    return this.getFromLocalStorage()
  }

  // Get documents for specific user based on role
  static async getDocumentsForUser(user: User): Promise<Document[]> {
    const useSupabase = await this.checkSupabaseConfig()
    
    if (useSupabase) {
      try {
        let query = supabase.from('documents').select('*')
        
        // Apply role-based filtering using direct queries
        switch (user.role) {
          case "admin":
            query = query.eq('created_by', user.email)
            break
          
          case "mail":
            query = query.in('status', [
              'Ready for Pickup',
              'In Transit',
              'Approved by Approver. Pending pickup for next step',
              'Approval Complete. Pending return to Originator'
            ])
            break
          
          case "approver":
            // For approvers, we need to check if they have pending approval steps
            // This is a complex query, so we'll get all flow documents and filter in memory
            query = query.eq('workflow', 'flow').not('approval_steps', 'is', null)
            break
          
          case "recipient":
            query = query.eq('workflow', 'drop').eq('recipient', user.email)
            break
          
          default:
            // Return empty array for unknown roles
            return []
        }

        const { data, error } = await query.order('created_at', { ascending: false })

        if (error) throw error

        let documents = data.map(row => this.mapRowToDocument(row))
        
        // Additional filtering for approvers (complex logic that needs to be done in memory)
        if (user.role === "approver") {
          documents = documents.filter(doc => {
            if (doc.approvalSteps && doc.approvalSteps.length > 0) {
              const currentStep = doc.approvalSteps[doc.currentStepIndex || 0]
              return currentStep?.approverEmail === user.email && currentStep.status === "pending"
            }
            return false
          })
        }

        console.log(`✅ Retrieved ${documents.length} documents for ${user.role} from Supabase`)
        return documents
      } catch (error) {
        console.error("❌ Supabase role-based fetch failed, falling back to localStorage:", error)
      }
    }

    // localStorage fallback with role filtering
    const allDocs = await this.getAllDocuments()
    return this.filterDocumentsByRole(allDocs, user)
  }

  // Get document by ID
  static async getDocumentById(id: string): Promise<Document | null> {
    console.log("🔍 DatabaseService.getDocumentById called with ID:", id)
    const useSupabase = await this.checkSupabaseConfig()
    console.log("📊 Using Supabase:", useSupabase)
    
    if (useSupabase) {
      try {
        console.log("🔗 Querying Supabase for document:", id)
        const { data, error } = await supabase
          .from('documents')
          .select('*')
          .eq('id', id)
          .single()

        if (error) {
          if (error.code === 'PGRST116') {
            console.log("❌ Document not found in Supabase:", id)
            return null // Not found
          }
          throw error
        }

        const result = this.mapRowToDocument(data)
        console.log("✅ Document found in Supabase:", result.id, "-", result.title)
        return result
      } catch (error) {
        console.error("❌ Supabase fetch by ID failed, falling back to localStorage:", error)
      }
    }

    // localStorage fallback
    console.log("💾 Using localStorage fallback for document:", id)
    const docs = await this.getAllDocuments()
    console.log("📋 Total documents in storage:", docs.length)
    const found = docs.find(doc => doc.id === id) || null
    console.log("🎯 Document found:", found ? `${found.id} - ${found.title}` : "null")
    return found
  }

  // Update document
  static async updateDocument(document: Document): Promise<void> {
    const useSupabase = await this.checkSupabaseConfig()
    
    if (useSupabase) {
      try {
        const row = this.mapDocumentToRow(document)
        const { error } = await supabase
          .from('documents')
          .update(row)
          .eq('id', document.id)

        if (error) throw error

        console.log("✅ Document updated in Supabase:", document.id)
        return
      } catch (error) {
        console.error("❌ Supabase update failed, falling back to localStorage:", error)
      }
    }

    // localStorage fallback
    this.updateInLocalStorage(document)
    console.log("✅ Document updated in localStorage:", document.id)
  }

  // Clear all documents (for testing)
  static async clearAllDocuments(): Promise<void> {
    const useSupabase = await this.checkSupabaseConfig()
    
    if (useSupabase) {
      try {
        const { error } = await supabase
          .from('documents')
          .delete()
          .neq('id', 'impossible-id') // Delete all

        if (error) throw error
        console.log("✅ All documents cleared from Supabase")
        return
      } catch (error) {
        console.error("❌ Supabase clear failed, falling back to localStorage:", error)
      }
    }

    // localStorage fallback
    localStorage.removeItem("documents")
    console.log("✅ All documents cleared from localStorage")
  }

  // localStorage helper methods
  private static saveToLocalStorage(document: Document): void {
    try {
      const docs = this.getFromLocalStorage()
      docs.push(document)
      localStorage.setItem("documents", JSON.stringify(docs))
    } catch (error) {
      console.error("Error saving to localStorage:", error)
      throw new Error("Failed to save document to local storage")
    }
  }

  private static getFromLocalStorage(): Document[] {
    try {
      const docs = localStorage.getItem("documents")
      return docs ? JSON.parse(docs) : []
    } catch (error) {
      console.error("Error retrieving from localStorage:", error)
      return []
    }
  }

  private static updateInLocalStorage(updatedDocument: Document): void {
    try {
      const docs = this.getFromLocalStorage()
      const index = docs.findIndex(doc => doc.id === updatedDocument.id)
      if (index >= 0) {
        docs[index] = updatedDocument
        localStorage.setItem("documents", JSON.stringify(docs))
      } else {
        throw new Error("Document not found for update")
      }
    } catch (error) {
      console.error("Error updating localStorage:", error)
      throw new Error("Failed to update document in local storage")
    }
  }

  // Role-based filtering (used for localStorage fallback)
  private static filterDocumentsByRole(documents: Document[], user: User): Document[] {
    switch (user.role) {
      case "admin":
        return documents.filter(doc => doc.createdBy === user.email)
      
      case "mail":
        return documents.filter(doc => 
          doc.status === "Ready for Pickup" ||
          doc.status === "In Transit" ||
          doc.status === "Approved by Approver. Pending pickup for next step" ||
          doc.status === "Approval Complete. Pending return to Originator"
        )
      
      case "approver":
        return documents.filter(doc => {
          if (doc.workflow === "flow" && doc.approvalSteps) {
            const currentStep = doc.approvalSteps[doc.currentStepIndex || 0]
            return currentStep?.approverEmail === user.email && currentStep.status === "pending"
          }
          return false
        })
      
      case "recipient":
        return documents.filter(doc => 
          doc.workflow === "drop" && doc.recipient === user.email
        )
      
      default:
        return []
    }
  }

  // Template methods
  static async getDocumentTemplates(userId?: string): Promise<DocumentTemplate[]> {
    const useSupabase = await this.checkSupabaseConfig()
    
    if (useSupabase) {
      try {
        let query = supabase
          .from('document_templates')
          .select('*')
          .eq('is_active', true)

        if (userId) {
          query = query.or(`is_public.eq.true,created_by.eq.${userId}`)
        } else {
          query = query.eq('is_public', true)
        }

        const { data, error } = await query.order('category', { ascending: true })

        if (error) throw error

        return data.map((row: any) => ({
          id: row.id,
          name: row.name,
          description: row.description || undefined,
          category: row.category,
          templateFields: (row.template_fields as any) || [],
          createdBy: row.created_by,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
          isPublic: row.is_public,
          isActive: row.is_active,
          usageCount: row.usage_count
        }))
      } catch (error) {
        console.error("❌ Failed to fetch templates from Supabase:", error)
        // Fall through to default templates
      }
    }

    // Default templates fallback
    return this.getDefaultTemplates()
  }

  static async createTemplate(request: CreateTemplateRequest, createdBy: string): Promise<DocumentTemplate> {
    const templateId = `template-${Date.now()}-${Math.floor(Math.random() * 1000)}`
    const now = new Date().toISOString()

    const template: DocumentTemplate = {
      id: templateId,
      name: request.name,
      description: request.description,
      category: request.category,
      templateFields: request.templateFields,
      createdBy,
      createdAt: now,
      updatedAt: now,
      isPublic: request.isPublic || false,
      isActive: true,
      usageCount: 0
    }

    const useSupabase = await this.checkSupabaseConfig()
    
    if (useSupabase) {
      try {
        const { data, error } = await supabase
          .from('document_templates')
          .insert([{
            id: template.id,
            name: template.name,
            description: template.description,
            category: template.category,
            template_fields: template.templateFields as any,
            created_by: template.createdBy,
            is_public: template.isPublic,
            is_active: template.isActive,
            usage_count: template.usageCount
          }])
          .select()
          .single()

        if (error) throw error

        console.log("✅ Template saved to Supabase:", template.id)
        return template
      } catch (error) {
        console.error("❌ Supabase template save failed:", error)
        throw error
      }
    }

    // For localStorage, we'd need to implement template storage
    console.log("✅ Template created (localStorage not implemented for templates):", template.id)
    return template
  }

  static async updateTemplate(template: DocumentTemplate): Promise<void> {
    const useSupabase = await this.checkSupabaseConfig()
    
    if (useSupabase) {
      try {
        const { error } = await supabase
          .from('document_templates')
          .update({
            name: template.name,
            description: template.description,
            category: template.category,
            template_fields: template.templateFields as any,
            is_public: template.isPublic,
            is_active: template.isActive,
            usage_count: template.usageCount,
            updated_at: new Date().toISOString()
          })
          .eq('id', template.id)

        if (error) throw error

        console.log("✅ Template updated in Supabase:", template.id)
      } catch (error) {
        console.error("❌ Supabase template update failed:", error)
        throw error
      }
    }
  }

  static async deleteTemplate(templateId: string): Promise<void> {
    const useSupabase = await this.checkSupabaseConfig()
    
    if (useSupabase) {
      try {
        const { error } = await supabase
          .from('document_templates')
          .delete()
          .eq('id', templateId)

        if (error) throw error

        console.log("✅ Template deleted from Supabase:", templateId)
      } catch (error) {
        console.error("❌ Supabase template deletion failed:", error)
        throw error
      }
    }
  }

  static async deleteDocument(documentId: string): Promise<void> {
    const useSupabase = await this.checkSupabaseConfig()
    
    if (useSupabase) {
      try {
        const { error } = await supabase
          .from('documents')
          .delete()
          .eq('id', documentId)

        if (error) throw error

        console.log("✅ Document deleted from Supabase:", documentId)
      } catch (error) {
        console.error("❌ Supabase document deletion failed:", error)
        throw error
      }
    } else {
      // localStorage fallback
      const documents = this.getFromLocalStorage()
      const filteredDocuments = documents.filter(doc => doc.id !== documentId)
      localStorage.setItem("documents", JSON.stringify(filteredDocuments))
      console.log("✅ Document deleted from localStorage:", documentId)
    }
  }

  private static getDefaultTemplates(): DocumentTemplate[] {
    const now = new Date().toISOString()
    return [
      {
        id: "financial-template",
        name: "Financial Document",
        description: "Template for financial documents and transactions",
        category: "Finance",
        templateFields: [
          { name: "amount", type: "number", label: "Amount", required: true, defaultValue: "" },
          { name: "currency", type: "select", label: "Currency", required: true, options: ["USD", "EUR", "THB"], defaultValue: "USD" },
          { name: "purpose", type: "textarea", label: "Purpose", required: true, defaultValue: "" },
          { name: "requestedBy", type: "text", label: "Requested By", required: true, defaultValue: "" },
          { name: "dueDate", type: "date", label: "Due Date", required: false, defaultValue: "" }
        ],
        createdBy: "admin@company.com",
        createdAt: now,
        updatedAt: now,
        isPublic: true,
        isActive: true,
        usageCount: 0
      },
      {
        id: "hr-template",
        name: "HR Document",
        description: "Template for human resources documents",
        category: "Human Resources",
        templateFields: [
          { name: "employeeId", type: "text", label: "Employee ID", required: true, defaultValue: "" },
          { name: "employeeName", type: "text", label: "Employee Name", required: true, defaultValue: "" },
          { name: "department", type: "select", label: "Department", required: true, options: ["HR", "Finance", "IT", "Operations"], defaultValue: "HR" },
          { name: "documentType", type: "select", label: "Document Type", required: true, options: ["Leave Request", "Performance Review", "Contract Amendment"], defaultValue: "Leave Request" },
          { name: "effectiveDate", type: "date", label: "Effective Date", required: true, defaultValue: "" }
        ],
        createdBy: "admin@company.com",
        createdAt: now,
        updatedAt: now,
        isPublic: true,
        isActive: true,
        usageCount: 0
      },
      {
        id: "legal-template",
        name: "Legal Document",
        description: "Template for legal documents and contracts",
        category: "Legal",
        templateFields: [
          { name: "contractType", type: "select", label: "Contract Type", required: true, options: ["NDA", "Service Agreement", "Employment Contract"], defaultValue: "NDA" },
          { name: "partyA", type: "text", label: "Party A", required: true, defaultValue: "" },
          { name: "partyB", type: "text", label: "Party B", required: true, defaultValue: "" },
          { name: "jurisdiction", type: "text", label: "Jurisdiction", required: true, defaultValue: "" },
          { name: "expirationDate", type: "date", label: "Expiration Date", required: false, defaultValue: "" }
        ],
        createdBy: "admin@company.com",
        createdAt: now,
        updatedAt: now,
        isPublic: true,
        isActive: true,
        usageCount: 0
      }
    ]
  }

  // Get storage status for debugging
  static async getStorageStatus(): Promise<{
    usingSupabase: boolean
    supabaseConfigured: boolean
    documentsCount: number
    storageType: 'supabase' | 'localStorage'
  }> {
    const useSupabase = await this.checkSupabaseConfig()
    const documents = await this.getAllDocuments()
    
    return {
      usingSupabase: useSupabase,
      supabaseConfigured: this.isSupabaseConfigured === true,
      documentsCount: documents.length,
      storageType: useSupabase ? 'supabase' : 'localStorage'
    }
  }
} 