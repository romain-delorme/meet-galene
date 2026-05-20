import { useEffect, useState } from 'react'

const isMobileBrowser = () =>
  /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  )

export const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(isMobileBrowser())

  useEffect(() => {
    const handleResize = () => setIsMobile(isMobileBrowser())
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  return isMobile
}