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
import { ArrowLeft, QrCode, CheckCircle, AlertCircle, Loader, Camera, Type, Users, User, Package, Truck, Clock, Eye } from "lucide-react"
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
  const [deliveryMethod, setDeliveryMethod] = useState<"drop_off" | "hand_to_hand" | "">("")
  const [scanResult, setScanResult] = useState<ScanResult | null>(null)
  const [isScanning, setIsScanning] = useState(false)
  const [scanMode, setScanMode] = useState<"camera" | "manual">("manual")
  const [lastScannedData, setLastScannedData] = useState<string>("")
  const [scanCooldown, setScanCooldown] = useState(false)
  const [hasCamera, setHasCamera] = useState(false)
  const [scannedDocument, setScannedDocument] = useState<any>(null)
  const [showDocumentInfo, setShowDocumentInfo] = useState(false)
  const [dropOffLocation, setDropOffLocation] = useState("")
  const [defaultDropOffLocation, setDefaultDropOffLocation] = useState("")
  
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

  // Clear action selection when scanned document changes
  useEffect(() => {
    if (scannedDocument && user) {
      // Clear current action selection
      setAction("")
      
      // For mail controller, auto-select action if only one is available
      const availableActions = EnhancedDocumentService.getAvailableActions(scannedDocument, user)
      if (user.role === "mail" && availableActions.length === 1) {
        setAction(availableActions[0])
        
        // Show appropriate message based on forced action
        if (availableActions[0] === "pickup") {
          if (EnhancedDocumentService.shouldForcePickup(scannedDocument, user)) {
            const isFirstScan = scannedDocument.actionHistory.filter((a: any) => 
              a.performedBy === user.email && 
              ["pickup", "deliver"].includes(a.action)
            ).length === 0
            
            toast({
              title: isFirstScan ? "First Scan - Pickup Required" : "Pickup Required",
              description: isFirstScan 
                ? "This is your first scan of this document. Pickup action has been automatically selected."
                : "Document has been processed by recipient. Pickup action has been automatically selected.",
            })
          }
        } else if (availableActions[0] === "deliver") {
          if (EnhancedDocumentService.shouldForceDeliver(scannedDocument, user)) {
            toast({
              title: "Deliver Required",
              description: "You have picked up this document. Deliver action has been automatically selected.",
            })
          }
        }
      }
    }
  }, [scannedDocument, user])

  const checkCameraSupport = async () => {
    const cameraSupported = await QRCodeScanner.hasCameraSupport()
    setHasCamera(cameraSupported)
    if (cameraSupported) {
      setScanMode("camera")
    }
  }

  const getActionsForRole = (): { value: ActionType, label: string, description: string }[] => {
    if (!user) return []

    // If we have a scanned document, get available actions for that specific document
    if (scannedDocument) {
      const availableActions = EnhancedDocumentService.getAvailableActions(scannedDocument, user)
      return availableActions.map(actionType => {
        switch (actionType) {
          case "pickup":
            return { value: "pickup", label: "Pickup Document", description: "Collect document for delivery" }
          case "deliver":
            return { value: "deliver", label: "Deliver Document", description: "Deliver document to recipient" }
          case "receive":
            return { value: "receive", label: user.role === "recipient" ? "Confirm Receipt" : "Receive for Review", description: user.role === "recipient" ? "Confirm document receipt" : "Confirm receipt of document" }
          case "approve":
            return { value: "approve", label: "Accept and Send", description: "Accept and send to next step" }
          case "reject":
            return { value: "reject", label: "Reject and Send", description: "Reject and return for revision" }
          case "close":
            return { value: "close", label: "Close Document", description: "Mark document as completed" }
          case "cancel":
            return { value: "cancel", label: "Cancel Document", description: "Cancel document processing" }
          default:
            return { value: actionType, label: actionType, description: "" }
        }
      })
    }

    // Fallback to role-based actions if no document is scanned
    switch (user?.role) {
      case "mail":
        return [
          { value: "pickup", label: "Pickup Document", description: "Collect document for delivery" },
          { value: "deliver", label: "Deliver Document", description: "Deliver document to recipient" },
        ]
      case "approver":
        return [
          { value: "receive", label: "Receive for Review", description: "Confirm receipt of document" },
          { value: "approve", label: "Accept and Send", description: "Accept and send to next step" },
          { value: "reject", label: "Reject and Send", description: "Reject and return for revision" },
        ]
      case "recipient":
        return [
          { value: "receive", label: "Confirm Receipt", description: "Confirm document receipt" }
        ]
      case "admin":
        return [
          { value: "close", label: "Close Document", description: "Mark document as completed" },
          { value: "cancel", label: "Cancel Document", description: "Cancel document processing" }
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

    // Check if approver needs to select delivery method
    if (user.role === "approver" && (action === "approve" || action === "reject") && !deliveryMethod) {
      toast({
        title: "Missing Delivery Method",
        description: "Please select how you want to deliver the document",
        variant: "destructive",
      })
      return
    }

    setIsScanning(true)
    setScanResult(null)

    try {
      console.log("Processing scan:", {
        documentId: documentId.trim(),
        action,
        userRole: user.role,
        deliveryMethod,
        comments: comments.trim()
      })

      // Simulate scanning delay
      await new Promise(resolve => setTimeout(resolve, 2000))

      const result = await EnhancedDocumentService.processScan(
        documentId.trim(),
        action as ActionType,
        user,
        comments.trim() || undefined,
        deliveryMethod || undefined
      )

      console.log("Scan result:", result)
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
        setDeliveryMethod("")
      } else {
        console.log("Scan failed:", result.message, result.warnings)
        toast({
          title: "Scan Failed",
          description: result.message,
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error processing scan:", error)
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

  const handleManualEntry = async () => {
    if (!documentId) {
      toast({
        title: "Missing Document ID",
        description: "Please enter a document ID",
        variant: "destructive",
      })
      return
    }

    try {
      // Load document details to get drop off location
      const document = await EnhancedDocumentService.getDocumentById(documentId.trim())
      if (document) {
        setScannedDocument(document)
        setShowDocumentInfo(true)
        
        // Get drop off location for mail controller
        if (user?.role === "mail") {
          const location = getDropOffLocationForDocument(document)
          setDefaultDropOffLocation(location)
          setDropOffLocation(location)
        }
        
      toast({
        title: "Document Found",
          description: `Document ${document.id} loaded successfully`,
      })
    } else {
      toast({
          title: "Document Not Found",
        description: "Please check the document ID and try again",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error Loading Document",
        description: "Failed to load document details",
        variant: "destructive",
      })
    }
  }

  const getDropOffLocationForDocument = (document: any) => {
    if (document.workflow === "flow" && document.approvalSteps) {
      const currentStep = document.currentStepIndex || 0
      if (currentStep < document.approvalSteps.length) {
        const currentApprover = document.approvalSteps[currentStep]
        return currentApprover.dropOffLocation || "Location not set"
      }
    }
    // For creator pickup or final return
    return document.createdByDropOffLocation || "Location not set"
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

        <div className="max-w-3xl mx-auto space-y-6">
          
          {/* Scanned Document Info */}
          {showDocumentInfo && scannedDocument && (
            <Card className="border-green-200 bg-green-50">
              <CardHeader>
                <CardTitle className="flex items-center text-green-800">
                  <CheckCircle className="h-5 w-5 mr-2" />
                  Scanned Document
                </CardTitle>
                <CardDescription className="text-green-600">
                  Document information found in system
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div>
                      <p className="font-medium text-green-800">Document ID</p>
                      <p className="text-sm text-green-700 font-mono bg-white px-2 py-1 rounded border">
                        {scannedDocument.id}
                      </p>
                    </div>
                    <div>
                      <p className="font-medium text-green-800">Document Title</p>
                      <p className="text-sm text-green-700">{scannedDocument.title}</p>
                    </div>
                    <div>
                      <p className="font-medium text-green-800">Type</p>
                      <p className="text-sm text-green-700">{scannedDocument.type}</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <p className="font-medium text-green-800">Current Status</p>
                      <Badge variant="outline" className="text-xs">
                        {scannedDocument.status}
                      </Badge>
                    </div>

                    <div>
                      <p className="font-medium text-green-800">Created By</p>
                      <p className="text-sm text-green-700">{scannedDocument.createdBy}</p>
                    </div>
                  </div>
                </div>
                
                {scannedDocument.description && (
                  <div className="mt-4 pt-4 border-t border-green-200">
                    <p className="font-medium text-green-800">Description</p>
                    <p className="text-sm text-green-700 mt-1">{scannedDocument.description}</p>
                  </div>
                )}

                <div className="mt-4 pt-4 border-t border-green-200 flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      setShowDocumentInfo(false)
                      setScannedDocument(null)
                      setDocumentId("")
                    }}
                  >
                    <Camera className="h-4 w-4 mr-2" />
                    Scan Again
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => router.push(`/document/${scannedDocument.id}`)}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    View Details
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <QrCode className="h-5 w-5 mr-2" />
                Document Scanner
              </CardTitle>
              <CardDescription>
                {showDocumentInfo ? "Select the action you want to perform on this document" : "Scan QR code or enter document ID manually"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              
              {/* Scan Mode Selection */}
              {!showDocumentInfo && (
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
              )}

              {/* Camera Scan */}
              {!showDocumentInfo && scanMode === "camera" && (
                <div className="space-y-4">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                    <p className="text-sm text-blue-800">
                      📱 <strong>Camera is active.</strong> Point your camera at a document cover sheet QR code.
                      The scanner will automatically detect valid QR codes.
                    </p>
                  </div>
                  <QRScanner 
                    onScan={(data) => {
                      // Prevent duplicate scans
                      if (scanCooldown || data === lastScannedData) {
                        console.log("⏳ Scan cooldown active or duplicate scan, ignoring...")
                        return
                      }

                      setScanCooldown(true)
                      setLastScannedData(data)
                      
                      // Reset cooldown after 3 seconds
                      setTimeout(() => {
                        setScanCooldown(false)
                      }, 3000)

                      console.log("=== QR SCAN START ===")
                      console.log("Raw QR Code data:", data)
                      console.log("Data type:", typeof data)
                      console.log("Data length:", data?.length)
                      
                      let docId = ""
                      let isValidQR = false
                      let parseMethod = ""
                      
                      try {
                        // Try to parse as JSON first (our system's format)
                        const parsed = JSON.parse(data)
                        console.log("JSON parse successful:", parsed)
                        
                        if (parsed.documentId && typeof parsed.documentId === 'string') {
                          docId = parsed.documentId
                          isValidQR = true
                          parseMethod = "JSON"
                          console.log("✅ Valid JSON QR code - Document ID:", docId)
                        } else {
                          console.log("❌ JSON missing documentId field")
                        }
                      } catch (e) {
                        console.log("Not JSON, trying other formats...")
                        
                        if (data && data.includes("document/")) {
                          // URL format: https://example.com/document/DOC-123
                          const matches = data.match(/document\/([^\/\?]+)/)
                          docId = matches ? matches[1] : ""
                          isValidQR = !!docId
                          parseMethod = "URL"
                          console.log("URL format - Document ID:", docId)
                        } else if (data && data.startsWith("DOC-")) {
                          // Direct document ID format
                          docId = data
                          isValidQR = true
                          parseMethod = "Direct ID"
                          console.log("Direct ID format - Document ID:", docId)
                        } else if (data && /^[A-Z0-9-]+$/.test(data.trim()) && data.length > 5) {
                          // Generic alphanumeric code that could be a document ID
                          docId = data.trim()
                          isValidQR = true
                          parseMethod = "Generic ID"
                          console.log("Generic ID format - Document ID:", docId)
                        }
                      }
                      
                      console.log("Final result:", { docId, isValidQR, parseMethod })
                      console.log("=== QR SCAN END ===")
                      
                      if (isValidQR && docId) {
                        // Stop camera scanning
                        setScanMode("manual")
                        
                        // Load document details
                        const                         loadDocumentDetails = async () => {
                          try {
                            const document = await EnhancedDocumentService.getDocumentById(docId)
                            if (document) {
                              setScannedDocument(document)
                              setDocumentId(docId)
                              setShowDocumentInfo(true)
                              
                              // Get drop off location for mail controller
                              if (user?.role === "mail") {
                                const location = getDropOffLocationForDocument(document)
                                setDefaultDropOffLocation(location)
                                setDropOffLocation(location)
                              }
                              
                              toast({
                                title: "✅ Document Found",
                                description: `Found document: ${document.title}`,
                              })
                            } else {
                              toast({
                                title: "❌ Document Not Found",
                                description: `Document ID: ${docId} not found in system`,
                                variant: "destructive"
                              })
                            }
                          } catch (error) {
                            console.error("Error loading document:", error)
                            toast({
                              title: "❌ Error Occurred",
                              description: "Unable to load document information",
                              variant: "destructive"
                            })
                          }
                        }
                        
                        loadDocumentDetails()
                      } else {
                        console.log("❌ INVALID QR - Raw data:", data)
                        // Don't show error toast for invalid QR codes during scanning
                        // This prevents spam when camera sees random patterns
                        console.log("Ignoring invalid QR pattern during continuous scanning")
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
              {!showDocumentInfo && scanMode === "manual" && (
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
                    <p className="text-xs text-gray-600">
                      💡 Tip: Go to Dashboard → View any document → Copy the Document ID from the details page
                    </p>
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

              {/* Delivery Method Selection (for approver approve/reject actions) */}
              {user?.role === "approver" && (action === "approve" || action === "reject") && (
                <div className="space-y-2">
                  <Label htmlFor="deliveryMethod">How would you like to deliver this document?</Label>
                  <Select value={deliveryMethod} onValueChange={(value) => setDeliveryMethod(value as "drop_off" | "hand_to_hand")}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select delivery method" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="drop_off">
                        <div className="flex items-center">
                          <Package className="h-4 w-4 mr-2 text-blue-600" />
                          <div>
                            <div className="font-medium">Drop Off</div>
                            <div className="text-xs text-gray-500">Place document at drop-off point for Mail Controller pickup</div>
                          </div>
                        </div>
                      </SelectItem>

                    </SelectContent>
                  </Select>
                  {deliveryMethod && (
                    <div className="bg-blue-50 border border-blue-200 p-3 rounded">
                      <p className="text-sm text-blue-800">
                        📦 Document will be placed at drop-off location for Mail Controller to pickup and deliver to next step.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Drop Off Location (for mail controller) */}
              {user?.role === "mail" && showDocumentInfo && (action === "pickup" || action === "deliver") && (
                <Card className="bg-orange-50 border-orange-200">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-orange-800 text-sm flex items-center">
                      <Package className="h-4 w-4 mr-2" />
                      Drop Off Location
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="space-y-3">
                      <div className="text-sm">
                        <p className="font-medium text-orange-800">Default Location:</p>
                        <p className="text-orange-700 bg-orange-100 p-2 rounded text-xs">
                          {defaultDropOffLocation}
                        </p>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="dropOffLocation" className="text-orange-800">
                          Current Drop Off Location
                        </Label>
                        <Input
                          id="dropOffLocation"
                          placeholder="Enter drop off location"
                          value={dropOffLocation}
                          onChange={(e) => setDropOffLocation(e.target.value)}
                          className="border-orange-300 focus:border-orange-500"
                        />
                        <p className="text-xs text-orange-600">
                          💡 You can change this location if needed (e.g., different office, temporary location)
                        </p>
                      </div>
                      
                      {dropOffLocation !== defaultDropOffLocation && dropOffLocation && (
                        <div className="bg-yellow-50 border border-yellow-200 p-2 rounded">
                          <p className="text-xs text-yellow-800">
                            ⚠️ Location changed from default. Make sure the recipient knows about this change.
                          </p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

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
        </div>
      </main>
    </div>
  )
}
