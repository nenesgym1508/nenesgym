import Image from "next/image"

// Fondo full-bleed para bienvenida / login / registro.
// Foto de gimnasio + velo oscuro para mantener legibles logo, texto y botones.
export function AuthBackground() {
  return (
    <div className="absolute inset-0">
      <Image
        src="/hero.jpg"
        alt=""
        fill
        priority
        sizes="100vw"
        className="object-cover object-center"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/65 via-black/75 to-zinc-950" />
    </div>
  )
}
