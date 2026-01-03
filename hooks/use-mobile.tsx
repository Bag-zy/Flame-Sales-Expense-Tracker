import * as React from "react"

const MOBILE_BREAKPOINT = 768

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined)

  React.useEffect(() => {
    const updateIsMobile = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    }

    // Set initial value on mount
    updateIsMobile()

    // Listen for resize events to keep it in sync
    window.addEventListener("resize", updateIsMobile)

    return () => {
      window.removeEventListener("resize", updateIsMobile)
    }
  }, [])

  return !!isMobile
}
