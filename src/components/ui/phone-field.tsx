"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"

/**
 * Países ofrecidos en el selector, con su indicativo.
 *
 * Lista curada a mano, no una librería. `libphonenumber-js` valida de verdad
 * (longitudes por país, prefijos de móvil) pero son ~145 KB al bundle del
 * navegador para un gimnasio donde el 99% de los socios son colombianos. Si
 * algún día se venden rutinas al extranjero en volumen, esa es la sustitución.
 *
 * Orden: Colombia primero por ser el caso real, luego el resto por cercanía.
 */
// `nat` = longitudes válidas del número NACIONAL (sin indicativo).
//
// ⚠️ Esto no es cosmético: en la base ya había un socio con 11 dígitos
// colombianos ("31355587918"). El campo anterior solo exigía "entre 10 y 15 en
// total", así que lo dio por bueno — y su enlace de WhatsApp apunta a un número
// que no existe. Nadie se entera hasta que el mensaje no llega.
//
// Donde no hay certeza se deja un rango amplio: prefiero aceptar de más a
// rechazar un número legítimo de un socio extranjero.
export const COUNTRIES = [
  { code: "CO", dial: "57", flag: "🇨🇴", name: "Colombia", nat: [10] },
  { code: "VE", dial: "58", flag: "🇻🇪", name: "Venezuela", nat: [10] },
  { code: "EC", dial: "593", flag: "🇪🇨", name: "Ecuador", nat: [9] },
  { code: "PE", dial: "51", flag: "🇵🇪", name: "Perú", nat: [9] },
  { code: "PA", dial: "507", flag: "🇵🇦", name: "Panamá", nat: [7,8] },
  { code: "MX", dial: "52", flag: "🇲🇽", name: "México", nat: [10] },
  { code: "CL", dial: "56", flag: "🇨🇱", name: "Chile", nat: [9] },
  { code: "AR", dial: "54", flag: "🇦🇷", name: "Argentina", nat: [10,11] },
  { code: "BR", dial: "55", flag: "🇧🇷", name: "Brasil", nat: [10,11] },
  { code: "BO", dial: "591", flag: "🇧🇴", name: "Bolivia", nat: [8] },
  { code: "UY", dial: "598", flag: "🇺🇾", name: "Uruguay", nat: [8,9] },
  { code: "PY", dial: "595", flag: "🇵🇾", name: "Paraguay", nat: [9] },
  { code: "CR", dial: "506", flag: "🇨🇷", name: "Costa Rica", nat: [8] },
  { code: "GT", dial: "502", flag: "🇬🇹", name: "Guatemala", nat: [8] },
  { code: "HN", dial: "504", flag: "🇭🇳", name: "Honduras", nat: [8] },
  { code: "SV", dial: "503", flag: "🇸🇻", name: "El Salvador", nat: [8] },
  { code: "NI", dial: "505", flag: "🇳🇮", name: "Nicaragua", nat: [8] },
  // Todo el plan de numeración norteamericano comparte el +1: EE.UU., Canadá,
  // Rep. Dominicana y Puerto Rico. Van en una sola entrada a propósito —
  // separarlas obligaría a listar los prefijos de cada una (809, 829 y 849 solo
  // para Dominicana) y un número con el prefijo equivocado saldría mal.
  { code: "US", dial: "1", flag: "🇺🇸", name: "EE.UU. / Canadá / Caribe", nat: [10] },
  { code: "ES", dial: "34", flag: "🇪🇸", name: "España", nat: [9] },
  { code: "PT", dial: "351", flag: "🇵🇹", name: "Portugal", nat: [9] },
  { code: "IT", dial: "39", flag: "🇮🇹", name: "Italia", nat: [9,10] },
  { code: "FR", dial: "33", flag: "🇫🇷", name: "Francia", nat: [9] },
  { code: "DE", dial: "49", flag: "🇩🇪", name: "Alemania", nat: [10,11] },
  { code: "GB", dial: "44", flag: "🇬🇧", name: "Reino Unido", nat: [10] },
  { code: "AU", dial: "61", flag: "🇦🇺", name: "Australia", nat: [9] },
] as const

const DEFAULT_DIAL = "57"

/** Indicativos de más largo a más corto: "1809" debe ganarle a "1". */
const DIALS_BY_LENGTH = [...COUNTRIES].sort((a, b) => b.dial.length - a.dial.length)

/**
 * Forma canónica del teléfono, IDÉNTICA a la del servidor.
 *
 * ⚠️ Debe coincidir con `adminCreateClientSchema` (src/schemas/client.schema.ts)
 * y con `handle_new_user` (migración 028). Los tres guardan el mismo número de
 * la misma forma; si divergen, el mismo socio dado de alta por el admin y
 * registrado por sí mismo serían dos socios distintos y la detección de
 * duplicados no vería nada.
 *
 * Colombia se guarda SIN el 57 (10 dígitos). Por eso el campo puede mandar
 * siempre `indicativo + nacional` sin caso especial: para Colombia salen 12
 * dígitos que empiezan por 57 y esta función los recorta sola.
 */
export function canonicalPhone(dial: string, national: string): string {
  const digits = `${dial}${national}`.replace(/\D/g, "")
  return digits.length === 12 && digits.startsWith("57") ? digits.slice(2) : digits
}

