"use client"

import { Menu } from "@base-ui/react/menu"
import { MoreVertical } from "lucide-react"
import { cn } from "@/lib/utils"

export interface ActionMenuItem {
  label: string
  icon?: React.ReactNode
  onClick: () => void
  destructive?: boolean
  disabled?: boolean
}

export function ActionMenu({
  items,
  label = "Más acciones",
  triggerIcon = <MoreVertical className="size-4" />
}: {
  items: ActionMenuItem[]
  label?: string
  triggerIcon?: React.ReactNode
}) {
  return (
    <Menu.Root>
      <Menu.Trigger
        aria-label={label}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100 transition-colors"
      >
        {triggerIcon}
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner sideOffset={6} align="end" className="z-[110] outline-none">
          <Menu.Popup className="min-w-[220px] rounded-xl border border-white/10 bg-zinc-900 p-1 shadow-xl outline-none">
            {items.map((item, i) => (
              <Menu.Item
                key={i}
                disabled={item.disabled}
                onClick={item.onClick}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm cursor-pointer outline-none transition-colors",
                  "data-[highlighted]:bg-zinc-800",
                  item.destructive ? "text-red-400" : "text-zinc-200",
                  item.disabled && "opacity-40"
                )}
              >
                {item.icon}
                {item.label}
              </Menu.Item>
            ))}
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  )
}
