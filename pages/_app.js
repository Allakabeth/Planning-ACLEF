import '@/styles/globals.css'
import { FormateurAuthProvider } from '@/contexts/FormateurAuthContext'

export default function App({ Component, pageProps }) {
  return (
    <FormateurAuthProvider>
      <Component {...pageProps} />
    </FormateurAuthProvider>
  )
}
