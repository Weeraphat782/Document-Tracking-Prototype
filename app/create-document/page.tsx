"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { X, Plus, ArrowLeft, FileText, Users, User, CheckCircle, AlertCircle, Info } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { EnhancedDocumentService } from "@/lib/enhanced-document-service"
import { User as UserType, WorkflowType, DocumentTemplate } from "@/lib/types"
import { useToast } from "@/hooks/use-toast"

export default function CreateDocument() {
  const [user, setUser] = useState<UserType | null>(null)
  const [title, setTitle] = useState("")
  const [selectedTemplate, setSelectedTemplate] = useState("")
  const [workflowType, setWorkflowType] = useState<WorkflowType | "">("")
  const [description, setDescription] = useState("")
  const [approvers, setApprovers] = useState<string[]>([])
  const [newApprover, setNewApprover] = useState("")
  const [recipient, setRecipient] = useState("")
  const [templates, setTemplates] = useState<DocumentTemplate[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  const router = useRouter()
  const { toast } = useToast()

  const loadTemplates = async (userId: string) => {
    try {
      const templatesData = await EnhancedDocumentService.getDocumentTemplates(userId)
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
  }, [router, toast])

  const addApprover = () => {
    if (newApprover && !approvers.includes(newApprover)) {
      setApprovers([...approvers, newApprover])
      setNewApprover("")
    }
  }

  const removeApprover = (email: string) => {
    setApprovers(approvers.filter((a) => a !== email))
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
    // Default approvers functionality removed as templates now use custom fields
    // Users will need to manually add approvers based on template requirements
    setApprovers([])
  }

  const validateForm = () => {
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

    if (!workflowType) {
      toast({
        title: "Validation Error",
        description: "Please select a workflow type",
        variant: "destructive",
      })
      return false
    }

    if (workflowType === "flow" && approvers.length === 0) {
      toast({
        title: "Validation Error",
        description: "Flow workflow requires at least one approver",
        variant: "destructive",
      })
      return false
    }

    if (workflowType === "drop" && !recipient.trim()) {
      toast({
        title: "Validation Error",
        description: "Drop workflow requires a recipient",
        variant: "destructive",
      })
      return false
    }

    return true
  }

  const handleSubmit = async () => {
    console.log("=== DOCUMENT CREATION DEBUG START ===")
    console.log("Form validation starting...")
    
    if (!validateForm() || !user) {
      console.log("Form validation failed or user not found")
      console.log("User:", user)
      console.log("Validation result:", validateForm())
      return
    }

    console.log("Form validation passed, starting document creation...")
    console.log("Form data:", {
      title: title.trim(),
      selectedTemplate,
      workflowType,
      userEmail: user.email,
      description: description.trim() || undefined,
      approvers: workflowType === "flow" ? approvers : undefined,
      recipient: workflowType === "drop" ? recipient.trim() : undefined
    })

    setIsSubmitting(true)

    try {
      console.log("Calling DocumentService.createDocument...")
      
      const document = await EnhancedDocumentService.createDocument(
        title.trim(),
        selectedTemplate,
        workflowType as WorkflowType,
        user.email,
        description.trim() || undefined,
        workflowType === "flow" ? approvers : undefined,
        workflowType === "drop" ? recipient.trim() : undefined
      )

      console.log("Document created successfully:", document)
      
      // Verify document was saved
      console.log("Verifying document was saved...")
      const savedDocument = await EnhancedDocumentService.getDocumentById(document.id)
      console.log("Retrieved saved document:", savedDocument)
      
      const allDocs = await EnhancedDocumentService.getAllDocuments()
      console.log("All documents after creation:", allDocs)
      console.log("Total documents count:", allDocs.length)

      toast({
        title: "Document Created Successfully",
        description: `Document ${document.id} has been created and is ready for pickup`,
      })

      console.log("Redirecting to cover sheet...")
      // Redirect to cover sheet generation
      router.push(`/cover-sheet/${document.id}`)
    } catch (error) {
      console.error("Error during document creation:", error)
      toast({
        title: "Error Creating Document",
        description: "An error occurred while creating the document. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
      console.log("=== DOCUMENT CREATION DEBUG END ===")
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
              <h1 className="text-lg sm:text-2xl font-bold text-gray-900 truncate">Create New Document</h1>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-8">
          
          {/* Document Information */}
          <div className="lg:col-span-2 space-y-4 sm:space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <FileText className="h-5 w-5 mr-2" />
                  Document Information
                </CardTitle>
                <CardDescription>Basic details about the document</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
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
                    <div className="mt-2 p-3 bg-blue-50 rounded-md">
                      <p className="text-sm text-blue-800">
                        <strong>Template:</strong> {getSelectedTemplate()?.name}
                      </p>
                      <p className="text-sm text-blue-600">
                        <strong>Category:</strong> {getSelectedTemplate()?.category}
                      </p>
                      {getSelectedTemplate()?.templateFields && getSelectedTemplate()!.templateFields.length > 0 && (
                        <div className="mt-2">
                          <p className="text-xs text-gray-600">
                            {getSelectedTemplate()!.templateFields.length} custom fields available
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
              </CardContent>
            </Card>

            {/* Workflow Configuration */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Users className="h-5 w-5 mr-2" />
                  Workflow Configuration
                </CardTitle>
                <CardDescription>Define how this document should be processed</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Workflow Type *</Label>
                  <Select value={workflowType} onValueChange={(value) => setWorkflowType(value as WorkflowType)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select workflow type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="flow">
                        <div className="flex items-center">
                          <Users className="h-4 w-4 mr-2" />
                          Flow (Multi-level Approval)
                        </div>
                      </SelectItem>
                      <SelectItem value="drop">
                        <div className="flex items-center">
                          <User className="h-4 w-4 mr-2" />
                          Drop (Direct Delivery)
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {workflowType && (
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                      {workflowType === "flow" ? (
                        <>
                          <strong>Flow Workflow:</strong> Document will go through multiple approvers in sequence. 
                          Each approver must approve before it moves to the next step.
                        </>
                      ) : (
                        <>
                          <strong>Drop Workflow:</strong> Document will be delivered directly to a single recipient 
                          without requiring approvals.
                        </>
                      )}
                    </AlertDescription>
                  </Alert>
                )}

                {workflowType === "flow" && (
                  <div className="space-y-4">
                    <div>
                      <Label>Approval Hierarchy *</Label>
                      <p className="text-sm text-gray-600 mb-2">
                        Add approvers in the order they should review the document
                      </p>
                      <div className="flex space-x-2">
                        <Input
                          placeholder="Enter approver email address"
                          value={newApprover}
                          onChange={(e) => setNewApprover(e.target.value)}
                          onKeyPress={(e) => e.key === "Enter" && addApprover()}
                        />
                        <Button onClick={addApprover} size="sm" disabled={!newApprover}>
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {approvers.length > 0 && (
                      <div className="space-y-2">
                        <Label>Approval Sequence:</Label>
                        <div className="space-y-2">
                          {approvers.map((email, index) => (
                            <div key={email} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                              <div className="flex items-center space-x-3">
                                <Badge variant="outline">{index + 1}</Badge>
                                <span className="text-sm font-medium">{email}</span>
                              </div>
                              <div className="flex items-center space-x-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => moveApproverUp(index)}
                                  disabled={index === 0}
                                >
                                  ↑
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => moveApproverDown(index)}
                                  disabled={index === approvers.length - 1}
                                >
                                  ↓
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeApprover(email)}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {workflowType === "drop" && (
                  <div className="space-y-2">
                    <Label htmlFor="recipient">Recipient *</Label>
                    <Input
                      id="recipient"
                      placeholder="Enter recipient email address"
                      value={recipient}
                      onChange={(e) => setRecipient(e.target.value)}
                    />
                    <p className="text-sm text-gray-600">
                      This person will receive the document directly without any approval process
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Summary Panel */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <CheckCircle className="h-5 w-5 mr-2" />
                  Document Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Title</p>
                    <p className="text-sm">{title || "Not specified"}</p>
                  </div>
                  
                  <div>
                    <p className="text-sm font-medium text-gray-600">Template</p>
                    <p className="text-sm">{getSelectedTemplate()?.name || "Not selected"}</p>
                  </div>
                  
                  <div>
                    <p className="text-sm font-medium text-gray-600">Workflow</p>
                    <p className="text-sm">
                      {workflowType === "flow" ? "Multi-level Approval" : 
                       workflowType === "drop" ? "Direct Delivery" : "Not selected"}
                    </p>
                  </div>

                  {workflowType === "flow" && approvers.length > 0 && (
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

                  {workflowType === "drop" && recipient && (
                    <div>
                      <p className="text-sm font-medium text-gray-600">Recipient</p>
                      <p className="text-sm">{recipient}</p>
                    </div>
                  )}
                </div>

                <Button 
                  onClick={handleSubmit} 
                  className="w-full" 
                  disabled={isSubmitting || !title || !selectedTemplate || !workflowType}
                >
                  {isSubmitting ? "Creating..." : "Create Document & Generate Cover Sheet"}
                </Button>
              </CardContent>
            </Card>

            {/* Help Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <AlertCircle className="h-5 w-5 mr-2" />
                  Need Help?
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p><strong>Flow Workflow:</strong> Use for documents requiring multiple approvals in sequence</p>
                <p><strong>Drop Workflow:</strong> Use for simple document delivery without approvals</p>
                <p><strong>Templates:</strong> Pre-configured document types with default settings</p>
                <p><strong>Cover Sheet:</strong> Will be generated automatically with QR code for tracking</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}
