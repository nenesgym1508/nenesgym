"use client"

import dynamic from "next/dynamic"

const QrScanner = dynamic(() => import("./qr-scanner"), { ssr: false })

export function QrScannerWrapper() {
  return <QrScanner />
}
