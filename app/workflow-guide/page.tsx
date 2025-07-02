"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ArrowRight, Users, User, Truck, CheckCircle, FileText, QrCode, Clock, Package } from "lucide-react"
import Link from "next/link"

export default function WorkflowGuidePage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center py-4">
            <Link href="/dashboard">
              <Button variant="ghost" size="sm" className="mr-4">
                ← Back to Dashboard
              </Button>
            </Link>
            <div className="flex items-center">
              <FileText className="h-6 w-6 mr-2 text-blue-600" />
              <h1 className="text-2xl font-bold text-gray-900">Workflow Testing Guide</h1>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Overview */}
        <Alert className="mb-8 border-blue-200 bg-blue-50">
          <FileText className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800">
            <strong>Important:</strong> Documents are filtered by user role. When you switch accounts, 
            you will only see documents relevant to that role. This is the correct behavior for security.
          </AlertDescription>
        </Alert>

        {/* Quick Setup */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Package className="h-5 w-5 mr-2" />
              Quick Setup for Testing
            </CardTitle>
            <CardDescription>Follow these steps to set up sample documents for testing</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 border rounded-lg">
                <div className="flex items-center mb-2">
                  <Badge className="bg-blue-600 text-white mr-2">1</Badge>
                  <span className="font-semibold">Login as Admin</span>
                </div>
                <p className="text-sm text-gray-600">Use admin@company.com</p>
              </div>
              <div className="p-4 border rounded-lg">
                <div className="flex items-center mb-2">
                  <Badge className="bg-blue-600 text-white mr-2">2</Badge>
                  <span className="font-semibold">Create Sample Docs</span>
                </div>
                <p className="text-sm text-gray-600">Click Create Sample Docs button</p>
              </div>
              <div className="p-4 border rounded-lg">
                <div className="flex items-center mb-2">
                  <Badge className="bg-blue-600 text-white mr-2">3</Badge>
                  <span className="font-semibold">Test Different Roles</span>
                </div>
                <p className="text-sm text-gray-600">Logout and login with different accounts</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* User Accounts */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Demo User Accounts</CardTitle>
            <CardDescription>Use these accounts to test different roles in the workflow</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 border rounded-lg bg-blue-50">
                <div className="flex items-center mb-2">
                  <Users className="h-5 w-5 text-blue-600 mr-2" />
                  <span className="font-semibold">Department Admin</span>
                </div>
                <p className="text-sm text-gray-600 mb-2">admin@company.com</p>
                <ul className="text-xs text-gray-600 space-y-1">
                  <li>• Create documents</li>
                  <li>• View own documents</li>
                  <li>• Close workflows</li>
                </ul>
              </div>

              <div className="p-4 border rounded-lg bg-purple-50">
                <div className="flex items-center mb-2">
                  <Truck className="h-5 w-5 text-purple-600 mr-2" />
                  <span className="font-semibold">Mail Controller</span>
                </div>
                <p className="text-sm text-gray-600 mb-2">mail@company.com</p>
                <ul className="text-xs text-gray-600 space-y-1">
                  <li>• Pickup documents</li>
                  <li>• Deliver documents</li>
                  <li>• Track transit status</li>
                </ul>
              </div>

              <div className="p-4 border rounded-lg bg-orange-50">
                <div className="flex items-center mb-2">
                  <CheckCircle className="h-5 w-5 text-orange-600 mr-2" />
                  <span className="font-semibold">Recipient</span>
                </div>
                <p className="text-sm text-gray-600 mb-2">manager@company.com</p>
                <ul className="text-xs text-gray-600 space-y-1">
                  <li>• Receive documents</li>
                  <li>• Accept/reject</li>
                  <li>• Add comments</li>
                </ul>
              </div>

              <div className="p-4 border rounded-lg bg-green-50">
                <div className="flex items-center mb-2">
                  <User className="h-5 w-5 text-green-600 mr-2" />
                  <span className="font-semibold">Recipient</span>
                </div>
                <p className="text-sm text-gray-600 mb-2">recipient@company.com</p>
                <ul className="text-xs text-gray-600 space-y-1">
                  <li>• Confirm receipt</li>
                  <li>• View delivered docs</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Testing Instructions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <QrCode className="h-5 w-5 mr-2" />
              Testing Instructions
            </CardTitle>
            <CardDescription>How to test the complete workflow</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                <strong>Pro Tip:</strong> Open multiple browser tabs or use incognito mode to test 
                different user roles simultaneously without logging out.
              </AlertDescription>
            </Alert>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold mb-3">Testing Flow Workflow:</h4>
                <ol className="text-sm space-y-2 list-decimal list-inside">
                  <li>Login as <strong>admin@company.com</strong></li>
                  <li>Click Create Sample Docs to generate test documents</li>
                  <li>Logout and login as <strong>mail@company.com</strong></li>
                  <li>See documents ready for pickup</li>
                  <li>Click Scan QR Code and select a document to pickup</li>
                  <li>Logout and login as <strong>manager@company.com</strong></li>
                  <li>See documents pending your approval</li>
                  <li>Use document detail page to accept/reject</li>
                </ol>
              </div>

              <div>
                <h4 className="font-semibold mb-3">Key Features to Test:</h4>
                <ul className="text-sm space-y-2 list-disc list-inside">
                  <li><strong>Role-based visibility:</strong> Each user sees different documents</li>
                  <li><strong>QR Code scanning:</strong> Status updates via QR scanning</li>
                  <li><strong>Recipient list:</strong> Sequential recipient workflow</li>
                  <li><strong>Action history:</strong> Complete audit trail</li>
                  <li><strong>Status tracking:</strong> Real-time status updates</li>
                  <li><strong>Cover sheets:</strong> Printable QR code labels</li>
                  <li><strong>Rejection handling:</strong> Comments and revision loop</li>
                </ul>
              </div>
            </div>

            <div className="mt-6 p-4 bg-yellow-50 rounded-lg">
              <h4 className="font-semibold text-yellow-800 mb-2">Remember:</h4>
              <p className="text-sm text-yellow-700">
                Documents do not disappear when you change accounts - they are filtered by role. 
                Use the Show Role Breakdown button in admin dashboard to see which documents 
                are visible to each role.
              </p>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
} 