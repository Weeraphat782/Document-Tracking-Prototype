"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { ArrowLeft, FileText, Clock, CheckCircle, XCircle, AlertCircle, Users, User, Package, Truck, History, QrCode } from "lucide-react"
import Link from "next/link"
import { useRouter, useParams } from "next/navigation"
import { EnhancedDocumentService } from "@/lib/enhanced-document-service"
import { Document, User as UserType, ActionType } from "@/lib/types"
import { useToast } from "@/hooks/use-toast"

export default function DocumentDetailPage() {
  const [user, setUser] = useState<UserType | null>(null)
  const [document, setDocument] = useState<Document | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [actionComments, setActionComments] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)
  
  const router = useRouter()
  const params = useParams()
  const { toast } = useToast()
  const documentId = params.id as string

  useEffect(() => {
    const userData = localStorage.getItem("user")
    if (!userData) {
      router.push("/")
      return
    }

    const parsedUser = JSON.parse(userData) as UserType
    setUser(parsedUser)
    loadDocument()
  }, [documentId, router])

  const loadDocument = async () => {
    try {
      const doc = await EnhancedDocumentService.getDocumentById(documentId)
      if (!doc) {
        toast({
          title: "Document Not Found",
          description: "The requested document could not be found",
          variant: "destructive",
        })
        router.push("/dashboard")
        return
      }

      setDocument(doc)
    } catch (error) {
      toast({
        title: "Error Loading Document",
        description: "An error occurred while loading the document",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleApprove = async () => {
    if (!document || !user) return

    setIsProcessing(true)
    try {
      const result = await EnhancedDocumentService.processScan(
        document.id,
        "approve",
        user,
        actionComments.trim() || undefined
      )

      if (result.success) {
        toast({
          title: "Document Approved",
          description: "Document has been approved successfully",
        })
        setActionComments("")
        await loadDocument() // Reload to show updated status
      } else {
        toast({
          title: "Approval Failed",
          description: result.message,
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An error occurred while processing the approval",
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleReject = async () => {
    if (!document || !user || !actionComments.trim()) {
      toast({
        title: "Comments Required",
        description: "Please provide a reason for rejection",
        variant: "destructive",
      })
      return
    }

    setIsProcessing(true)
    try {
      const result = await EnhancedDocumentService.processScan(
        document.id,
        "reject",
        user,
        actionComments.trim()
      )

      if (result.success) {
        toast({
          title: "Document Rejected",
          description: "Document has been rejected and will be returned for revision",
        })
        setActionComments("")
        await loadDocument() // Reload to show updated status
      } else {
        toast({
          title: "Rejection Failed",
          description: result.message,
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An error occurred while processing the rejection",
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
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

  const getActionIcon = (action: ActionType) => {
    switch (action) {
      case "created": return <FileText className="h-4 w-4" />
      case "pickup": return <Package className="h-4 w-4" />
      case "deliver": return <Truck className="h-4 w-4" />
      case "receive": return <CheckCircle className="h-4 w-4" />
      case "approve": return <CheckCircle className="h-4 w-4" />
      case "reject": return <XCircle className="h-4 w-4" />
      case "close": return <CheckCircle className="h-4 w-4" />
      default: return <History className="h-4 w-4" />
    }
  }

  const canUserApprove = () => {
    if (!user || !document || user.role !== "approver") return false
    if (document.workflow !== "flow" || !document.approvalSteps) return false
    
    const currentStep = document.approvalSteps[document.currentStepIndex || 0]
    return currentStep?.approverEmail === user.email && currentStep.status === "pending"
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading document...</p>
        </div>
      </div>
    )
  }

  if (!document) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="text-center py-6">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Document Not Found</h2>
            <p className="text-gray-600 mb-4">The requested document could not be found.</p>
            <Link href="/dashboard">
              <Button>Return to Dashboard</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile-optimized Header */}
      <header className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8">
          <div className="flex items-center py-3 sm:py-4">
            <Link href="/dashboard">
              <Button variant="ghost" size="sm" className="mr-2 sm:mr-4 px-2 sm:px-3">
                <ArrowLeft className="h-4 w-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">Back to Dashboard</span>
                <span className="sm:hidden">Back</span>
              </Button>
            </Link>
            <div className="flex items-center min-w-0 flex-1">
              <FileText className="h-5 w-5 sm:h-6 sm:w-6 mr-2 text-blue-600 flex-shrink-0" />
              <h1 className="text-lg sm:text-2xl font-bold text-gray-900 truncate">
                <span className="hidden sm:inline">Document Details</span>
                <span className="sm:hidden">Details</span>
              </h1>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
          
          {/* Main Document Information */}
          <div className="lg:col-span-2 space-y-4 sm:space-y-6">
            
            {/* Document Header */}
            <Card>
              <CardHeader className="pb-3 sm:pb-6">
                <div className="space-y-3 sm:space-y-0 sm:flex sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <CardTitle className="flex items-center text-base sm:text-lg">
                      <FileText className="h-4 w-4 sm:h-5 sm:w-5 mr-2 flex-shrink-0" />
                      <span className="truncate">{document.title}</span>
                    </CardTitle>
                    <CardDescription className="mt-2 space-y-2">
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="outline" className="text-xs font-mono">{document.id}</Badge>
                        <Badge variant="outline" className="text-xs">{document.type}</Badge>
                      </div>
                      <div className="flex items-center space-x-1 text-xs sm:text-sm">
                        {document.workflow === "flow" ? (
                          <Users className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                        ) : (
                          <User className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                        )}
                        <span className="truncate">
                          {document.workflow === "flow" ? "Multi-level Approval" : "Direct Delivery"}
                        </span>
                      </div>
                    </CardDescription>
                  </div>
                  <div className="flex-shrink-0">
                    <Badge className={`${getStatusColor(document.status)} text-xs sm:text-sm px-2 sm:px-3 py-1`}>
                      <span className="flex items-center">
                        {getStatusIcon(document.status)}
                        <span className="ml-1 truncate max-w-[120px] sm:max-w-none">{document.status}</span>
                      </span>
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 sm:space-y-4 pt-3 sm:pt-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <p className="text-xs sm:text-sm font-medium text-gray-600">Created By</p>
                    <p className="text-sm sm:text-base truncate">{document.createdBy}</p>
                  </div>
                  <div>
                    <p className="text-xs sm:text-sm font-medium text-gray-600">Created Date</p>
                    <p className="text-sm sm:text-base">{new Date(document.createdAt).toLocaleString()}</p>
                  </div>
                  {document.updatedAt && (
                    <div className="sm:col-span-2">
                      <p className="text-xs sm:text-sm font-medium text-gray-600">Last Updated</p>
                      <p className="text-sm sm:text-base">{new Date(document.updatedAt).toLocaleString()}</p>
                    </div>
                  )}
                  {document.workflow === "drop" && document.recipient && (
                    <div className="sm:col-span-2">
                      <p className="text-xs sm:text-sm font-medium text-gray-600">Recipient</p>
                      <p className="text-sm sm:text-base truncate">{document.recipient}</p>
                    </div>
                  )}
                </div>
                
                {document.description && (
                  <div>
                    <p className="text-xs sm:text-sm font-medium text-gray-600">Description</p>
                    <div className="text-sm sm:text-base mt-1 p-3 bg-gray-50 rounded break-words">
                      {document.description}
                    </div>
                  </div>
                )}

                {document.rejectionReason && (
                  <Alert variant="destructive">
                    <XCircle className="h-4 w-4 flex-shrink-0" />
                    <AlertDescription className="text-sm">
                      <strong>Rejection Reason:</strong> 
                      <div className="mt-1 break-words">{document.rejectionReason}</div>
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>

            {/* Approval Hierarchy (for Flow workflow) */}
            {document.workflow === "flow" && document.approvalSteps && (
              <Card>
                <CardHeader className="pb-3 sm:pb-6">
                  <CardTitle className="flex items-center text-base sm:text-lg">
                    <Users className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                    Approval Hierarchy
                  </CardTitle>
                  <CardDescription className="text-sm">
                    Document approval progress and hierarchy
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-3 sm:pt-6">
                  <div className="space-y-2 sm:space-y-3">
                    {document.approvalSteps.map((step, index) => (
                      <div 
                        key={step.approverEmail}
                        className={`flex items-start sm:items-center justify-between p-3 rounded-lg border ${
                          index === document.currentStepIndex ? 'bg-blue-50 border-blue-200' : 
                          step.status === "approved" ? 'bg-green-50 border-green-200' :
                          step.status === "rejected" ? 'bg-red-50 border-red-200' : 
                          'bg-gray-50 border-gray-200'
                        }`}
                      >
                        <div className="flex items-start space-x-2 sm:space-x-3 min-w-0 flex-1">
                          <Badge 
                            variant={index === document.currentStepIndex ? "default" : "outline"}
                            className="w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center p-0 text-xs sm:text-sm flex-shrink-0"
                          >
                            {index + 1}
                          </Badge>
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-xs sm:text-sm truncate">{step.approverEmail}</p>
                            {step.timestamp && (
                              <p className="text-xs text-gray-500 mt-1">
                                {step.status === "approved" ? "Approved" : "Rejected"} on{" "}
                                <span className="block sm:inline">
                                  {new Date(step.timestamp).toLocaleString()}
                                </span>
                              </p>
                            )}
                            {step.comments && (
                              <p className="text-xs text-gray-600 mt-1 italic break-words">"{step.comments}"</p>
                            )}
                          </div>
                        </div>
                        <div className="flex-shrink-0 ml-2">
                          {step.status === "approved" && <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />}
                          {step.status === "rejected" && <XCircle className="h-4 w-4 sm:h-5 sm:w-5 text-red-600" />}
                          {step.status === "pending" && index === document.currentStepIndex && (
                            <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
                          )}
                          {step.status === "pending" && index !== document.currentStepIndex && (
                            <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Action History */}
            <Card>
              <CardHeader className="pb-3 sm:pb-6">
                <CardTitle className="flex items-center text-base sm:text-lg">
                  <History className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                  Action History
                </CardTitle>
                <CardDescription className="text-sm">
                  Complete audit trail of document actions
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-3 sm:pt-6">
                <div className="space-y-2 sm:space-y-3">
                  {document.actionHistory.map((action) => (
                    <div key={action.id} className="flex items-start space-x-2 sm:space-x-3 p-3 border rounded-lg">
                      <div className="mt-0.5 flex-shrink-0">
                        {getActionIcon(action.action)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-0">
                          <p className="font-medium text-xs sm:text-sm capitalize">{action.action}</p>
                          <p className="text-xs text-gray-500">
                            {new Date(action.performedAt).toLocaleString()}
                          </p>
                        </div>
                        <p className="text-xs sm:text-sm text-gray-600 truncate">
                          Performed by {action.performedBy}
                        </p>
                        {action.previousStatus && (
                          <p className="text-xs text-gray-500 break-words">
                            Status changed from "{action.previousStatus}" to "{action.newStatus}"
                          </p>
                        )}
                        {action.comments && (
                          <p className="text-xs text-gray-600 mt-1 italic break-words">"{action.comments}"</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Actions Panel */}
          <div className="space-y-4 sm:space-y-6">
            
            {/* Current Status */}
            <Card>
              <CardHeader className="pb-3 sm:pb-6">
                <CardTitle className="text-base sm:text-lg">Current Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 sm:space-y-4 pt-3 sm:pt-6">
                <div className="text-center">
                  <Badge className={`${getStatusColor(document.status)} text-sm sm:text-base px-2 sm:px-3 py-1 sm:py-2`}>
                    <span className="flex items-center">
                      {getStatusIcon(document.status)}
                      <span className="ml-1 sm:ml-2 break-words max-w-[200px]">{document.status}</span>
                    </span>
                  </Badge>
                </div>
                
                {document.workflow === "flow" && document.approvalSteps && (
                  <div className="text-center">
                    <p className="text-xs sm:text-sm text-gray-600">
                      Progress: {document.approvalSteps.filter(s => s.status === "approved").length} of{" "}
                      {document.approvalSteps.length} approvals completed
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader className="pb-3 sm:pb-6">
                <CardTitle className="text-base sm:text-lg">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 sm:space-y-3 pt-3 sm:pt-6">
                <Link href="/scan-qr">
                  <Button variant="outline" className="w-full text-sm sm:text-base py-2 sm:py-3">
                    <QrCode className="h-4 w-4 mr-2 flex-shrink-0" />
                    <span className="truncate">Scan QR Code</span>
                  </Button>
                </Link>
                
                <Link href={`/cover-sheet/${document.id}`}>
                  <Button variant="outline" className="w-full text-sm sm:text-base py-2 sm:py-3">
                    <FileText className="h-4 w-4 mr-2 flex-shrink-0" />
                    <span className="truncate">View Cover Sheet</span>
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* Approval Actions (for approvers) */}
            {canUserApprove() && (
              <Card>
                <CardHeader className="pb-3 sm:pb-6">
                  <CardTitle className="text-orange-600 text-base sm:text-lg">Pending Your Approval</CardTitle>
                  <CardDescription className="text-sm">
                    This document is waiting for your review and approval
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 sm:space-y-4 pt-3 sm:pt-6">
                  <div className="space-y-2">
                    <Label htmlFor="comments" className="text-sm">
                      Comments (Optional for approval, Required for rejection)
                    </Label>
                    <Textarea
                      id="comments"
                      placeholder="Add your comments or feedback..."
                      value={actionComments}
                      onChange={(e) => setActionComments(e.target.value)}
                      rows={3}
                      className="text-sm"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Button 
                      onClick={handleApprove}
                      className="w-full bg-green-600 hover:bg-green-700 text-sm sm:text-base py-2 sm:py-3"
                      disabled={isProcessing}
                    >
                      <CheckCircle className="h-4 w-4 mr-2 flex-shrink-0" />
                      <span className="truncate">{isProcessing ? "Processing..." : "Approve Document"}</span>
                    </Button>
                    
                    <Button 
                      onClick={handleReject}
                      variant="destructive"
                      className="w-full text-sm sm:text-base py-2 sm:py-3"
                      disabled={isProcessing || !actionComments.trim()}
                    >
                      <XCircle className="h-4 w-4 mr-2 flex-shrink-0" />
                      <span className="truncate">{isProcessing ? "Processing..." : "Reject Document"}</span>
                    </Button>
                  </div>

                  <Alert>
                    <AlertCircle className="h-4 w-4 flex-shrink-0" />
                    <AlertDescription className="text-xs sm:text-sm">
                      <strong>Important:</strong> Comments are required when rejecting a document to provide 
                      clear feedback to the originator.
                    </AlertDescription>
                  </Alert>
                </CardContent>
              </Card>
            )}

            {/* Document Info */}
            <Card>
              <CardHeader className="pb-3 sm:pb-6">
                <CardTitle className="text-base sm:text-lg">Document Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 sm:space-y-3 text-xs sm:text-sm pt-3 sm:pt-6">
                <div className="flex justify-between items-start gap-2">
                  <span className="text-gray-600 flex-shrink-0">Document ID:</span>
                  <span className="font-mono text-right break-all">{document.id}</span>
                </div>
                <div className="flex justify-between items-start gap-2">
                  <span className="text-gray-600 flex-shrink-0">Workflow Type:</span>
                  <span className="text-right">{document.workflow === "flow" ? "Multi-level Approval" : "Direct Delivery"}</span>
                </div>
                {document.workflow === "flow" && document.approvalSteps && (
                  <div className="flex justify-between items-start gap-2">
                    <span className="text-gray-600 flex-shrink-0">Total Approvers:</span>
                    <span className="text-right">{document.approvalSteps.length}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}
