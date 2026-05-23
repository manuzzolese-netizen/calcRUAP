"use client"

import { useState, useCallback } from "react"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"

interface FormData {
  assistiti: number
  over75: number
  under14: number
  oreAttivita: number
  ms2: boolean
  ms3: boolean
  primaMedicazione: number
  sutura: number
  succMedicazioni: number
  rimozionePunti: number
  catUomo: number
  catDonna: number
  tamponamento: number
  fleboclisi: number
  lavanda: number
  antitetanica: number
  desensibilizzante: number
  tampone: number
  cicloFleboclisi: number
  ev: number
  aerosol: number
  vaccini: number
}

const initialFormData: FormData = {
  assistiti: 1200,
  over75: 0,
  under14: 0,
  oreAttivita: 12,
  ms2: false,
  ms3: false,
  primaMedicazione: 0,
  sutura: 0,
  succMedicazioni: 0,
  rimozionePunti: 0,
  catUomo: 0,
  catDonna: 0,
  tamponamento: 0,
  fleboclisi: 0,
  lavanda: 0,
  antitetanica: 0,
  desensibilizzante: 0,
  tampone: 0,
  cicloFleboclisi: 0,
  ev: 0,
  aerosol: 0,
  vaccini: 0,
}

function formatCurrency(value: number): string {
  return value.toLocaleString("it-IT", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

export function CompensoCalculator() {
  const [formData, setFormData] = useState<FormData>(initialFormData)

  const updateField = useCallback(
    (field: keyof FormData, value: number | boolean) => {
      setFormData((prev) => ({ ...prev, [field]: value }))
    },
    []
  )

  const calculate = useCallback(() => {
    const a = formData.assistiti
    const over75 = formData.over75
    const under14 = formData.under14
    const h = formData.oreAttivita

    const compensoForfettario = (45.2 * a) / 12
    const ponderazione = (3.08 * a) / 12
    const quotaVariabile = (6.64 * a) / 12
    const accordo2010 = (0.5758 * a) / 12
    const quotaIngresso = (13.46 * Math.min(a, 500)) / 12
    const quotaOver75 = (31.09 * over75) / 12
    const quotaUnder14 = (18.95 * under14) / 12
    const attivitaOraria = 25.1 * h
    const quotaAggOraria = 0.18 * h

    const innovazione = 225
    const collaboratore = 693

    const prestazioni =
      12.32 * formData.primaMedicazione +
      3.32 * formData.sutura +
      6.16 * formData.succMedicazioni +
      12.32 * formData.rimozionePunti +
      9.66 * formData.catUomo +
      3.59 * formData.catDonna +
      5.62 * formData.tamponamento +
      12.32 * formData.fleboclisi +
      12.32 * formData.lavanda +
      6.16 * formData.antitetanica +
      9.21 * formData.desensibilizzante +
      0.64 * formData.tampone +
      9.21 * formData.cicloFleboclisi +
      6.16 * formData.ev +
      1.23 * formData.aerosol +
      6.16 * formData.vaccini

    const aft = (10.8 * a) / 12

    const ms2Val = formData.ms2 ? (5.41 * a) / 12 : 0
    const ms3Val = formData.ms3 ? (9.62 * a) / 12 : 0

    const lordo =
      compensoForfettario +
      ponderazione +
      quotaVariabile +
      accordo2010 +
      quotaIngresso +
      ms2Val +
      ms3Val +
      quotaOver75 +
      quotaUnder14 +
      attivitaOraria +
      quotaAggOraria +
      innovazione +
      collaboratore +
      prestazioni +
      aft

    const enpam = lordo * 0.156
    const irpef = lordo * 0.2
    const altre = lordo * 0.005

    const totale = enpam + irpef + altre
    const netto = lordo - totale

    return {
      compensoForfettario,
      ponderazione,
      quotaIngresso,
      quotaVariabile,
      accordo2010,
      quotaOver75,
      quotaUnder14,
      aft,
      ms2: ms2Val,
      ms3: ms3Val,
      attivitaOraria,
      innovazione,
      collaboratore,
      prestazioni,
      lordo,
      enpam,
      irpef,
      altre,
      netto,
    }
  }, [formData])

  const result = calculate()

  return (
    <Card className="w-[92%] max-w-[900px] border-border/30 bg-card backdrop-blur-xl shadow-2xl">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-3">
          <svg viewBox="0 0 64 64" className="h-9 w-9">
            <rect
              x="12"
              y="8"
              width="40"
              height="48"
              rx="4"
              stroke="currentColor"
              strokeWidth="3"
              fill="none"
              className="text-accent"
            />
            <line
              x1="20"
              y1="20"
              x2="44"
              y2="20"
              stroke="currentColor"
              strokeWidth="2"
              className="text-accent"
            />
            <line
              x1="20"
              y1="28"
              x2="44"
              y2="28"
              stroke="currentColor"
              strokeWidth="2"
              className="text-accent"
            />
            <line
              x1="20"
              y1="36"
              x2="36"
              y2="36"
              stroke="currentColor"
              strokeWidth="2"
              className="text-accent"
            />
          </svg>
          <h2 className="text-xl font-semibold text-foreground">
            Calcolatore Compenso MMG Art.47
          </h2>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Dati base */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label className="text-muted-foreground">Numero assistiti</Label>
            <Input
              type="number"
              value={formData.assistiti}
              onChange={(e) =>
                updateField("assistiti", Number(e.target.value) || 0)
              }
              className="bg-input border-border/30"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-muted-foreground">
              Ore attivita oraria mensili
            </Label>
            <Input
              type="number"
              value={formData.oreAttivita}
              onChange={(e) =>
                updateField("oreAttivita", Number(e.target.value) || 0)
              }
              className="bg-input border-border/30"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-muted-foreground">Assistiti over 75</Label>
            <Input
              type="number"
              value={formData.over75}
              onChange={(e) =>
                updateField("over75", Number(e.target.value) || 0)
              }
              className="bg-input border-border/30"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-muted-foreground">Assistiti under 14</Label>
            <Input
              type="number"
              value={formData.under14}
              onChange={(e) =>
                updateField("under14", Number(e.target.value) || 0)
              }
              className="bg-input border-border/30"
            />
          </div>
        </div>

        {/* Compensi aggiuntivi */}
        <div className="space-y-3">
          <h3 className="font-medium text-foreground">Compensi aggiuntivi</h3>
          <div className="flex flex-wrap gap-6">
            <div className="flex items-center gap-2">
              <Checkbox
                id="ms2"
                checked={formData.ms2}
                onCheckedChange={(checked) =>
                  updateField("ms2", checked === true)
                }
              />
              <Label htmlFor="ms2" className="text-sm text-muted-foreground">
                MS2 (5,41/assistito/anno)
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="ms3"
                checked={formData.ms3}
                onCheckedChange={(checked) =>
                  updateField("ms3", checked === true)
                }
              />
              <Label htmlFor="ms3" className="text-sm text-muted-foreground">
                MS3 (9,62/assistito/anno)
              </Label>
            </div>
          </div>
        </div>

        {/* Prestazioni aggiuntive */}
        <div className="space-y-3">
          <h3 className="font-medium text-foreground">Prestazioni aggiuntive</h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                key: "primaMedicazione",
                label: "Prima medicazione",
                price: "12,32",
              },
              {
                key: "sutura",
                label: "Sutura ferita superficiale",
                price: "3,32",
              },
              {
                key: "succMedicazioni",
                label: "Successive medicazioni",
                price: "6,16",
              },
              {
                key: "rimozionePunti",
                label: "Rimozione punti",
                price: "12,32",
              },
              { key: "catUomo", label: "Cateterismo uomo", price: "9,66" },
              { key: "catDonna", label: "Cateterismo donna", price: "3,59" },
              {
                key: "tamponamento",
                label: "Tamponamento nasale",
                price: "5,62",
              },
              { key: "fleboclisi", label: "Fleboclisi urgenza", price: "12,32" },
              { key: "lavanda", label: "Lavanda gastrica", price: "12,32" },
              {
                key: "antitetanica",
                label: "Vaccinazione antitetanica",
                price: "6,16",
              },
              {
                key: "desensibilizzante",
                label: "Iniezione desensibilizzante",
                price: "9,21",
              },
              { key: "tampone", label: "Tampone faringeo", price: "0,64" },
              {
                key: "cicloFleboclisi",
                label: "Ciclo fleboclisi",
                price: "9,21",
              },
              { key: "ev", label: "Iniezioni EV", price: "6,16" },
              { key: "aerosol", label: "Aerosol/inalazioni", price: "1,23" },
              { key: "vaccini", label: "Vaccinazioni", price: "6,16" },
            ].map((item) => (
              <div key={item.key} className="space-y-1">
                <Label className="text-xs text-muted-foreground">
                  {item.label} ({item.price})
                </Label>
                <Input
                  type="number"
                  value={formData[item.key as keyof FormData] as number}
                  onChange={(e) =>
                    updateField(
                      item.key as keyof FormData,
                      Number(e.target.value) || 0
                    )
                  }
                  className="bg-input border-border/30 h-9"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Risultati */}
        <div className="border-t border-border/30 pt-5 space-y-4">
          <h3 className="font-medium text-foreground">Dettaglio compensi</h3>
          <div className="grid gap-2 sm:grid-cols-2 text-sm text-foreground">
            <p>
              Compenso forfettario (M77):{" "}
              <span className="font-medium">
                {formatCurrency(result.compensoForfettario)}
              </span>
            </p>
            <p>
              Quota ponderazione (M79):{" "}
              <span className="font-medium">
                {formatCurrency(result.ponderazione)}
              </span>
            </p>
            <p>
              Quota ingresso (M80):{" "}
              <span className="font-medium">
                {formatCurrency(result.quotaIngresso)}
              </span>
            </p>
            <p>
              Quota variabile regionale (M81):{" "}
              <span className="font-medium">
                {formatCurrency(result.quotaVariabile)}
              </span>
            </p>
            <p>
              Accordo ACN 2010:{" "}
              <span className="font-medium">
                {formatCurrency(result.accordo2010)}
              </span>
            </p>
            <p>
              Quota over 75:{" "}
              <span className="font-medium">
                {formatCurrency(result.quotaOver75)}
              </span>
            </p>
            <p>
              Quota under 14:{" "}
              <span className="font-medium">
                {formatCurrency(result.quotaUnder14)}
              </span>
            </p>
            <p>
              AFT:{" "}
              <span className="font-medium">{formatCurrency(result.aft)}</span>
            </p>
            <p>
              MS2:{" "}
              <span className="font-medium">{formatCurrency(result.ms2)}</span>
            </p>
            <p>
              MS3:{" "}
              <span className="font-medium">{formatCurrency(result.ms3)}</span>
            </p>
            <p>
              Attivita oraria:{" "}
              <span className="font-medium">
                {formatCurrency(result.attivitaOraria)}
              </span>
            </p>
            <p>
              Innovazione:{" "}
              <span className="font-medium">
                {formatCurrency(result.innovazione)}
              </span>
            </p>
            <p>
              Collaboratore:{" "}
              <span className="font-medium">
                {formatCurrency(result.collaboratore)}
              </span>
            </p>
            <p>
              Prestazioni:{" "}
              <span className="font-medium">
                {formatCurrency(result.prestazioni)}
              </span>
            </p>
          </div>

          <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg bg-secondary/50 p-3">
              <p className="text-xs text-muted-foreground">Lordo</p>
              <p className="text-lg font-bold text-foreground">
                {formatCurrency(result.lordo)}
              </p>
            </div>
            <div className="rounded-lg bg-secondary/50 p-3">
              <p className="text-xs text-muted-foreground">ENPAM</p>
              <p className="text-lg font-bold text-foreground">
                {formatCurrency(result.enpam)}
              </p>
            </div>
            <div className="rounded-lg bg-secondary/50 p-3">
              <p className="text-xs text-muted-foreground">IRPEF</p>
              <p className="text-lg font-bold text-foreground">
                {formatCurrency(result.irpef)}
              </p>
            </div>
            <div className="rounded-lg bg-accent/20 p-3">
              <p className="text-xs text-muted-foreground">Netto stimato</p>
              <p className="text-lg font-bold text-accent">
                {formatCurrency(result.netto)}
              </p>
            </div>
          </div>
        </div>
      </CardContent>

      <CardFooter className="pt-4">
        <p className="ml-auto text-xs text-muted-foreground">
          Designed by Manuel Nuzzolese
        </p>
      </CardFooter>
    </Card>
  )
}
