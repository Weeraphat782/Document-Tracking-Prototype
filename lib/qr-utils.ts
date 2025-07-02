import { QRCodeData } from './types'

// Simple QR code generation using Google Charts API as fallback
export class QRCodeGenerator {
  
  // Generate QR code URL using Google Charts API
  static generateQRCodeURL(data: QRCodeData, size: number = 200): string {
    const qrData = JSON.stringify(data)
    const encodedData = encodeURIComponent(qrData)
    return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodedData}`
  }

  // Generate QR code as data URL for embedding
  static async generateQRCodeDataURL(data: QRCodeData, size: number = 200): Promise<string> {
    try {
      const url = this.generateQRCodeURL(data, size)
      const response = await fetch(url)
      const blob = await response.blob()
      
      return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result as string)
        reader.onerror = reject
        reader.readAsDataURL(blob)
      })
    } catch (error) {
      console.error('Error generating QR code:', error)
      // Fallback to a simple placeholder
      return this.generatePlaceholderQR(data, size)
    }
  }

  // Generate a simple text-based placeholder QR code
  private static generatePlaceholderQR(data: QRCodeData, size: number): string {
    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext('2d')
    
    if (!ctx) return ''
    
    // Draw a simple pattern
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, size, size)
    
    ctx.fillStyle = '#000000'
    const cellSize = size / 25
    
    // Create a simple pattern
    for (let i = 0; i < 25; i++) {
      for (let j = 0; j < 25; j++) {
        if ((i + j) % 2 === 0 || (i * j) % 3 === 0) {
          ctx.fillRect(i * cellSize, j * cellSize, cellSize, cellSize)
        }
      }
    }
    
    // Add border
    ctx.strokeStyle = '#000000'
    ctx.lineWidth = 2
    ctx.strokeRect(0, 0, size, size)
    
    return canvas.toDataURL()
  }

  // Parse QR code data from scanned string
  static parseQRData(scannedData: string): QRCodeData | null {
    try {
      const parsed = JSON.parse(scannedData)
      
      // Validate required fields
      if (parsed.documentId && parsed.title && parsed.workflow) {
        return parsed as QRCodeData
      }
      
      return null
    } catch (error) {
      console.error('Error parsing QR data:', error)
      return null
    }
  }

  // Validate QR code data structure
  static validateQRData(data: any): data is QRCodeData {
    return (
      typeof data === 'object' &&
      typeof data.documentId === 'string' &&
      typeof data.title === 'string' &&
      typeof data.workflow === 'string' &&
      typeof data.currentStep === 'string' &&
      typeof data.expectedRole === 'string' &&
      typeof data.createdAt === 'string' &&
      typeof data.version === 'string'
    )
  }

  // Generate cover sheet QR code with document info
  static generateCoverSheetQR(data: QRCodeData): string {
    return this.generateQRCodeURL(data, 150)
  }
}

// QR Code scanner utility (using camera or manual input)
export class QRCodeScanner {
  
  // Simulate QR code scanning (for demo purposes)
  static simulateScan(documentId: string): Promise<QRCodeData | null> {
    return new Promise((resolve) => {
      setTimeout(() => {
        // Simulate successful scan
        const mockData: QRCodeData = {
          documentId,
          title: `Document ${documentId}`,
          workflow: 'flow',
          currentStep: 'Ready for processing',
          expectedRole: 'mail',
          createdAt: new Date().toISOString(),
          version: '1.0'
        }
        resolve(mockData)
      }, 1000)
    })
  }

  // Manual QR data entry (fallback when camera is not available)
  static manualEntry(input: string): QRCodeData | null {
    // Try to parse as JSON first
    let parsed = QRCodeGenerator.parseQRData(input)
    if (parsed) return parsed

    // If not JSON, treat as document ID and create minimal QR data
    if (input.startsWith('DOC-')) {
      return {
        documentId: input,
        title: `Document ${input}`,
        workflow: 'flow',
        currentStep: 'Manual entry',
        expectedRole: 'mail',
        createdAt: new Date().toISOString(),
        version: '1.0'
      }
    }

    return null
  }

  // Check if device has camera support
  static async hasCameraSupport(): Promise<boolean> {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices()
      return devices.some(device => device.kind === 'videoinput')
    } catch {
      return false
    }
  }
}

// Cover sheet generation utilities
export class CoverSheetGenerator {
  
  // Generate cover sheet HTML for printing
  static generateCoverSheetHTML(
    documentId: string,
    title: string,
    type: string,
    workflow: string,
    from: string,
    to: string,
    qrCodeURL: string,
    approvalHierarchy?: string[],
    approvalMode?: string
  ): string {
    const currentDate = new Date().toLocaleDateString()
    
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Document Cover Sheet - ${documentId}</title>
          <style>
            body { 
              font-family: Arial, sans-serif; 
              margin: 20px; 
              background: white;
              color: #1f2937;
            }
            .cover-sheet { 
              border: 2px solid #374151; 
              padding: 20px; 
              max-width: 600px;
              margin: 0 auto;
              background: white;
            }
            .header { 
              text-align: center; 
              border-bottom: 2px solid #374151; 
              padding-bottom: 15px; 
              margin-bottom: 20px;
            }
            .header h1 {
              color: #111827;
              margin: 0 0 10px 0;
            }
            .header h2 {
              color: #374151;
              margin: 0;
            }
            .qr-section { 
              text-align: center; 
              margin: 20px 0;
              padding: 15px;
              border: 2px solid #6b7280;
              background: #f9fafb;
            }
            .qr-code { 
              margin: 10px 0;
            }
            .qr-code img {
              border: 1px solid #d1d5db;
              padding: 8px;
              background: white;
            }
            .info-section { 
              margin: 15px 0;
            }
            .info-row { 
              display: flex; 
              justify-content: space-between; 
              margin: 8px 0;
              padding: 5px 0;
              border-bottom: 1px dotted #6b7280;
            }
            .label { 
              font-weight: bold; 
              width: 150px;
              color: #374151;
            }
            .value { 
              flex: 1;
              color: #111827;
            }
            .approval-hierarchy {
              margin-top: 20px;
              padding: 15px;
              background: #eff6ff;
              border-left: 4px solid #3b82f6;
              border: 1px solid #bfdbfe;
            }
            .approval-hierarchy h3 {
              color: #111827;
              margin: 0 0 10px 0;
            }
            .approval-step {
              margin: 5px 0;
              padding: 5px;
              color: #374151;
            }
            .instructions {
              margin-top: 20px;
              padding: 15px;
              background: #fef3c7;
              border-left: 4px solid #f59e0b;
              border: 1px solid #fcd34d;
              font-size: 14px;
            }
            .instructions h4 {
              color: #111827;
              margin: 0 0 10px 0;
            }
            .instructions ol {
              color: #374151;
              margin: 0;
              padding-left: 20px;
            }
            .instructions li {
              margin: 5px 0;
            }
            @media print {
              body { margin: 0; }
              .cover-sheet { border: 2px solid #374151; }
              .qr-section { background: #f9fafb !important; }
              .approval-hierarchy { background: #eff6ff !important; }
              .instructions { background: #fef3c7 !important; }
            }
          </style>
        </head>
        <body>
          <div class="cover-sheet">
            <div class="header">
              <h1>DOCUMENT TRACKING COVER SHEET</h1>
              <h2>${documentId}</h2>
            </div>
            
            <div class="info-section">
              <div class="info-row">
                <span class="label">Document Title:</span>
                <span class="value">${title}</span>
              </div>
              <div class="info-row">
                <span class="label">Document Type:</span>
                <span class="value">${type}</span>
              </div>
              <div class="info-row">
                <span class="label">Workflow:</span>
                <span class="value">${workflow.toUpperCase()}</span>
              </div>
              <div class="info-row">
                <span class="label">From:</span>
                <span class="value">${from}</span>
              </div>
              <div class="info-row">
                <span class="label">To:</span>
                <span class="value">${to}</span>
              </div>
              <div class="info-row">
                <span class="label">Created:</span>
                <span class="value">${currentDate}</span>
              </div>
            </div>

            <div class="qr-section">
              <h3>QR CODE - SCAN TO TRACK</h3>
              <div class="qr-code">
                <img src="${qrCodeURL}" alt="Document QR Code" style="width: 150px; height: 150px;" />
              </div>
              <p><strong>Document ID:</strong> ${documentId}</p>
              <p style="font-size: 12px; color: #666;">
                Scan this QR code at each step to update document status
              </p>
            </div>

            ${approvalHierarchy && approvalHierarchy.length > 0 ? `
              <div class="approval-hierarchy">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                  <h3>APPROVAL HIERARCHY</h3>
                  <span style="background: #dcfce7; 
                               color: #166534; 
                               padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold;">
                    Flexible (ข้ามได้)
                  </span>
                </div>
                ${approvalHierarchy.map((approver, index) => `
                  <div class="approval-step">
                    <strong>Step ${index + 1}:</strong> ${approver}
                  </div>
                `).join('')}
                <div style="margin-top: 10px; padding-top: 10px; border-top: 1px solid #bfdbfe; font-size: 12px; color: #1e40af;">
                  <strong>Mode:</strong> Recipients can review in any order
                </div>
              </div>
            ` : ''}

            <div class="instructions">
              <h4>INSTRUCTIONS:</h4>
              <ol>
                <li><strong>Mail Controller:</strong> Scan QR code when picking up and delivering documents</li>
                <li><strong>Recipients:</strong> Scan QR code when receiving documents for review</li>
                <li><strong>Recipients:</strong> Scan QR code to confirm receipt</li>
                <li><strong>Keep this cover sheet attached</strong> to the document at all times</li>
                <li>For questions, contact the document originator: ${from}</li>
              </ol>
            </div>
          </div>
        </body>
      </html>
    `
  }

  // Generate cover sheet and open in new window for printing
  static printCoverSheet(
    documentId: string,
    title: string,
    type: string,
    workflow: string,
    from: string,
    to: string,
    qrCodeURL: string,
    approvalHierarchy?: string[],
    approvalMode?: string
  ): void {
    const html = this.generateCoverSheetHTML(
      documentId, title, type, workflow, from, to, qrCodeURL, approvalHierarchy, approvalMode
    )
    
    const printWindow = window.open('', '_blank')
    if (printWindow) {
      printWindow.document.write(html)
      printWindow.document.close()
      
      // Auto-print after a short delay to allow content to load
      setTimeout(() => {
        printWindow.print()
        printWindow.close()
      }, 1000)
    }
  }
} 