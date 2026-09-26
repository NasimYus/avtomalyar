import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useGrades, type Grade } from '@/entities/grade'
import { DeleteGradeDialog, GradeFormDrawer } from '@/features/manage-grade'
import { isTierColor, tierAt, useMoneyWithUnit } from '@/shared/lib'
import {
  Button,
  Card,
  CardTitle,
  EmptyState,
  PageHeader,
  Skeleton,
  TierBadge,
  TierMedal,
} from '@/shared/ui'

export function AdminGradesPage() {
  const { t } = useTranslation()
  const money = useMoneyWithUnit()
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
          {/* The whole ladder as the cabinet paints it, so the admin sees
              the effect of a colour change without logging in as a dealer. */}
          <Card>
            <CardTitle>{t('grades.previewTitle')}</CardTitle>
            <div className="mt-3.5 flex flex-wrap items-center gap-x-2 gap-y-3">
              {grades.map((grade, index) => (
                <TierBadge key={grade.id} tier={tierAt(index, grades.length, grade.color)}>
                  {grade.name_ru}
                </TierBadge>
              ))}
            </div>
          </Card>

          {grades.map((grade, index) => {
            const tier = tierAt(index, grades.length, grade.color)
            return (
              <Card
                key={grade.id}
                padded={false}
                className="grid grid-cols-[44px_1fr_auto_auto] items-center gap-3.5 px-[18px] py-4"
              >
                <TierMedal tier={tier} size="md" label={grade.name_ru} className="size-11" />
                <div className="min-w-0">
                  <div className="text-[15px] font-extrabold">{grade.name_ru}</div>
                  <div className="truncate text-xs text-muted">
                    {grade.name_tg} · {t('grades.level', { level: tier.level })} ·{' '}
                    {t(`grades.colors.${tier.color}`)}
                    {!isTierColor(grade.color) && ` (${t('grades.autoColor')})`}
                  </div>
                </div>
                <div className="rounded-chip bg-field px-3 py-2.5 text-sm font-bold whitespace-nowrap">
                  {t('grades.from', { amount: money(grade.min_purchase_amount) })}
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
            )
          })}

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
