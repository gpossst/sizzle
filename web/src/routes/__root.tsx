import { HeadContent, Scripts, createRootRoute } from '@tanstack/react-router'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'
import { TanStackDevtools } from '@tanstack/react-devtools'

import { ThemeProvider } from '../components/theme-provider'
import ConvexProvider from '../integrations/convex/provider'

import appCss from '../styles.css?url'

const SITE_TITLE = 'Sizzle — AI recipe generator'
const SITE_DESCRIPTION =
  'Generate custom recipes with AI, save your favorites, and build grocery lists. Sizzle helps you cook with ingredients you have and goals you set.'

function siteOrigin(): string | undefined {
  const raw =
    typeof process !== 'undefined' ? process.env.SIZZLE_APP_URL : undefined
  if (!raw?.trim()) return undefined
  return raw.replace(/\/+$/, '')
}

export const Route = createRootRoute({
  head: () => {
    const origin = siteOrigin()

    const meta = [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1',
      },
      {
        title: SITE_TITLE,
      },
      {
        name: 'description',
        content: SITE_DESCRIPTION,
      },
      {
        name: 'theme-color',
        content: '#000000',
      },
      {
        property: 'og:title',
        content: SITE_TITLE,
      },
      {
        property: 'og:description',
        content: SITE_DESCRIPTION,
      },
      {
        property: 'og:type',
        content: 'website',
      },
      {
        property: 'og:site_name',
        content: 'Sizzle',
      },
      ...(origin
        ? [
            { property: 'og:url' as const, content: `${origin}/` },
            { property: 'og:image' as const, content: `${origin}/sizzle.png` },
          ]
        : []),
      {
        name: 'twitter:card',
        content: 'summary_large_image',
      },
      {
        name: 'twitter:title',
        content: SITE_TITLE,
      },
      {
        name: 'twitter:description',
        content: SITE_DESCRIPTION,
      },
      ...(origin
        ? [{ name: 'twitter:image', content: `${origin}/sizzle.png` }]
        : []),
    ]

    const links = [
      {
        rel: 'stylesheet',
        href: appCss,
      },
      {
        rel: 'icon',
        href: '/favicon.ico',
      },
      {
        rel: 'apple-touch-icon',
        href: '/logo192.png',
      },
      {
        rel: 'manifest',
        href: '/manifest.json',
      },
      ...(origin
        ? [{ rel: 'canonical' as const, href: `${origin}/` }]
        : []),
    ]

    return { meta, links }
  },
  notFoundComponent: () => <p>Page not found.</p>,
  shellComponent: RootDocument,
})

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body>
        <ThemeProvider>
          <ConvexProvider>
            {children}
            <TanStackDevtools
              config={{
                position: 'bottom-right',
              }}
              plugins={[
                {
                  name: 'Tanstack Router',
                  render: <TanStackRouterDevtoolsPanel />,
                },
              ]}
            />
          </ConvexProvider>
        </ThemeProvider>
        <Scripts />
      </body>
    </html>
  )
}
