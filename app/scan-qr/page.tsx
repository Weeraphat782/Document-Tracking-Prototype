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
import { ArrowLeft, QrCode, CheckCircle, AlertCircle, Loader, Camera, Type, Users, User, Package, Truck, Clock } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { EnhancedDocumentService } from "@/lib/enhanced-document-service"
import { QRCodeScanner } from "@/lib/qr-utils"
import { QRScanner } from "@/components/ui/qr-scanner"
import { User as UserType, ActionType, ScanResult } from "@/lib/types"
import { useToast } from "@/hooks/use-toast"

export default function ScanQR() {
  const [user, setUser] = useState<UserType | null>(null)
  const [documentId, setDocumentId] = useState("")
  const [action, setAction] = useState<ActionType | "">("")
  const [comments, setComments] = useState("")
  const [scanResult, setScanResult] = useState<ScanResult | null>(null)
  const [isScanning, setIsScanning] = useState(false)
  const [scanMode, setScanMode] = useState<"camera" | "manual">("manual")
  const [hasCamera, setHasCamera] = useState(false)
  
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

    // Check for camera support
    checkCameraSupport()
  }, [router])

  const checkCameraSupport = async () => {
    const cameraSupported = await QRCodeScanner.hasCameraSupport()
    setHasCamera(cameraSupported)
    if (cameraSupported) {
      setScanMode("camera")
    }
  }

  const getActionsForRole = (): { value: ActionType, label: string, description: string }[] => {
    switch (user?.role) {
      case "mail":
        return [
          { value: "pickup", label: "Pickup Document", description: "Collect document for delivery" },
          { value: "deliver", label: "Deliver Document", description: "Deliver document to recipient" },
        ]
      case "approver":
        return [
          { value: "receive", label: "Receive for Review", description: "Confirm receipt of document" },
          { value: "approve", label: "Approve Document", description: "Approve and send to next step" },
          { value: "reject", label: "Reject Document", description: "Reject and return for revision" },
        ]
      case "recipient":
        return [
          { value: "receive", label: "Confirm Receipt", description: "Confirm document receipt" }
        ]
      case "admin":
        return [
          { value: "close", label: "Close Document", description: "Mark document as completed" },
          { value: "revise", label: "Revise Document", description: "Create revised version" }
        ]
      default:
        return []
    }
  }

  const handleScan = async () => {
    if (!documentId || !action || !user) {
      toast({
        title: "Missing Information",
        description: "Please enter document ID and select an action",
        variant: "destructive",
      })
      return
    }

    setIsScanning(true)
    setScanResult(null)

    try {
      // Simulate scanning delay
      await new Promise(resolve => setTimeout(resolve, 2000))

      const result = await EnhancedDocumentService.processScan(
        documentId.trim(),
        action as ActionType,
        user,
        comments.trim() || undefined
      )

      setScanResult(result)

      if (result.success) {
        toast({
          title: "Scan Successful",
          description: result.message,
        })
        
        // Clear form on success
        setDocumentId("")
        setAction("")
        setComments("")
      } else {
        toast({
          title: "Scan Failed",
          description: result.message,
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error Processing Scan",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsScanning(false)
    }
  }

  const handleCameraScan = async () => {
    if (!user) return

    setIsScanning(true)
    
    try {
      // Simulate camera scanning - in real implementation, this would use camera
      const mockResult = await QRCodeScanner.simulateScan(documentId || "DOC-" + Date.now())
      
      if (mockResult) {
        setDocumentId(mockResult.documentId)
        toast({
          title: "QR Code Detected",
          description: `Document ${mockResult.documentId} scanned successfully`,
        })
      }
    } catch (error) {
      toast({
        title: "Camera Scan Failed",
        description: "Failed to scan QR code with camera",
        variant: "destructive",
      })
    } finally {
      setIsScanning(false)
    }
  }

  const handleManualEntry = () => {
    if (!documentId) {
      toast({
        title: "Missing Document ID",
        description: "Please enter a document ID",
        variant: "destructive",
      })
      return
    }

    const qrData = QRCodeScanner.manualEntry(documentId.trim())
    if (qrData) {
      setDocumentId(qrData.documentId)
      toast({
        title: "Document Found",
        description: `Document ${qrData.documentId} loaded successfully`,
      })
    } else {
      toast({
        title: "Invalid Document ID",
        description: "Please check the document ID and try again",
        variant: "destructive",
      })
    }
  }

  const getActionIcon = (actionType: ActionType) => {
    switch (actionType) {
      case "pickup": return <Package className="h-4 w-4" />
      case "deliver": return <Truck className="h-4 w-4" />
      case "receive": return <CheckCircle className="h-4 w-4" />
      case "approve": return <CheckCircle className="h-4 w-4" />
      case "reject": return <AlertCircle className="h-4 w-4" />
      case "close": return <CheckCircle className="h-4 w-4" />
      case "revise": return <Type className="h-4 w-4" />
      default: return <QrCode className="h-4 w-4" />
    }
  }

  const getActionColor = (actionType: ActionType) => {
    switch (actionType) {
      case "pickup": return "text-blue-600"
      case "deliver": return "text-purple-600"
      case "receive": return "text-green-600"
      case "approve": return "text-green-600"
      case "reject": return "text-red-600"
      case "close": return "text-gray-600"
      case "revise": return "text-orange-600"
      default: return "text-gray-600"
    }
  }

  if (!user) return <div>Loading...</div>

  const availableActions = getActionsForRole()

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
              <QrCode className="h-6 w-6 mr-2 text-blue-600" />
              <h1 className="text-2xl font-bold text-gray-900">Scan QR Code</h1>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Success Result */}
        {scanResult && scanResult.success && (
          <Alert className="mb-6 border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              <div className="space-y-2">
                <div className="font-semibold">Scan Successful!</div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm"><strong>Document:</strong> {scanResult.document?.id}</p>
                    <p className="text-sm"><strong>Title:</strong> {scanResult.document?.title}</p>
                    <p className="text-sm"><strong>Status:</strong> {scanResult.document?.status}</p>
                  </div>
                  <div>
                    <p className="text-sm"><strong>Action:</strong> {scanResult.action}</p>
                    <p className="text-sm"><strong>Timestamp:</strong> {scanResult.timestamp}</p>
                    {scanResult.nextStep && (
                      <p className="text-sm"><strong>Next Step:</strong> {scanResult.nextStep}</p>
                    )}
                  </div>
                </div>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Error Result */}
        {scanResult && !scanResult.success && (
          <Alert className="mb-6" variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-2">
                <div className="font-semibold">Scan Failed</div>
                <p>{scanResult.message}</p>
                {scanResult.warnings && scanResult.warnings.length > 0 && (
                  <ul className="list-disc list-inside text-sm">
                    {scanResult.warnings.map((warning, index) => (
                      <li key={index}>{warning}</li>
                    ))}
                  </ul>
                )}
              </div>
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Scanning Interface */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <QrCode className="h-5 w-5 mr-2" />
                Document Scanner
              </CardTitle>
              <CardDescription>
                Scan QR code or enter document ID manually
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              
              {/* Scan Mode Selection */}
              <div className="flex space-x-2">
                <Button
                  variant={scanMode === "camera" ? "default" : "outline"}
                  onClick={() => setScanMode("camera")}
                  disabled={!hasCamera}
                  className="flex-1"
                >
                  <Camera className="h-4 w-4 mr-2" />
                  Camera
                </Button>
                <Button
                  variant={scanMode === "manual" ? "default" : "outline"}
                  onClick={() => setScanMode("manual")}
                  className="flex-1"
                >
                  <Type className="h-4 w-4 mr-2" />
                  Manual Entry
                </Button>
              </div>

              {/* Camera Scan */}
              {scanMode === "camera" && (
                <div className="space-y-4">
                  <QRScanner 
                    onScan={(data) => {
                      console.log("QR Code scanned:", data)
                      // Extract document ID from QR code
                      let docId = ""
                      if (data.includes("document/")) {
                        const matches = data.match(/document\/([^\/\?]+)/)
                        docId = matches ? matches[1] : ""
                      } else if (data.startsWith("DOC-")) {
                        docId = data
                      }
                      
                      if (docId) {
                        setDocumentId(docId)
                        toast({
                          title: "QR Code Detected",
                          description: `Document ${docId} scanned successfully`,
                        })
                      } else {
                        toast({
                          title: "Invalid QR Code",
                          description: "This QR code is not from our document tracking system",
                          variant: "destructive"
                        })
                      }
                    }}
                    onError={(error) => {
                      toast({
                        title: "Scanner Error",
                        description: error,
                        variant: "destructive"
                      })
                    }}
                  />
                </div>
              )}

              {/* Manual Entry */}
              {scanMode === "manual" && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="documentId">Document ID</Label>
                    <div className="flex space-x-2">
                      <Input
                        id="documentId"
                        placeholder="Enter Document ID (e.g., DOC-123456)"
                        value={documentId}
                        onChange={(e) => setDocumentId(e.target.value)}
                        onKeyPress={(e) => e.key === "Enter" && handleManualEntry()}
                      />
                      <Button onClick={handleManualEntry} variant="outline">
                        Load
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Action Selection */}
              <div className="space-y-2">
                <Label htmlFor="action">Action</Label>
                <Select value={action} onValueChange={(value) => setAction(value as ActionType)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select an action" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableActions.map((actionOption) => (
                      <SelectItem key={actionOption.value} value={actionOption.value}>
                        <div className="flex items-center">
                          <span className={getActionColor(actionOption.value)}>
                            {getActionIcon(actionOption.value)}
                          </span>
                          <span className="ml-2">{actionOption.label}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {action && (
                  <p className="text-sm text-gray-600">
                    {availableActions.find(a => a.value === action)?.description}
                  </p>
                )}
              </div>

              {/* Comments (for approve/reject actions) */}
              {(action === "approve" || action === "reject") && (
                <div className="space-y-2">
                  <Label htmlFor="comments">
                    Comments {action === "reject" ? "(Required)" : "(Optional)"}
                  </Label>
                  <Textarea
                    id="comments"
                    placeholder={
                      action === "reject" 
                        ? "Please explain why this document is being rejected..." 
                        : "Add any additional notes or comments..."
                    }
                    value={comments}
                    onChange={(e) => setComments(e.target.value)}
                    rows={3}
                  />
                </div>
              )}

              {/* Scan Button */}
              <Button 
                onClick={handleScan}
                className="w-full"
                disabled={
                  isScanning || 
                  !documentId || 
                  !action || 
                  (action === "reject" && !comments.trim())
                }
              >
                {isScanning ? (
                  <>
                    <Loader className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <QrCode className="h-4 w-4 mr-2" />
                    Process Action
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Role Information & Instructions */}
          <div className="space-y-6">
            
            {/* Current Role */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  {user.role === "mail" && <Truck className="h-5 w-5 mr-2 text-blue-600" />}
                  {user.role === "approver" && <Users className="h-5 w-5 mr-2 text-orange-600" />}
                  {user.role === "recipient" && <User className="h-5 w-5 mr-2 text-green-600" />}
                  {user.role === "admin" && <CheckCircle className="h-5 w-5 mr-2 text-purple-600" />}
                  Your Role
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <Badge variant="outline" className="text-sm">
                      {user.role === "admin" ? "Department Admin" : 
                       user.role === "mail" ? "Mail Controller" :
                       user.role === "approver" ? "Approver/Signer" : "Recipient"}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">
                      {user.role === "mail" && "You can pickup and deliver documents between departments"}
                      {user.role === "approver" && "You can receive, review, approve, or reject documents"}
                      {user.role === "recipient" && "You can confirm receipt of documents sent to you"}
                      {user.role === "admin" && "You can close completed documents and manage workflows"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Available Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Available Actions</CardTitle>
                <CardDescription>Actions you can perform based on your role</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {availableActions.map((actionOption) => (
                    <div key={actionOption.value} className="flex items-start space-x-3 p-3 border rounded-lg">
                      <span className={getActionColor(actionOption.value)}>
                        {getActionIcon(actionOption.value)}
                      </span>
                      <div>
                        <p className="font-medium text-sm">{actionOption.label}</p>
                        <p className="text-xs text-gray-600">{actionOption.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Instructions */}
            <Card>
              <CardHeader>
                <CardTitle>How to Scan</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div>
                  <strong>Step 1:</strong> Use camera to scan QR code or enter Document ID manually
                </div>
                <div>
                  <strong>Step 2:</strong> Select the appropriate action for your role
                </div>
                <div>
                  <strong>Step 3:</strong> Add comments if required (especially for rejections)
                </div>
                <div>
                  <strong>Step 4:</strong> Click "Process Action" to update document status
                </div>
                
                <Alert className="mt-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    Only authorized actions for your role will be processed. 
                    The system will verify your permissions before updating document status.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}
