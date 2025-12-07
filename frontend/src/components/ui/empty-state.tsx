import { ReactNode } from 'react'
import { Button } from './button'

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode
  title: string
  description?: string
  action?: { label: string; onClick: () => void }
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center gap-2 py-12">
      {icon ? <div className="text-neutral-400">{icon}</div> : null}
      <div className="text-sm font-medium">{title}</div>
      {description ? <div className="text-xs text-neutral-500 max-w-md">{description}</div> : null}
      {action ? <Button className="mt-2" onClick={action.onClick}>{action.label}</Button> : null}
    </div>
  )
}

