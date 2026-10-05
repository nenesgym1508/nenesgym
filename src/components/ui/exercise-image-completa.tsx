"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import { X } from "lucide-react"
import { exerciseImageUrl } from "@/lib/images"

/**
 * La foto de un ejercicio ENTERA, con su forma original, en los detalles del
 * ejercicio. Al tocarla se abre a pantalla completa.
 *
 * Antes el detalle la metía en una caja de alto fijo (224 px) con `object-cover`:
 * una imagen guardada «completa» —una rutina con varios pasos, un afiche
 * vertical— salía siempre recortada, sin el primer paso ni el último. La variante
 * `-detail` de R2 ya conserva la imagen entera (`scaleDown`, 1024 px de ancho);
 * el recorte era solo al mostrarla.
 *
 * Si la variante no existe (pasó con 26 ejercicios subidos sin `sharp`, Sesión 22), cae
 * al original en vez de quedar una foto rota.
 */
export function ExerciseImageCompleta({ src, alt }: { src: string; alt: string }) {
  const variante = exerciseImageUrl(src, "detail") ?? src
  const [actual, setActual] = useState(variante)
  const [visto, setVisto] = useState(variante)
  if (visto !== variante) {
    setVisto(variante)
    setActual(variante)
  }
  const [pantallaCompleta, setPantallaCompleta] = useState(false)

  // En computador, Escape la cierra. En el teléfono se cierra tocándola o con la X.
  useEffect(() => {
    if (!pantallaCompleta) return
    const cerrar = (e: KeyboardEvent) => e.key === "Escape" && setPantallaCompleta(false)
    window.addEventListener("keydown", cerrar)
    return () => window.removeEventListener("keydown", cerrar)
  }, [pantallaCompleta])

  const onError = () => {
    if (actual !== src) setActual(src)
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setPantallaCompleta(true)}
        aria-label="Ver la imagen en pantalla completa"
        className="block w-full bg-zinc-800"
      >
        <Image
          src={actual}
          alt={alt}
          // Ancho y alto solo dan una proporción inicial: con `h-auto` el navegador
          // usa la de la foto real en cuanto carga, así que se ve tal cual se guardó.
          width={1024}
          height={1024}
          sizes="(max-width: 768px) 100vw, 512px"
          unoptimized
          onError={onError}
          // Tope de alto para que una foto muy vertical no empuje el resto del
          // detalle fuera de la pantalla; se ve entera, más pequeña.
          className="mx-auto h-auto max-h-[70vh] w-full object-contain"
        />
      </button>

      {pantallaCompleta && (
        <div
          role="dialog"
          aria-label={alt || "Imagen del ejercicio"}
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black"
          onClick={() => setPantallaCompleta(false)}
        >
          <Image
            src={actual}
            alt={alt}
            fill
            sizes="100vw"
            unoptimized
            onError={onError}
            className="object-contain"
          />
          <button
            type="button"
            onClick={() => setPantallaCompleta(false)}
            aria-label="Cerrar"
            className="absolute right-3 top-3 flex size-10 items-center justify-center rounded-full bg-black/70 text-white"
          >
            <X className="size-5" />
          </button>
        </div>
      )}
    </>
  )
}
