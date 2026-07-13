"use client"

import { Menu } from "@base-ui/react/menu"
import { ContextMenu } from "@base-ui/react/context-menu"
import { MoreVertical } from "lucide-react"
import { cn } from "@/lib/utils"

export interface ActionMenuItem {
  label: string
  icon?: React.ReactNode
  onClick: () => void
  destructive?: boolean
  disabled?: boolean
}

function itemClassName(item: ActionMenuItem) {
  return cn(
    "flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm cursor-pointer outline-none transition-colors",
    "data-[highlighted]:bg-zinc-800",
    item.destructive ? "text-red-400" : "text-zinc-200",
    item.disabled && "opacity-40"
  )
}

export function ActionMenu({
  items,
  label = "Más acciones",
  triggerIcon = <MoreVertical className="size-4" />,
  children
}: {
  items: ActionMenuItem[]
  label?: string
  triggerIcon?: React.ReactNode
  /** Si se pasa, envuelve el contenido y permite abrir el mismo menú manteniendo pulsado (o clic derecho). */
  children?: React.ReactNode
}) {
  const menu = (
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
              <Menu.Item key={i} disabled={item.disabled} onClick={item.onClick} className={itemClassName(item)}>
                {item.icon}
                {item.label}
              </Menu.Item>
            ))}
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  )

  if (!children) return menu

  return (
    <ContextMenu.Root>
      <ContextMenu.Trigger className="contents">
        {children}
      </ContextMenu.Trigger>
      {menu}
      <ContextMenu.Portal>
        <ContextMenu.Positioner sideOffset={6} align="start" className="z-[110] outline-none">
          <ContextMenu.Popup className="min-w-[220px] rounded-xl border border-white/10 bg-zinc-900 p-1 shadow-xl outline-none">
            {items.map((item, i) => (
              <ContextMenu.Item key={i} disabled={item.disabled} onClick={item.onClick} className={itemClassName(item)}>
                {item.icon}
                {item.label}
              </ContextMenu.Item>
            ))}
          </ContextMenu.Popup>
        </ContextMenu.Positioner>
      </ContextMenu.Portal>
    </ContextMenu.Root>
  )
}
