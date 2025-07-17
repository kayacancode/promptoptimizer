import type { AppProps } from 'next/app'
import { Inter } from 'next/font/google'
import '../app/globals.css'
import { SessionProvider } from '@/components/providers/SessionProvider'

const inter = Inter({ subsets: ['latin'] })

export default function App({ Component, pageProps }: AppProps) {
  return (
    <div className={inter.className}>
      <SessionProvider>
        <Component {...pageProps} />
      </SessionProvider>
    </div>
  )
} 