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

export default function TemplatesPage() {
  const [user, setUser] = useState<User | null>(null)
  const [templates, setTemplates] = useState<DocumentTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTemplate, setSelectedTemplate] = useState<DocumentTemplate | null>(null)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)

  // Form state
  const [formData, setFormData] = useState<CreateTemplateRequest>({
    name: "",
    description: "",
    category: "",
    templateFields: [],
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

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      category: "",
      templateFields: [],
      isPublic: false
    })
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

  const handleCreateTemplate = async () => {
    if (!user) return

    try {
      if (!formData.name.trim() || !formData.category.trim()) {
        toast.error("Please fill in all required fields")
        return
      }

      await EnhancedDocumentService.createTemplate(formData, user.email)
      toast.success("Template created successfully")
      setIsCreateDialogOpen(false)
      resetForm()
      loadTemplates(user.email)
    } catch (error) {
      console.error("Error creating template:", error)
      toast.error("Failed to create template")
    }
  }

  const handleUpdateTemplate = async () => {
    if (!user || !selectedTemplate) return

    try {
      const updatedTemplate: DocumentTemplate = {
        ...selectedTemplate,
        name: formData.name,
        description: formData.description,
        category: formData.category,
        templateFields: formData.templateFields,
        isPublic: formData.isPublic,
        updatedAt: new Date().toISOString()
      }

      await EnhancedDocumentService.updateTemplate(updatedTemplate)
      toast.success("Template updated successfully")
      setIsEditDialogOpen(false)
      resetForm()
      setSelectedTemplate(null)
      loadTemplates(user.email)
    } catch (error) {
      console.error("Error updating template:", error)
      toast.error("Failed to update template")
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
    setFormData({
      name: `${template.name} (Copy)`,
      description: template.description || "",
      category: template.category,
      templateFields: JSON.parse(JSON.stringify(template.templateFields)), // Deep copy
      isPublic: false
    })
    setIsCreateDialogOpen(true)
  }

  const openEditDialog = (template: DocumentTemplate) => {
    setSelectedTemplate(template)
    setFormData({
      name: template.name,
      description: template.description || "",
      category: template.category,
      templateFields: JSON.parse(JSON.stringify(template.templateFields)), // Deep copy
      isPublic: template.isPublic
    })
    setIsEditDialogOpen(true)
  }

  const openViewDialog = (template: DocumentTemplate) => {
    setSelectedTemplate(template)
    setIsViewDialogOpen(true)
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

    // Reset field form
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
      <div className="min-h-screen bg-gray-50">
        <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 py-3">
          <div className="flex items-center justify-between max-w-7xl mx-auto">
            <h1 className="text-xl font-semibold text-gray-900">Document Templates</h1>
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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center space-x-4">
            <Link href="/dashboard">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Button>
            </Link>
            <h1 className="text-xl font-semibold text-gray-900">Document Templates</h1>
          </div>
          <div className="flex items-center space-x-2">
            <Badge variant="outline">{templates.length} Templates</Badge>
            {user.role === "admin" && (
              <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={resetForm}>
                    <Plus className="w-4 h-4 mr-2" />
                    Create Template
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Create New Template</DialogTitle>
                    <DialogDescription>
                      Design a custom document template with fields and validation
                    </DialogDescription>
                  </DialogHeader>
                  <TemplateForm 
                    formData={formData}
                    setFormData={setFormData}
                    fieldForm={fieldForm}
                    setFieldForm={setFieldForm}
                    editingField={editingField}
                    addField={addField}
                    updateField={updateField}
                    removeField={removeField}
                    editField={editField}
                    addOption={addOption}
                    removeOption={removeOption}
                    onSave={handleCreateTemplate}
                    onCancel={() => {
                      setIsCreateDialogOpen(false)
                      resetForm()
                    }}
                    isEdit={false}
                  />
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-6">
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
                <Button onClick={() => setIsCreateDialogOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Template
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {templates.map((template) => (
              <Card key={template.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg">{template.name}</CardTitle>
                      <CardDescription className="mt-1">
                        {template.description || "No description"}
                      </CardDescription>
                    </div>
                    <Badge variant="secondary" className="ml-2">
                      {template.category}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Fields:</span>
                      <span className="font-medium">{template.templateFields.length}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Usage:</span>
                      <span className="font-medium">{template.usageCount}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Visibility:</span>
                      <Badge variant={template.isPublic ? "default" : "outline"} className="text-xs">
                        {template.isPublic ? "Public" : "Private"}
                      </Badge>
                    </div>
                    
                    <Separator />
                    
                    <div className="flex items-center justify-between">
                      <div className="flex space-x-1">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => openViewDialog(template)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleDuplicateTemplate(template)}
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                      </div>
                      
                      {user.role === "admin" && template.createdBy === user.email && (
                        <div className="flex space-x-1">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => openEditDialog(template)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700">
                                <Trash2 className="w-4 h-4" />
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
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Template</DialogTitle>
            <DialogDescription>
              Modify the template fields and settings
            </DialogDescription>
          </DialogHeader>
          <TemplateForm 
            formData={formData}
            setFormData={setFormData}
            fieldForm={fieldForm}
            setFieldForm={setFieldForm}
            editingField={editingField}
            addField={addField}
            updateField={updateField}
            removeField={removeField}
            editField={editField}
            addOption={addOption}
            removeOption={removeOption}
            onSave={handleUpdateTemplate}
            onCancel={() => {
              setIsEditDialogOpen(false)
              resetForm()
              setSelectedTemplate(null)
            }}
            isEdit={true}
          />
        </DialogContent>
      </Dialog>

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
  )
}

// Template Form Component
interface TemplateFormProps {
  formData: CreateTemplateRequest
  setFormData: (data: CreateTemplateRequest) => void
  fieldForm: TemplateField
  setFieldForm: (field: TemplateField) => void
  editingField: TemplateField | null
  addField: () => void
  updateField: () => void
  removeField: (fieldName: string) => void
  editField: (field: TemplateField) => void
  addOption: () => void
  removeOption: (option: string) => void
  onSave: () => void
  onCancel: () => void
  isEdit: boolean
}

function TemplateForm({
  formData,
  setFormData,
  fieldForm,
  setFieldForm,
  editingField,
  addField,
  updateField,
  removeField,
  editField,
  addOption,
  removeOption,
  onSave,
  onCancel,
  isEdit
}: TemplateFormProps) {
  return (
    <div className="space-y-6">
      {/* Basic Information */}
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
          placeholder="Describe what this template is used for"
          rows={3}
        />
      </div>

      <div className="flex items-center space-x-2">
        <Switch
          id="is-public"
          checked={formData.isPublic}
          onCheckedChange={(checked) => setFormData({...formData, isPublic: checked})}
        />
        <Label htmlFor="is-public">Make this template public (visible to all users)</Label>
      </div>

      <Separator />

      {/* Field Builder */}
      <div>
        <h3 className="text-lg font-medium mb-4">Template Fields</h3>
        
        {/* Field Form */}
        <Card className="mb-4">
          <CardHeader>
            <CardTitle className="text-base">
              {editingField ? "Edit Field" : "Add New Field"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="field-name">Field Name *</Label>
                <Input
                  id="field-name"
                  value={fieldForm.name}
                  onChange={(e) => setFieldForm({...fieldForm, name: e.target.value})}
                  placeholder="e.g., amount, employeeId"
                  disabled={!!editingField}
                />
              </div>
              <div>
                <Label htmlFor="field-label">Field Label *</Label>
                <Input
                  id="field-label"
                  value={fieldForm.label}
                  onChange={(e) => setFieldForm({...fieldForm, label: e.target.value})}
                  placeholder="e.g., Amount, Employee ID"
                />
              </div>
              <div>
                <Label htmlFor="field-type">Field Type</Label>
                <Select
                  value={fieldForm.type}
                  onValueChange={(value: any) => setFieldForm({...fieldForm, type: value})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="text">Text</SelectItem>
                    <SelectItem value="textarea">Textarea</SelectItem>
                    <SelectItem value="number">Number</SelectItem>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="date">Date</SelectItem>
                    <SelectItem value="select">Select</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="field-placeholder">Placeholder</Label>
                <Input
                  id="field-placeholder"
                  value={fieldForm.placeholder}
                  onChange={(e) => setFieldForm({...fieldForm, placeholder: e.target.value})}
                  placeholder="Enter placeholder text"
                />
              </div>
              <div>
                <Label htmlFor="field-default">Default Value</Label>
                <Input
                  id="field-default"
                  value={fieldForm.defaultValue}
                  onChange={(e) => setFieldForm({...fieldForm, defaultValue: e.target.value})}
                  placeholder="Enter default value"
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="field-required"
                checked={fieldForm.required}
                onCheckedChange={(checked) => setFieldForm({...fieldForm, required: !!checked})}
              />
              <Label htmlFor="field-required">Required field</Label>
            </div>

            {fieldForm.type === "select" && (
              <div>
                <Label>Options</Label>
                <div className="space-y-2">
                  <div className="flex space-x-2">
                    <Input
                      id="new-option"
                      placeholder="Add option"
                      onKeyDown={(e) => e.key === "Enter" && addOption()}
                    />
                    <Button type="button" onClick={addOption} variant="outline">
                      Add
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {fieldForm.options?.map((option, index) => (
                      <Badge key={index} variant="secondary" className="cursor-pointer">
                        {option}
                        <X 
                          className="w-3 h-3 ml-1" 
                          onClick={() => removeOption(option)}
                        />
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-end space-x-2">
              {editingField && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setFieldForm({
                      name: "",
                      type: "text",
                      label: "",
                      required: false,
                      defaultValue: "",
                      options: [],
                      placeholder: ""
                    })
                  }}
                >
                  Cancel
                </Button>
              )}
              <Button
                type="button"
                onClick={editingField ? updateField : addField}
              >
                {editingField ? "Update Field" : "Add Field"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Fields List */}
        {formData.templateFields.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium">Template Fields ({formData.templateFields.length})</h4>
            {formData.templateFields.map((field, index) => (
              <div key={index} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <span className="font-medium">{field.label}</span>
                    <Badge variant="outline" className="text-xs">{field.type}</Badge>
                    {field.required && (
                      <Badge variant="destructive" className="text-xs">Required</Badge>
                    )}
                  </div>
                  <p className="text-sm text-gray-600">Field name: {field.name}</p>
                </div>
                <div className="flex space-x-1">
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
            ))}
          </div>
        )}
      </div>

      <Separator />

      {/* Actions */}
      <div className="flex justify-end space-x-2">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={onSave}>
          <Save className="w-4 h-4 mr-2" />
          {isEdit ? "Update Template" : "Create Template"}
        </Button>
      </div>
    </div>
  )
}
