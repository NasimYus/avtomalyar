import { createBrowserRouter, Navigate } from 'react-router-dom'
import { UiKitPage } from '@/pages/ui-kit'
import { AdminShell } from '@/widgets/admin-shell'
import { Card, CardTitle, PageHeader } from '@/shared/ui'

/** Stand-in for pages that land in the next modules. */
function ComingSoon({ title }: { title: string }) {
  return (
    <>
      <PageHeader title={title} />
      <Card>
        <CardTitle>Модуль в разработке</CardTitle>
        <p className="mt-2 text-[13px] text-muted">
          Экран появится на следующем шаге. Визуальный язык и компоненты — в разделе «UI-кит».
        </p>
      </Card>
    </>
  )
}

export const router = createBrowserRouter([
  { path: '/', element: <Navigate to="/admin" replace /> },
  {
    path: '/admin',
    element: <AdminShell />,
    children: [
      { index: true, element: <ComingSoon title="Дашборд" /> },
      { path: 'dealers', element: <ComingSoon title="Дилеры" /> },
      { path: 'purchases', element: <ComingSoon title="Покупки" /> },
      { path: 'cities', element: <ComingSoon title="Города" /> },
      { path: 'grades', element: <ComingSoon title="Уровни" /> },
      { path: 'prizes', element: <ComingSoon title="Призы" /> },
      { path: 'ui-kit', element: <UiKitPage /> },
    ],
  },
])
