"use client"

import { useState, useEffect, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { X, Plus, ArrowLeft, FileText, Users, User, CheckCircle, AlertCircle, Info, AlertTriangle } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { EnhancedDocumentService } from "@/lib/enhanced-document-service"
import { User as UserType, WorkflowType, DocumentTemplate, Document } from "@/lib/types"
import { useToast } from "@/hooks/use-toast"

function CreateDocumentContent() {
  const [user, setUser] = useState<UserType | null>(null)
  const [title, setTitle] = useState("")
  const [selectedTemplate, setSelectedTemplate] = useState("")
  const [description, setDescription] = useState("")
  const [approvers, setApprovers] = useState<string[]>([])
  const [newApprover, setNewApprover] = useState("")
  const [recipient, setRecipient] = useState("")
  const [templates, setTemplates] = useState<DocumentTemplate[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  // Approval mode is now always flexible - removed UI selection
  const [originalDocument, setOriginalDocument] = useState<Document | null>(null)
  const [isRevision, setIsRevision] = useState(false)
  const [isEdit, setIsEdit] = useState(false)
  const [editDocument, setEditDocument] = useState<Document | null>(null)
  const [revisionReason, setRevisionReason] = useState("")
  const [currentStep, setCurrentStep] = useState(1)
  const [createdDocument, setCreatedDocument] = useState<any>(null)
  const [resetAllApprovals, setResetAllApprovals] = useState(false)
  const [approvedApprovers, setApprovedApprovers] = useState<string[]>([])
  const [pendingApprovers, setPendingApprovers] = useState<string[]>([])
  const [rejectedApprovers, setRejectedApprovers] = useState<string[]>([])
  
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()

  const loadTemplates = async (userId: string) => {
    try {
      const templatesData = await EnhancedDocumentService.getDocumentTemplates(userId)
      console.log("📋 Templates loaded:", templatesData.map(t => ({
        id: t.id,
        name: t.name,
        defaultApprovers: t.defaultApprovers
      })))
      setTemplates(templatesData)
    } catch (error) {
      console.error("Error loading templates:", error)
      toast({
        title: "Error",
        description: "Failed to load document templates",
        variant: "destructive",
      })
    }
  }

  const loadOriginalDocument = async (documentId: string) => {
    try {
      const doc = await EnhancedDocumentService.getDocumentById(documentId)
      if (doc) {
        setOriginalDocument(doc)
        setIsRevision(true)
        
        // Pre-fill form with original document data
        setTitle(doc.title)
        setSelectedTemplate(doc.type)
        setDescription(doc.description || "")
        // Approval mode is now always flexible
        
        // Set approvers from original document and categorize by status
        if (doc.approvalSteps) {
          const approverEmails = doc.approvalSteps.map(step => step.approverEmail)
          const approved = doc.approvalSteps.filter(step => step.status === "approved").map(step => step.approverEmail)
          const pending = doc.approvalSteps.filter(step => step.status === "pending").map(step => step.approverEmail)
          const rejected = doc.approvalSteps.filter(step => step.status === "rejected").map(step => step.approverEmail)
          
          setApprovers(approverEmails)
          setApprovedApprovers(approved)
          setPendingApprovers(pending)
          setRejectedApprovers(rejected)
        }
        
        // Set recipient for drop workflow
        if (doc.workflow === "drop" && doc.recipient) {
          setRecipient(doc.recipient)
        }
      }
    } catch (error) {
      console.error("Error loading original document:", error)
      toast({
        title: "Error",
        description: "Failed to load original document for revision",
        variant: "destructive",
      })
    }
  }

  const loadEditDocument = async (documentId: string) => {
    try {
      const doc = await EnhancedDocumentService.getDocumentById(documentId)
      if (doc) {
        setEditDocument(doc)
        setIsEdit(true)
        
        // Pre-fill form with document data for editing
        setTitle(doc.title)
        setSelectedTemplate(doc.type)
        setDescription(doc.description || "")
        
        // Set approvers from document
        if (doc.approvalSteps) {
          const approverEmails = doc.approvalSteps.map(step => step.approverEmail)
          setApprovers(approverEmails)
        }
        
        // Set recipient for drop workflow
        if (doc.workflow === "drop" && doc.recipient) {
          setRecipient(doc.recipient)
        }
      }
    } catch (error) {
      console.error("Error loading document for edit:", error)
      toast({
        title: "Error",
        description: "Failed to load document for editing",
        variant: "destructive",
      })
    }
  }

  useEffect(() => {
    const userData = localStorage.getItem("user")
    if (!userData) {
      router.push("/")
      return
    }

    const parsedUser = JSON.parse(userData) as UserType
    setUser(parsedUser)

    // Only admins can create documents
    if (parsedUser.role !== "admin") {
      toast({
        title: "Access Denied",
        description: "Only Department Admins can create documents",
        variant: "destructive",
      })
      router.push("/dashboard")
      return
    }

    // Load document templates
    loadTemplates(parsedUser.email)
    
    // Check if this is a revision
    const revisionOf = searchParams.get('revisionOf')
    if (revisionOf) {
      loadOriginalDocument(revisionOf)
    }
    
    // Check if this is an edit
    const editId = searchParams.get('editId')
    if (editId) {
      loadEditDocument(editId)
    }
  }, [router, toast, searchParams])

  // Auto-load default approvers when template is selected
  useEffect(() => {
    console.log("🔄 useEffect check auto-load:", { 
      selectedTemplate, 
      isRevision, 
      isEdit,
      templatesLength: templates.length,
      shouldAutoLoad: selectedTemplate && !isRevision && !isEdit && templates.length > 0
    })
    
    if (selectedTemplate && !isRevision && !isEdit && templates.length > 0) {
      console.log("🚀 Auto-loading default approvers...")
      loadDefaultApprovers()
    }
  }, [selectedTemplate, isRevision, isEdit, templates])

  const addApprover = () => {
    if (newApprover && !approvers.includes(newApprover)) {
      setApprovers([...approvers, newApprover])
      setNewApprover("")
    }
  }

  const addNewApproverField = () => {
    setApprovers([...approvers, ""])
  }

  const updateApprover = (index: number, value: string) => {
    const newApprovers = [...approvers]
    newApprovers[index] = value
    setApprovers(newApprovers)
  }

  const removeApprover = (index: number) => {
    const newApprovers = approvers.filter((_, i) => i !== index)
    setApprovers(newApprovers)
  }

  const moveApproverUp = (index: number) => {
    if (index > 0) {
      const newApprovers = [...approvers]
      ;[newApprovers[index - 1], newApprovers[index]] = [newApprovers[index], newApprovers[index - 1]]
      setApprovers(newApprovers)
    }
  }

  const moveApproverDown = (index: number) => {
    if (index < approvers.length - 1) {
      const newApprovers = [...approvers]
      ;[newApprovers[index], newApprovers[index + 1]] = [newApprovers[index + 1], newApprovers[index]]
      setApprovers(newApprovers)
    }
  }

  const getSelectedTemplate = () => {
    return templates.find(t => t.id === selectedTemplate)
  }

  const loadDefaultApprovers = () => {
    // Load default approvers from selected template
    const template = getSelectedTemplate()
    console.log("🔍 Loading default approvers:", { 
      selectedTemplate, 
      template, 
      defaultApprovers: template?.defaultApprovers 
    })
    
    if (template && template.defaultApprovers && template.defaultApprovers.length > 0) {
      setApprovers([...template.defaultApprovers])
      toast({
        title: "Recipients Loaded",
        description: `Loaded ${template.defaultApprovers.length} default recipients from template "${template.name}"`,
      })
      console.log("✅ Default approvers loaded:", template.defaultApprovers)
    } else {
      console.log("⚠️ No default approvers found for template:", template?.name)
      // Don't clear existing approvers
    }
  }

  const validateStep1 = () => {
    if (!title.trim()) {
      toast({
        title: "Validation Error",
        description: "Document title is required",
        variant: "destructive",
      })
      return false
    }

    if (!selectedTemplate) {
      toast({
        title: "Validation Error",
        description: "Please select a document template",
        variant: "destructive",
      })
      return false
    }

    if (isRevision && !revisionReason.trim()) {
      toast({
        title: "Validation Error",
        description: "Please provide a reason for this revision",
        variant: "destructive",
      })
      return false
    }

    return true
  }

  const validateStep2 = () => {
    const validApprovers = approvers.filter(email => email.trim() !== "")
    if (validApprovers.length === 0) {
      toast({
        title: "Validation Error",
        description: "At least one recipient is required",
        variant: "destructive",
      })
      return false
    }
    // Update approvers to only include valid ones
    setApprovers(validApprovers)
    return true
  }

  const handleNextStep = () => {
    if (currentStep === 1 && validateStep1()) {
      setCurrentStep(2)
    } else if (currentStep === 2 && validateStep2()) {
      handleCreateDocument()
    }
  }

  const handleCreateDocument = async () => {
    if (!user) return

    setIsSubmitting(true)

    try {
      let document;
      
      if (isEdit && editDocument) {
        // Edit mode - update existing document
        const updatedDocument = {
          ...editDocument,
          title: title.trim(),
          type: selectedTemplate,
          description: description.trim() || undefined,
          updatedAt: new Date().toISOString(),
          approvalSteps: approvers.map((approver, index) => ({
            order: index + 1,
            approverEmail: approver,
            approverName: approver, // Could be improved with user lookup
            status: "pending" as const,
            timestamp: undefined,
            comments: undefined
          }))
        }
        
        await EnhancedDocumentService.updateDocument(updatedDocument)
        document = updatedDocument
      } else if (isRevision && originalDocument) {
        // Revision mode - create new document based on original
        document = await EnhancedDocumentService.createEditableRevision(
          originalDocument.id,
          revisionReason.trim(),
          user.email,
          title.trim(),
          description.trim() || undefined,
          approvers,
          "flexible",
          resetAllApprovals
        )
      } else {
        // Create new document
        document = await EnhancedDocumentService.createDocument(
        title.trim(),
        selectedTemplate,
          "flow" as WorkflowType,
        user.email,
        description.trim() || undefined,
          approvers,
                      undefined,
            "flexible"
        )
      }

      setCreatedDocument(document)
      setCurrentStep(3)

      toast({
        title: isEdit ? "Document Updated Successfully" : isRevision ? "Revision Created Successfully" : "Document Created Successfully",
        description: isEdit 
          ? `Document ${document.id} has been updated successfully`
          : isRevision 
          ? `Revised document ${document.id} created. ${resetAllApprovals ? 'All recipients must approve again.' : 'Previous approvals preserved where applicable.'}`
          : `Document ${document.id} has been created and is ready for pickup`,
      })
    } catch (error) {
      console.error("Error during document operation:", error)
      toast({
        title: isEdit ? "Error Updating Document" : "Error Creating Document",
        description: isEdit ? "An error occurred while updating the document. Please try again." : "An error occurred while creating the document. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleGenerateCoverSheet = () => {
    if (createdDocument) {
      router.push(`/cover-sheet/${createdDocument.id}`)
    }
  }

  if (!user) return <div>Loading...</div>

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex items-center py-3 sm:py-4">
            <Link href="/dashboard">
              <Button variant="ghost" size="sm" className="mr-2 sm:mr-4">
                <ArrowLeft className="h-4 w-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">Back to Dashboard</span>
                <span className="sm:hidden">Back</span>
              </Button>
            </Link>
            <div className="flex items-center min-w-0 flex-1">
              <FileText className="h-5 w-5 sm:h-6 sm:w-6 mr-2 text-blue-600 flex-shrink-0" />
              <div>
                <h1 className="text-lg sm:text-2xl font-bold text-gray-900 truncate">
                  {isEdit ? "Edit Document" : isRevision ? "Edit & Revise Document" : "Create New Document"}
                </h1>
                {isEdit && editDocument && (
                  <p className="text-sm text-gray-600">
                    Editing: {editDocument.title} (ID: {editDocument.id})
                  </p>
                )}
                {isRevision && originalDocument && (
                  <p className="text-sm text-gray-600">
                    Revising: {originalDocument.title} (ID: {originalDocument.id})
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8">
        {/* Step Progress */}
        <div className="mb-8">
          <div className="flex items-center justify-center space-x-4">
            <div className={`flex items-center ${currentStep >= 1 ? 'text-blue-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${currentStep >= 1 ? 'border-blue-600 bg-blue-600 text-white' : 'border-gray-300'}`}>
                1
              </div>
              <span className="ml-2 font-medium">Document Info</span>
            </div>
            <div className={`w-8 h-0.5 ${currentStep >= 2 ? 'bg-blue-600' : 'bg-gray-300'}`}></div>
            <div className={`flex items-center ${currentStep >= 2 ? 'text-blue-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${currentStep >= 2 ? 'border-blue-600 bg-blue-600 text-white' : 'border-gray-300'}`}>
                2
              </div>
              <span className="ml-2 font-medium">Select Users</span>
            </div>
            <div className={`w-8 h-0.5 ${currentStep >= 3 ? 'bg-blue-600' : 'bg-gray-300'}`}></div>
            <div className={`flex items-center ${currentStep >= 3 ? 'text-blue-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${currentStep >= 3 ? 'border-blue-600 bg-blue-600 text-white' : 'border-gray-300'}`}>
                3
              </div>
              <span className="ml-2 font-medium">Preview</span>
            </div>
          </div>
        </div>

        {/* Step 1: Document Information */}
        {currentStep === 1 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <FileText className="h-5 w-5 mr-2" />
                  Document Information
                </CardTitle>
                <CardDescription>Basic details about the document</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
              {/* Revision Reason - only show for revisions */}
              {isRevision && (
                <div className="space-y-3 p-4 bg-orange-50 border border-orange-200 rounded-lg">
                  <div className="flex items-start space-x-2">
                    <AlertTriangle className="h-5 w-5 text-orange-600 mt-0.5 flex-shrink-0" />
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-orange-800">
                        📋 Document Clone/Copy Options
                      </p>
                      <p className="text-sm text-orange-700">
                        You can choose whether to preserve existing approvals or require everyone to approve again. This will be configurable in the next step.
                      </p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="revisionReason">Clone/Copy Reason *</Label>
                    <Textarea
                      id="revisionReason"
                      placeholder="Explain why this document is being cloned/copied..."
                      value={revisionReason}
                      onChange={(e) => setRevisionReason(e.target.value)}
                      rows={2}
                      className="border-orange-200 focus:border-orange-400"
                    />
                    <p className="text-sm text-orange-700">
                      This reason will be recorded in the document history.
                    </p>
                  </div>
                </div>
              )}

                <div className="space-y-2">
                  <Label htmlFor="title">Document Title *</Label>
                  <Input
                    id="title"
                    placeholder="Enter a descriptive title for the document"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="template">Document Template *</Label>
                  <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a document template" />
                    </SelectTrigger>
                    <SelectContent>
                      {templates.map((template) => (
                        <SelectItem key={template.id} value={template.id}>
                          <div className="flex items-center justify-between w-full">
                            <span>{template.name}</span>
                            <Badge variant="outline" className="ml-2">
                              {template.category}
                            </Badge>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedTemplate && (
                    <div className="mt-2 p-3 bg-blue-50 rounded-md space-y-2">
                      <p className="text-sm text-blue-800">
                        <strong>Template:</strong> {getSelectedTemplate()?.name}
                      </p>
                      <p className="text-sm text-blue-600">
                        <strong>Category:</strong> {getSelectedTemplate()?.category}
                      </p>
                      {getSelectedTemplate()?.defaultApprovers && getSelectedTemplate()!.defaultApprovers.length > 0 && (
                        <div className="border-t border-blue-200 pt-2 mt-2">
                          <p className="text-sm text-blue-800 font-medium">Default Approvers:</p>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {getSelectedTemplate()!.defaultApprovers.map((approver, index) => (
                              <Badge key={approver} variant="outline" className="text-xs bg-blue-100 text-blue-700">
                                {index + 1}. {approver}
                              </Badge>
                            ))}
                          </div>
                          <p className="text-xs text-blue-600 mt-1">
                            ✅ These approvers will be automatically loaded to the next step
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description (Optional)</Label>
                  <Textarea
                    id="description"
                    placeholder="Additional notes, special instructions, or context"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                  />
                </div>

              <div className="flex justify-end pt-4">
                <Button onClick={handleNextStep}>
                  Next
                </Button>
              </div>
              </CardContent>
            </Card>
        )}

        {/* Step 2: Select Users */}
        {currentStep === 2 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Users className="h-5 w-5 mr-2" />
                Select Users
                </CardTitle>
              <CardDescription>Add approvers in the order they should review the document</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
              {/* Show approval status for revision */}
              {isRevision && originalDocument && (approvedApprovers.length > 0 || rejectedApprovers.length > 0) && (
                <div className="space-y-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <Info className="h-5 w-5 text-blue-600" />
                    <h4 className="font-medium text-blue-800">Original Document Approval Status</h4>
                </div>

                  {approvedApprovers.length > 0 && (
                    <div>
                      <p className="text-sm font-medium text-green-700 mb-2">✅ Already Approved ({approvedApprovers.length})</p>
                      <div className="space-y-1">
                        {approvedApprovers.map(email => (
                          <p key={email} className="text-xs text-green-600 ml-4">• {email}</p>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {rejectedApprovers.length > 0 && (
                    <div>
                      <p className="text-sm font-medium text-red-700 mb-2">❌ Previously Rejected ({rejectedApprovers.length})</p>
                      <div className="space-y-1">
                        {rejectedApprovers.map(email => (
                          <p key={email} className="text-xs text-red-600 ml-4">• {email}</p>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {pendingApprovers.length > 0 && (
                    <div>
                      <p className="text-sm font-medium text-orange-700 mb-2">⏳ Still Pending ({pendingApprovers.length})</p>
                      <div className="space-y-1">
                        {pendingApprovers.map(email => (
                          <p key={email} className="text-xs text-orange-600 ml-4">• {email}</p>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  <div className="pt-3 border-t border-blue-200">
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="resetAllApprovals"
                        checked={resetAllApprovals}
                        onChange={(e) => setResetAllApprovals(e.target.checked)}
                        className="h-4 w-4 text-blue-600 rounded border-gray-300"
                      />
                      <Label htmlFor="resetAllApprovals" className="text-sm font-medium text-blue-800">
                        Reset all approvals - require everyone to approve again
                      </Label>
                    </div>
                    <p className="text-xs text-blue-600 ml-6 mt-1">
                      {resetAllApprovals 
                        ? "All approvers (including those who already approved the original) will need to approve this new document."
                        : "Previously approved approvers will keep their approval status in the new document."
                      }
                    </p>
                  </div>
                              </div>
              )}

              {/* Approval workflow is now always flexible - UI selection removed */}

              {/* Template Info and Load Default Approvers */}
              {selectedTemplate && getSelectedTemplate()?.defaultApprovers && (
                <div className="space-y-3 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <FileText className="h-5 w-5 text-green-600" />
                      <h4 className="font-medium text-green-800">Template: {getSelectedTemplate()?.name}</h4>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={loadDefaultApprovers}
                      className="text-green-700 border-green-300 hover:bg-green-100"
                    >
                      <Users className="h-4 w-4 mr-2" />
                      Load Default Approvers
                    </Button>
                  </div>
                  <div>
                    <p className="text-sm text-green-700 mb-2">Default Approvers ({getSelectedTemplate()!.defaultApprovers.length}):</p>
                    <div className="flex flex-wrap gap-1">
                      {getSelectedTemplate()!.defaultApprovers.map((approver, index) => (
                        <Badge key={approver} variant="outline" className="text-xs bg-green-100 text-green-700 border-green-300">
                          {index + 1}. {approver}
                        </Badge>
                      ))}
                    </div>
                    <p className="text-xs text-green-600 mt-2">
                      💡 Click "Load Default Approvers" to load recipients from template
                    </p>
                  </div>
                </div>
              )}

              <div className="space-y-4">
                <Label>Approvers *</Label>

                <div className="space-y-3">
                  {approvers.length === 0 ? (
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline">1</Badge>
                      <Input
                        placeholder="Enter approver email address"
                        value=""
                        onChange={(e) => setApprovers([e.target.value])}
                        className="flex-1"
                      />
                                <Button
                                  variant="ghost"
                                  size="sm"
                        disabled
                                >
                        <X className="h-4 w-4" />
                                </Button>
                    </div>
                  ) : (
                    approvers.map((email, index) => {
                      const isApproved = approvedApprovers.includes(email)
                      const isRejected = rejectedApprovers.includes(email)
                      const isPending = pendingApprovers.includes(email)
                      
                      return (
                        <div key={index} className="flex items-center space-x-2">
                          <Badge variant="outline">{index + 1}</Badge>
                          <div className="flex-1 relative">
                            <Input
                              placeholder="Enter approver email address"
                              value={email}
                              onChange={(e) => updateApprover(index, e.target.value)}
                              className={`${isApproved && !resetAllApprovals ? 'border-green-300 bg-green-50' : isRejected ? 'border-red-300 bg-red-50' : ''}`}
                            />
                            {isRevision && email && (
                              <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                                {isApproved && !resetAllApprovals && <span className="text-green-600 text-xs">✅</span>}
                                {isRejected && <span className="text-red-600 text-xs">❌</span>}
                                {isPending && <span className="text-orange-600 text-xs">⏳</span>}
                                {resetAllApprovals && (isApproved || isRejected || isPending) && <span className="text-blue-600 text-xs">🔄</span>}
                              </div>
                            )}
                          </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                            onClick={() => removeApprover(index)}
                            disabled={approvers.length === 1}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                        </div>
                      )
                    })
                    )}
                  </div>

                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={addNewApproverField}
                  className="w-full"
                >
                  Add New
                </Button>
              </div>

              <div className="flex justify-between pt-4">
                <Button variant="outline" onClick={() => setCurrentStep(1)}>
                  Back
                </Button>
                <Button 
                  onClick={handleNextStep}
                  disabled={isSubmitting}
                >
                  {isSubmitting 
                    ? (isEdit ? "Updating..." : "Creating...") 
                    : (isEdit ? "Update Document" : isRevision ? "Create Revision" : "Create Document")
                  }
                </Button>
                  </div>
              </CardContent>
            </Card>
        )}

        {/* Step 3: Preview Cover Sheet */}
        {currentStep === 3 && createdDocument && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <CheckCircle className="h-5 w-5 mr-2" />
                {isEdit ? "Document Updated Successfully" : isRevision ? "Revision Created Successfully" : "Document Created Successfully"}
                </CardTitle>
              <CardDescription>Preview your document details and generate cover sheet</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
              <div className="space-y-3 p-4 bg-green-50 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-gray-600">Document ID</p>
                  <p className="text-sm font-mono">{createdDocument.id}</p>
                </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Title</p>
                  <p className="text-sm">{createdDocument.title}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Template</p>
                  <p className="text-sm">{getSelectedTemplate()?.name}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Status</p>
                  <p className="text-sm">{createdDocument.status}</p>
                  </div>
                {approvers.length > 0 && (
                    <div>
                      <p className="text-sm font-medium text-gray-600">Approvers ({approvers.length})</p>
                      <div className="space-y-1">
                        {approvers.map((approver, index) => (
                          <p key={approver} className="text-xs">
                            {index + 1}. {approver}
                          </p>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

              <div className="flex justify-end pt-4">
                <Button onClick={handleGenerateCoverSheet}>
                  Generate Cover Sheet
                </Button>
              </div>
              </CardContent>
            </Card>
        )}
      </main>
    </div>
  )
}

export default function CreateDocument() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <CreateDocumentContent />
    </Suspense>
  )
}
