"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Input } from "@/components/ui/input"

// PDF.js types
interface PDFDocumentProxy {
  numPages: number
  getPage(pageNumber: number): Promise<PDFPageProxy>
}

interface PDFPageProxy {
  getTextContent(): Promise<TextContent>
}

interface TextContent {
  items: Array<{ str?: string }>
}

// Store PDF.js module reference
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PDFJSModule = { 
  getDocument: (params: { data: ArrayBuffer }) => { promise: Promise<PDFDocumentProxy> }
  GlobalWorkerOptions: { workerSrc: string }
}

interface ExtractedData {
  lordo: number | null
  irpef: number | null
  enpam: number | null
  altreTrattenute: number | null
  fondoAssicurativo: number | null
  nettoReale: number | null
}

interface VerificationResult {
  extracted: ExtractedData
  calculated: {
    totaleTrattenute: number
    nettoCalcolato: number
  }
  differences: {
    netto: number | null
    isCorrect: boolean
  }
  rawText: string
}

function formatCurrency(value: number | null): string {
  if (value === null) return "N/D"
  return value.toLocaleString("it-IT", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

function parseItalianNumber(str: string): number | null {
  // Handle Italian number format (1.234,56 or 1234,56)
  const cleaned = str
    .replace(/\s/g, "")
    .replace(/\./g, "")
    .replace(",", ".")
  const num = parseFloat(cleaned)
  return isNaN(num) ? null : num
}

function extractValueFromText(text: string, patterns: RegExp[]): number | null {
  for (const pattern of patterns) {
    const match = text.match(pattern)
    if (match && match[1]) {
      const value = parseItalianNumber(match[1])
      if (value !== null) return value
    }
  }
  return null
}

function extractCedolinoData(text: string): ExtractedData {
  // Normalize text - collapse multiple spaces
  const normalizedText = text.replace(/\s+/g, ' ')
  
  // ASL Puglia cedolino format patterns
  // Format: "TOTALE COMPETENZE 4.468,05" or "QUOTA SINDACALE -3,24"
  
  // Lordo = TOTALE COMPETENZE
  const lordoMatch = normalizedText.match(/TOTALE\s+COMPETENZE\s+([\d.]+,\d{2})/i)
  const lordo = lordoMatch ? parseItalianNumber(lordoMatch[1]) : null
  
  // Netto = TOTALE DA PAGARE
  const nettoMatch = normalizedText.match(/TOTALE\s+DA\s+PAGARE\s+([\d.]+,\d{2})/i)
  const netto = nettoMatch ? parseItalianNumber(nettoMatch[1]) : null
  
  // IRPEF - può apparire come "IRPEF 123,45" o dentro altre descrizioni
  // Cerchiamo nella sezione ritenute (valori negativi o nella lista ritenute)
  const irpefMatch = normalizedText.match(/\bIRPEF\s+[-]?([\d.]+,\d{2})/i)
  const irpef = irpefMatch ? parseItalianNumber(irpefMatch[1]) : null
  
  // ENPAM
  const enpamMatch = normalizedText.match(/\bENPAM\s+[-]?([\d.]+,\d{2})/i)
  const enpam = enpamMatch ? parseItalianNumber(enpamMatch[1]) : null
  
  // QUOTA SINDACALE (valore negativo nel cedolino)
  const quotaSindMatch = normalizedText.match(/QUOTA\s+SINDACALE\s+[-]?([\d.]+,\d{2})/i)
  const quotaSindacale = quotaSindMatch ? parseItalianNumber(quotaSindMatch[1]) : null
  
  // FONDO / FSSA
  const fondoMatch = normalizedText.match(/(?:FONDO|FSSA)\s+[-]?([\d.]+,\d{2})/i)
  const fondo = fondoMatch ? parseItalianNumber(fondoMatch[1]) : null
  
  // Totale ritenute (se esplicitamente indicato)
  const totRitenuteMatch = normalizedText.match(/TOTALE\s+RITENUTE\s+([\d.]+,\d{2})/i)
  const totaleRitenute = totRitenuteMatch ? parseItalianNumber(totRitenuteMatch[1]) : null
  
  // Calcola altre trattenute
  let altreTrattenute: number | null = null
  
  if (totaleRitenute !== null) {
    // Se abbiamo il totale ritenute, sottrai le voci note
    const knownDeductions = (irpef || 0) + (enpam || 0) + (fondo || 0)
    altreTrattenute = Math.round((totaleRitenute - knownDeductions) * 100) / 100
  } else if (lordo !== null && netto !== null) {
    // Altrimenti calcola dalle differenze lordo-netto meno le voci note
    const totalDeductions = lordo - netto
    const knownDeductions = (irpef || 0) + (enpam || 0) + (fondo || 0)
    altreTrattenute = Math.round((totalDeductions - knownDeductions) * 100) / 100
  } else if (quotaSindacale !== null) {
    altreTrattenute = quotaSindacale
  }

  return {
    lordo,
    irpef,
    enpam,
    altreTrattenute,
    fondoAssicurativo: fondo,
    nettoReale: netto,
  }
}

export function CedolinoAnalyzer() {
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<VerificationResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pdfReady, setPdfReady] = useState(false)
  const [pdfModule, setPdfModule] = useState<PDFJSModule | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Load PDF.js dynamically on client side only
  useEffect(() => {
    const loadPdfJs = async () => {
      try {
        const pdfjs = await import("pdfjs-dist")
        pdfjs.GlobalWorkerOptions.workerSrc = "https://unpkg.com/pdfjs-dist@4.4.168/build/pdf.worker.min.mjs"
        setPdfModule(pdfjs as unknown as PDFJSModule)
        setPdfReady(true)
      } catch (err) {
        console.error("Failed to load PDF.js:", err)
        setError("Impossibile caricare la libreria PDF")
      }
    }
    loadPdfJs()
  }, [])

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (file.type !== "application/pdf") {
      setError("Per favore carica un file PDF")
      return
    }

    if (!pdfReady || !pdfModule) {
      setError("La libreria PDF non è ancora pronta. Riprova tra un momento.")
      return
    }

    setIsLoading(true)
    setError(null)
    setResult(null)

    try {
      const arrayBuffer = await file.arrayBuffer()
      
      const loadingTask = pdfModule.getDocument({ data: arrayBuffer })
      const pdf: PDFDocumentProxy = await loadingTask.promise
      
      let fullText = ""
      
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i)
        const textContent = await page.getTextContent()
        const pageText = textContent.items
          .filter((item): item is { str: string } => typeof item.str === "string")
          .map((item) => item.str)
          .join(" ")
        fullText += pageText + "\n"
      }

      const extracted = extractCedolinoData(fullText)
      
      // Calculate expected values
      const totaleTrattenute = 
        (extracted.irpef || 0) + 
        (extracted.enpam || 0) + 
        (extracted.altreTrattenute || 0) + 
        (extracted.fondoAssicurativo || 0)
      
      const nettoCalcolato = extracted.lordo 
        ? extracted.lordo - totaleTrattenute 
        : 0

      // Compare with extracted netto
      const nettoDifference = extracted.nettoReale !== null 
        ? Math.abs(nettoCalcolato - extracted.nettoReale) 
        : null
      
      const isCorrect = nettoDifference !== null && nettoDifference < 0.02

      setResult({
        extracted,
        calculated: {
          totaleTrattenute,
          nettoCalcolato,
        },
        differences: {
          netto: nettoDifference,
          isCorrect,
        },
        rawText: fullText,
      })
    } catch (err) {
      console.error("Error processing PDF:", err)
      const errorMessage = err instanceof Error ? err.message : "Errore sconosciuto"
      setError(`Errore durante l'elaborazione del PDF: ${errorMessage}`)
    } finally {
      setIsLoading(false)
    }
  }

  const handleReset = () => {
    setResult(null)
    setError(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  return (
    <Card className="w-[92%] max-w-[900px] border-border/30 bg-card backdrop-blur-xl shadow-2xl">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-3">
          <svg viewBox="0 0 64 64" className="h-9 w-9">
            <path
              d="M32 2c2 10-6 14-6 24s6 14 6 24-8 14-6 22"
              stroke="currentColor"
              strokeWidth="3"
              fill="none"
              className="text-accent"
            />
            <path
              d="M20 18h24"
              stroke="currentColor"
              strokeWidth="3"
              className="text-accent"
            />
            <path
              d="M20 46h24"
              stroke="currentColor"
              strokeWidth="3"
              className="text-accent"
            />
          </svg>
          <h2 className="text-xl font-semibold text-foreground">
            MMG Cedolino Analyzer
          </h2>
        </div>
        <p className="text-sm text-muted-foreground mt-2">
          Carica il tuo cedolino PDF per verificare se i calcoli sono corretti
        </p>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm text-muted-foreground">
            Carica cedolino PDF
          </label>
          <Input
            ref={fileInputRef}
            type="file"
            accept=".pdf"
            onChange={handleFileUpload}
            className="bg-input border-border/30 text-foreground file:bg-primary file:text-primary-foreground file:border-0 file:rounded-md file:px-3 file:py-1 file:mr-3 file:cursor-pointer cursor-pointer"
            disabled={isLoading || !pdfReady}
          />
        </div>

        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
            <span className="ml-3 text-muted-foreground">Analisi in corso...</span>
          </div>
        )}

        {error && (
          <div className="p-4 bg-destructive/20 border border-destructive/30 rounded-lg">
            <p className="text-destructive">{error}</p>
          </div>
        )}

        {result && (
          <div className="mt-6 space-y-6 border-t border-border/30 pt-5">
            {/* Extracted Values */}
            <div className="space-y-3">
              <h3 className="font-semibold text-foreground text-lg">Valori estratti dal PDF</h3>
              <div className="grid grid-cols-2 gap-3 text-foreground">
                <div className="p-3 bg-secondary/30 rounded-lg">
                  <span className="text-sm text-muted-foreground">Lordo</span>
                  <p className="font-semibold">{formatCurrency(result.extracted.lordo)}</p>
                </div>
                <div className="p-3 bg-secondary/30 rounded-lg">
                  <span className="text-sm text-muted-foreground">IRPEF</span>
                  <p className="font-semibold">{formatCurrency(result.extracted.irpef)}</p>
                </div>
                <div className="p-3 bg-secondary/30 rounded-lg">
                  <span className="text-sm text-muted-foreground">ENPAM</span>
                  <p className="font-semibold">{formatCurrency(result.extracted.enpam)}</p>
                </div>
                <div className="p-3 bg-secondary/30 rounded-lg">
                  <span className="text-sm text-muted-foreground">Altre trattenute</span>
                  <p className="font-semibold">{formatCurrency(result.extracted.altreTrattenute)}</p>
                </div>
                <div className="p-3 bg-secondary/30 rounded-lg">
                  <span className="text-sm text-muted-foreground">Fondo assicurativo</span>
                  <p className="font-semibold">{formatCurrency(result.extracted.fondoAssicurativo)}</p>
                </div>
                <div className="p-3 bg-secondary/30 rounded-lg">
                  <span className="text-sm text-muted-foreground">Netto da cedolino</span>
                  <p className="font-semibold">{formatCurrency(result.extracted.nettoReale)}</p>
                </div>
              </div>
            </div>

            {/* Verification */}
            <div className="space-y-3">
              <h3 className="font-semibold text-foreground text-lg">Verifica calcoli</h3>
              <div className="p-4 bg-secondary/30 rounded-lg space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Totale trattenute calcolato:</span>
                  <span className="font-semibold text-foreground">
                    {formatCurrency(result.calculated.totaleTrattenute)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Netto calcolato (Lordo - Trattenute):</span>
                  <span className="font-semibold text-foreground">
                    {formatCurrency(result.calculated.nettoCalcolato)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Netto da cedolino:</span>
                  <span className="font-semibold text-foreground">
                    {formatCurrency(result.extracted.nettoReale)}
                  </span>
                </div>
                {result.differences.netto !== null && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Differenza:</span>
                    <span className={`font-semibold ${result.differences.isCorrect ? "text-green-400" : "text-amber-400"}`}>
                      {formatCurrency(result.differences.netto)}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Result */}
            <div className={`p-4 rounded-lg border ${
              result.differences.isCorrect 
                ? "bg-green-500/20 border-green-500/30" 
                : "bg-amber-500/20 border-amber-500/30"
            }`}>
              {result.differences.isCorrect ? (
                <div className="flex items-center gap-2">
                  <svg className="h-6 w-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-green-400 font-semibold text-lg">Calcoli corretti!</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <svg className="h-6 w-6 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <span className="text-amber-400 font-semibold text-lg">
                    {result.extracted.nettoReale === null 
                      ? "Impossibile estrarre tutti i valori dal PDF" 
                      : "Discrepanza rilevata nei calcoli"}
                  </span>
                </div>
              )}
              <p className="text-sm text-muted-foreground mt-2">
                {result.differences.isCorrect 
                  ? "I calcoli del cedolino corrispondono alle trattenute indicate."
                  : result.extracted.nettoReale === null
                    ? "Alcuni valori non sono stati trovati. Potrebbe essere necessario inserirli manualmente."
                    : "La differenza potrebbe essere dovuta ad arrotondamenti o voci non estratte correttamente."}
              </p>
            </div>

            {/* Raw text debug (collapsible) */}
            <details className="text-sm">
              <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                Mostra testo estratto dal PDF (debug)
              </summary>
              <pre className="mt-2 p-3 bg-secondary/30 rounded-lg text-xs text-muted-foreground overflow-auto max-h-48 whitespace-pre-wrap">
                {result.rawText}
              </pre>
            </details>

            <Button
              onClick={handleReset}
              variant="outline"
              className="w-full border-border/30"
            >
              Carica un altro cedolino
            </Button>
          </div>
        )}
      </CardContent>

      <CardFooter className="pt-4">
        <p className="ml-auto text-xs text-muted-foreground">
          Designed by Manuel Nuzzolese
        </p>
      </CardFooter>
    </Card>
  )
}
