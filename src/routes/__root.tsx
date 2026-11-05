import { HeadContent, Scripts, createRootRoute } from '@tanstack/react-router'

import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { NotFoundPage } from '@/components/error-pages'
import { AuthProvider } from '@/components/AuthProvider'
import { WinterBackdrop } from '@/components/WinterBackdrop'

import '../styles.css'

const siteName = 'Infinite Count'
const siteDescription =
  'One shared number. Count up together, one at a time. Repeat a number or go twice in a row and it resets to zero.'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1',
      },
      {
        title: siteName,
      },
      {
        name: 'description',
        content: siteDescription,
      },
      {
        property: 'og:title',
        content: siteName,
      },
      {
        property: 'og:description',
        content: siteDescription,
      },
      {
        property: 'og:type',
        content: 'website',
      },
      {
        name: 'twitter:card',
        content: 'summary_large_image',
      },
    ],
    links: [
      { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
      {
        rel: 'preconnect',
        href: 'https://fonts.gstatic.com',
        crossOrigin: 'anonymous',
      },
      {
        rel: 'stylesheet',
        href: 'https://fonts.googleapis.com/css2?family=Alegreya:wght@500;700;800&family=Press+Start+2P&family=Bricolage+Grotesque:opsz,wght@12..96,400..800&family=JetBrains+Mono:wght@500;700;800&display=swap',
      },
    ],
  }),
  shellComponent: RootDocument,
  notFoundComponent: NotFoundPage,
})

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        <HeadContent />
      </head>
      <body>
        <WinterBackdrop />
        <AuthProvider>
          <TooltipProvider>{children}</TooltipProvider>
        </AuthProvider>
        <Toaster />
        <Scripts />
      </body>
    </html>
  )
}
