"use client"

import { useState, useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  FileText, 
  Menu,
  X,
  Home,
  ChevronLeft,
  ChevronRight
} from "lucide-react"
import Link from "next/link"
import { User as UserType } from "@/lib/types"

interface SidebarLayoutProps {
  children: React.ReactNode
}

export default function SidebarLayout({ children }: SidebarLayoutProps) {
  const [user, setUser] = useState<UserType | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    const userData = localStorage.getItem("user")
    if (!userData) {
      router.push("/")
      return
    }
    setUser(JSON.parse(userData))
    
    // Load sidebar collapsed state from localStorage
    const collapsed = localStorage.getItem("sidebarCollapsed")
    if (collapsed) {
      setSidebarCollapsed(JSON.parse(collapsed))
    }
  }, [router])

  // Save sidebar collapsed state to localStorage
  const toggleSidebarCollapsed = () => {
    const newCollapsed = !sidebarCollapsed
    setSidebarCollapsed(newCollapsed)
    localStorage.setItem("sidebarCollapsed", JSON.stringify(newCollapsed))
  }

  const menuItems = [
    {
      id: 'dashboard',
              label: 'Document Registration',
      icon: <Home className="h-4 w-4" />,
      href: '/dashboard',
      roles: ['admin', 'mail', 'approver', 'recipient']
    },
    {
      id: 'templates',
      label: 'Templates',
      icon: <FileText className="h-4 w-4" />,
      href: '/templates',
      roles: ['admin']
    }
  ]

  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case 'admin': return 'Department Admin'
      case 'mail': return 'Mail Controller'
      case 'approver': return 'Approver/Signer'
      case 'recipient': return 'Recipient'
      default: return role
    }
  }

  const getUserInitials = (email: string) => {
    return email.substring(0, 2).toUpperCase()
  }

  if (!user) {
    return <div>Loading...</div>
  }

  const sidebarWidth = sidebarCollapsed ? 'w-16' : 'w-64'

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 ${sidebarWidth} bg-white shadow-lg transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} transition-all duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0`}>
        <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <FileText className="h-5 w-5 text-white" />
            </div>
            {!sidebarCollapsed && (
              <div>
                <h1 className="text-lg font-bold text-gray-900">SERVICE</h1>
                <h1 className="text-lg font-bold text-gray-900 -mt-1">MIND</h1>
              </div>
            )}
          </div>
          <div className="flex items-center space-x-1">
            {/* Desktop collapse button */}
            <Button
              variant="ghost"
              size="sm"
              className="hidden lg:flex"
              onClick={toggleSidebarCollapsed}
            >
              {sidebarCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </Button>
            {/* Mobile close button */}
            <Button
              variant="ghost"
              size="sm"
              className="lg:hidden"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <nav className="flex-1 px-4 py-4 space-y-2 overflow-y-auto">
          {menuItems.map((item) => {
            if (!item.roles.includes(user.role)) return null

            return (
              <Link
                key={item.id}
                href={item.href}
                className={`flex items-center ${sidebarCollapsed ? 'justify-center' : 'space-x-3'} px-3 py-2 text-sm font-medium rounded-md hover:bg-gray-100 transition-colors ${
                  pathname === item.href ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-600' : 'text-gray-700'
                }`}
                title={sidebarCollapsed ? item.label : undefined}
              >
                {item.icon}
                {!sidebarCollapsed && <span>{item.label}</span>}
              </Link>
            )
          })}
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden lg:ml-0">
        {/* Header */}
        <header className="bg-white shadow-sm border-b border-gray-200">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                className="lg:hidden"
                onClick={() => setSidebarOpen(true)}
              >
                <Menu className="h-5 w-5" />
              </Button>
              
              <div className="hidden md:block">
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-500">Company</span>
                  <select className="text-sm border border-gray-300 rounded px-2 py-1 bg-white">
                    <option>ServiceMind</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-red-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
                  {getUserInitials(user.email)}
                </div>
                <div className="hidden sm:block text-right">
                  <div className="text-sm font-medium text-gray-900">
                    {getRoleDisplayName(user.role)}
                  </div>
                  <div className="text-xs text-gray-500">Organisation Admin</div>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  localStorage.removeItem("user")
                  router.push("/")
                }}
              >
                Logout
              </Button>
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  )
} 