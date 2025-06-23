"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { EnhancedDocumentService } from "@/lib/enhanced-document-service"
import { DatabaseService } from "@/lib/database-service"
import { ArrowLeft, Database, CheckCircle, XCircle, AlertCircle } from "lucide-react"
import Link from "next/link"

export default function TestDatabase() {
  const [isLoading, setIsLoading] = useState(false)
  const [results, setResults] = useState<any[]>([])
  const [storageStatus, setStorageStatus] = useState<any>(null)

  useEffect(() => {
    checkStorageStatus()
  }, [])

  const checkStorageStatus = async () => {
    try {
      const status = await EnhancedDocumentService.getStorageStatus()
      setStorageStatus(status)
    } catch (error) {
      console.error("Error checking storage status:", error)
    }
  }

  const runTest = async (testName: string, testFn: () => Promise<any>) => {
    setIsLoading(true)
    const startTime = Date.now()
    
    try {
      const result = await testFn()
      const endTime = Date.now()
      
      setResults(prev => [...prev, {
        name: testName,
        status: "success",
        result,
        duration: endTime - startTime,
        timestamp: new Date().toLocaleTimeString()
      }])
    } catch (error) {
      const endTime = Date.now()
      
      setResults(prev => [...prev, {
        name: testName,
        status: "error",
        error: error instanceof Error ? error.message : String(error),
        duration: endTime - startTime,
        timestamp: new Date().toLocaleTimeString()
      }])
    } finally {
      setIsLoading(false)
    }
  }

  const testCreateDocument = async () => {
    const doc = await EnhancedDocumentService.createDocument(
      "Test Document - " + Date.now(),
      "test-template",
      "flow",
      "test@example.com",
      "This is a test document",
      ["approver1@example.com", "approver2@example.com"]
    )
    return { documentId: doc.id, title: doc.title }
  }

  const testRetrieveDocuments = async () => {
    const allDocs = await EnhancedDocumentService.getAllDocuments()
    return { count: allDocs.length, documents: allDocs.map(d => ({ id: d.id, title: d.title })) }
  }

  const testDocumentPersistence = async () => {
    // Create a document
    const doc = await EnhancedDocumentService.createDocument(
      "Persistence Test - " + Date.now(),
      "test-template",
      "drop",
      "test@example.com",
      "Testing document persistence",
      undefined,
      "recipient@example.com"
    )
    
    // Retrieve it back
    const retrieved = await EnhancedDocumentService.getDocumentById(doc.id)
    
    if (!retrieved) {
      throw new Error("Document not found after creation")
    }
    
    if (retrieved.title !== doc.title) {
      throw new Error("Document data mismatch")
    }
    
    return { 
      created: { id: doc.id, title: doc.title },
      retrieved: { id: retrieved.id, title: retrieved.title },
      match: retrieved.title === doc.title
    }
  }

  const testWorkflowProcessing = async () => {
    // Create a document
    const doc = await EnhancedDocumentService.createDocument(
      "Workflow Test - " + Date.now(),
      "test-template",
      "flow",
      "admin@example.com",
      "Testing workflow processing",
      ["approver@example.com"]
    )
    
    // Process a scan action
    const user = { role: "mail", email: "mail@example.com" } as any
    const result = await EnhancedDocumentService.processScan(doc.id, "pickup", user)
    
    if (!result.success) {
      throw new Error("Scan processing failed: " + result.message)
    }
    
    // Retrieve updated document
    const updated = await EnhancedDocumentService.getDocumentById(doc.id)
    
    return {
      originalStatus: doc.status,
      newStatus: updated?.status,
      scanResult: result.success,
      actionHistory: updated?.actionHistory.length || 0
    }
  }

  const clearResults = () => {
    setResults([])
  }

  const clearAllDocuments = async () => {
    await runTest("Clear All Documents", async () => {
      await EnhancedDocumentService.clearAllDocuments()
      const remaining = await EnhancedDocumentService.getAllDocuments()
      return { remainingCount: remaining.length }
    })
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
              <Database className="h-6 w-6 mr-2 text-blue-600" />
              <h1 className="text-2xl font-bold text-gray-900">Database Integration Test</h1>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Storage Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Database className="h-5 w-5 mr-2" />
                Storage Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              {storageStatus ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span>Storage Type:</span>
                    <Badge variant={storageStatus.usingSupabase ? "default" : "secondary"}>
                      {storageStatus.usingSupabase ? "Supabase" : "localStorage"}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Connection:</span>
                    <Badge variant={storageStatus.connected ? "default" : "destructive"}>
                      {storageStatus.connected ? "Connected" : "Disconnected"}
                    </Badge>
                  </div>
                  {storageStatus.error && (
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{storageStatus.error}</AlertDescription>
                    </Alert>
                  )}
                </div>
              ) : (
                <div className="text-center py-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-2 text-sm text-gray-600">Checking storage status...</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Test Controls */}
          <Card>
            <CardHeader>
              <CardTitle>Test Controls</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <Button 
                  onClick={() => runTest("Create Document", testCreateDocument)}
                  disabled={isLoading}
                  className="w-full"
                >
                  Test Document Creation
                </Button>
                
                <Button 
                  onClick={() => runTest("Retrieve Documents", testRetrieveDocuments)}
                  disabled={isLoading}
                  className="w-full"
                  variant="outline"
                >
                  Test Document Retrieval
                </Button>
                
                <Button 
                  onClick={() => runTest("Document Persistence", testDocumentPersistence)}
                  disabled={isLoading}
                  className="w-full"
                  variant="outline"
                >
                  Test Document Persistence
                </Button>
                
                <Button 
                  onClick={() => runTest("Workflow Processing", testWorkflowProcessing)}
                  disabled={isLoading}
                  className="w-full"
                  variant="outline"
                >
                  Test Workflow Processing
                </Button>
                
                <div className="border-t pt-3 mt-4">
                  <Button 
                    onClick={clearAllDocuments}
                    disabled={isLoading}
                    className="w-full"
                    variant="destructive"
                  >
                    Clear All Documents
                  </Button>
                </div>
                
                <Button 
                  onClick={clearResults}
                  disabled={isLoading}
                  className="w-full"
                  variant="secondary"
                >
                  Clear Test Results
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Test Results */}
        {results.length > 0 && (
          <Card className="mt-8">
            <CardHeader>
              <CardTitle>Test Results</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {results.map((result, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center">
                        {result.status === "success" ? (
                          <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                        ) : (
                          <XCircle className="h-5 w-5 text-red-500 mr-2" />
                        )}
                        <span className="font-medium">{result.name}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant={result.status === "success" ? "default" : "destructive"}>
                          {result.status}
                        </Badge>
                        <span className="text-xs text-gray-500">
                          {result.duration}ms
                        </span>
                        <span className="text-xs text-gray-500">
                          {result.timestamp}
                        </span>
                      </div>
                    </div>
                    
                    {result.status === "success" && result.result && (
                      <div className="mt-2 p-2 bg-green-50 rounded text-sm">
                        <pre className="whitespace-pre-wrap">
                          {JSON.stringify(result.result, null, 2)}
                        </pre>
                      </div>
                    )}
                    
                    {result.status === "error" && result.error && (
                      <div className="mt-2 p-2 bg-red-50 rounded text-sm text-red-700">
                        {result.error}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  )
} 