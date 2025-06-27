"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { useRouter } from "next/navigation"
import { Users, Truck, CheckCircle, User, Info } from "lucide-react"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [role, setRole] = useState("")
  const router = useRouter()

  const demoUsers = [
    {
      email: "admin@company.com",
      role: "admin",
      name: "Department Admin",
      description: "Create documents, manage workflows, close completed documents",
      icon: <Users className="h-4 w-4" />,
      color: "bg-blue-100 text-blue-800"
    },
    {
      email: "mail@company.com", 
      role: "mail",
      name: "Mail Controller",
      description: "Pickup and deliver documents between departments",
      icon: <Truck className="h-4 w-4" />,
      color: "bg-purple-100 text-purple-800"
    },
    {
      email: "manager@company.com",
      role: "approver", 
      name: "Approver/Signer",
      description: "Receive, review, approve, or reject documents",
      icon: <CheckCircle className="h-4 w-4" />,
      color: "bg-orange-100 text-orange-800"
    },
    {
      email: "recipient@company.com",
      role: "recipient",
      name: "Recipient", 
      description: "Confirm receipt of documents sent to you",
      icon: <User className="h-4 w-4" />,
      color: "bg-green-100 text-green-800"
    }
  ]

  const handleLogin = () => {
    if (email && role) {
      // Store user info in localStorage for demo purposes
      localStorage.setItem("user", JSON.stringify({ email, role }))
      router.push("/dashboard")
    }
  }

  const handleDemoLogin = (demoUser: any) => {
    setEmail(demoUser.email)
    setRole(demoUser.role)
    localStorage.setItem("user", JSON.stringify({ email: demoUser.email, role: demoUser.role }))
    router.push("/dashboard")
  }

  const getRoleDescription = (selectedRole: string) => {
    const user = demoUsers.find(u => u.role === selectedRole)
    return user ? user.description : ""
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-3 sm:p-4">
      <div className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-8">
        
        {/* Login Form */}
        <Card className="w-full">
          <CardHeader className="text-center pb-4 sm:pb-6">
            <CardTitle className="text-xl sm:text-2xl font-bold">ServiceMind</CardTitle>
            <CardDescription className="text-sm sm:text-base">Login to access the document workflow system</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 sm:space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="role">Select Your Role</Label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose your role in the system" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">
                    <div className="flex items-center space-x-2">
                      <Users className="h-4 w-4 text-blue-600" />
                      <span>Department Admin</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="mail">
                    <div className="flex items-center space-x-2">
                      <Truck className="h-4 w-4 text-purple-600" />
                      <span>Mail Controller</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="approver">
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="h-4 w-4 text-orange-600" />
                      <span>Approver/Signer</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="recipient">
                    <div className="flex items-center space-x-2">
                      <User className="h-4 w-4 text-green-600" />
                      <span>Recipient</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              
              {role && (
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    <strong>{demoUsers.find(u => u.role === role)?.name}:</strong>{" "}
                    {getRoleDescription(role)}
                  </AlertDescription>
                </Alert>
              )}
            </div>

            <Button onClick={handleLogin} className="w-full" disabled={!email || !role}>
              Login to System
            </Button>
          </CardContent>
        </Card>

        {/* Demo Users & Role Information */}
        <Card className="w-full">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Info className="h-5 w-5 mr-2" />
              Demo Users & Roles
            </CardTitle>
            <CardDescription>
              Click any demo user below to quickly login and explore their role capabilities
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {demoUsers.map((user) => (
              <div 
                key={user.role}
                className="p-3 sm:p-4 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                onClick={() => handleDemoLogin(user)}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2 min-w-0 flex-1">
                    {user.icon}
                    <h3 className="font-semibold text-sm sm:text-base truncate">{user.name}</h3>
                  </div>
                  <Badge className={`${user.color} text-xs flex-shrink-0 ml-2`}>
                    {user.role}
                  </Badge>
                </div>
                <p className="text-xs sm:text-sm text-gray-600 mb-2">{user.description}</p>
                <p className="text-xs text-blue-600 font-medium truncate">{user.email}</p>
              </div>
            ))}
            
            <Alert className="mt-4">
              <Info className="h-4 w-4" />
              <AlertDescription className="text-sm">
                This is a demo system. In production, users would authenticate through your organization's 
                identity provider and roles would be assigned based on their position.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
