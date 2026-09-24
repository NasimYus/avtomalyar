import '@/shared/i18n'
import './styles/index.css'
import { useTranslation } from 'react-i18next'

function App() {
  const { t } = useTranslation()

  return (
    <div className="flex min-h-screen items-center justify-center bg-brand-white">
      <div className="rounded-card border border-neutral-200 p-10 text-center shadow-sm">
        <h1 className="text-2xl font-bold text-brand-red">{t('app.name')}</h1>
        <p className="mt-2 text-neutral-500">Admin panel scaffold — modules land here.</p>
      </div>
    </div>
  )
}

export default App
