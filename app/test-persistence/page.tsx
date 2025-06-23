"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { DocumentService } from "@/lib/document-service"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, XCircle, RefreshCw } from "lucide-react"

export default function TestPersistencePage() {
  const [testResults, setTestResults] = useState<string[]>([])
  const [isRunning, setIsRunning] = useState(false)

  const addResult = (message: string) => {
    setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`])
  }

  const runPersistenceTest = async () => {
    setIsRunning(true)
    setTestResults([])
    
    try {
      addResult("🧪 Starting persistence test...")
      
      // Clear everything first
      DocumentService.clearAllDocuments()
      addResult("✅ Cleared all documents")
      
      // Create a test document
      const testDoc = DocumentService.createDocument(
        "Persistence Test Document",
        "purchase-request",
        "flow",
        "admin@company.com",
        "Testing if documents persist across sessions",
        ["manager@company.com"]
      )
      addResult(`✅ Created test document: ${testDoc.id}`)
      
      // Verify it exists
      const retrieved = DocumentService.getDocumentById(testDoc.id)
      if (retrieved) {
        addResult(`✅ Document retrieved successfully: ${retrieved.title}`)
      } else {
        addResult("❌ Failed to retrieve document immediately after creation")
        return
      }
      
      // Check localStorage directly
      const rawData = localStorage.getItem("documents")
      if (rawData) {
        const parsed = JSON.parse(rawData)
        addResult(`✅ localStorage contains ${parsed.length} document(s)`)
      } else {
        addResult("❌ No documents found in localStorage")
        return
      }
      
      // Simulate logout/login by clearing user data only
      addResult("🔄 Simulating logout (clearing user data only)...")
      localStorage.removeItem("user")
      
      // Set new user
      localStorage.setItem("user", JSON.stringify({ email: "mail@company.com", role: "mail" }))
      addResult("🔄 Simulated login as mail controller")
      
      // Check if document still exists
      const afterLoginDoc = DocumentService.getDocumentById(testDoc.id)
      if (afterLoginDoc) {
        addResult(`✅ Document still exists after login: ${afterLoginDoc.title}`)
      } else {
        addResult("❌ Document missing after login simulation")
      }
      
      // Check what mail controller sees
      const mailUser = { email: "mail@company.com", role: "mail" as any }
      const mailDocs = DocumentService.getDocumentsForUser(mailUser)
      addResult(`📋 Mail controller sees ${mailDocs.length} document(s)`)
      
      if (mailDocs.length > 0) {
        mailDocs.forEach(doc => {
          addResult(`  - ${doc.id}: ${doc.title} (${doc.status})`)
        })
      }
      
      addResult("🎉 Persistence test completed!")
      
    } catch (error) {
      addResult(`❌ Test failed with error: ${error}`)
    } finally {
      setIsRunning(false)
    }
  }

  const quickDocumentCheck = () => {
    const allDocs = DocumentService.getAllDocuments()
    const rawData = localStorage.getItem("documents")
    
    addResult("📊 Quick document check:")
    addResult(`  - Service reports: ${allDocs.length} documents`)
    addResult(`  - localStorage has: ${rawData ? JSON.parse(rawData).length : 0} documents`)
    
    if (allDocs.length > 0) {
      allDocs.forEach(doc => {
        addResult(`  - ${doc.id}: ${doc.title} (${doc.status})`)
      })
    }
  }

  const clearResults = () => {
    setTestResults([])
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Document Persistence Test</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                This test verifies that documents persist in localStorage across login/logout cycles.
                Open browser console (F12) for additional debugging information.
              </AlertDescription>
            </Alert>

            <div className="flex space-x-2">
              <Button 
                onClick={runPersistenceTest} 
                disabled={isRunning}
                className="flex items-center"
              >
                {isRunning && <RefreshCw className="h-4 w-4 mr-2 animate-spin" />}
                Run Persistence Test
              </Button>
              <Button variant="outline" onClick={quickDocumentCheck}>
                Quick Document Check
              </Button>
              <Button variant="outline" onClick={clearResults}>
                Clear Results
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Test Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm max-h-96 overflow-y-auto">
              {testResults.length === 0 ? (
                <p className="text-gray-500">No test results yet. Click "Run Persistence Test" to start.</p>
              ) : (
                testResults.map((result, index) => (
                  <div key={index} className="mb-1">
                    {result}
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Manual Testing Steps</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="list-decimal list-inside space-y-2 text-sm">
              <li>Login as <Badge variant="outline">admin@company.com</Badge></li>
              <li>Create a new document or click "Create Sample Docs"</li>
              <li>Note the document ID and details</li>
              <li>Logout and login as <Badge variant="outline">mail@company.com</Badge></li>
              <li>Check if you can see the document in your dashboard</li>
              <li>Use "Inspect localStorage" button to verify data persistence</li>
              <li>If documents are missing, run this persistence test to identify the issue</li>
            </ol>
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 