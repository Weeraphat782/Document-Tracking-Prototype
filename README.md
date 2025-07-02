# Document Tracking System

A comprehensive document tracking and workflow management system built with **Next.js 15**, **React 19**, **TypeScript**, and **Supabase**. Features real-time QR code scanning, role-based access control, and automated workflow processing.

## 🚀 Features

### Core Functionality
- **📄 Document Management**: Create, track, and manage documents through their entire lifecycle
- **📱 QR Code Integration**: Real camera-based QR scanning for document tracking
- **👥 Role-Based Access Control**: Four distinct user roles with specific permissions
- **🔄 Workflow Automation**: Flow (multi-level approval) and Drop (direct delivery) workflows
- **📊 Real-time Dashboard**: Role-specific dashboards with document statistics
- **🗄️ Database Integration**: Supabase database with localStorage fallback

### Advanced Features
- **📱 Mobile Responsive**: Optimized for mobile devices and tablets
- **🎨 Modern UI**: Built with shadcn/ui components and Tailwind CSS
- **🔍 Real-time Search**: Find documents by ID, title, or status
- **📋 Audit Trail**: Complete action history for all document operations
- **🖨️ Printable Cover Sheets**: Auto-generated cover sheets with QR codes
- **⚡ Offline Support**: Works with localStorage when database is unavailable

## 👥 User Roles

### 1. **Department Admin** (`admin`)
- Create new documents and workflows
- Manage document templates
- Close completed workflows
- Access to workflow guide and testing tools

### 2. **Mail Controller** (`mail`)
- Pickup documents for delivery
- Deliver documents to recipients
- Track documents in transit
- Manage physical document movement

### 3. **Recipient** (`approver`)
- Receive documents for review
- Accept or reject documents
- Add comments and feedback
- Process multi-level approvals

### 4. **Recipient** (`recipient`)
- Confirm receipt of documents
- View delivery status
- Access delivered documents

## 🔄 Workflow Types

### Flow Workflow
- **Multi-level approval process**
- Sequential approver chain
- Document moves through each approval step
- Rejection returns document to originator
- Complete audit trail maintained

### Drop Workflow
- **Direct delivery to recipient**
- Single-step process
- Immediate delivery confirmation
- Ideal for informational documents

## 🛠️ Technology Stack

- **Frontend**: Next.js 15, React 19, TypeScript
- **Styling**: Tailwind CSS, shadcn/ui components
- **Database**: Supabase (PostgreSQL) with localStorage fallback
- **QR Scanning**: ZXing library for real camera access
- **State Management**: React hooks and localStorage
- **Authentication**: Session-based with role management

## 📦 Installation

### Prerequisites
- Node.js 18+ 
- npm or pnpm
- Git

### Quick Start

1. **Clone the repository**
   ```bash
   git clone https://github.com/Weeraphat782/Document-Tracking-Prototype.git
   cd Document-Tracking-Prototype
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   pnpm install
   ```

3. **Start development server**
   ```bash
   npm run dev
   # or
   pnpm dev
   ```

4. **Open in browser**
   ```
   http://localhost:3000
   ```

## 🗄️ Database Setup (Optional)

The system works with localStorage by default. For production use with Supabase:

1. **Create Supabase project**
   - Sign up at [supabase.com](https://supabase.com)
   - Create a new project

2. **Set up environment variables**
   ```bash
   # Create .env.local file
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

3. **Run database schema**
   - Execute the SQL in `supabase-schema.sql` in your Supabase SQL editor
   - This creates tables, indexes, RLS policies, and functions

4. **Verify setup**
   - Visit `/test-database` to check database connectivity
   - System automatically falls back to localStorage if Supabase is unavailable

See `SUPABASE_SETUP.md` for detailed database setup instructions.

## 🧪 Testing & Debug Tools

### Built-in Testing Pages

- **`/test-database`**: Database integration testing
- **`/debug-documents`**: Document CRUD operations testing  
- **`/test-storage`**: Storage persistence testing
- **`/workflow-guide`**: Complete system testing guide

### Demo Users

The system includes pre-configured demo users for testing:

- **Admin**: `admin@company.com`
- **Mail Controller**: `mail@company.com`  
- **Recipient**: `manager@company.com`
- **Recipient**: `recipient@company.com`

### Testing Workflow

1. **Login as Admin** → Create documents
2. **Switch to Mail Controller** → Pickup and deliver documents
3. **Switch to Recipient** → Review and accept/reject
4. **Switch to Recipient** → Confirm receipt
5. **Return to Admin** → Close completed workflows

## 📱 Mobile Usage

The system is fully responsive and optimized for mobile devices:

- **Touch-friendly interfaces**
- **Real camera QR scanning**
- **Responsive typography and layouts**
- **Mobile-optimized navigation**
- **Offline functionality**

## 🔧 Development

### Project Structure
```
├── app/                    # Next.js app directory
│   ├── create-document/    # Document creation
│   ├── dashboard/          # Role-based dashboards
│   ├── document/[id]/      # Document detail pages
│   ├── scan-qr/           # QR scanning interface
│   └── ...
├── components/ui/          # shadcn/ui components
├── lib/                   # Core business logic
│   ├── enhanced-document-service.ts  # Main service layer
│   ├── database-service.ts          # Database abstraction
│   ├── types.ts                     # TypeScript definitions
│   └── ...
├── supabase-schema.sql    # Database schema
└── SUPABASE_SETUP.md     # Database setup guide
```

### Key Services

- **`EnhancedDocumentService`**: Main business logic and workflow management
- **`DatabaseService`**: Database abstraction with Supabase/localStorage fallback
- **`QRScanner`**: Real camera QR code scanning component

## 🚀 Deployment

### Vercel (Recommended)
1. Push code to GitHub (already done!)
2. Connect repository to Vercel
3. Add environment variables for Supabase
4. Deploy automatically

### Other Platforms
- **Netlify**: Works with static export
- **Railway**: Full-stack deployment with database
- **Docker**: Container-ready setup

## 🔒 Security Features

- **Role-based access control (RBAC)**
- **Document-level permissions**
- **Audit trail for all actions**
- **Supabase Row Level Security (RLS)**
- **Input validation and sanitization**

## 📈 Performance

- **Optimized bundle size** with Next.js 15
- **Lazy loading** for large components
- **Efficient database queries** with indexes
- **Client-side caching** for better UX
- **Mobile-first responsive design**

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Issues**: [GitHub Issues](https://github.com/Weeraphat782/Document-Tracking-Prototype/issues)
- **Documentation**: Check `/workflow-guide` in the app
- **Debug Tools**: Use `/debug-documents` for troubleshooting

## 🎯 Roadmap

- [ ] Email notifications for workflow events
- [ ] Document version control
- [ ] Advanced reporting and analytics
- [ ] Integration with external document systems
- [ ] Multi-language support
- [ ] API endpoints for third-party integration

---

**Built with ❤️ using Next.js, React, and Supabase**

## 📊 Repository Stats

![GitHub repo size](https://img.shields.io/github/repo-size/Weeraphat782/Document-Tracking-Prototype)
![GitHub last commit](https://img.shields.io/github/last-commit/Weeraphat782/Document-Tracking-Prototype)
![GitHub issues](https://img.shields.io/github/issues/Weeraphat782/Document-Tracking-Prototype)
![GitHub stars](https://img.shields.io/github/stars/Weeraphat782/Document-Tracking-Prototype) 