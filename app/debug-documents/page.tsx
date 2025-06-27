"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { EnhancedDocumentService } from "@/lib/enhanced-document-service"
import { ArrowLeft, Database, Search, Plus } from "lucide-react"
import Link from "next/link"
import { Document } from '@/lib/types'
import { convertLegacyToDualStatus, LEGACY_TO_DUAL_STATUS_MAP } from '@/lib/types'

export default function DebugDocuments() {
  const [documentId, setDocumentId] = useState("")
  const [searchResult, setSearchResult] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [allDocuments, setAllDocuments] = useState<any[]>([])
  const [createResult, setCreateResult] = useState<any>(null)
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)

  const searchDocument = async () => {
    if (!documentId.trim()) return
    
    setIsLoading(true)
    setSearchResult(null)
    
    try {
      console.log("🔍 Searching for document:", documentId)
      const doc = await EnhancedDocumentService.getDocumentById(documentId.trim())
      setSearchResult(doc)
      console.log("🎯 Search result:", doc)
    } catch (error) {
      console.error("❌ Search error:", error)
      setSearchResult({ error: String(error) })
    } finally {
      setIsLoading(false)
    }
  }

  const loadAllDocuments = async () => {
    setIsLoading(true)
    try {
      console.log("📋 Loading all documents...")
      const docs = await EnhancedDocumentService.getAllDocuments()
      setAllDocuments(docs)
      setDocuments(docs)
      console.log("📊 Loaded documents:", docs.length)
    } catch (error) {
      console.error("❌ Load error:", error)
      setAllDocuments([{ error: String(error) }])
    } finally {
      setIsLoading(false)
    }
  }

  const createTestDocument = async () => {
    setIsLoading(true)
    setCreateResult(null)
    
    try {
      console.log("➕ Creating test document...")
      const doc = await EnhancedDocumentService.createDocument(
        "Debug Test Document - " + Date.now(),
        "test-template",
        "flow",
        "debug@example.com",
        "This is a debug test document",
        ["approver1@example.com", "approver2@example.com"]
      )
      setCreateResult(doc)
      console.log("✅ Document created:", doc)
      
      // Auto-load all documents after creation
      await loadAllDocuments()
    } catch (error) {
      console.error("❌ Create error:", error)
      setCreateResult({ error: String(error) })
    } finally {
      setIsLoading(false)
    }
  }

  const clearAllDocuments = async () => {
    setIsLoading(true)
    try {
      console.log("🗑️ Clearing all documents...")
      await EnhancedDocumentService.clearAllDocuments()
      setAllDocuments([])
      setSearchResult(null)
      setCreateResult(null)
      setDocuments([])
      console.log("✅ All documents cleared")
    } catch (error) {
      console.error("❌ Clear error:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const fixApprovalModes = async () => {
    setIsLoading(true)
    try {
      console.log("🔧 Fixing approval modes for existing documents...")
      const docs = await EnhancedDocumentService.getAllDocuments()
      let fixedCount = 0
      
      for (const doc of docs) {
        if (doc.workflow === "flow" && !doc.approvalMode) {
          // Set default approval mode to sequential for existing documents
          doc.approvalMode = "sequential"
          await EnhancedDocumentService.updateDocument(doc)
          fixedCount++
          console.log(`✅ Fixed approval mode for document: ${doc.id}`)
        }
      }
      
      console.log(`✅ Fixed ${fixedCount} documents`)
      await loadAllDocuments() // Reload to show updated data
    } catch (error) {
      console.error("❌ Fix error:", error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    const fetchDocuments = async () => {
      try {
        const docs = await EnhancedDocumentService.getAllDocuments()
        setDocuments(docs)
      } catch (error) {
        console.error('Error fetching documents:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchDocuments()
  }, [])

  const testStatusConversion = (legacyStatus: string) => {
    const mapping = convertLegacyToDualStatus(legacyStatus as any)
    return mapping
  }

  if (loading) {
    return <div className="p-8">Loading...</div>
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
              <h1 className="text-2xl font-bold text-gray-900">Debug Documents</h1>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Search Document */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Search className="h-5 w-5 mr-2" />
                Search Document
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex space-x-2">
                  <Input
                    placeholder="Enter Document ID (e.g., DOC-123456789-123)"
                    value={documentId}
                    onChange={(e) => setDocumentId(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && searchDocument()}
                  />
                  <Button onClick={searchDocument} disabled={isLoading}>
                    <Search className="h-4 w-4" />
                  </Button>
                </div>
                
                {searchResult && (
                  <div className="mt-4 p-4 border rounded-lg">
                    {searchResult.error ? (
                      <div className="text-red-600">
                        <strong>Error:</strong> {searchResult.error}
                      </div>
                    ) : searchResult ? (
                      <div className="space-y-2">
                        <div><strong>ID:</strong> {searchResult.id}</div>
                        <div><strong>Title:</strong> {searchResult.title}</div>
                        <div><strong>Status:</strong> <Badge>{searchResult.status}</Badge></div>
                        <div><strong>Created By:</strong> {searchResult.createdBy}</div>
                        <div><strong>Workflow:</strong> {searchResult.workflow}</div>
                      </div>
                    ) : (
                      <div className="text-gray-600">Document not found</div>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Plus className="h-5 w-5 mr-2" />
                Actions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <Button 
                  onClick={createTestDocument} 
                  disabled={isLoading}
                  className="w-full"
                >
                  Create Test Document
                </Button>
                
                <Button 
                  onClick={loadAllDocuments} 
                  disabled={isLoading}
                  className="w-full"
                  variant="outline"
                >
                  Load All Documents
                </Button>
                
                <Button 
                  onClick={fixApprovalModes} 
                  disabled={isLoading}
                  className="w-full"
                  variant="secondary"
                >
                  Fix Approval Modes
                </Button>
                
                <Button 
                  onClick={clearAllDocuments} 
                  disabled={isLoading}
                  className="w-full"
                  variant="destructive"
                >
                  Clear All Documents
                </Button>
              </div>
              
              {createResult && (
                <div className="mt-4 p-4 border rounded-lg">
                  {createResult.error ? (
                    <div className="text-red-600">
                      <strong>Error:</strong> {createResult.error}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="text-green-600"><strong>✅ Document Created!</strong></div>
                      <div><strong>ID:</strong> {createResult.id}</div>
                      <div><strong>Title:</strong> {createResult.title}</div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Status Conversion Test */}
        <div className="mb-8 p-4 border rounded-lg bg-gray-50">
          <h2 className="text-lg font-semibold mb-4">Status Conversion Test</h2>
          <div className="space-y-2">
            <div>
              <strong>REJECTED - Returned to Originator:</strong>
              {JSON.stringify(testStatusConversion("REJECTED - Returned to Originator"))}
            </div>
            <div>
              <strong>In Transit - Rejected Document:</strong>
              {JSON.stringify(testStatusConversion("In Transit - Rejected Document"))}
            </div>
            <div>
              <strong>Delivered (Drop Off):</strong>
              {JSON.stringify(testStatusConversion("Delivered (Drop Off)"))}
            </div>
          </div>
        </div>

        {/* Full Status Mapping */}
        <div className="mb-8 p-4 border rounded-lg bg-blue-50">
          <h2 className="text-lg font-semibold mb-4">Full Status Mapping</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
            {Object.entries(LEGACY_TO_DUAL_STATUS_MAP).map(([legacy, dual]) => (
              <div key={legacy} className="p-2 bg-white rounded border">
                <div className="font-medium">{legacy}</div>
                <div className="text-gray-600">
                  Doc: {dual.documentStatus} | Track: {dual.trackingStatus}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* All Documents */}
        {documents.length > 0 && (
          <Card className="mt-8">
            <CardHeader>
              <CardTitle>All Documents ({documents.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {documents.map((doc, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    {(doc as any).error ? (
                      <div className="text-red-600">Error: {(doc as any).error}</div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div>
                          <strong>ID:</strong><br />
                          <code className="text-xs">{doc.id}</code>
                        </div>
                        <div>
                          <strong>Title:</strong><br />
                          {doc.title}
                        </div>
                        <div>
                          <strong>Legacy Status:</strong><br />
                          {doc.status}
                        </div>
                        <div>
                          <strong>Document Status:</strong><br />
                          {doc.documentStatus || 'Not Set'}
                        </div>
                        <div>
                          <strong>Tracking Status:</strong><br />
                          {doc.trackingStatus || 'Not Set'}
                        </div>
                        <div>
                          <strong>Expected Dual Status:</strong><br />
                          {JSON.stringify(convertLegacyToDualStatus(doc.status))}
                        </div>
                        <div>
                          <strong>Created:</strong><br />
                          {new Date(doc.createdAt).toLocaleString()}
                        </div>
                        <div>
                          <strong>Updated:</strong><br />
                          {doc.updatedAt ? new Date(doc.updatedAt).toLocaleString() : 'Never'}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Console Instructions */}
        <Card className="mt-8 bg-blue-50">
          <CardHeader>
            <CardTitle className="text-blue-800">Debug Instructions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-blue-700 space-y-2">
              <p>1. Open browser console (F12) to see detailed debug logs</p>
              <p>2. Create a test document and note the generated ID</p>
              <p>3. Search for the document using the ID to test retrieval</p>
              <p>4. Check console for detailed database operations</p>
              <p>5. All operations will show Supabase vs localStorage usage</p>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
} 