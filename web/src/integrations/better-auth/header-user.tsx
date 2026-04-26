import { useSession } from '#/lib/auth-client'
import { Button } from '#/components/ui/button'
import {
  RiBookletLine,
  RiCheckboxMultipleLine,
  RiLoginBoxLine,
  RiLogoutBoxRLine,
  RiMoonLine,
  RiSparkling2Line,
  RiSunLine,
} from '@remixicon/react'
import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'

type BetterAuthHeaderProps = {
  pageView: 'generation' | 'saved' | 'grocery' | 'pricing'
  onSelectPageView: (view: 'generation' | 'saved' | 'grocery') => void
}

export default function BetterAuthHeader({
  pageView,
  onSelectPageView,
}: BetterAuthHeaderProps) {
  const { data: session, isPending } = useSession()
  const [isHovering, setIsHovering] = useState(false)
  const [mounted, setMounted] = useState(false)
  const { resolvedTheme, setTheme } = useTheme()

  useEffect(() => {
    setMounted(true)
  }, [])

  if (isPending) {
    return <div className="h-8 w-8 animate-pulse" />
  }

  const sidebarNav = (
    <div>
      <div className="relative isolate h-10 w-full shrink-0 overflow-hidden border border-border border-b-0 bg-background dark:border-input dark:bg-input/30">
        <img
          src="/sizzle.png"
          alt=""
          draggable={false}
          className="pointer-events-none m-0 block h-full w-full max-w-none origin-center object-cover object-center scale-[1.85]"
        />
      </div>
      <div className="flex flex-col">
        <Button
          type="button"
          variant="outline"
          className="group relative z-30 h-10 w-10 hover:bg-secondary hover:text-secondary-foreground hover:w-44 hover:px-3 focus-visible:w-44 focus-visible:px-3 focus-visible:text-secondary-foreground data-[active=true]:bg-secondary data-[active=true]:text-secondary-foreground"
          aria-label="View recipe generator"
          data-active={pageView === 'generation'}
          onClick={() => onSelectPageView('generation')}
        >
          <RiSparkling2Line
            aria-hidden="true"
            className="ml-1 size-4 shrink-0"
          />
          <span className="ml-0 max-w-0 overflow-hidden whitespace-nowrap font-heading font-bold opacity-0 transition-all duration-200 group-hover:ml-2 group-hover:max-w-32 group-hover:opacity-100 group-focus-visible:ml-2 group-focus-visible:max-w-32 group-focus-visible:opacity-100">
            Generator
          </span>
        </Button>
        <Button
          type="button"
          variant="outline"
          className="group relative z-30 h-10 w-10 border-t-0 hover:bg-secondary hover:text-secondary-foreground hover:w-44 hover:px-3 focus-visible:w-44 focus-visible:px-3 focus-visible:text-secondary-foreground data-[active=true]:bg-secondary data-[active=true]:text-secondary-foreground"
          aria-label="View saved recipes"
          data-active={pageView === 'saved'}
          onClick={() => onSelectPageView('saved')}
        >
          <RiBookletLine
            aria-hidden="true"
            className="ml-1 size-4 shrink-0"
          />
          <span className="ml-0 max-w-0 overflow-hidden whitespace-nowrap font-heading font-bold opacity-0 transition-all duration-200 group-hover:ml-2 group-hover:max-w-32 group-hover:opacity-100 group-focus-visible:ml-2 group-focus-visible:max-w-32 group-focus-visible:opacity-100">
            Saved Recipes
          </span>
        </Button>
        <Button
          type="button"
          variant="outline"
          className="group relative z-30 h-10 w-10 border-t-0 hover:bg-secondary hover:text-secondary-foreground hover:w-44 hover:px-3 focus-visible:w-44 focus-visible:px-3 focus-visible:text-secondary-foreground data-[active=true]:bg-secondary data-[active=true]:text-secondary-foreground"
          aria-label="View grocery list"
          data-active={pageView === 'grocery'}
          onClick={() => onSelectPageView('grocery')}
        >
          <RiCheckboxMultipleLine
            aria-hidden="true"
            className="ml-1 size-4 shrink-0"
          />
          <span className="ml-0 max-w-0 overflow-hidden whitespace-nowrap font-heading font-bold opacity-0 transition-all duration-200 group-hover:ml-2 group-hover:max-w-32 group-hover:opacity-100 group-focus-visible:ml-2 group-focus-visible:max-w-32 group-focus-visible:opacity-100">
            Grocery List
          </span>
        </Button>
      </div>
    </div>
  )

  if (session?.user) {
    return (
      <div className="relative z-30 flex h-full w-10 flex-col justify-between overflow-visible leading-none border-r">
        {sidebarNav}
        <div className="flex flex-col gap-0">
          <Button
            type="button"
            variant="outline"
            className="group relative z-30 h-10 w-10 border-b-0 hover:bg-secondary"
            aria-label="Toggle theme"
            onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
          >
            {mounted && resolvedTheme === 'dark' ? (
              <RiSunLine aria-hidden="true" className="ml-1 size-4 shrink-0" />
            ) : (
              <RiMoonLine aria-hidden="true" className="ml-1 size-4 shrink-0" />
            )}
          </Button>
          <form action="/auth/logout" method="POST" className="m-0">
            <Button
              variant="outline"
              className="group relative z-30 h-10 w-10 hover:w-32 hover:bg-hazard hover:px-3 hover:text-foreground focus-visible:w-32 focus-visible:bg-hazard focus-visible:px-3 focus-visible:text-foreground"
              aria-label="Sign out"
              onMouseEnter={() => setIsHovering(true)}
              onMouseLeave={() => setIsHovering(false)}
            >
              <RiLogoutBoxRLine
                aria-hidden="true"
                className={`size-4 shrink-0 ${isHovering ? '' : 'ml-1'}`}
              />
              <span className="ml-0 max-w-0 overflow-hidden whitespace-nowrap opacity-0 font-heading font-bold transition-all duration-200 group-hover:ml-2 group-hover:max-w-16 group-hover:opacity-100 group-focus-visible:ml-2 group-focus-visible:max-w-16 group-focus-visible:opacity-100">
                Sign out
              </span>
            </Button>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="relative z-30 flex h-full w-10 flex-col justify-between overflow-visible leading-none border-r">
      {sidebarNav}
      <div className="flex flex-col gap-0">
        <Button
          type="button"
          variant="outline"
          className="group relative z-30 h-10 w-10 border-b-0 hover:bg-secondary"
          aria-label="Toggle theme"
          onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
        >
          {mounted && resolvedTheme === 'dark' ? (
            <RiSunLine aria-hidden="true" className="ml-1 size-4 shrink-0" />
          ) : (
            <RiMoonLine aria-hidden="true" className="ml-1 size-4 shrink-0" />
          )}
        </Button>
        <Button
          variant="outline"
          className="group relative z-30 h-10 w-10 hover:w-32 hover:bg-secondary hover:px-3 hover:text-secondary-foreground focus-visible:w-32 focus-visible:px-3 focus-visible:text-secondary-foreground"
          asChild
        >
          <a href="/auth/login" aria-label="Sign in">
            <RiLoginBoxLine
              aria-hidden="true"
              className="ml-1 size-4 shrink-0"
            />
            <span className="ml-0 max-w-0 overflow-hidden whitespace-nowrap opacity-0 font-heading font-bold transition-all duration-200 group-hover:ml-2 group-hover:max-w-16 group-hover:opacity-100 group-focus-visible:ml-2 group-focus-visible:max-w-16 group-focus-visible:opacity-100">
              Sign in
            </span>
          </a>
        </Button>
      </div>
    </div>
  )
}