export function usePhoneField(initialDial: string = DEFAULT_DIAL) {
  const [dial, setDial] = useState(initialDial)
  const [national, setNational] = useState("")

  /** Lo que se manda al servidor. */
  const value = canonicalPhone(dial, national)

  // Doble comprobación, y las dos hacen falta:
  //
  //  - `nat`  es la del país elegido. Es la que caza los números mal tecleados
  //    que antes pasaban: 11 dígitos "colombianos", 9 en vez de 10...
  //  - 10..15 es la del SERVIDOR (adminCreateClientSchema). Si el campo diera
  //    por bueno algo que el servidor rechaza, el admin llenaría el formulario
  //    entero para que le saltara un error al final.
  const pais = COUNTRIES.find((c) => c.dial === dial)
  const largoNacionalOk = pais
    ? (pais.nat as readonly number[]).includes(national.length)
    : national.length >= 6
  const isValid = largoNacionalOk && value.length >= 10 && value.length <= 15

  /** Para el mensaje de error: qué longitud esperaba el país elegido. */
  const largoEsperado = pais ? (pais.nat as readonly number[]).join(" o ") : "6 o más"

  /**
   * Acepta lo que sea que el admin teclee o pegue y lo reparte.
   *
   * Detección automática del país: SOLO funciona si el número trae el prefijo
   * internacional (`+57…` o `0057…`). Sin él es imposible — un número suelto de
   * 10 dígitos es un móvil colombiano válido, pero también encaja en México,
   * Argentina o EE.UU., y nada en los dígitos dice cuál es. Por eso el selector
   * existe y por eso viene con Colombia puesta.
   */
  const handleInput = (raw: string) => {
    const conMas = raw.trimStart().startsWith("+")
    let digits = raw.replace(/\D/g, "")

    // "0057…" es la otra forma de escribir "+57…".
    let internacional = conMas
    if (!internacional && digits.startsWith("00")) {
      digits = digits.slice(2)
      internacional = true
    }

    if (internacional) {
      const match = DIALS_BY_LENGTH.find((c) => digits.startsWith(c.dial))
      if (match) {
        setDial(match.dial)
        setNational(digits.slice(match.dial.length).slice(0, 14))
        return
      }
    }

    setNational(digits.slice(0, 14))
  }

  return {
    dial,
    setDial,
    national,
    setNational,
    handleInput,
    value,
    isValid,
    largoEsperado,
    reset: () => {
      setDial(initialDial)
      setNational("")
    },
  }
}

interface PhoneFieldProps {
  id?: string
  label?: string
  dial: string
  onDialChange: (dial: string) => void
  national: string
  onInput: (raw: string) => void
  error?: string
  hint?: string
  autoFocus?: boolean
}

export function PhoneField({
  id = "phone",
  label = "WhatsApp",
  dial,
  onDialChange,
  national,
  onInput,
  error,
  hint,
  autoFocus,
}: PhoneFieldProps) {
  const selected = COUNTRIES.find((c) => c.dial === dial) ?? COUNTRIES[0]

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={id} className="text-sm font-medium text-zinc-300">
          {label}
        </label>
      )}

      <div
        className={cn(
          "flex items-stretch overflow-hidden rounded-lg border border-white/10 bg-white/5 transition",
          "focus-within:border-red-600 focus-within:ring-2 focus-within:ring-red-600/20",
          error && "border-red-500 focus-within:border-red-500 focus-within:ring-red-500/20"
        )}
      >
        {/* El <select> nativo es deliberado: en móvil abre la ruleta del sistema,
            que se busca por teclado y se maneja con el pulgar mejor que
            cualquier desplegable propio. */}
        <div className="relative flex shrink-0 items-center gap-1 border-r border-white/10 bg-white/[0.03] pl-3 pr-2 text-sm text-zinc-200">
          <span aria-hidden>{selected.flag}</span>
          <span className="tabular-nums">+{selected.dial}</span>
          <svg className="size-3 text-zinc-500" viewBox="0 0 12 12" fill="none" aria-hidden>
            <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <select
            aria-label="País"
            value={dial}
            onChange={(e) => onDialChange(e.target.value)}
            className="absolute inset-0 cursor-pointer opacity-0"
          >
            {COUNTRIES.map((c) => (
              <option key={c.code} value={c.dial} className="bg-zinc-900 text-zinc-100">
                {c.flag} {c.name} (+{c.dial})
              </option>
            ))}
          </select>
        </div>

        <input
          id={id}
          type="tel"
          // inputMode numeric + filtrado en onInput: las letras no llegan nunca
          // al estado, así que no hay nada que validar después.
          inputMode="numeric"
          autoComplete="tel-national"
          autoFocus={autoFocus}
          value={national}
          onChange={(e) => onInput(e.target.value)}
          onPaste={(e) => {
            // Se intercepta el pegado para poder leer el "+" antes de que el
            // navegador lo tire: es lo que permite detectar el país al pegar un
            // número copiado de WhatsApp.
            e.preventDefault()
            onInput(e.clipboardData.getData("text"))
          }}
          placeholder={dial === "57" ? "3001234567" : "Número sin el indicativo"}
          className="w-full min-w-0 bg-transparent px-3 py-2.5 text-sm text-zinc-100 outline-none placeholder:text-zinc-500"
        />
      </div>

      {error ? (
        <p className="text-xs text-red-400">{error}</p>
      ) : hint ? (
        <p className="text-[11px] text-zinc-500">{hint}</p>
      ) : null}
    </div>
  )
}
