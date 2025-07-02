"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import SidebarLayout from "@/components/sidebar-layout"
import { EnhancedDocumentService } from "@/lib/enhanced-document-service"
import { CreateTemplateRequest } from "@/lib/types"
import { ArrowLeft, Save, X } from "lucide-react"

export default function CreateTemplate() {
  const router = useRouter()
  const { toast } = useToast()
  
  const [templateName, setTemplateName] = useState("")
  const [templateDescription, setTemplateDescription] = useState("")
  const [templateCategory, setTemplateCategory] = useState("")
  const [defaultApprovers, setDefaultApprovers] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const categories = [
    'General', 'HR', 'Finance', 'Legal', 'Operations', 'IT', 'Procurement', 'Other'
  ]

  const addNewApproverField = () => {
    setDefaultApprovers([...defaultApprovers, ""])
  }

  const updateApprover = (index: number, value: string) => {
    const newApprovers = [...defaultApprovers]
    newApprovers[index] = value
    setDefaultApprovers(newApprovers)
  }

  const removeApprover = (index: number) => {
    const newApprovers = defaultApprovers.filter((_, i) => i !== index)
    setDefaultApprovers(newApprovers)
  }

  const handleSave = async () => {
    if (!templateName.trim()) {
      toast({
        title: "Error",
        description: "Template name is required",
        variant: "destructive"
      })
      return
    }

    if (!templateCategory) {
      toast({
        title: "Error", 
        description: "Template category is required",
        variant: "destructive"
      })
      return
    }

    setIsLoading(true)
    try {
      const request: CreateTemplateRequest = {
        name: templateName,
        description: templateDescription,
        category: templateCategory,
        templateFields: [],
        defaultApprovers: defaultApprovers,
        isPublic: true
      }

      // Filter out empty approvers before saving
      const validApprovers = defaultApprovers.filter(email => email.trim() !== "")
      request.defaultApprovers = validApprovers
      
      await EnhancedDocumentService.createTemplate(request, "admin@company.com")

      toast({
        title: "Success",
        description: `Template "${templateName}" created successfully`,
      })

      router.push('/templates')
    } catch (error) {
      console.error("Error creating template:", error)
      toast({
        title: "Error",
        description: "Failed to create template. Please try again.",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <SidebarLayout>
      <div className="p-6">
        {/* Breadcrumb */}
        <div className="flex items-center space-x-2 text-sm text-gray-500 mb-4">
          <span>Home</span>
          <span>/</span>
          <Link href="/templates" className="hover:text-gray-700">Templates</Link>
          <span>/</span>
          <span className="text-gray-900">Create Template</span>
        </div>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <Link href="/templates">
              <Button variant="outline" size="sm" className="w-fit">
                <ArrowLeft className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Back to Templates</span>
                <span className="sm:hidden">Back</span>
              </Button>
            </Link>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Create Distribution List Template</h1>
              <p className="text-sm sm:text-base text-gray-600">Design a reusable document template</p>
            </div>
          </div>
          {/* Create List button moved to bottom right */}
        </div>

        <div className="max-w-4xl mx-auto space-y-6">
          {/* Distribution List */}
          <Card>
            <CardHeader>
              <CardTitle>Distribution List</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Template Name *</Label>
                  <Input
                    id="name"
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                    placeholder="e.g., Purchase Request Form"
                  />
                </div>
                
                <div>
                  <Label htmlFor="category">Category *</Label>
                  <Select value={templateCategory} onValueChange={setTemplateCategory}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map(category => (
                        <SelectItem key={category} value={category}>{category}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={templateDescription}
                  onChange={(e) => setTemplateDescription(e.target.value)}
                  placeholder="Brief description of this template's purpose"
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Default Approvers */}
          <Card>
            <CardHeader>
              <CardTitle>Default Approvers</CardTitle>
              <p className="text-sm text-gray-600">Define default approvers for this template (will be loaded automatically when creating documents)</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <Label>Default Approvers *</Label>

                <div className="space-y-3">
                  {defaultApprovers.length === 0 ? (
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline">1</Badge>
                      <Input
                        placeholder="Enter approver email address"
                        value=""
                        onChange={(e) => setDefaultApprovers([e.target.value])}
                        className="flex-1"
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    defaultApprovers.map((email, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <Badge variant="outline">{index + 1}</Badge>
                        <div className="flex-1 relative">
                          <Input
                            placeholder="Enter approver email address"
                            value={email}
                            onChange={(e) => updateApprover(index, e.target.value)}
                          />
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeApprover(index)}
                          disabled={defaultApprovers.length === 1}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))
                  )}
                </div>

                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={addNewApproverField}
                  className="w-full"
                >
                  Add New
                </Button>
              </div>

              {defaultApprovers.filter(email => email.trim() !== "").length > 0 && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-xs text-blue-600">
                    💡 When someone selects this template, these approvers will be automatically loaded in the document creation process
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Create List Button - Bottom Right */}
          <div className="flex justify-end mt-6">
            <Button onClick={handleSave} disabled={isLoading} className="w-full sm:w-auto">
              <Save className="h-4 w-4 mr-2" />
              {isLoading ? 'Creating...' : 'Create List'}
            </Button>
          </div>

        </div>
      </div>
    </SidebarLayout>
  )
} 