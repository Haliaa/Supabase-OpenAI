// // src/pages/_app.tsx
// import '../styles/globals.css'
// import type { AppProps } from 'next/app'

// export default function App({ Component, pageProps }: AppProps) {
//   return <Component {...pageProps} />
// }

// _app.tsx
import '../styles/globals.css'
import type { AppProps } from 'next/app'
import { useEffect } from 'react'

export default function App({ Component, pageProps }: AppProps) {
  useEffect(() => {
    // Auto-toggle based on system preference
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    document.documentElement.classList.toggle('dark', prefersDark)
  }, [])

  return <Component {...pageProps} />
}
