import { getBrowser, isFirefox } from './browser'

(async (browser) => {
  const unavailableWebsite = document.getElementById('unavailableWebsite')
  const openThroughProxyButton = document.getElementById('openThroughProxy')

  const [tab] = await browser.tabs.query({ active: true, lastFocusedWindow: true })

  const [, encodedHostname] = tab.url.split('?')
  const targetUrl = window.atob(encodedHostname)

  unavailableWebsite.innerText = targetUrl

  if (encodedHostname && openThroughProxyButton) {
    openThroughProxyButton.classList.remove('btn-hidden')

    const timeout = isFirefox() ? 300 : 3500

    setTimeout(() => {
      if (openThroughProxyButton.classList.contains('btn-disabled')) {
        openThroughProxyButton.disabled = false
        openThroughProxyButton.classList.remove('btn-disabled')
      }
    }, timeout)
  }

  document.addEventListener('click', (event) => {
    if (event.target.matches('#openThroughProxy')) {
      browser.tabs.create({ url: targetUrl, index: tab.index }, () => {
        browser.tabs.remove(tab.id)
      })
    }

    if (event.target.matches('#tryAgain')) {
      browser.tabs.update(tab.id, { url: targetUrl })
    }

    if (event.target.matches('#closeTab')) {
      browser.tabs.remove(tab.id)
    }

    event.preventDefault()
  }, false)
})(getBrowser())
