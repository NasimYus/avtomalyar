import { createBrowserRouter } from 'react-router-dom'
import { AdminCitiesPage } from '@/pages/admin-cities'
import { AdminDashboardPage } from '@/pages/admin-dashboard'
import { AdminDealersPage } from '@/pages/admin-dealers'
import { AdminGradesPage } from '@/pages/admin-grades'
import { AdminPrizesPage } from '@/pages/admin-prizes'
import { AdminPromotionResultsPage } from '@/pages/admin-promotion-results'
import { AdminPromotionsPage } from '@/pages/admin-promotions'
import { AdminPurchasesPage } from '@/pages/admin-purchases'
import { DealerHomePage } from '@/pages/dealer-home'
import { LoginPage } from '@/pages/login'
import { UiKitPage } from '@/pages/ui-kit'
import { AdminShell } from '@/widgets/admin-shell'
import { RedirectIfAuthenticated, RequireRole, RoleHome } from './guards'

export const router = createBrowserRouter([
  { path: '/', element: <RoleHome /> },
  {
    path: '/login',
    element: (
      <RedirectIfAuthenticated>
        <LoginPage />
      </RedirectIfAuthenticated>
    ),
  },
  {
    element: <RequireRole role="admin" />,
    children: [
      {
        path: '/admin',
        element: <AdminShell />,
        children: [
          { index: true, element: <AdminDashboardPage /> },
          { path: 'dealers', element: <AdminDealersPage /> },
          { path: 'purchases', element: <AdminPurchasesPage /> },
          { path: 'promotions', element: <AdminPromotionsPage /> },
          { path: 'promotions/:id/results', element: <AdminPromotionResultsPage /> },
          { path: 'cities', element: <AdminCitiesPage /> },
          { path: 'grades', element: <AdminGradesPage /> },
          { path: 'prizes', element: <AdminPrizesPage /> },
          { path: 'ui-kit', element: <UiKitPage /> },
        ],
      },
    ],
  },
  {
    element: <RequireRole role="dealer" />,
    children: [{ path: '/me', element: <DealerHomePage /> }],
  },
])
