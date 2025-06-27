"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { FileText, Plus, QrCode, Clock, CheckCircle, XCircle, Truck, Package, Users, User, AlertCircle, History, Trash2, Filter, Search, Activity, Archive, Download, Eye, FileImage, Edit, X, RotateCcw, CheckSquare } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { EnhancedDocumentService } from "@/lib/enhanced-document-service"
import { DatabaseService } from "@/lib/database-service"
import { Document, User as UserType, getDualStatusFromDocument, DOCUMENT_STATUS_DISPLAY, TRACKING_STATUS_DISPLAY, convertLegacyToDualStatus, ActionType, DocumentStatus } from "@/lib/types"
import { useToast } from "@/hooks/use-toast"
import SidebarLayout from "@/components/sidebar-layout"

export default function Dashboard() {
  const [user, setUser] = useState<UserType | null>(null)
  const [documents, setDocuments] = useState<Document[]>([])
  const [allDocuments, setAllDocuments] = useState<Document[]>([])
  const [filteredDocuments, setFilteredDocuments] = useState<Document[]>([])
  const [activeDocuments, setActiveDocuments] = useState<Document[]>([])
  const [historyDocuments, setHistoryDocuments] = useState<Document[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(10)
  const [activeTab, setActiveTab] = useState("active")
  const [selectedDocuments, setSelectedDocuments] = useState<string[]>([])
  const [showDeliveryDialog, setShowDeliveryDialog] = useState(false)
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

  useEffect(() => {
    // Filter documents based on search and status for current tab
    let filtered = getCurrentDocuments()
    
    if (searchTerm) {
      filtered = filtered.filter(doc => 
        doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.type.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }
    
    if (statusFilter !== "all") {
      filtered = filtered.filter(doc => doc.status === statusFilter)
    }
    
    setFilteredDocuments(filtered)
    setCurrentPage(1) // Reset to first page when filtering
  }, [activeDocuments, historyDocuments, searchTerm, statusFilter, activeTab])

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
            doc.status === "Ready for Pick-up (Drop Off)" ||
            doc.status === "In Transit (Mail Controller)" ||
            doc.status === "Approved by Approver. Pending pickup for next step" ||
            doc.status === "Approval Complete. Pending return to Originator"
          }`)
        })
        console.log("=== END DEBUG ===")
      }
      
      // Separate documents into active and history
      const { active, history } = separateDocuments(userDocs)
      
      setDocuments(userDocs)
      setAllDocuments(allDocs)
      setActiveDocuments(active)
      setHistoryDocuments(history)
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

  // Separate documents into active and history based on status
  const separateDocuments = (docs: Document[]) => {
    const activeStatuses = [
      "NEW",  // Document created, awaiting delivery method selection
      "Ready for Pick-up (Drop Off)",
      "In Transit (Mail Controller)", 
      "In Transit - Rejected Document",
      "Delivered (Drop Off)",
      "Delivered (User)",
      "Delivered (Hand to Hand)",
      "Final Approval - Hand to Hand",
      "Final Approval - Delivered to Originator",  // Admin can close this
      "Received (User)",
      "Approved by Approver. Pending pickup for next step",
      "Approval Complete. Pending return to Originator",
      "REJECTED ROUTE",
      "REJECTED - Ready for Pickup",
      "REJECTED - Hand to Hand",
      "REJECTED - Returned to Originator"  // Admin can still revise this
    ]

    const active = docs.filter(doc => activeStatuses.includes(doc.status))
    const history = docs.filter(doc => !activeStatuses.includes(doc.status))

    return { active, history }
  }

  // Get current documents based on active tab
  const getCurrentDocuments = () => {
    return activeTab === "active" ? activeDocuments : historyDocuments
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

  const getStatusDisplay = (status: string) => {
    return EnhancedDocumentService.getStatusDisplay(status as any)
  }

  // NEW: Functions for dual status display
  const getDualStatusDisplay = (document: Document) => {
    const dualStatus = getDualStatusFromDocument(document)
    
    return {
      documentStatus: dualStatus.documentStatus ? DOCUMENT_STATUS_DISPLAY[dualStatus.documentStatus] : null,
      trackingStatus: dualStatus.trackingStatus ? TRACKING_STATUS_DISPLAY[dualStatus.trackingStatus] : null
    }
  }

  const renderStatusBadge = (display: any, type: 'document' | 'tracking') => {
    // Handle undefined/null status (for NEW documents)
    if (!display || display.text === undefined) {
      return (
        <Badge className="bg-gray-300 text-xs text-gray-600">
          <span className="mr-1">⏸️</span>
          <span className="hidden sm:inline">Not Set</span>
        </Badge>
      )
    }
    
    return (
      <Badge className={`${display.color} text-xs text-white`}>
        <span className="mr-1">{display.icon}</span>
        <span className="hidden sm:inline">{display.text}</span>
      </Badge>
    )
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
        // Admin actions moved to page title section
        return null
      case "mail":
        return (
          <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
            <h3 className="text-lg font-semibold mb-4">Mail Controller Actions</h3>
            <div className="flex flex-wrap gap-2">
              <Link href="/scan-qr">
                <Button size="sm">
                  <QrCode className="h-4 w-4 mr-2" />
                  Scan QR Code
                </Button>
              </Link>
            </div>
          </div>
        )
      case "approver":
        return (
          <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
            <h3 className="text-lg font-semibold mb-4">Approver Actions</h3>
            <div className="flex flex-wrap gap-2">
              <Link href="/scan-qr">
                <Button size="sm">
                  <QrCode className="h-4 w-4 mr-2" />
                  Scan QR Code
                </Button>
              </Link>
            </div>
          </div>
        )
      case "recipient":
        return (
          <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
            <h3 className="text-lg font-semibold mb-4">Recipient Actions</h3>
            <div className="flex flex-wrap gap-2">
              <Link href="/scan-qr">
                <Button size="sm">
                  <QrCode className="h-4 w-4 mr-2" />
                  Scan QR Code
                </Button>
              </Link>
            </div>
          </div>
        )
      default:
        return null
    }
  }

  const getDocumentActions = (document: Document) => {
    const actions = []

    // Show document details
    actions.push(
      <Link key="view" href={`/document/${document.id}`}>
        <Button variant="outline" size="sm" title="View Details">
          <Eye className="h-4 w-4" />
        </Button>
      </Link>
    )

    // Role-specific actions
    if (user?.role === "admin") {
      // Admin can see cover sheet and close completed documents
      actions.push(
        <Link key="cover" href={`/cover-sheet/${document.id}`}>
          <Button variant="outline" size="sm" title="Cover Sheet">
            <FileImage className="h-4 w-4" />
          </Button>
        </Link>
      )

      // Check if document is ready to be closed
      const canCloseWorkflow = () => {
        // Always allow closing for these statuses
        if (document.status === "Delivered (User)" || 
            document.status === "COMPLETED ROUTE" ||
            document.status === "Final Approval - Hand to Hand" ||
            document.status === "Final Approval - Delivered to Originator") {
          return true
        }
        
        // For "Delivered (Drop Off)", check if all approvals are complete
        if (document.status === "Delivered (Drop Off)" && 
            document.workflow === "flow" && 
            document.approvalSteps) {
          const allApproved = document.approvalSteps.every(step => step.status === "approved")
          return allApproved
        }
        
        return false
      }

      if (canCloseWorkflow()) {
        actions.push(
          <Button
            key="close"
            variant="outline"
            size="sm"
            onClick={() => handleCloseDocument(document.id)}
            title="Close Workflow"
          >
            <CheckSquare className="h-4 w-4" />
          </Button>
        )
      }

      // Admin can select delivery method for NEW documents
      if (document.status === "NEW") {
        actions.push(
          <Button
            key="delivery-method"
            variant="outline"
            size="sm"
            onClick={() => handleSelectDeliveryMethod(document.id)}
            className="text-blue-600 hover:text-blue-700"
            title="Select Delivery Method"
          >
            <Truck className="h-4 w-4" />
          </Button>
        )
      }

      // Admin can edit documents
      actions.push(
        <Link key="edit" href={`/document/${document.id}`}>
          <Button
            variant="outline"
            size="sm"
            className="text-blue-600 hover:text-blue-700"
            title="Edit"
          >
            <Edit className="h-4 w-4" />
          </Button>
        </Link>
      )

      // Admin can cancel documents
      actions.push(
        <Button
          key="cancel"
          variant="outline"
          size="sm"
          onClick={() => handleCancelDocument(document.id)}
          className="text-red-600 hover:text-red-700"
          title="Cancel Document"
        >
          <X className="h-4 w-4" />
        </Button>
      )

      // Admin can create revision for rejected documents
      if (EnhancedDocumentService.canCreateRevision(document)) {
        actions.push(
          <Button
            key="revise"
            variant="outline"
            size="sm"
            onClick={() => handleCreateRevision(document.id)}
            className="text-orange-600 hover:text-orange-700"
            title="Create Revision"
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
        )
      }
    }

    if (user?.role === "mail") {
      // Mail controller actions based on document status
      if (document.status === "Ready for Pick-up (Drop Off)" || 
          document.status === "Approved by Approver. Pending pickup for next step" ||
          document.status === "Approval Complete. Pending return to Originator") {
        actions.push(
          <Link key="scan" href={`/scan-qr?expected=${document.id}`}>
            <Button size="sm" title="Scan QR">
              <QrCode className="h-4 w-4" />
            </Button>
          </Link>
        )
      }
    }

    if (user?.role === "approver") {
      // Approver actions
      if (document.status === "Received (User)" || 
          document.status === "In Transit (Mail Controller)") {
        actions.push(
          <Link key="scan" href={`/scan-qr?expected=${document.id}`}>
            <Button size="sm" title="Scan QR">
              <QrCode className="h-4 w-4" />
            </Button>
          </Link>
        )
      }
    }

    if (user?.role === "recipient") {
      // Recipient actions  
      if (document.status === "In Transit (Mail Controller)" || 
          document.status === "Delivered (User)") {
        actions.push(
          <Link key="scan" href={`/scan-qr?expected=${document.id}`}>
            <Button size="sm" title="Scan QR">
              <QrCode className="h-4 w-4" />
            </Button>
          </Link>
        )
      }
    }

    return (
      <div className="flex flex-wrap gap-2">
        {actions}
      </div>
    )
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

  const handleCancelDocument = async (documentId: string) => {
    if (!confirm("Are you sure you want to cancel this document? This action cannot be undone.")) {
      return
    }

    try {
      const result = await EnhancedDocumentService.processScan(documentId, "cancel", user!, "Document cancelled by admin")
      
      if (result.success) {
        toast({
          title: "Document Cancelled",
          description: "Document workflow has been cancelled successfully.",
        })
        // Refresh the documents list
        loadDocuments(user!)
      } else {
        toast({
          title: "Error",
          description: result.message || "Failed to cancel document",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error("Error cancelling document:", error)
      toast({
        title: "Error",
        description: "An unexpected error occurred while cancelling the document",
        variant: "destructive"
      })
    }
  }

  const handleDeleteDocument = async (documentId: string) => {
    if (!confirm("Are you sure you want to delete this document? This action cannot be undone.")) {
      return
    }

    try {
      await EnhancedDocumentService.deleteDocument(documentId)
      toast({
        title: "Document Deleted",
        description: "The document has been deleted successfully",
      })
      await loadDocuments(user!)
    } catch (error) {
      toast({
        title: "Error",
        description: "An error occurred while deleting the document",
        variant: "destructive",
      })
    }
  }

  const handleCreateRevision = async (documentId: string) => {
    // Redirect to create-document page for editing the revision
    router.push(`/create-document?revisionOf=${documentId}`)
  }

  // Handle checkbox selection
  const handleSelectDocument = (documentId: string) => {
    setSelectedDocuments(prev => {
      if (prev.includes(documentId)) {
        return prev.filter(id => id !== documentId)
      } else {
        return [...prev, documentId]
      }
    })
  }

  // Handle select all checkbox
  const handleSelectAll = () => {
    const newDocuments = getCurrentDocuments().filter(doc => doc.status === "NEW")
    if (selectedDocuments.length === newDocuments.length) {
      setSelectedDocuments([])
    } else {
      setSelectedDocuments(newDocuments.map(doc => doc.id))
    }
  }

  // Handle bulk delivery method selection
  const handleBulkDeliveryMethod = () => {
    if (selectedDocuments.length === 0) {
      toast({
        title: "No Documents Selected",
        description: "Please select documents to send",
        variant: "destructive"
      })
      return
    }
    setShowDeliveryDialog(true)
  }

  const handleDeliveryMethodConfirm = async (deliveryMethod: "mail_controller" | "hand_to_hand") => {
    try {
      const selectedCount = selectedDocuments.length
      for (const docId of selectedDocuments) {
        await handleSelectDeliveryMethod(docId, deliveryMethod)
      }
      
      setSelectedDocuments([]) // Clear selection
      setShowDeliveryDialog(false)
      toast({
        title: "Bulk Delivery Method Set",
        description: `${selectedCount} documents updated successfully`,
      })
    } catch (error) {
      console.error("Error setting bulk delivery method:", error)
      toast({
        title: "Error",
        description: "Failed to set delivery method for some documents",
        variant: "destructive"
      })
    }
  }

  const handleSelectDeliveryMethod = async (documentId: string, method?: "mail_controller" | "hand_to_hand") => {
    // Use provided method or show dialog to select delivery method
    const deliveryMethod = method || (window.confirm(
      "Select delivery method:\n\nOK = Mail Controller Pickup\nCancel = Hand-to-Hand Delivery"
    ) ? "mail_controller" : "hand_to_hand")

    try {
      const document = await EnhancedDocumentService.getDocumentById(documentId)
      if (!document) {
        throw new Error("Document not found")
      }

      if (deliveryMethod === "mail_controller") {
        // Update document status for mail controller pickup
        document.status = "Ready for Pick-up (Drop Off)"
        const dualStatus = convertLegacyToDualStatus(document.status)
        document.documentStatus = dualStatus.documentStatus
        document.trackingStatus = dualStatus.trackingStatus
        
        // Add action to history
        const actionRecord = {
          id: Date.now().toString(),
          documentId: document.id,
          action: "created" as ActionType,
          performedBy: user!.email,
          performedAt: new Date().toISOString(),
          previousStatus: "NEW" as DocumentStatus,
          newStatus: "Ready for Pick-up (Drop Off)" as DocumentStatus,
          comments: "Delivery method selected: Mail Controller",
          previousDocumentStatus: undefined,
          newDocumentStatus: dualStatus.documentStatus,
          previousTrackingStatus: undefined,
          newTrackingStatus: dualStatus.trackingStatus
        }
        document.actionHistory.push(actionRecord)
      } else {
        // Hand-to-hand delivery - deliver directly to first approver
        if (document.workflow === "flow" && document.approvalSteps && document.approvalSteps.length > 0) {
          document.status = "Delivered (Hand to Hand)"
          const dualStatus = convertLegacyToDualStatus(document.status)
          document.documentStatus = dualStatus.documentStatus
          document.trackingStatus = dualStatus.trackingStatus
          
          // Add action to history
          const actionRecord = {
            id: Date.now().toString(),
            documentId: document.id,
            action: "deliver" as ActionType,
            performedBy: user!.email,
            performedAt: new Date().toISOString(),
            previousStatus: "NEW" as DocumentStatus,
            newStatus: "Delivered (Hand to Hand)" as DocumentStatus,
            comments: "Delivery method selected: Hand-to-Hand - Delivered to first approver",
            deliveryMethod: "hand_to_hand" as "hand_to_hand",
            previousDocumentStatus: undefined,
            newDocumentStatus: dualStatus.documentStatus,
            previousTrackingStatus: undefined,
            newTrackingStatus: dualStatus.trackingStatus
          }
          document.actionHistory.push(actionRecord)
        } else {
          throw new Error("Hand-to-hand delivery requires approval workflow")
        }
      }

      // Update in database
      await DatabaseService.updateDocument(document)

      toast({
        title: "Delivery Method Selected",
        description: `Document is now ready for ${deliveryMethod === "mail_controller" ? "mail controller pickup" : "hand-to-hand delivery"}`,
      })
      
      // Refresh documents
      loadDocuments(user!)
    } catch (error) {
      console.error("Error selecting delivery method:", error)
      toast({
        title: "Error",
        description: "Failed to select delivery method",
        variant: "destructive"
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

  const getApprovalStatus = (document: Document) => {
    if (document.workflow !== "flow" || !document.approvalSteps || user?.role !== "approver") {
      return null
    }

    const userStep = document.approvalSteps.find(step => step.approverEmail === user.email)
    if (!userStep || userStep.status !== "pending") {
      return null
    }

    // Check if document is in a state where approvers can act
    const canApproversAct = [
      "Delivered (Drop Off)",
      "Delivered (Hand to Hand)", 
      "Received (User)",
      "With Approver for Review"
    ].includes(document.status)

    if (!canApproversAct) {
      return (
        <Badge className="bg-gray-100 text-gray-600 text-xs ml-2">
          <Clock className="h-3 w-3 mr-1" />
          In Transit
        </Badge>
      )
    }

    const currentStepIndex = document.currentStepIndex || 0
    const isCurrentTurn = document.approvalSteps[currentStepIndex]?.approverEmail === user.email
    
    // Default to sequential if approvalMode is not set
    const approvalMode = document.approvalMode || "sequential"

    // Debug logging
    console.log(`Document ${document.id}: approvalMode=${approvalMode}, isCurrentTurn=${isCurrentTurn}, userEmail=${user.email}, status=${document.status}`)

    if (approvalMode === "flexible") {
      // In flexible mode, any pending approver can review if document is delivered
      return (
        <Badge className="bg-green-100 text-green-800 text-xs ml-2">
          <CheckCircle className="h-3 w-3 mr-1" />
          Ready to Review
        </Badge>
      )
    } else if (approvalMode === "sequential") {
      if (isCurrentTurn) {
        return (
          <Badge className="bg-green-100 text-green-800 text-xs ml-2">
            <CheckCircle className="h-3 w-3 mr-1" />
            Ready to Review
          </Badge>
        )
      } else {
        return (
          <Badge className="bg-gray-100 text-gray-600 text-xs ml-2">
            <Clock className="h-3 w-3 mr-1" />
            Incoming
          </Badge>
        )
      }
    }

    return null
  }

  // Get current location based on document status
  const getCurrentLocation = (document: Document) => {
    // Sample locations for demonstration (matching the image data)
    const sampleLocations: { [key: string]: string } = {
      "admin@company.com": "Building A, Floor 2, Room 201",
      "manager@company.com": "Building B, Floor 3, Executive Suite",
      "View": "Building C, Floor 1, Reception Desk",
      "Tawan": "Building A, Floor 4, IT Department",
      "Muk": "Building B, Floor 2, HR Department", 
      "Shivek": "Building C, Floor 3, Finance Department"
    }

    // Determine current location based on status
    switch (document.status) {
      case "NEW":
        // Document just created, awaiting delivery method selection
        const newCreatorName = document.createdBy.split('@')[0]
        const newCreatorLocation = sampleLocations[document.createdBy] || sampleLocations[newCreatorName] || "Building A, Floor 2, Room 201"
        return {
          user: newCreatorName,
          location: newCreatorLocation,
          status: "Awaiting delivery method selection"
        }
        
      case "Ready for Pick-up (Drop Off)":
      case "REJECTED - Ready for Pickup":
        // Document is with creator
        const creatorName = document.createdBy.split('@')[0]
        const creatorLocation = sampleLocations[document.createdBy] || sampleLocations[creatorName] || "Building A, Floor 2, Room 201"
        return {
          user: creatorName,
          location: creatorLocation,
          status: "With Creator"
        }
      
      case "In Transit (Mail Controller)":
      case "In Transit - Rejected Document":
        return {
          user: "Mail Controller",
          location: "In Transit Vehicle",
          status: "In Transit"
        }
      
      case "Delivered (Drop Off)":
      case "Delivered (Hand to Hand)":
      case "Received (User)":
        // Find current approver or recipient
        if (document.workflow === "flow" && document.approvalSteps) {
          const currentStep = document.approvalSteps[document.currentStepIndex || 0]
          if (currentStep && currentStep.status === "pending") {
            const approverName = currentStep.approverName || currentStep.approverEmail.split('@')[0]
            const location = sampleLocations[approverName] || sampleLocations[currentStep.approverEmail] || "Office Location"
            return {
              user: approverName,
              location: location,
              status: "With Approver"
            }
          }
          // If no pending step, check for current delivery destination
          const lastPendingStep = document.approvalSteps.find(step => step.status === "pending")
          if (lastPendingStep) {
            const approverName = lastPendingStep.approverName || lastPendingStep.approverEmail.split('@')[0]
            const location = sampleLocations[approverName] || sampleLocations[lastPendingStep.approverEmail] || "Office Location"
            return {
              user: approverName,
              location: location,
              status: "Current delivery destination"
            }
          }
        }
        // For drop workflow
        const recipientName = document.recipient?.split('@')[0] || "Recipient"
        return {
          user: recipientName,
          location: sampleLocations[recipientName] || "Office Location",
          status: "With Recipient"
        }
      
      case "Final Approval - Hand to Hand":
      case "Final Approval - Delivered to Originator":
      case "REJECTED - Returned to Originator":
        // Back with creator
        const finalCreatorName = document.createdBy.split('@')[0]
        const finalLocation = sampleLocations[document.createdBy] || sampleLocations[finalCreatorName] || "Building A, Floor 2, Room 201"
        return {
          user: finalCreatorName,
          location: finalLocation,
          status: "With Creator"
        }
      
      case "COMPLETED ROUTE":
      case "CANCELLED ROUTE":
        return {
          user: "Archive",
          location: "Document Archive System",
          status: "Archived"
        }
      
      default:
        // Try to find current approver
        if (document.workflow === "flow" && document.approvalSteps) {
          const currentStep = document.approvalSteps[document.currentStepIndex || 0]
          if (currentStep) {
            const approverName = currentStep.approverName || currentStep.approverEmail.split('@')[0]
            const location = sampleLocations[approverName] || sampleLocations[currentStep.approverEmail] || "Office Location"
            return {
              user: approverName,
              location: location,
              status: "Processing"
            }
          }
        }
        return {
          user: "System",
          location: "Processing Queue",
          status: "Processing"
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

  // Get unique statuses for filter dropdown
  const getUniqueStatuses = () => {
    const statuses = [...new Set(getCurrentDocuments().map(doc => doc.status))]
    return statuses.sort()
  }

  // Render document table for each tab
  const renderDocumentTable = (tabType: "active" | "history") => {
    const emptyMessage = tabType === "active" 
      ? "No active documents found. Documents in progress will appear here."
      : "No completed documents found. Finished documents will appear here."

    // Pagination
    const totalPages = Math.ceil(filteredDocuments.length / itemsPerPage)
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    const currentDocuments = filteredDocuments.slice(startIndex, endIndex)

    return (
      <>
        {/* Table Content */}
        {filteredDocuments.length === 0 ? (
          <div className="text-center py-12">
            <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Documents Found</h3>
            <p className="text-gray-600 mb-4">{emptyMessage}</p>
            {user?.role === "admin" && tabType === "active" && (
              <Link href="/create-document">
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Create First Document
                </Button>
              </Link>
            )}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-full">
                <thead className="bg-gray-50">
                  <tr className="border-b border-gray-200">
                    {user?.role === "admin" && (
                      <th className="px-2 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12">
                        <input
                          type="checkbox"
                          className="rounded border-gray-300"
                          checked={selectedDocuments.length > 0 && selectedDocuments.length === getCurrentDocuments().filter(doc => doc.status === "NEW").length}
                          onChange={handleSelectAll}
                        />
                      </th>
                    )}
                    <th className="px-2 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sr.</th>
                    <th className="px-2 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Document ID</th>
                    <th className="px-2 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
                    <th className="px-2 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Document Status</th>
                    <th className="px-2 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tracking Status</th>
                    <th className="hidden lg:table-cell px-2 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Current Location</th>
                    <th className="hidden md:table-cell px-2 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                    <th className="hidden lg:table-cell px-2 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Workflow</th>
                    <th className="hidden sm:table-cell px-2 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                    <th className="px-2 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {currentDocuments.map((doc, index) => {
                    const workflowInfo = getWorkflowInfo(doc)
                    const dualStatusDisplay = getDualStatusDisplay(doc)
                    const currentLocation = getCurrentLocation(doc)
                    const srNo = startIndex + index + 1
                    return (
                      <tr key={doc.id} className="hover:bg-gray-50">
                        {user?.role === "admin" && (
                          <td className="px-2 sm:px-4 py-4 whitespace-nowrap">
                            {doc.status === "NEW" ? (
                              <input
                                type="checkbox"
                                className="rounded border-gray-300"
                                checked={selectedDocuments.includes(doc.id)}
                                onChange={() => handleSelectDocument(doc.id)}
                              />
                            ) : (
                              <div className="w-4 h-4"></div>
                            )}
                          </td>
                        )}
                        <td className="px-2 sm:px-4 py-4 whitespace-nowrap text-sm text-gray-900">{srNo}</td>
                        <td className="px-2 sm:px-4 py-4 whitespace-nowrap">
                          <div className="text-xs sm:text-sm font-medium text-blue-600 break-all">{doc.id}</div>
                        </td>
                        <td className="px-2 sm:px-4 py-4">
                          <div className="flex flex-col sm:flex-row sm:items-center gap-1">
                            <div className="text-xs sm:text-sm font-medium text-gray-900 truncate max-w-32 sm:max-w-none">{doc.title}</div>
                            {getApprovalStatus(doc)}
                          </div>
                        </td>
                        <td className="px-2 sm:px-4 py-4 whitespace-nowrap">
                          {renderStatusBadge(dualStatusDisplay.documentStatus, 'document')}
                        </td>
                        <td className="px-2 sm:px-4 py-4 whitespace-nowrap">
                          {renderStatusBadge(dualStatusDisplay.trackingStatus, 'tracking')}
                        </td>
                        <td className="hidden lg:table-cell px-2 sm:px-4 py-4">
                          <div className="text-sm">
                            <div className="font-medium text-gray-900">{currentLocation.user}</div>
                            <div className="text-xs text-gray-500">({currentLocation.location})</div>
                          </div>
                        </td>
                        <td className="hidden md:table-cell px-2 sm:px-4 py-4 whitespace-nowrap text-sm text-gray-900">{doc.type}</td>
                        <td className="hidden lg:table-cell px-2 sm:px-4 py-4 whitespace-nowrap">
                          <div className="flex items-center space-x-1 text-sm text-gray-600">
                            {workflowInfo.icon}
                            <span>{workflowInfo.info}</span>
                          </div>
                        </td>
                        <td className="hidden sm:table-cell px-2 sm:px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                          {new Date(doc.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-2 sm:px-4 py-4 whitespace-nowrap text-sm">
                          <div className="flex flex-col sm:flex-row gap-1">
                            {getDocumentActions(doc)}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between px-4 py-3 border-t border-gray-200 gap-4">
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-700 hidden sm:inline">Items per page:</span>
                <select 
                  className="text-sm border border-gray-300 rounded px-2 py-1"
                  value={itemsPerPage}
                  disabled
                >
                  <option value={10}>10</option>
                </select>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <span className="text-sm text-gray-700 text-center">
                  {startIndex + 1} - {Math.min(endIndex, filteredDocuments.length)} of {filteredDocuments.length}
                </span>
                <div className="flex items-center justify-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="text-xs sm:text-sm"
                  >
                    <span className="hidden sm:inline">Previous</span>
                    <span className="sm:hidden">Prev</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="text-xs sm:text-sm"
                  >
                    Next
                  </Button>
                </div>
              </div>
            </div>
          </>
        )}
      </>
    )
  }

  if (isLoading) {
    return (
      <SidebarLayout>
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading dashboard...</p>
          </div>
        </div>
      </SidebarLayout>
    )
  }

  if (!user) return <div>Loading...</div>

  return (
    <SidebarLayout>
      <div className="p-6">
        {/* Breadcrumb */}
        <div className="flex items-center space-x-2 text-sm text-gray-500 mb-4">
          <span>Home</span>
          <span>/</span>
          <span>Documents</span>
          <span>/</span>
          <span className="text-gray-900">Document Distribution System</span>
        </div>

        {/* Page Title */}
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Document Distribution System</h1>
          {user.role === "admin" && (
            <Link href="/create-document">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add new Document
              </Button>
            </Link>
          )}
        </div>

        {/* Role-specific Actions */}
        {getRoleActions()}

        {/* System Statistics (for admin) */}
        {user.role === "admin" && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Total</p>
                    <p className="text-2xl font-bold">{allDocuments.length}</p>
                  </div>
                  <FileText className="h-8 w-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">In Transit</p>
                    <p className="text-2xl font-bold">
                      {allDocuments.filter(d => d.status.includes("Transit")).length}
                    </p>
                  </div>
                  <Truck className="h-8 w-8 text-yellow-500" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Review</p>
                    <p className="text-2xl font-bold">
                      {allDocuments.filter(d => d.status.includes("Review")).length}
                    </p>
                  </div>
                  <Clock className="h-8 w-8 text-orange-500" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Done</p>  
                    <p className="text-2xl font-bold">
                      {allDocuments.filter(d => d.status.includes("Completed")).length}
                    </p>
                  </div>
                  <CheckCircle className="h-8 w-8 text-green-500" />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Document Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          {/* Tabs Navigation - Full Width */}
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="active" className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Active Route ({activeDocuments.length})
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2">
              <Archive className="h-4 w-4" />
              Route History ({historyDocuments.length})
            </TabsTrigger>
          </TabsList>

          <div className="bg-white rounded-lg border border-gray-200">
            {/* Filters */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 border-b border-gray-200">
              <div className="flex flex-col sm:flex-row gap-2">
                <Button variant="outline" size="sm" className="w-fit">
                  <Download className="h-4 w-4 mr-2" />
                  DEFAULT
                </Button>
                <Button variant="outline" size="sm" className="w-fit">
                  <Filter className="h-4 w-4 mr-2" />
                  FILTER
                </Button>
                {user?.role === "admin" && selectedDocuments.length > 0 && (
                  <Button 
                    onClick={handleBulkDeliveryMethod}
                    size="sm" 
                    variant="default"
                    className="w-fit"
                  >
                    <Truck className="h-4 w-4 mr-2" />
                    Send Selected ({selectedDocuments.length})
                  </Button>
                )}
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full sm:w-48">
                    <SelectValue placeholder="Filter by Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    {getUniqueStatuses().map(status => (
                      <SelectItem key={status} value={status}>{status}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="relative">
                <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <Input
                  placeholder="Search by Document ID or Title"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-full sm:w-64"
                />
              </div>
            </div>

            {/* Tab Contents */}
            <TabsContent value="active" className="mt-0">
              {renderDocumentTable("active")}
            </TabsContent>
            
            <TabsContent value="history" className="mt-0">
              {renderDocumentTable("history")}
            </TabsContent>
          </div>
        </Tabs>

        {/* Delivery Method Selection Dialog */}
        <Dialog open={showDeliveryDialog} onOpenChange={setShowDeliveryDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Truck className="h-5 w-5 text-blue-600" />
                Select Delivery Method
              </DialogTitle>
              <DialogDescription>
                Choose how you want to deliver {selectedDocuments.length} selected document{selectedDocuments.length > 1 ? 's' : ''}
              </DialogDescription>
            </DialogHeader>
            
            <div className="grid grid-cols-1 gap-4 py-4">
              <Button
                onClick={() => handleDeliveryMethodConfirm("mail_controller")}
                className="h-auto p-4 flex flex-col items-center gap-2 bg-blue-50 hover:bg-blue-100 text-blue-700 border-2 border-blue-200 hover:border-blue-300"
                variant="outline"
              >
                <div className="flex items-center gap-2">
                  <Truck className="h-6 w-6" />
                  <span className="font-semibold">Mail Controller Pickup</span>
                </div>
                <span className="text-sm text-blue-600 text-center">
                  Documents will be picked up by mail controller for delivery
                </span>
              </Button>

              <Button
                onClick={() => handleDeliveryMethodConfirm("hand_to_hand")}
                className="h-auto p-4 flex flex-col items-center gap-2 bg-green-50 hover:bg-green-100 text-green-700 border-2 border-green-200 hover:border-green-300"
                variant="outline"
              >
                <div className="flex items-center gap-2">
                  <Users className="h-6 w-6" />
                  <span className="font-semibold">Hand-to-Hand Delivery</span>
                </div>
                <span className="text-sm text-green-600 text-center">
                  Documents will be delivered directly to first approver
                </span>
              </Button>
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setShowDeliveryDialog(false)}
              >
                Cancel
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </SidebarLayout>
  )
}
