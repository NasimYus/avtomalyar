import { QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from 'react-router-dom'
// Self-hosted Montserrat: 500 body, 600 secondary, 700/800/900 headings.
import '@fontsource/montserrat/cyrillic-500.css'
import '@fontsource/montserrat/cyrillic-600.css'
import '@fontsource/montserrat/cyrillic-700.css'
import '@fontsource/montserrat/cyrillic-800.css'
import '@fontsource/montserrat/cyrillic-900.css'
import '@fontsource/montserrat/latin-500.css'
import '@fontsource/montserrat/latin-600.css'
import '@fontsource/montserrat/latin-700.css'
import '@fontsource/montserrat/latin-800.css'
import '@fontsource/montserrat/latin-900.css'
import '@/shared/i18n'
import './styles/index.css'
import { ToastProvider } from '@/shared/ui'
import { createQueryClient } from './query-client'
import { router } from './router'

const queryClient = createQueryClient()

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <RouterProvider router={router} />
      </ToastProvider>
    </QueryClientProvider>
  )
}

export default App
