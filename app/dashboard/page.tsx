"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { FileText, Plus, QrCode, Clock, CheckCircle, XCircle, Truck, Package, Users, User, AlertCircle, History, Trash2 } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { EnhancedDocumentService } from "@/lib/enhanced-document-service"
import { Document, User as UserType } from "@/lib/types"
import { useToast } from "@/hooks/use-toast"

export default function Dashboard() {
  const [user, setUser] = useState<UserType | null>(null)
  const [documents, setDocuments] = useState<Document[]>([])
  const [allDocuments, setAllDocuments] = useState<Document[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()
  const { toast } = useToast()

  useEffect(() => {
    const userData = localStorage.getItem("user")
    if (!userData) {
      router.push("/")
      return
    }

    const parsedUser = JSON.parse(userData) as UserType
    setUser(parsedUser)
    loadDocuments(parsedUser)
    
    // Debug storage on page load
    console.log("=== DASHBOARD DEBUG ===")
    EnhancedDocumentService.getStorageStatus().then(status => console.log("Storage status:", status))
  }, [router])

  useEffect(() => {
    // Auto-refresh documents every 5 seconds to catch any updates
    const interval = setInterval(() => {
      if (user) {
        console.log("Auto-refreshing documents...")
        loadDocuments(user)
      }
    }, 5000)

    return () => clearInterval(interval)
  }, [user])

  const loadDocuments = async (currentUser: UserType) => {
    try {
      const userDocs = await EnhancedDocumentService.getDocumentsForUser(currentUser)
      const allDocs = await EnhancedDocumentService.getAllDocuments()
      
      // Debug logging for mail controllers
      if (currentUser.role === "mail") {
        console.log("=== MAIL CONTROLLER DEBUG ===")
        console.log("All documents:", allDocs)
        console.log("Documents for mail controller:", userDocs)
        allDocs.forEach(doc => {
          console.log(`Document ${doc.id}: Status="${doc.status}", Should show: ${
            doc.status === "Ready for Pickup" ||
            doc.status === "In Transit" ||
            doc.status === "Approved by Approver. Pending pickup for next step" ||
            doc.status === "Approval Complete. Pending return to Originator"
          }`)
        })
        console.log("=== END DEBUG ===")
      }
      
      setDocuments(userDocs)
      setAllDocuments(allDocs)
    } catch (error) {
      toast({
        title: "Error Loading Documents",
        description: "Failed to load documents. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const getStatusIcon = (status: string) => {
    if (status.includes("Transit")) return <Truck className="h-4 w-4" />
    if (status.includes("Review")) return <Clock className="h-4 w-4" />
    if (status.includes("Approved")) return <CheckCircle className="h-4 w-4" />
    if (status.includes("Rejected")) return <XCircle className="h-4 w-4" />
    if (status.includes("Pickup")) return <Package className="h-4 w-4" />
    if (status.includes("Delivered")) return <CheckCircle className="h-4 w-4" />
    if (status.includes("Completed")) return <CheckCircle className="h-4 w-4" />
    return <FileText className="h-4 w-4" />
  }

  const getStatusColor = (status: string) => {
    if (status.includes("Transit")) return "bg-blue-100 text-blue-800"
    if (status.includes("Review")) return "bg-yellow-100 text-yellow-800"
    if (status.includes("Approved")) return "bg-green-100 text-green-800"
    if (status.includes("Rejected")) return "bg-red-100 text-red-800"
    if (status.includes("Pickup")) return "bg-purple-100 text-purple-800"
    if (status.includes("Delivered")) return "bg-green-100 text-green-800"
    if (status.includes("Completed")) return "bg-gray-100 text-gray-800"
    return "bg-gray-100 text-gray-800"
  }

  const handleDebugLocalStorage = async () => {
    const status = await EnhancedDocumentService.getStorageStatus()
    console.log("Storage status:", status)
    await loadDocuments(user!)
  }

  const handleClearDocuments = async () => {
    await EnhancedDocumentService.clearAllDocuments()
    await loadDocuments(user!)
    toast({
      title: "Documents Cleared",
      description: "All documents have been cleared from storage",
    })
  }

  const handleCreateSampleDocuments = async () => {
    await EnhancedDocumentService.createSampleDocuments()
    await loadDocuments(user!)
    toast({
      title: "Sample Documents Created",
      description: "Sample documents have been created for testing the workflow",
    })
  }

  const handleShowRoleBreakdown = async () => {
    const allDocs = await EnhancedDocumentService.getAllDocuments()
    console.log("=== DOCUMENTS BY ROLE ===")
    console.log("Total documents:", allDocs.length)
    allDocs.forEach(doc => {
      console.log(`- ${doc.id}: ${doc.title} (${doc.status})`)
    })
    console.log("=== END ROLE BREAKDOWN ===")
    toast({
      title: "Role Breakdown",
      description: "Check the console for document visibility by role",
    })
  }

  const handleInspectLocalStorage = () => {
    console.log("=== COMPLETE LOCALSTORAGE INSPECTION ===")
    
    // Check all localStorage keys
    console.log("All localStorage keys:", Object.keys(localStorage))
    
    // Check documents specifically
    const documentsRaw = localStorage.getItem("documents")
    console.log("Raw documents data:", documentsRaw)
    
    if (documentsRaw) {
      try {
        const parsed = JSON.parse(documentsRaw)
        console.log("Parsed documents:", parsed)
        console.log("Number of documents:", parsed.length)
        
        parsed.forEach((doc: any, index: number) => {
          console.log(`Document ${index + 1}:`, {
            id: doc.id,
            title: doc.title,
            status: doc.status,
            createdBy: doc.createdBy,
            workflow: doc.workflow,
            createdAt: doc.createdAt
          })
        })
      } catch (error) {
        console.error("Error parsing documents:", error)
      }
    } else {
      console.log("No documents found in localStorage")
    }
    
    // Check user data
    const userData = localStorage.getItem("user")
    console.log("Current user data:", userData)
    
    // Check localStorage size
    let totalSize = 0
    for (let key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        totalSize += localStorage[key].length + key.length
      }
    }
    console.log(`Total localStorage size: ${totalSize} characters`)
    
    console.log("=== END INSPECTION ===")
    
    toast({
      title: "localStorage Inspected",
      description: "Check console for complete localStorage data",
    })
  }

  const getRoleActions = () => {
    switch (user?.role) {
      case "admin":
        return (
          <div className="space-y-3 sm:space-y-4 mb-4 sm:mb-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              <Link href="/create-document">
                <Card className="cursor-pointer hover:shadow-md transition-shadow">
                  <CardContent className="flex items-center p-4 sm:p-6">
                    <Plus className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600 mr-3 sm:mr-4 flex-shrink-0" />
                    <div className="min-w-0">
                      <h3 className="font-semibold text-sm sm:text-base">Create New Document</h3>
                      <p className="text-xs sm:text-sm text-gray-600">Start a new workflow</p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
              <Link href="/templates">
                <Card className="cursor-pointer hover:shadow-md transition-shadow">
                  <CardContent className="flex items-center p-4 sm:p-6">
                    <FileText className="h-6 w-6 sm:h-8 sm:w-8 text-purple-600 mr-3 sm:mr-4 flex-shrink-0" />
                    <div className="min-w-0">
                      <h3 className="font-semibold text-sm sm:text-base">Manage Templates</h3>
                      <p className="text-xs sm:text-sm text-gray-600">Create and edit document templates</p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
              <Link href="/workflow-guide">
                <Card className="cursor-pointer hover:shadow-md transition-shadow">
                  <CardContent className="flex items-center p-4 sm:p-6">
                    <FileText className="h-6 w-6 sm:h-8 sm:w-8 text-green-600 mr-3 sm:mr-4 flex-shrink-0" />
                    <div className="min-w-0">
                      <h3 className="font-semibold text-sm sm:text-base">Workflow Guide</h3>
                      <p className="text-xs sm:text-sm text-gray-600">Learn how to test the system</p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </div>
            
            {/* Debug Panel */}
            <Card className="bg-yellow-50 border-yellow-200">
              <CardHeader className="pb-2 sm:pb-4">
                <CardTitle className="text-xs sm:text-sm text-yellow-800">Debug Tools</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 sm:gap-2">
                  <Button variant="outline" size="sm" onClick={handleDebugLocalStorage} className="text-xs">
                    <span className="hidden sm:inline">Test localStorage</span>
                    <span className="sm:hidden">Test</span>
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleCreateSampleDocuments} className="text-xs">
                    <span className="hidden sm:inline">Create Sample Docs</span>
                    <span className="sm:hidden">Sample</span>
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleShowRoleBreakdown} className="text-xs">
                    <span className="hidden sm:inline">Show Role Breakdown</span>
                    <span className="sm:hidden">Roles</span>
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleInspectLocalStorage} className="text-xs">
                    <span className="hidden sm:inline">Inspect localStorage</span>
                    <span className="sm:hidden">Inspect</span>
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => loadDocuments(user!)} className="text-xs">
                    Refresh
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleClearDocuments} className="text-xs">
                    <span className="hidden sm:inline">Clear All Documents</span>
                    <span className="sm:hidden">Clear</span>
                  </Button>
                </div>
                <p className="text-xs text-yellow-700 mt-2">
                  <span className="hidden sm:inline">Total documents in system: {allDocuments.length} | Your documents: {documents.length}</span>
                  <span className="sm:hidden">Total: {allDocuments.length} | Yours: {documents.length}</span>
                </p>
              </CardContent>
            </Card>
          </div>
        )
      case "mail":
        return (
          <div className="space-y-3 sm:space-y-4 mb-4 sm:mb-6">
            <Link href="/scan-qr">
              <Card className="cursor-pointer hover:shadow-md transition-shadow">
                <CardContent className="flex items-center p-4 sm:p-6">
                  <QrCode className="h-6 w-6 sm:h-8 sm:w-8 text-purple-600 mr-3 sm:mr-4 flex-shrink-0" />
                  <div className="min-w-0">
                    <h3 className="font-semibold text-sm sm:text-base">Scan QR Code</h3>
                    <p className="text-xs sm:text-sm text-gray-600">Update document status</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
            
            {/* Debug Panel for Mail Controllers */}
            <Card className="bg-purple-50 border-purple-200">
              <CardHeader className="pb-2 sm:pb-4">
                <CardTitle className="text-xs sm:text-sm text-purple-800">Mail Controller Debug</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 sm:gap-2">
                  <Button variant="outline" size="sm" onClick={() => loadDocuments(user!)} className="text-xs">
                    <span className="hidden sm:inline">Refresh Documents</span>
                    <span className="sm:hidden">Refresh</span>
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleInspectLocalStorage} className="text-xs">
                    <span className="hidden sm:inline">Inspect localStorage</span>
                    <span className="sm:hidden">Inspect</span>
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => router.push('/test-persistence')} className="text-xs">
                    <span className="hidden sm:inline">Test Persistence</span>
                    <span className="sm:hidden">Test</span>
                  </Button>
                </div>
                <p className="text-xs text-purple-700 mt-2">
                  <span className="hidden sm:inline">Total documents: {allDocuments.length} | Available for mail: {documents.length}</span>
                  <span className="sm:hidden">Total: {allDocuments.length} | Mail: {documents.length}</span>
                </p>
              </CardContent>
            </Card>
          </div>
        )
      case "approver":
        return (
          <div className="mb-4 sm:mb-6">
            <Link href="/scan-qr">
              <Card className="cursor-pointer hover:shadow-md transition-shadow">
                <CardContent className="flex items-center p-4 sm:p-6">
                  <QrCode className="h-6 w-6 sm:h-8 sm:w-8 text-orange-600 mr-3 sm:mr-4 flex-shrink-0" />
                  <div className="min-w-0">
                    <h3 className="font-semibold text-sm sm:text-base">Scan QR Code</h3>
                    <p className="text-xs sm:text-sm text-gray-600">Receive and approve documents</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          </div>
        )
      case "recipient":
        return (
          <div className="mb-4 sm:mb-6">
            <Link href="/scan-qr">
              <Card className="cursor-pointer hover:shadow-md transition-shadow">
                <CardContent className="flex items-center p-4 sm:p-6">
                  <QrCode className="h-6 w-6 sm:h-8 sm:w-8 text-green-600 mr-3 sm:mr-4 flex-shrink-0" />
                  <div className="min-w-0">
                    <h3 className="font-semibold text-sm sm:text-base">Scan QR Code</h3>
                    <p className="text-xs sm:text-sm text-gray-600">Confirm document receipt</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          </div>
        )
      default:
        return null
    }
  }

  const getDocumentActions = (document: Document) => {
    switch (user?.role) {
      case "admin":
        if (document.createdBy === user.email) {
          return (
            <div className="flex flex-col sm:flex-row gap-2 sm:space-x-2 w-full sm:w-auto">
              <Link href={`/document/${document.id}`} className="w-full sm:w-auto">
                <Button variant="outline" size="sm" className="w-full sm:w-auto">
                  <History className="h-4 w-4 mr-1" />
                  <span className="hidden sm:inline">View</span>
                  <span className="sm:hidden">Details</span>
                </Button>
              </Link>
              {document.status === "Approval Complete. Pending return to Originator" && (
                <Button variant="outline" size="sm" onClick={() => handleCloseDocument(document.id)} className="w-full sm:w-auto">
                  <CheckCircle className="h-4 w-4 mr-1" />
                  <span className="hidden sm:inline">Close Workflow</span>
                  <span className="sm:hidden">Close</span>
                </Button>
              )}
              {document.status === "Completed and Archived" && (
                <Button variant="outline" size="sm" disabled className="w-full sm:w-auto">
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Closed
                </Button>
              )}
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => handleDeleteDocument(document.id)} 
                className="w-full sm:w-auto text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4 mr-1" />
                <span className="hidden sm:inline">Delete</span>
                <span className="sm:hidden">Del</span>
              </Button>
            </div>
          )
        }
        break
      case "mail":
        return (
          <Link href="/scan-qr" className="w-full sm:w-auto">
            <Button variant="outline" size="sm" className="w-full sm:w-auto">
              <QrCode className="h-4 w-4 mr-1" />
              Scan QR
            </Button>
          </Link>
        )
      case "approver":
        if (document.workflow === "flow" && document.approvalSteps) {
          const currentStep = document.approvalSteps[document.currentStepIndex || 0]
          if (currentStep?.approverEmail === user.email && currentStep.status === "pending") {
            return (
              <div className="flex flex-col sm:flex-row gap-2 sm:space-x-2 w-full sm:w-auto">
                <Link href="/scan-qr" className="w-full sm:w-auto">
                  <Button variant="outline" size="sm" className="w-full sm:w-auto">
                    <QrCode className="h-4 w-4 mr-1" />
                    Scan QR
                  </Button>
                </Link>
                <Link href={`/document/${document.id}`} className="w-full sm:w-auto">
                  <Button variant="outline" size="sm" className="w-full sm:w-auto">
                    Review
                  </Button>
                </Link>
              </div>
            )
          }
        }
        break
      case "recipient":
        if (document.workflow === "drop" && document.recipient === user.email) {
          return (
            <Link href="/scan-qr" className="w-full sm:w-auto">
              <Button variant="outline" size="sm" className="w-full sm:w-auto">
                <QrCode className="h-4 w-4 mr-1" />
                <span className="hidden sm:inline">Confirm Receipt</span>
                <span className="sm:hidden">Confirm</span>
              </Button>
            </Link>
          )
        }
        break
    }
    return null
  }

  const handleCloseDocument = async (documentId: string) => {
    try {
      const result = await EnhancedDocumentService.processScan(documentId, "close", user!, "Workflow completed by admin")
      
      if (result.success) {
        toast({
          title: "Workflow Completed",
          description: "Document has been successfully closed and archived.",
        })
        // Refresh the documents list
        loadDocuments(user!)
      } else {
        toast({
          title: "Error",
          description: result.message || "Failed to close document",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error("Error closing document:", error)
      toast({
        title: "Error",
        description: "An unexpected error occurred while closing the document",
        variant: "destructive"
      })
    }
  }

  const handleDeleteDocument = async (documentId: string) => {
    if (!user) return

    try {
      const document = await EnhancedDocumentService.getDocumentById(documentId)
      if (!document) {
        toast({
          title: "Error",
          description: "Document not found",
          variant: "destructive",
        })
        return
      }

      // Only allow deletion if user is admin and document creator
      if (user.role !== "admin" || document.createdBy !== user.email) {
        toast({
          title: "Cannot Delete Document",
          description: "Only the document creator (admin) can delete documents",
          variant: "destructive",
        })
        return
      }

      // Confirm deletion
      if (!confirm(`Are you sure you want to delete "${document.title}"? This action cannot be undone.`)) {
        return
      }

      await EnhancedDocumentService.deleteDocument(documentId)
      await loadDocuments(user)
      
      toast({
        title: "Document Deleted",
        description: "The document has been permanently deleted",
      })
    } catch (error) {
      console.error("Error deleting document:", error)
      toast({
        title: "Error",
        description: "Failed to delete document",
        variant: "destructive",
      })
    }
  }

  const getWorkflowInfo = (document: Document) => {
    if (document.workflow === "flow" && document.approvalSteps) {
      const currentStep = document.approvalSteps[document.currentStepIndex || 0]
      const completedSteps = document.approvalSteps.filter(step => step.status === "approved").length
      const allApproved = completedSteps === document.approvalSteps.length
      
      return {
        type: "Flow",
        icon: <Users className="h-4 w-4" />,
        info: `${completedSteps}/${document.approvalSteps.length} approvals`,
        current: allApproved && document.status === "Approval Complete. Pending return to Originator" 
          ? "Ready to close workflow" 
          : currentStep && currentStep.status === "pending"
          ? `Current: ${currentStep.approverEmail}` 
          : allApproved 
          ? "All approvals complete" 
          : "In progress"
      }
    } else {
      return {
        type: "Drop",
        icon: <User className="h-4 w-4" />,
        info: document.recipient || "Direct delivery",
        current: ""
      }
    }
  }

  const getDocumentDescription = () => {
    switch (user?.role) {
      case "admin":
        return "Documents you've created and their current status"
      case "mail":
        return "Documents requiring pickup or delivery"
      case "approver":
        return "Documents pending your approval"
      case "recipient":
        return "Documents sent to you"
      default:
        return "Your documents"
    }
  }

  const getEmptyStateMessage = () => {
    switch (user?.role) {
      case "admin":
        return "No documents created yet. Create your first document to get started."
      case "mail":
        return "No documents requiring pickup or delivery at this time."
      case "approver":
        return "No documents pending your approval at this time."
      case "recipient":
        return "No documents have been sent to you yet."
      default:
        return "No documents found."
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  if (!user) return <div>Loading...</div>

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-3 sm:py-4">
            <div className="flex-1 min-w-0">
              <h1 className="text-lg sm:text-2xl font-bold text-gray-900 truncate">
                Document Tracking
              </h1>
              <p className="text-xs sm:text-sm text-gray-600 truncate">
                {user.role === "admin" ? "Department Admin" : 
                user.role === "mail" ? "Mail Controller" :
                user.role === "approver" ? "Approver/Signer" : "Recipient"}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                localStorage.removeItem("user")
                // Note: We keep documents in localStorage for persistence across sessions
                router.push("/")
              }}
              className="ml-2"
            >
              <span className="hidden sm:inline">Logout</span>
              <span className="sm:hidden">Exit</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8">
        {/* Role-specific Actions */}
        {getRoleActions()}

        {/* System Statistics (for admin) */}
        {user.role === "admin" && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
            <Card>
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs sm:text-sm text-gray-600">Total</p>
                    <p className="text-lg sm:text-2xl font-bold">{allDocuments.length}</p>
                  </div>
                  <FileText className="h-6 w-6 sm:h-8 sm:w-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs sm:text-sm text-gray-600">In Transit</p>
                    <p className="text-lg sm:text-2xl font-bold">
                      {allDocuments.filter(d => d.status.includes("Transit")).length}
                    </p>
                  </div>
                  <Truck className="h-6 w-6 sm:h-8 sm:w-8 text-yellow-500" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs sm:text-sm text-gray-600">Review</p>
                    <p className="text-lg sm:text-2xl font-bold">
                      {allDocuments.filter(d => d.status.includes("Review")).length}
                    </p>
                  </div>
                  <Clock className="h-6 w-6 sm:h-8 sm:w-8 text-orange-500" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs sm:text-sm text-gray-600">Done</p>
                    <p className="text-lg sm:text-2xl font-bold">
                      {allDocuments.filter(d => d.status.includes("Completed")).length}
                    </p>
                  </div>
                  <CheckCircle className="h-6 w-6 sm:h-8 sm:w-8 text-green-500" />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Document List */}
        <Card>
          <CardHeader>
            <CardTitle>
              {user.role === "admin" ? "Your Documents" : 
               user.role === "mail" ? "Documents for Pickup/Delivery" :
               user.role === "approver" ? "Pending Approvals" : "Documents for You"}
            </CardTitle>
            <CardDescription>{getDocumentDescription()}</CardDescription>
          </CardHeader>
          <CardContent>
            {documents.length === 0 ? (
              <div className="text-center py-8">
                <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Documents Found</h3>
                <p className="text-gray-600 mb-4">{getEmptyStateMessage()}</p>
                {user.role === "admin" && (
                  <Link href="/create-document">
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Create First Document
                    </Button>
                  </Link>
                )}
              </div>
            ) : (
              <div className="space-y-3 sm:space-y-4">
                {documents.map((doc) => {
                  const workflowInfo = getWorkflowInfo(doc)
                  return (
                    <div key={doc.id} className="border rounded-lg hover:bg-gray-50 transition-colors">
                      <div className="p-3 sm:p-4">
                        {/* Mobile-first header */}
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-4 mb-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-2">
                              <h3 className="font-semibold text-gray-900 text-sm sm:text-base truncate">{doc.title}</h3>
                              <div className="flex items-center gap-2 flex-wrap">
                                <Badge variant="outline" className="text-xs">{doc.id}</Badge>
                                <div className="flex items-center space-x-1 text-xs sm:text-sm text-gray-600">
                                  {workflowInfo.icon}
                                  <span>{workflowInfo.type}</span>
                                </div>
                              </div>
                            </div>
                            
                            {/* Status badge - full width on mobile */}
                            <div className="mb-3 sm:mb-2">
                              <Badge className={`${getStatusColor(doc.status)} text-xs`}>
                                {getStatusIcon(doc.status)}
                                <span className="ml-1">{doc.status}</span>
                              </Badge>
                            </div>
                          </div>
                          
                          {/* Actions - bottom on mobile */}
                          <div className="flex-shrink-0 sm:ml-4">
                            {getDocumentActions(doc)}
                          </div>
                        </div>
                        
                        {/* Document details */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4 text-xs sm:text-sm text-gray-600 mb-2">
                          <div>
                            <span className="font-medium">Type:</span> {doc.type}
                          </div>
                          <div>
                            <span className="font-medium">Created:</span> {new Date(doc.createdAt).toLocaleDateString()}
                          </div>
                          <div>
                            <span className="font-medium">{workflowInfo.type === "Flow" ? "Progress:" : "Recipient:"}</span> {workflowInfo.info}
                          </div>
                        </div>
                        
                        {/* Workflow status */}
                        {workflowInfo.current && (
                          <div className={`text-xs sm:text-sm ${
                            workflowInfo.current === "Ready to close workflow" 
                              ? "text-green-600 font-semibold" 
                              : "text-blue-600"
                          }`}>
                            {workflowInfo.current === "Ready to close workflow" && (
                              <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 inline mr-1" />
                            )}
                            {workflowInfo.current}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
