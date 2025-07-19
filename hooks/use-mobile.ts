import * as React from "react"

const MOBILE_BREAKPOINT = 768

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined)

  const checkIsMobile = React.useCallback(() => {
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
  }, [])

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    checkIsMobile()
    mql.addEventListener("change", checkIsMobile)
    return () => mql.removeEventListener("change", checkIsMobile)
  }, [checkIsMobile])

  return !!isMobile
}
