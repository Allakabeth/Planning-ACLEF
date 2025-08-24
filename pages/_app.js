import '@/styles/globals.css'
import { AuthProvider } from '@/lib/AuthContext'
import { FormateurAuthProvider } from '@/contexts/FormateurAuthContext'

export default function App({ Component, pageProps }) {
  return (
    <AuthProvider>
      <FormateurAuthProvider>
        <Component {...pageProps} />
      </FormateurAuthProvider>
    </AuthProvider>
  )
}