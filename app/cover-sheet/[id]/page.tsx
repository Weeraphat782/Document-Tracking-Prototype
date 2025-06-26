"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ArrowLeft, Printer, Download, QrCode, CheckCircle, Clock, Users, User, AlertCircle } from "lucide-react"
import Link from "next/link"
import { useRouter, useParams } from "next/navigation"
import { EnhancedDocumentService } from "@/lib/enhanced-document-service"
import { QRCodeGenerator, CoverSheetGenerator } from "@/lib/qr-utils"
import { Document, User as UserType } from "@/lib/types"
import { useToast } from "@/hooks/use-toast"

export default function CoverSheetPage() {
  const [user, setUser] = useState<UserType | null>(null)
  const [document, setDocument] = useState<Document | null>(null)
  const [qrCodeURL, setQrCodeURL] = useState<string>("")
  const [isLoading, setIsLoading] = useState(true)
  const [isGenerating, setIsGenerating] = useState(false)
  
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
      
      // Generate QR code
      const qrURL = QRCodeGenerator.generateQRCodeURL(doc.qrData, 200)
      setQrCodeURL(qrURL)
      
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

  const handlePrintCoverSheet = () => {
    if (!document || !user) return

    setIsGenerating(true)

    try {
      const to = document.workflow === "flow" && document.approvalSteps 
        ? document.approvalSteps[0].approverEmail 
        : document.recipient || "Unknown"

      const approvalHierarchy = document.workflow === "flow" && document.approvalSteps
        ? document.approvalSteps.map(step => step.approverEmail)
        : undefined

      CoverSheetGenerator.printCoverSheet(
        document.id,
        document.title,
        document.type,
        document.workflow,
        user.email,
        to,
        qrCodeURL,
        approvalHierarchy
      )

      toast({
        title: "Cover Sheet Generated",
        description: "The cover sheet has been opened in a new window for printing",
      })
    } catch (error) {
      toast({
        title: "Error Generating Cover Sheet",
        description: "An error occurred while generating the cover sheet",
        variant: "destructive",
      })
    } finally {
      setIsGenerating(false)
    }
  }

  const handleMarkReady = () => {
    if (!document || !user) return

    toast({
      title: "Document Ready",
      description: "Document has been marked as ready for pickup. Mail controller will be notified.",
    })

    // Redirect back to dashboard
    router.push("/dashboard")
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
              <QrCode className="h-6 w-6 mr-2 text-blue-600" />
              <h1 className="text-2xl font-bold text-gray-900">Cover Sheet & QR Code</h1>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Success Alert */}
        <Alert className="mb-6 border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            <strong>Document Created Successfully!</strong> Your document has been created and is ready for processing. 
            Print the cover sheet below and attach it to your physical document.
          </AlertDescription>
        </Alert>

        {/* Cover Sheet Preview */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Printer className="h-5 w-5 mr-2" />
              Cover Sheet Preview
            </CardTitle>
            <CardDescription>
              Print this cover sheet and attach it to your physical document
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="border-2 border-gray-400 p-6 bg-white rounded-lg shadow-sm">
              {/* Cover Sheet Content */}
              <div className="text-center border-b-2 border-gray-600 pb-4 mb-6">
                <h1 className="text-2xl font-bold text-gray-900">DOCUMENT TRACKING COVER SHEET</h1>
                <h2 className="text-xl font-semibold mt-2 text-gray-800">{document.id}</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                {/* Document Information */}
                <div className="space-y-3">
                  <div className="flex justify-between border-b border-dotted border-gray-400 pb-1">
                    <span className="font-semibold text-gray-800">Document Title:</span>
                    <span className="flex-1 text-right text-gray-900">{document.title}</span>
                  </div>
                  <div className="flex justify-between border-b border-dotted border-gray-400 pb-1">
                    <span className="font-semibold text-gray-800">Document Type:</span>
                    <span className="flex-1 text-right text-gray-900">{document.type}</span>
                  </div>
                  <div className="flex justify-between border-b border-dotted border-gray-400 pb-1">
                    <span className="font-semibold text-gray-800">Workflow:</span>
                    <span className="flex-1 text-right uppercase font-medium text-gray-900">
                      {document.workflow}
                    </span>
                  </div>
                </div>

                {/* Routing Information */}
                <div className="space-y-3">
                  <div className="flex justify-between border-b border-dotted border-gray-400 pb-1">
                    <span className="font-semibold text-gray-800">From:</span>
                    <span className="flex-1 text-right text-gray-900">{document.createdBy}</span>
                  </div>
                  <div className="flex justify-between border-b border-dotted border-gray-400 pb-1">
                    <span className="font-semibold text-gray-800">To:</span>
                    <span className="flex-1 text-right text-gray-900">
                      {document.workflow === "flow" && document.approvalSteps 
                        ? document.approvalSteps[0].approverEmail 
                        : document.recipient}
                    </span>
                  </div>
                  <div className="flex justify-between border-b border-dotted border-gray-400 pb-1">
                    <span className="font-semibold text-gray-800">Created:</span>
                    <span className="flex-1 text-right text-gray-900">
                      {new Date(document.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* QR Code Section */}
              <div className="text-center border-2 border-gray-400 p-4 mb-6 bg-gray-50">
                <h3 className="font-semibold mb-3 text-gray-900">QR CODE - SCAN TO TRACK</h3>
                <div className="flex justify-center mb-3">
                  {qrCodeURL && (
                    <img 
                      src={qrCodeURL} 
                      alt="Document QR Code" 
                      className="w-32 h-32 border border-gray-300 bg-white p-2 rounded"
                    />
                  )}
                </div>
                <p className="font-semibold text-gray-900">Document ID: {document.id}</p>
                <p className="text-sm text-gray-700 mt-1">
                  Scan this QR code at each step to update document status
                </p>
              </div>

              {/* Approval Hierarchy */}
              {document.workflow === "flow" && document.approvalSteps && (
                <div className="bg-blue-50 border-l-4 border-blue-500 p-4 border border-blue-200">
                  <h3 className="font-semibold mb-3 text-gray-900">APPROVAL HIERARCHY</h3>
                  <div className="space-y-2">
                    {document.approvalSteps.map((step, index) => (
                      <div key={step.approverEmail} className="flex items-center">
                        <Badge variant="outline" className="mr-2 border-blue-300 text-blue-800">
                          Step {index + 1}
                        </Badge>
                        <span className="text-gray-900">{step.approverEmail}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button 
            onClick={handlePrintCoverSheet} 
            size="lg"
            disabled={isGenerating}
          >
            <Printer className="h-4 w-4 mr-2" />
            {isGenerating ? "Generating..." : "Print Cover Sheet"}
          </Button>
          
          <Button 
            onClick={handleMarkReady}
            variant="outline" 
            size="lg"
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            Mark as Ready for Pickup
          </Button>
        </div>
      </main>
    </div>
  )
}
