"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { Switch } from "@/components/ui/switch"
import { Checkbox } from "@/components/ui/checkbox"
import { toast } from "sonner"
import { DocumentTemplate, TemplateField, CreateTemplateRequest, User } from "@/lib/types"
import { EnhancedDocumentService } from "@/lib/enhanced-document-service"
import { Plus, Edit, Trash2, Eye, Copy, Settings, ArrowLeft, Save, X } from "lucide-react"
import Link from "next/link"
import SidebarLayout from "@/components/sidebar-layout"

export default function TemplatesPage() {
  const [user, setUser] = useState<User | null>(null)
  const [templates, setTemplates] = useState<DocumentTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTemplate, setSelectedTemplate] = useState<DocumentTemplate | null>(null)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)

  useEffect(() => {
    // Get user from localStorage - check both possible keys for compatibility
    const userData = localStorage.getItem("user") || localStorage.getItem("currentUser")
    if (userData) {
      const parsedUser = JSON.parse(userData)
      setUser(parsedUser)
      loadTemplates(parsedUser.email)
    } else {
      toast.error("Please log in to manage templates")
      setLoading(false)
    }
  }, [])

  const loadTemplates = async (userId?: string) => {
    try {
      setLoading(true)
      const templatesData = await EnhancedDocumentService.getDocumentTemplates(userId)
      setTemplates(templatesData)
    } catch (error) {
      console.error("Error loading templates:", error)
      toast.error("Failed to load templates")
    } finally {
      setLoading(false)
    }
  }





  const handleDeleteTemplate = async (templateId: string) => {
    if (!user) return

    try {
      await EnhancedDocumentService.deleteTemplate(templateId)
      toast.success("Template deleted successfully")
      loadTemplates(user.email)
    } catch (error) {
      console.error("Error deleting template:", error)
      toast.error("Failed to delete template")
    }
  }

  const handleDuplicateTemplate = (template: DocumentTemplate) => {
    // Navigate to create page with template data
    const templateData = encodeURIComponent(JSON.stringify({
      name: `${template.name} (Copy)`,
      description: template.description || "",
      category: template.category,
      templateFields: template.templateFields,
      isPublic: false
    }))
    window.location.href = `/templates/create?duplicate=${templateData}`
  }



  const openViewDialog = (template: DocumentTemplate) => {
    setSelectedTemplate(template)
    setIsViewDialogOpen(true)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 py-3">
          <div className="flex items-center justify-between max-w-7xl mx-auto">
            <h1 className="text-xl font-semibold text-gray-900">Distribution List template</h1>
          </div>
        </div>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading templates...</p>
          </div>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>Please log in to manage templates</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/">
              <Button className="w-full">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Go to Login
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  const categories = [...new Set(templates.map(t => t.category))]

  return (
    <SidebarLayout>
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center space-x-4">
            <h1 className="text-xl font-semibold text-gray-900">Distribution List template</h1>
          </div>
          <div className="flex items-center space-x-2">
            {user.role === "admin" && (
              <Link href="/templates/create">
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Add List
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="w-full px-4 py-6">
        {templates.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <Settings className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Templates Found</h3>
              <p className="text-gray-600 mb-4">
                {user.role === "admin" 
                  ? "Create your first document template to get started"
                  : "No templates are available for your role"
                }
              </p>
              {user.role === "admin" && (
                <Link href="/templates/create">
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Add List
                  </Button>
                </Link>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="bg-white rounded-lg border border-gray-200 w-full">
            {/* Table Header with Filters */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 border-b border-gray-200 gap-4">
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <Button variant="outline" size="sm" className="w-fit">
                  <Settings className="h-4 w-4 mr-2" />
                  FILTER
                </Button>
                    </div>
                  </div>

            {/* Table Content */}
            <div className="overflow-x-auto">
              <table className="w-full min-w-full">
                <thead className="bg-gray-50">
                  <tr className="border-b border-gray-200">
                    <th className="px-2 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sr.</th>
                    <th className="px-2 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Template Name</th>
                    <th className="hidden md:table-cell px-2 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                    {/* Fields, Usage, and Visibility columns removed */}
                    <th className="hidden sm:table-cell px-2 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                    <th className="px-2 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {templates.map((template, index) => (
                    <tr key={template.id} className="hover:bg-gray-50">
                      <td className="px-2 sm:px-4 py-4 whitespace-nowrap text-sm text-gray-900">{index + 1}</td>
                      <td className="px-2 sm:px-4 py-4">
                        <div>
                          <div className="text-xs sm:text-sm font-medium text-blue-600 truncate max-w-32 sm:max-w-none">{template.name}</div>
                          {template.description && (
                            <div className="text-xs text-gray-500 mt-1 truncate max-w-32 sm:max-w-none">
                              {template.description}
                    </div>
                          )}
                    </div>
                      </td>
                      <td className="hidden md:table-cell px-2 sm:px-4 py-4 whitespace-nowrap text-sm text-gray-900">{template.category}</td>
                      {/* Fields, Usage, and Visibility columns removed */}
                      <td className="hidden sm:table-cell px-2 sm:px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(template.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-2 sm:px-4 py-4 whitespace-nowrap text-sm">
                        <div className="flex flex-wrap items-center gap-1">
                        <Button 
                            variant="outline" 
                          size="sm"
                          onClick={() => openViewDialog(template)}
                            className="p-1 sm:p-2"
                        >
                            <Eye className="w-3 h-3 sm:w-4 sm:h-4" />
                        </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleDuplicateTemplate(template)}
                            className="p-1 sm:p-2"
                          >
                            <Copy className="w-3 h-3 sm:w-4 sm:h-4" />
                          </Button>
                          {user.role === "admin" && template.createdBy === user.email && (
                            <>
                              <Link href={`/templates/edit/${template.id}`}>
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  className="text-blue-600 hover:text-blue-700 p-1 sm:p-2"
                                >
                                  <Edit className="w-3 h-3 sm:w-4 sm:h-4" />
                                </Button>
                              </Link>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                                  <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700 p-1 sm:p-2">
                                    <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Template</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete "{template.name}"? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction 
                                  onClick={() => handleDeleteTemplate(template.id)}
                                  className="bg-red-600 hover:bg-red-700"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between px-4 py-3 border-t border-gray-200 gap-4">
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-700 hidden sm:inline">Items per page:</span>
                <select 
                  className="text-sm border border-gray-300 rounded px-2 py-1"
                  defaultValue="10"
                  disabled
                >
                  <option value="10">10</option>
                </select>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <span className="text-sm text-gray-700 text-center">
                  1 - {Math.min(10, templates.length)} of {templates.length}
                </span>
                <div className="flex items-center justify-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled
                    className="text-xs sm:text-sm"
                  >
                    <span className="hidden sm:inline">Previous</span>
                    <span className="sm:hidden">Prev</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled
                    className="text-xs sm:text-sm"
                  >
                    Next
                  </Button>
                </div>
                    </div>
                  </div>
          </div>
        )}
      </div>



      {/* View Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedTemplate?.name}</DialogTitle>
            <DialogDescription>
              {selectedTemplate?.description || "No description"}
            </DialogDescription>
          </DialogHeader>
          {selectedTemplate && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-600">Category</Label>
                  <p className="text-sm">{selectedTemplate.category}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-600">Visibility</Label>
                  <p className="text-sm">{selectedTemplate.isPublic ? "Public" : "Private"}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-600">Usage Count</Label>
                  <p className="text-sm">{selectedTemplate.usageCount}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-600">Created By</Label>
                  <p className="text-sm">{selectedTemplate.createdBy}</p>
                </div>
              </div>
              
              <Separator />
              
              <div>
                <Label className="text-sm font-medium text-gray-600 mb-3 block">Template Fields</Label>
                <div className="space-y-3">
                  {selectedTemplate.templateFields.map((field, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium">{field.label}</h4>
                        <div className="flex items-center space-x-2">
                          <Badge variant="outline" className="text-xs">
                            {field.type}
                          </Badge>
                          {field.required && (
                            <Badge variant="destructive" className="text-xs">
                              Required
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="text-sm text-gray-600">
                        <p><strong>Field Name:</strong> {field.name}</p>
                        {field.placeholder && <p><strong>Placeholder:</strong> {field.placeholder}</p>}
                        {field.defaultValue && <p><strong>Default Value:</strong> {field.defaultValue}</p>}
                        {field.options && field.options.length > 0 && (
                          <p><strong>Options:</strong> {field.options.join(", ")}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
    </SidebarLayout>
  )
}
