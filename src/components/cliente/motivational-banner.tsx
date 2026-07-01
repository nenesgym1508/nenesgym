import Image from "next/image"

export function MotivationalBanner() {
  return (
    <div className="relative overflow-hidden rounded-2xl">
      <Image
        src="/gym-banner.webp"
        alt="La constancia construye resultados."
        width={800}
        height={400}
        className="w-full object-cover"
        priority={false}
      />
    </div>
  )
}
