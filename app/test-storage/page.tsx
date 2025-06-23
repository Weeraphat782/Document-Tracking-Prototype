"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { DocumentService } from "@/lib/document-service"

export default function TestStoragePage() {
  const [testResult, setTestResult] = useState<string>("")
  const [storageData, setStorageData] = useState<string>("")

  useEffect(() => {
    checkStorage()
  }, [])

  const checkStorage = () => {
    try {
      // Test basic localStorage
      const testKey = "test_" + Date.now()
      const testValue = { message: "Hello localStorage", timestamp: new Date().toISOString() }
      
      localStorage.setItem(testKey, JSON.stringify(testValue))
      const retrieved = localStorage.getItem(testKey)
      localStorage.removeItem(testKey)
      
      if (retrieved) {
        const parsed = JSON.parse(retrieved)
        setTestResult(`✅ localStorage working: ${parsed.message}`)
      } else {
        setTestResult("❌ localStorage failed")
      }

      // Check existing documents
      const docs = localStorage.getItem("documents")
      setStorageData(docs || "No documents found")
      
    } catch (error) {
      setTestResult(`❌ localStorage error: ${error}`)
    }
  }

  const createTestDocument = () => {
    try {
      console.log("Creating test document...")
      
      const testDoc = DocumentService.createDocument(
        "Test Document " + Date.now(),
        "purchase-request",
        "flow",
        "test@example.com",
        "This is a test document",
        ["approver1@test.com", "approver2@test.com"]
      )
      
      console.log("Test document created:", testDoc)
      
      // Verify it was saved
      const saved = DocumentService.getDocumentById(testDoc.id)
      console.log("Retrieved test document:", saved)
      
      checkStorage()
      
    } catch (error) {
      console.error("Error creating test document:", error)
      setTestResult(`❌ Error: ${error}`)
    }
  }

  const clearStorage = () => {
    DocumentService.clearAllDocuments()
    checkStorage()
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>localStorage Test Page</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">Test Result:</h3>
              <p className="text-sm bg-gray-100 p-2 rounded">{testResult}</p>
            </div>
            
            <div>
              <h3 className="font-semibold mb-2">Current Storage Data:</h3>
              <textarea 
                className="w-full h-32 text-xs bg-gray-100 p-2 rounded font-mono"
                value={storageData}
                readOnly
              />
            </div>
            
            <div className="flex space-x-2">
              <Button onClick={checkStorage}>
                Check Storage
              </Button>
              <Button onClick={createTestDocument}>
                Create Test Document
              </Button>
              <Button onClick={clearStorage} variant="destructive">
                Clear Storage
              </Button>
            </div>
            
            <div className="mt-4 p-4 bg-yellow-50 rounded">
              <h4 className="font-semibold text-yellow-800 mb-2">Debug Instructions:</h4>
                             <ol className="text-sm text-yellow-700 space-y-1">
                 <li>1. Open browser Developer Tools (F12)</li>
                 <li>2. Go to Console tab</li>
                 <li>3. Click &quot;Create Test Document&quot; button</li>
                 <li>4. Watch console logs for debugging info</li>
                 <li>5. Check Application tab &gt; Local Storage to see stored data</li>
               </ol>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 