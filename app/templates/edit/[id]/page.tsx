"use client"

import { useState, useEffect, use } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Checkbox } from "@/components/ui/checkbox"
import { toast } from "sonner"
import { DocumentTemplate, TemplateField, User } from "@/lib/types"
import { EnhancedDocumentService } from "@/lib/enhanced-document-service"
import { Plus, Edit, Trash2, ArrowLeft, Save, X } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"

interface EditTemplatePageProps {
  params: {
    id: string
  }
}

export default function EditTemplatePage({ params }: EditTemplatePageProps) {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [template, setTemplate] = useState<DocumentTemplate | null>(null)
  const [templateId, setTemplateId] = useState<string | null>(null)

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    category: "",
    templateFields: [] as TemplateField[],
    isPublic: false
  })

  // Field being edited
  const [editingField, setEditingField] = useState<TemplateField | null>(null)
  const [fieldForm, setFieldForm] = useState<TemplateField>({
    name: "",
    type: "text",
    label: "",
    required: false,
    defaultValue: "",
    options: [],
    placeholder: ""
  })

  useEffect(() => {
    // Resolve params asynchronously
    Promise.resolve(params).then((resolvedParams) => {
      setTemplateId(resolvedParams.id)
    })
  }, [params])

  useEffect(() => {
    if (!templateId) return

    const userData = localStorage.getItem("user") || localStorage.getItem("currentUser")
    if (userData) {
      const parsedUser = JSON.parse(userData)
      setUser(parsedUser)
      
      if (parsedUser.role !== "admin") {
        toast.error("Access denied. Admin role required.")
        router.push("/templates")
        return
      }
      
      loadTemplate(templateId, parsedUser.email)
    } else {
      toast.error("Please log in to edit templates")
      router.push("/")
      return
    }
  }, [templateId, router])

  const loadTemplate = async (templateId: string, userEmail: string) => {
    try {
      setLoading(true)
      const templates = await EnhancedDocumentService.getDocumentTemplates(userEmail)
      const foundTemplate = templates.find(t => t.id === templateId)
      
      if (!foundTemplate) {
        toast.error("Template not found")
        router.push("/templates")
        return
      }
      
      if (foundTemplate.createdBy !== userEmail) {
        toast.error("You can only edit templates you created")
        router.push("/templates")
        return
      }
      
      setTemplate(foundTemplate)
      setFormData({
        name: foundTemplate.name,
        description: foundTemplate.description || "",
        category: foundTemplate.category,
        templateFields: JSON.parse(JSON.stringify(foundTemplate.templateFields)),
        isPublic: foundTemplate.isPublic
      })
    } catch (error) {
      console.error("Error loading template:", error)
      toast.error("Failed to load template")
      router.push("/templates")
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateTemplate = async () => {
    if (!user || !template) return

    try {
      setSaving(true)
      
      if (!formData.name.trim() || !formData.category.trim()) {
        toast.error("Please fill in all required fields")
        return
      }

      const updatedTemplate: DocumentTemplate = {
        ...template,
        name: formData.name,
        description: formData.description,
        category: formData.category,
        templateFields: formData.templateFields,
        isPublic: formData.isPublic,
        updatedAt: new Date().toISOString()
      }

      await EnhancedDocumentService.updateTemplate(updatedTemplate)
      toast.success("Template updated successfully")
      router.push("/templates")
    } catch (error) {
      console.error("Error updating template:", error)
      toast.error("Failed to update template")
    } finally {
      setSaving(false)
    }
  }

  const addField = () => {
    if (!fieldForm.name.trim() || !fieldForm.label.trim()) {
      toast.error("Please fill in field name and label")
      return
    }

    const newField: TemplateField = {
      ...fieldForm,
      options: fieldForm.type === "select" ? fieldForm.options : undefined
    }

    setFormData(prev => ({
      ...prev,
      templateFields: [...prev.templateFields, newField]
    }))

    setFieldForm({
      name: "",
      type: "text",
      label: "",
      required: false,
      defaultValue: "",
      options: [],
      placeholder: ""
    })
  }

  const updateField = () => {
    if (!editingField) return

    const updatedFields = formData.templateFields.map(field => 
      field.name === editingField.name ? {
        ...fieldForm,
        options: fieldForm.type === "select" ? fieldForm.options : undefined
      } : field
    )

    setFormData(prev => ({
      ...prev,
      templateFields: updatedFields
    }))

    setEditingField(null)
    setFieldForm({
      name: "",
      type: "text",
      label: "",
      required: false,
      defaultValue: "",
      options: [],
      placeholder: ""
    })
  }

  const removeField = (fieldName: string) => {
    setFormData(prev => ({
      ...prev,
      templateFields: prev.templateFields.filter(field => field.name !== fieldName)
    }))
  }

  const editField = (field: TemplateField) => {
    setEditingField(field)
    setFieldForm({
      ...field,
      options: field.options || []
    })
  }

  const addOption = () => {
    const newOption = (document.getElementById("new-option") as HTMLInputElement)?.value?.trim()
    if (newOption && !fieldForm.options?.includes(newOption)) {
      setFieldForm(prev => ({
        ...prev,
        options: [...(prev.options || []), newOption]
      }))
      const input = document.getElementById("new-option") as HTMLInputElement
      if (input) input.value = ""
    }
  }

  const removeOption = (option: string) => {
    setFieldForm(prev => ({
      ...prev,
      options: prev.options?.filter(opt => opt !== option) || []
    }))
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading template...</p>
        </div>
      </div>
    )
  }

  if (!user || !template) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>Template not found or access denied</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/templates">
              <Button className="w-full">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Templates
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center space-x-4">
            <Link href="/templates">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Templates
              </Button>
            </Link>
            <h1 className="text-xl font-semibold text-gray-900">Edit Template: {template.name}</h1>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
              <CardDescription>
                Edit the basic properties of your template
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="template-name">Template Name *</Label>
                  <Input
                    id="template-name"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    placeholder="Enter template name"
                  />
                </div>
                <div>
                  <Label htmlFor="template-category">Category *</Label>
                  <Input
                    id="template-category"
                    value={formData.category}
                    onChange={(e) => setFormData({...formData, category: e.target.value})}
                    placeholder="e.g., Finance, HR, Legal"
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="template-description">Description</Label>
                <Textarea
                  id="template-description"
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  placeholder="Describe what this template is for"
                  rows={3}
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="is-public"
                  checked={formData.isPublic}
                  onCheckedChange={(checked) => setFormData({...formData, isPublic: checked})}
                />
                <Label htmlFor="is-public">Make this template public</Label>
              </div>
            </CardContent>
          </Card>

          {/* Template Fields */}
          <Card>
            <CardHeader>
              <CardTitle>Template Fields</CardTitle>
              <CardDescription>
                Edit custom fields for your template
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Add/Edit Field Form */}
              <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                <h4 className="font-medium mb-4">
                  {editingField ? "Edit Field" : "Add New Field"}
                </h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <Label htmlFor="field-name">Field Name *</Label>
                    <Input
                      id="field-name"
                      value={fieldForm.name}
                      onChange={(e) => setFieldForm({...fieldForm, name: e.target.value})}
                      placeholder="e.g., firstName"
                      disabled={!!editingField}
                    />
                  </div>
                  <div>
                    <Label htmlFor="field-label">Field Label *</Label>
                    <Input
                      id="field-label"
                      value={fieldForm.label}
                      onChange={(e) => setFieldForm({...fieldForm, label: e.target.value})}
                      placeholder="e.g., First Name"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <Label htmlFor="field-type">Field Type</Label>
                    <Select value={fieldForm.type} onValueChange={(value) => setFieldForm({...fieldForm, type: value as any})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="text">Text</SelectItem>
                        <SelectItem value="textarea">Textarea</SelectItem>
                        <SelectItem value="select">Select</SelectItem>
                        <SelectItem value="date">Date</SelectItem>
                        <SelectItem value="number">Number</SelectItem>
                        <SelectItem value="email">Email</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="field-placeholder">Placeholder</Label>
                    <Input
                      id="field-placeholder"
                      value={fieldForm.placeholder}
                      onChange={(e) => setFieldForm({...fieldForm, placeholder: e.target.value})}
                      placeholder="Placeholder text"
                    />
                  </div>
                </div>

                <div className="mb-4">
                  <Label htmlFor="field-default">Default Value</Label>
                  <Input
                    id="field-default"
                    value={fieldForm.defaultValue}
                    onChange={(e) => setFieldForm({...fieldForm, defaultValue: e.target.value})}
                    placeholder="Default value"
                  />
                </div>

                {fieldForm.type === "select" && (
                  <div className="mb-4">
                    <Label>Options</Label>
                    <div className="flex space-x-2 mb-2">
                      <Input
                        id="new-option"
                        placeholder="Add option"
                        onKeyPress={(e) => e.key === "Enter" && addOption()}
                      />
                      <Button type="button" onClick={addOption}>
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {fieldForm.options?.map((option, index) => (
                        <Badge key={index} variant="secondary" className="flex items-center">
                          {option}
                          <button
                            type="button"
                            onClick={() => removeOption(option)}
                            className="ml-2 text-red-500 hover:text-red-700"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="field-required"
                      checked={fieldForm.required}
                      onCheckedChange={(checked) => setFieldForm({...fieldForm, required: !!checked})}
                    />
                    <Label htmlFor="field-required">Required field</Label>
                  </div>
                  <div className="flex space-x-2">
                    {editingField ? (
                      <>
                        <Button onClick={updateField}>
                          <Save className="w-4 h-4 mr-2" />
                          Update Field
                        </Button>
                        <Button variant="outline" onClick={() => {
                          setEditingField(null)
                          setFieldForm({
                            name: "",
                            type: "text",
                            label: "",
                            required: false,
                            defaultValue: "",
                            options: [],
                            placeholder: ""
                          })
                        }}>
                          Cancel
                        </Button>
                      </>
                    ) : (
                      <Button onClick={addField}>
                        <Plus className="w-4 h-4 mr-2" />
                        Add Field
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              {/* Existing Fields */}
              {formData.templateFields.length > 0 && (
                <div>
                  <h4 className="font-medium mb-4">Template Fields ({formData.templateFields.length})</h4>
                  <div className="space-y-3">
                    {formData.templateFields.map((field, index) => (
                      <div key={index} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <h5 className="font-medium">{field.label}</h5>
                          <div className="flex items-center space-x-2">
                            <Badge variant="outline" className="text-xs">
                              {field.type}
                            </Badge>
                            {field.required && (
                              <Badge variant="destructive" className="text-xs">
                                Required
                              </Badge>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => editField(field)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeField(field.name)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
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
              )}
            </CardContent>
          </Card>
        </div>
        
        {/* Fixed Update Button */}
        <div className="fixed bottom-6 right-6">
          <Button 
            onClick={handleUpdateTemplate} 
            disabled={saving}
            size="lg"
            className="shadow-lg"
          >
            <Save className="w-4 h-4 mr-2" />
            {saving ? "Updating..." : "Update Template"}
          </Button>
        </div>
      </div>
    </div>
  )
} 