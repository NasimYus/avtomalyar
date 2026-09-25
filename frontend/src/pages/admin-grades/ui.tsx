import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { gradeToneByIndex, useGrades, type Grade } from '@/entities/grade'
import { DeleteGradeDialog, GradeFormDrawer } from '@/features/manage-grade'
import { cn, formatMoneyWithUnit } from '@/shared/lib'
import { Button, Card, EmptyState, PageHeader, Skeleton } from '@/shared/ui'

const TONE_DOT: Record<string, string> = {
  bronze: 'bg-grade-bronze',
  silver: 'bg-grade-silver',
  gold: 'bg-grade-gold',
}

export function AdminGradesPage() {
  const { t } = useTranslation()
  const { data: grades = [], isPending } = useGrades()

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Grade | undefined>(undefined)
  const [deleting, setDeleting] = useState<Grade | undefined>(undefined)

  const openCreate = () => {
    setEditing(undefined)
    setFormOpen(true)
  }

  return (
    <>
      <PageHeader
        title={t('nav.grades')}
        count={grades.length > 0 ? grades.length : undefined}
        actions={
          <Button variant="dark" onClick={openCreate}>
            {t('grades.add')}
          </Button>
        }
      />

      {isPending && (
        <div className="grid gap-3.5">
          <Skeleton className="h-[76px] rounded-card" />
          <Skeleton className="h-[76px] rounded-card" />
        </div>
      )}

      {!isPending && grades.length === 0 && (
        <EmptyState
          title={t('grades.emptyTitle')}
          description={t('grades.emptyDescription')}
          action={
            <Button variant="dark" onClick={openCreate}>
              {t('grades.add')}
            </Button>
          }
        />
      )}

      {!isPending && grades.length > 0 && (
        <div className="grid gap-3.5">
          {grades.map((grade, index) => (
            <Card
              key={grade.id}
              padded={false}
              className="grid grid-cols-[44px_1fr_auto_auto] items-center gap-3.5 px-[18px] py-4"
            >
              <span
                className={cn(
                  'size-11 rounded-full',
                  TONE_DOT[gradeToneByIndex(index, grades.length)],
                )}
              />
              <div className="min-w-0">
                <div className="text-[15px] font-extrabold">{grade.name_ru}</div>
                <div className="truncate text-xs text-muted">{grade.name_tg}</div>
              </div>
              <div className="rounded-chip bg-field px-3 py-2.5 text-sm font-bold whitespace-nowrap">
                {t('grades.from', { amount: formatMoneyWithUnit(grade.min_purchase_amount) })}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  className="bg-field"
                  onClick={() => {
                    setEditing(grade)
                    setFormOpen(true)
                  }}
                >
                  {t('common.edit')}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setDeleting(grade)
                  }}
                >
                  {t('common.delete')}
                </Button>
              </div>
            </Card>
          ))}

          <p className="px-1 text-xs leading-[1.5] text-muted">{t('grades.autoNote')}</p>
        </div>
      )}

      <GradeFormDrawer
        open={formOpen}
        grade={editing}
        onClose={() => {
          setFormOpen(false)
        }}
      />
      <DeleteGradeDialog
        grade={deleting}
        onClose={() => {
          setDeleting(undefined)
        }}
      />
    </>
  )
}
