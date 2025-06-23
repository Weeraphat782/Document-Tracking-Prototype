"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Plus, Edit, Trash2, FileText } from "lucide-react"
import Link from "next/link"

interface Template {
  id: string
  name: string
  description: string
  category: string
  fields: string[]
  defaultWorkflow: "flow" | "drop"
}

export default function Templates() {
  const [templates] = useState<Template[]>([
    {
      id: "1",
      name: "Purchase Request",
      description: "Request for purchasing office supplies or equipment",
      category: "Finance",
      fields: ["Item Description", "Quantity", "Estimated Cost", "Justification"],
      defaultWorkflow: "flow",
    },
    {
      id: "2",
      name: "Leave Form",
      description: "Employee leave application form",
      category: "HR",
      fields: ["Leave Type", "Start Date", "End Date", "Reason"],
      defaultWorkflow: "flow",
    },
    {
      id: "3",
      name: "Expense Report",
      description: "Monthly expense reimbursement report",
      category: "Finance",
      fields: ["Expense Category", "Amount", "Receipt", "Business Purpose"],
      defaultWorkflow: "flow",
    },
    {
      id: "4",
      name: "Monthly Report",
      description: "Departmental monthly status report",
      category: "Operations",
      fields: ["Department", "Period", "Key Metrics", "Summary"],
      defaultWorkflow: "drop",
    },
  ])

  const [newTemplate, setNewTemplate] = useState({
    name: "",
    description: "",
    category: "",
  })

  const categories = ["Finance", "HR", "Operations", "Legal", "IT"]

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center">
              <Link href="/dashboard">
                <Button variant="ghost" size="sm" className="mr-4">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Dashboard
                </Button>
              </Link>
              <h1 className="text-2xl font-bold text-gray-900">Document Templates</h1>
            </div>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Template
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Template List */}
          <div className="lg:col-span-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {templates.map((template) => (
                <Card key={template.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="flex items-center">
                          <FileText className="h-5 w-5 mr-2" />
                          {template.name}
                        </CardTitle>
                        <CardDescription className="mt-2">{template.description}</CardDescription>
                      </div>
                      <div className="flex space-x-1">
                        <Button variant="ghost" size="sm">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Category:</span>
                        <Badge variant="outline">{template.category}</Badge>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Default Workflow:</span>
                        <Badge variant={template.defaultWorkflow === "flow" ? "default" : "secondary"}>
                          {template.defaultWorkflow.toUpperCase()}
                        </Badge>
                      </div>

                      <div>
                        <span className="text-sm font-medium">Fields:</span>
                        <div className="mt-2 flex flex-wrap gap-1">
                          {template.fields.map((field) => (
                            <Badge key={field} variant="outline" className="text-xs">
                              {field}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Create New Template */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle>Create New Template</CardTitle>
                <CardDescription>Add a new document template</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Template Name</Label>
                  <Input
                    id="name"
                    placeholder="Enter template name"
                    value={newTemplate.name}
                    onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Input
                    id="description"
                    placeholder="Brief description"
                    value={newTemplate.description}
                    onChange={(e) => setNewTemplate({ ...newTemplate, description: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Input
                    id="category"
                    placeholder="Select or enter category"
                    value={newTemplate.category}
                    onChange={(e) => setNewTemplate({ ...newTemplate, category: e.target.value })}
                  />
                </div>

                <Button className="w-full" disabled={!newTemplate.name || !newTemplate.description}>
                  Create Template
                </Button>
              </CardContent>
            </Card>

            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Template Statistics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm">Total Templates:</span>
                    <span className="font-medium">{templates.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Flow Templates:</span>
                    <span className="font-medium">{templates.filter((t) => t.defaultWorkflow === "flow").length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Drop Templates:</span>
                    <span className="font-medium">{templates.filter((t) => t.defaultWorkflow === "drop").length}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}
