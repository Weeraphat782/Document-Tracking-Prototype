"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, ArrowLeft, QrCode, Clock, User, MapPin, FileText } from "lucide-react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"

export default function ScanResult() {
  const [scanData, setScanData] = useState<any>(null)
  const searchParams = useSearchParams()

  useEffect(() => {
    // In a real app, this would come from the QR scan or URL params
    const mockScanResult = {
      success: true,
      document: {
        id: "DOC-001",
        title: "Purchase Request - Office Supplies",
        type: "Purchase Request",
        workflow: "flow",
        status: "In Transit to manager@company.com",
        createdAt: "2024-01-15",
        approvers: ["manager@company.com", "cfo@company.com"],
        lastUpdated: new Date().toISOString(),
        lastAction: "pickup",
        lastActionBy: "mailcontroller@company.com",
      },
      action: "pickup",
      nextStep: "Deliver to manager@company.com",
      timestamp: new Date().toLocaleString(),
      location: "Building A, Floor 2",
      estimatedDelivery: "15 minutes",
    }
    setScanData(mockScanResult)
  }, [])

  if (!scanData) {
    return <div>Loading...</div>
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center py-4">
            <Link href="/scan-qr">
              <Button variant="ghost" size="sm" className="mr-4">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Scanner
              </Button>
            </Link>
            <h1 className="text-2xl font-bold text-gray-900">Scan Result</h1>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Success Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Scan Successful!</h2>
          <p className="text-gray-600">Document status has been updated successfully</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Document Information */}
          <Card className="border-green-200">
            <CardHeader className="bg-green-50">
              <CardTitle className="flex items-center text-green-800">
                <FileText className="h-5 w-5 mr-2" />
                Document Information
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Document ID</p>
                    <p className="text-lg font-mono">{scanData.document.id}</p>
                  </div>
                  <QrCode className="h-8 w-8 text-gray-400" />
                </div>

                <div>
                  <p className="text-sm font-medium text-gray-500">Title</p>
                  <p className="font-medium">{scanData.document.title}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Type</p>
                    <p>{scanData.document.type}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Workflow</p>
                    <Badge variant={scanData.document.workflow === "flow" ? "default" : "secondary"}>
                      {scanData.document.workflow.toUpperCase()}
                    </Badge>
                  </div>
                </div>

                <div>
                  <p className="text-sm font-medium text-gray-500">Created</p>
                  <p>{scanData.document.createdAt}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Action Details */}
          <Card className="border-blue-200">
            <CardHeader className="bg-blue-50">
              <CardTitle className="flex items-center text-blue-800">
                <User className="h-5 w-5 mr-2" />
                Action Details
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-gray-500">Action Performed</p>
                  <p className="text-lg font-semibold capitalize">{scanData.action}</p>
                </div>

                <div>
                  <p className="text-sm font-medium text-gray-500">Performed By</p>
                  <p>{scanData.document.lastActionBy}</p>
                </div>

                <div>
                  <p className="text-sm font-medium text-gray-500">Timestamp</p>
                  <p className="flex items-center">
                    <Clock className="h-4 w-4 mr-2 text-gray-400" />
                    {scanData.timestamp}
                  </p>
                </div>

                {scanData.location && (
                  <div>
                    <p className="text-sm font-medium text-gray-500">Current Location</p>
                    <p className="flex items-center">
                      <MapPin className="h-4 w-4 mr-2 text-gray-400" />
                      {scanData.location}
                    </p>
                  </div>
                )}

                {scanData.estimatedDelivery && (
                  <div>
                    <p className="text-sm font-medium text-gray-500">Estimated Delivery</p>
                    <p className="text-green-600 font-medium">{scanData.estimatedDelivery}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Status Update */}
        <Card className="mt-8 border-yellow-200">
          <CardHeader className="bg-yellow-50">
            <CardTitle className="text-yellow-800">Updated Status</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm font-medium text-gray-500 mb-1">Current Status</p>
                <Badge className="bg-yellow-100 text-yellow-800 text-base px-3 py-1">{scanData.document.status}</Badge>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-gray-500 mb-1">Last Updated</p>
                <p className="text-sm">{new Date(scanData.document.lastUpdated).toLocaleString()}</p>
              </div>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm font-medium text-gray-700 mb-2">Next Step:</p>
              <p className="text-gray-800">{scanData.nextStep}</p>
            </div>
          </CardContent>
        </Card>

        {/* Workflow Progress */}
        {scanData.document.workflow === "flow" && scanData.document.approvers && (
          <Card className="mt-8">
            <CardHeader>
              <CardTitle>Workflow Progress</CardTitle>
              <CardDescription>Document approval hierarchy</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {scanData.document.approvers.map((approver: string, index: number) => (
                  <div key={approver} className="flex items-center p-3 rounded-lg bg-gray-50">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium mr-3 ${
                        index === 0 ? "bg-blue-100 text-blue-800" : "bg-gray-200 text-gray-600"
                      }`}
                    >
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{approver}</p>
                      <p className="text-sm text-gray-600">{index === 0 ? "Next recipient" : "Pending"}</p>
                    </div>
                    {index === 0 && (
                      <Badge variant="outline" className="bg-blue-50 text-blue-700">
                        Current
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Action Buttons */}
        <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/scan-qr">
            <Button variant="outline" className="w-full sm:w-auto">
              Scan Another Document
            </Button>
          </Link>
          <Link href={`/document/${scanData.document.id}`}>
            <Button className="w-full sm:w-auto">View Full Document Details</Button>
          </Link>
          <Link href="/dashboard">
            <Button variant="outline" className="w-full sm:w-auto">
              Return to Dashboard
            </Button>
          </Link>
        </div>
      </main>
    </div>
  )
}
