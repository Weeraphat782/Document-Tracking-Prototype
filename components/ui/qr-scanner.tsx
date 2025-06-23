"use client"

import React, { useEffect, useRef, useState } from 'react'
import { BrowserMultiFormatReader, NotFoundException } from '@zxing/library'
import { Button } from './button'
import { Card, CardContent } from './card'
import { Camera, Square, AlertCircle } from 'lucide-react'

interface QRScannerProps {
  onScan: (data: string) => void
  onError?: (error: string) => void
  className?: string
}

export function QRScanner({ onScan, onError, className }: QRScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isScanning, setIsScanning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([])
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>("")
  const [hasPermission, setHasPermission] = useState<boolean | null>(null)
  const codeReader = useRef<BrowserMultiFormatReader | null>(null)

  useEffect(() => {
    // Initialize code reader
    codeReader.current = new BrowserMultiFormatReader()
    
    // Get available video devices
    const getDevices = async () => {
      try {
        // Request camera permission first
        const stream = await navigator.mediaDevices.getUserMedia({ video: true })
        stream.getTracks().forEach(track => track.stop()) // Stop the stream after getting permission
        setHasPermission(true)
        
        const videoDevices = await codeReader.current!.listVideoInputDevices()
        setDevices(videoDevices)
        
        // Select back camera if available (usually contains "back" or "rear" in label)
        const backCamera = videoDevices.find(device => 
          device.label.toLowerCase().includes('back') || 
          device.label.toLowerCase().includes('rear')
        )
        setSelectedDeviceId(backCamera?.deviceId || videoDevices[0]?.deviceId || "")
        
      } catch (err) {
        console.error("Error accessing camera:", err)
        setHasPermission(false)
        setError("Camera access denied. Please allow camera access and try again.")
        onError?.("Camera access denied")
      }
    }

    getDevices()

    return () => {
      stopScanning()
    }
  }, [onError])

  const startScanning = async () => {
    if (!codeReader.current || !videoRef.current || !selectedDeviceId) {
      setError("Camera not available")
      return
    }

    try {
      setIsScanning(true)
      setError(null)
      
      console.log("Starting QR scan with device:", selectedDeviceId)
      
      await codeReader.current.decodeFromVideoDevice(
        selectedDeviceId,
        videoRef.current,
        (result, error) => {
          if (result) {
            console.log("QR Code detected:", result.getText())
            onScan(result.getText())
            stopScanning()
          }
          if (error && !(error instanceof NotFoundException)) {
            console.error("QR scanning error:", error)
            setError("Error scanning QR code: " + error.message)
            onError?.(error.message)
          }
        }
      )
      
    } catch (err) {
      console.error("Error starting scan:", err)
      setError("Failed to start camera: " + (err as Error).message)
      onError?.((err as Error).message)
      setIsScanning(false)
    }
  }

  const stopScanning = () => {
    if (codeReader.current) {
      codeReader.current.reset()
    }
    setIsScanning(false)
  }

  const switchCamera = async () => {
    if (devices.length <= 1) return
    
    const currentIndex = devices.findIndex(d => d.deviceId === selectedDeviceId)
    const nextIndex = (currentIndex + 1) % devices.length
    const nextDevice = devices[nextIndex]
    
    setSelectedDeviceId(nextDevice.deviceId)
    
    if (isScanning) {
      stopScanning()
      // Small delay to ensure camera is released
      setTimeout(() => {
        startScanning()
      }, 500)
    }
  }

  if (hasPermission === false) {
    return (
      <Card className={className}>
        <CardContent className="p-6 text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Camera Access Required</h3>
          <p className="text-gray-600 mb-4">
            This app needs camera access to scan QR codes. Please allow camera access in your browser settings and refresh the page.
          </p>
          <Button onClick={() => window.location.reload()}>
            Refresh Page
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (hasPermission === null) {
    return (
      <Card className={className}>
        <CardContent className="p-6 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Requesting camera access...</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardContent className="p-4">
        <div className="space-y-4">
          {/* Camera View */}
          <div className="relative bg-black rounded-lg overflow-hidden">
            <video
              ref={videoRef}
              className="w-full h-64 object-cover"
              playsInline
              muted
            />
            
            {/* Scanning overlay */}
            {isScanning && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="relative">
                  <Square className="h-32 w-32 text-green-500 animate-pulse" strokeWidth={3} />
                  <div className="absolute inset-0 border-2 border-green-500 rounded-lg animate-ping"></div>
                </div>
              </div>
            )}
            
            {/* Camera switch button */}
            {devices.length > 1 && (
              <Button
                variant="secondary"
                size="sm"
                className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 text-white"
                onClick={switchCamera}
              >
                <Camera className="h-4 w-4" />
              </Button>
            )}
          </div>

          {/* Error message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <div className="flex items-center">
                <AlertCircle className="h-4 w-4 text-red-500 mr-2" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          )}

          {/* Controls */}
          <div className="flex gap-2">
            {!isScanning ? (
              <Button 
                onClick={startScanning} 
                className="flex-1"
                disabled={!selectedDeviceId}
              >
                <Camera className="h-4 w-4 mr-2" />
                Start Scanning
              </Button>
            ) : (
              <Button 
                onClick={stopScanning} 
                variant="destructive" 
                className="flex-1"
              >
                <Square className="h-4 w-4 mr-2" />
                Stop Scanning
              </Button>
            )}
          </div>

          {/* Device info */}
          {devices.length > 0 && (
            <div className="text-xs text-gray-500 text-center">
              Using: {devices.find(d => d.deviceId === selectedDeviceId)?.label || "Default camera"}
              {devices.length > 1 && ` (${devices.length} cameras available)`}
            </div>
          )}

          {/* Instructions */}
          <div className="text-sm text-gray-600 text-center">
            <p>Position the QR code within the scanning area</p>
            <p className="text-xs mt-1">The scanner will automatically detect and process the code</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
} 