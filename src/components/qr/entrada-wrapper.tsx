"use client"

import dynamic from "next/dynamic"

const EntradaTabs = dynamic(() => import("./entrada-tabs"), { ssr: false })

export function EntradaWrapper() {
  return <EntradaTabs />
}
