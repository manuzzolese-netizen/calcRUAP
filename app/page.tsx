"use client"

import { useState } from "react"
import { CedolinoAnalyzer } from "@/components/cedolino-analyzer"
import { CompensoCalculator } from "@/components/compenso-calculator"
import { Button } from "@/components/ui/button"

type View = "analyzer" | "calculator"

export default function Home() {
  const [view, setView] = useState<View>("calculator")

  return (
    <main className="flex min-h-screen flex-col items-center p-4 py-8">
      <div className="mb-6 flex gap-2">
        <Button
          variant={view === "calculator" ? "default" : "outline"}
          onClick={() => setView("calculator")}
          className={
            view === "calculator"
              ? "bg-primary text-primary-foreground"
              : "border-border/30 text-foreground hover:bg-secondary"
          }
        >
          Calcolatore Compenso
        </Button>
        <Button
          variant={view === "analyzer" ? "default" : "outline"}
          onClick={() => setView("analyzer")}
          className={
            view === "analyzer"
              ? "bg-primary text-primary-foreground"
              : "border-border/30 text-foreground hover:bg-secondary"
          }
        >
          Analizzatore Cedolino
        </Button>
      </div>

      {view === "calculator" ? <CompensoCalculator /> : <CedolinoAnalyzer />}
    </main>
  )
}
