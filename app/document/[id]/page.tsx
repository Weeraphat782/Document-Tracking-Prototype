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
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center py-4">
            <Link href="/dashboard">
              <Button variant="ghost" size="sm" className="mr-4">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
            </Link>
            <div className="flex items-center">
              <FileText className="h-6 w-6 mr-2 text-blue-600" />
              <h1 className="text-2xl font-bold text-gray-900">Document Details</h1>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main Document Information */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Document Header */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center">
                      <FileText className="h-5 w-5 mr-2" />
                      {document.title}
                    </CardTitle>
                    <CardDescription className="flex items-center space-x-2 mt-2">
                      <Badge variant="outline">{document.id}</Badge>
                      <Badge variant="outline">{document.type}</Badge>
                      <div className="flex items-center space-x-1">
                        {document.workflow === "flow" ? (
                          <Users className="h-4 w-4" />
                        ) : (
                          <User className="h-4 w-4" />
                        )}
                        <span className="text-sm">
                          {document.workflow === "flow" ? "Multi-level Approval" : "Direct Delivery"}
                        </span>
                      </div>
                    </CardDescription>
                  </div>
                  <Badge className={getStatusColor(document.status)}>
                    {getStatusIcon(document.status)}
                    <span className="ml-1">{document.status}</span>
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Created By</p>
                    <p className="text-sm">{document.createdBy}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Created Date</p>
                    <p className="text-sm">{new Date(document.createdAt).toLocaleString()}</p>
                  </div>
                  {document.updatedAt && (
                    <>
                      <div>
                        <p className="text-sm font-medium text-gray-600">Last Updated</p>
                        <p className="text-sm">{new Date(document.updatedAt).toLocaleString()}</p>
                      </div>
                    </>
                  )}
                  {document.workflow === "drop" && document.recipient && (
                    <div>
                      <p className="text-sm font-medium text-gray-600">Recipient</p>
                      <p className="text-sm">{document.recipient}</p>
                    </div>
                  )}
                </div>
                
                {document.description && (
                  <div>
                    <p className="text-sm font-medium text-gray-600">Description</p>
                    <p className="text-sm mt-1 p-3 bg-gray-50 rounded">{document.description}</p>
                  </div>
                )}

                {document.rejectionReason && (
                  <Alert variant="destructive">
                    <XCircle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Rejection Reason:</strong> {document.rejectionReason}
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>

            {/* Approval Hierarchy (for Flow workflow) */}
            {document.workflow === "flow" && document.approvalSteps && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Users className="h-5 w-5 mr-2" />
                    Approval Hierarchy
                  </CardTitle>
                  <CardDescription>
                    Document approval progress and hierarchy
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {document.approvalSteps.map((step, index) => (
                      <div 
                        key={step.approverEmail}
                        className={`flex items-center justify-between p-3 rounded-lg border ${
                          index === document.currentStepIndex ? 'bg-blue-50 border-blue-200' : 
                          step.status === "approved" ? 'bg-green-50 border-green-200' :
                          step.status === "rejected" ? 'bg-red-50 border-red-200' : 
                          'bg-gray-50 border-gray-200'
                        }`}
                      >
                        <div className="flex items-center space-x-3">
                          <Badge 
                            variant={index === document.currentStepIndex ? "default" : "outline"}
                            className="w-8 h-8 rounded-full flex items-center justify-center p-0"
                          >
                            {index + 1}
                          </Badge>
                          <div>
                            <p className="font-medium text-sm">{step.approverEmail}</p>
                            {step.timestamp && (
                              <p className="text-xs text-gray-500">
                                {step.status === "approved" ? "Approved" : "Rejected"} on{" "}
                                {new Date(step.timestamp).toLocaleString()}
                              </p>
                            )}
                            {step.comments && (
                              <p className="text-xs text-gray-600 mt-1 italic">"{step.comments}"</p>
                            )}
                          </div>
                        </div>
                        <div>
                          {step.status === "approved" && <CheckCircle className="h-5 w-5 text-green-600" />}
                          {step.status === "rejected" && <XCircle className="h-5 w-5 text-red-600" />}
                          {step.status === "pending" && index === document.currentStepIndex && (
                            <Clock className="h-5 w-5 text-blue-600" />
                          )}
                          {step.status === "pending" && index !== document.currentStepIndex && (
                            <Clock className="h-5 w-5 text-gray-400" />
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
              <CardHeader>
                <CardTitle className="flex items-center">
                  <History className="h-5 w-5 mr-2" />
                  Action History
                </CardTitle>
                <CardDescription>
                  Complete audit trail of document actions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {document.actionHistory.map((action) => (
                    <div key={action.id} className="flex items-start space-x-3 p-3 border rounded-lg">
                      <div className="mt-0.5">
                        {getActionIcon(action.action)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <p className="font-medium text-sm capitalize">{action.action}</p>
                          <p className="text-xs text-gray-500">
                            {new Date(action.performedAt).toLocaleString()}
                          </p>
                        </div>
                        <p className="text-sm text-gray-600">
                          Performed by {action.performedBy}
                        </p>
                        {action.previousStatus && (
                          <p className="text-xs text-gray-500">
                            Status changed from "{action.previousStatus}" to "{action.newStatus}"
                          </p>
                        )}
                        {action.comments && (
                          <p className="text-xs text-gray-600 mt-1 italic">"{action.comments}"</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Actions Panel */}
          <div className="space-y-6">
            
            {/* Current Status */}
            <Card>
              <CardHeader>
                <CardTitle>Current Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center">
                  <Badge className={`${getStatusColor(document.status)} text-base px-3 py-2`}>
                    {getStatusIcon(document.status)}
                    <span className="ml-2">{document.status}</span>
                  </Badge>
                </div>
                
                {document.workflow === "flow" && document.approvalSteps && (
                  <div className="text-center">
                    <p className="text-sm text-gray-600">
                      Progress: {document.approvalSteps.filter(s => s.status === "approved").length} of{" "}
                      {document.approvalSteps.length} approvals completed
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Link href="/scan-qr">
                  <Button variant="outline" className="w-full">
                    <QrCode className="h-4 w-4 mr-2" />
                    Scan QR Code
                  </Button>
                </Link>
                
                <Link href={`/cover-sheet/${document.id}`}>
                  <Button variant="outline" className="w-full">
                    <FileText className="h-4 w-4 mr-2" />
                    View Cover Sheet
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* Approval Actions (for approvers) */}
            {canUserApprove() && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-orange-600">Pending Your Approval</CardTitle>
                  <CardDescription>
                    This document is waiting for your review and approval
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="comments">Comments (Optional for approval, Required for rejection)</Label>
                    <Textarea
                      id="comments"
                      placeholder="Add your comments or feedback..."
                      value={actionComments}
                      onChange={(e) => setActionComments(e.target.value)}
                      rows={3}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Button 
                      onClick={handleApprove}
                      className="w-full bg-green-600 hover:bg-green-700"
                      disabled={isProcessing}
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      {isProcessing ? "Processing..." : "Approve Document"}
                    </Button>
                    
                    <Button 
                      onClick={handleReject}
                      variant="destructive"
                      className="w-full"
                      disabled={isProcessing || !actionComments.trim()}
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      {isProcessing ? "Processing..." : "Reject Document"}
                    </Button>
                  </div>

                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription className="text-sm">
                      <strong>Important:</strong> Comments are required when rejecting a document to provide 
                      clear feedback to the originator.
                    </AlertDescription>
                  </Alert>
                </CardContent>
              </Card>
            )}

            {/* Document Info */}
            <Card>
              <CardHeader>
                <CardTitle>Document Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Document ID:</span>
                  <span className="font-mono">{document.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Workflow Type:</span>
                  <span>{document.workflow === "flow" ? "Multi-level Approval" : "Direct Delivery"}</span>
                </div>
                {document.workflow === "flow" && document.approvalSteps && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total Approvers:</span>
                    <span>{document.approvalSteps.length}</span>
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
