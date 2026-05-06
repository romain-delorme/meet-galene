export function isSafari(): boolean {
  const ua = navigator.userAgent.toLowerCase()
  return ua.includes('safari') && !ua.includes('chrome')
}

export function isMobileBrowser(): boolean {
  return /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(
    navigator.userAgent
  )
}

export function isFirefox(): boolean {
  return navigator.userAgent.toLowerCase().includes('firefox')
}

export function isChromiumBased(): boolean {
  return (
    /chrome|chromium/i.test(navigator.userAgent) &&
    !/edge/i.test(navigator.userAgent)
  )
}

export function isMacintosh(): boolean {
  return navigator.platform.indexOf('Mac') > -1
}
