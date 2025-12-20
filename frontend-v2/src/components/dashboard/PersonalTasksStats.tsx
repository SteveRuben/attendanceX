import { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { useMyTasks } from '@/hooks/useResolutions'
import { ResolutionStatus } from '@/types/resolution.types'

interface PersonalTasksStatsProps {
  className?: string
}

export function PersonalTasksStats({ className }: PersonalTasksStatsProps) {
  const { resolutions: tasks, loading } = useMyTasks()
  
  const activeTasks = tasks?.filter(task => 
    task.status === ResolutionStatus.PENDING || task.status === ResolutionStatus.IN_PROGRESS
  ).length || 0

  const overdueTasks = tasks?.filter(task => {
    if (!task.dueDate || task.status === ResolutionStatus.COMPLETED) return false
    return new Date(task.dueDate) < new Date()
  }).length || 0

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="p-4 text-center">
          <div className="text-2xl font-bold">—</div>
          <div className="text-sm text-muted-foreground">Mes tâches</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardContent className="p-4 text-center">
        <div className="text-2xl font-bold">
          {activeTasks}
          {overdueTasks > 0 && (
            <span className="text-sm text-red-500 ml-1">
              ({overdueTasks} en retard)
            </span>
          )}
        </div>
        <div className="text-sm text-muted-foreground">Mes tâches</div>
      </CardContent>
    </Card>
  )
}