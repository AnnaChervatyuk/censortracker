import browser from '../../../browser-api'
import { extractHostnameFromUrl } from '../../../utilities'
import configManager from '../config'
import registry from '../registry'
import { triggerAuth } from './auth/triggerAuth'
import * as handlers from './handlers'
import { getPacScript } from './pac'
import { getPremiumPacScript } from './pacPremium'

export const isEnabled = async () => {
  const { useProxy } = await configManager.get('useProxy')

  return useProxy
}

export const enable = async () => {
  console.log('Proxying enabled.')
  await configManager.set({ useProxy: true, proxyIsAlive: true })
}

export const disable = async () => {
  console.warn('Proxying disabled.')
  configManager.set({ useProxy: false })
}

export const monitorPremiumExpiration = async () => {
  const {
    usePremiumProxy,
    premiumExpirationDate,
  } = await configManager.get(
    'usePremiumProxy',
    'premiumExpirationDate',
  )

  if (!usePremiumProxy) {
    return false
  }
  if (Date.now() >= premiumExpirationDate) {
    await configManager.set({
      usePremiumProxy: false,
      haveActivePremiumConfig: false,
      premiumProxyServerURI: '',
      premiumUsername: '',
      premiumPassword: '',
      premiumIdentificationCode: '',
    })
    return true
  }
  return false
}

export const getProxyingRules = async () => {
  const {
    proxyServerURI,
    customProxyProtocol,
    customProxyServerURI,
  } = await configManager.get(
    'proxyServerURI',
    'customProxyProtocol',
    'customProxyServerURI',
  )

  if (
    customProxyServerURI &&
    customProxyProtocol
  ) {
    return {
      proxyServerProtocol: customProxyProtocol,
      proxyServerURI: customProxyServerURI,
    }
  }
  return {
    proxyServerProtocol: 'HTTPS',
    proxyServerURI,
  }
}

export const requestIncognitoAccess = async () => {
  if (browser.isFirefox) {
    const isAllowedIncognitoAccess =
      await browser.extension.isAllowedIncognitoAccess()

    if (!isAllowedIncognitoAccess) {
      await browser.browserAction.setBadgeText({ text: '✕' })
      configManager.set({
        privateBrowsingPermissionsRequired: true,
      })
      console.info('Private browsing permissions requested.')
    }
  }
}

export const grantIncognitoAccess = async () => {
  if (browser.isFirefox) {
    await browser.browserAction.setBadgeText({ text: '' })
    configManager.set({
      privateBrowsingPermissionsRequired: false,
    })
  }
}

export const setProxy = async () => {
  const proxyConfig = {}
  const domains = await registry.getDomainsByLevel()

  const customProxyInUse = await usingCustomProxy()
  const premiumProxyInUse = await usingPremiumProxy()

  const {
    localConfig: {
      countryCode,
      customRegistryUrl,
      geoIPServiceURL,
      ignoreUrl,
      proxyUrl,
      registryUrl,
      specifics: { cooperationRefusedORIUrl },
    },
    premiumProxyServerURI,
    ignoredHosts,
    premiumBackendURL,
  } = await configManager.get(
    'localConfig',
    'premiumProxyServerURI',
    'ignoredHosts',
    'premiumBackendURL',
  )
  const serviceHosts = [
    cooperationRefusedORIUrl,
    customRegistryUrl,
    geoIPServiceURL,
    premiumBackendURL,
    proxyUrl,
    registryUrl,
    ignoreUrl,
  ].filter((el) => !!el).map((el) => extractHostnameFromUrl(el))

  let pacData

  if (premiumProxyInUse) {
    pacData = getPremiumPacScript({
      premiumProxyServerURI,
      ignoredHosts,
      serviceHosts,
    })
    console.log('Configured premium proxy PAC')
  } else {
    if (Object.keys(domains).length === 0) {
      await removeProxy()
      return false
    }

    const {
      proxyServerURI,
      proxyServerProtocol,
    } = await getProxyingRules()

    pacData = getPacScript({
      domains,
      proxyServerURI,
      proxyServerProtocol,
      countryCode,
    })
  }

  if (browser.isFirefox) {
    const blob = new Blob([pacData], {
      type: 'application/x-ns-proxy-autoconfig',
    })

    proxyConfig.value = {
      proxyType: 'autoConfig',
      autoConfigUrl: URL.createObjectURL(blob),
    }
  } else {
    proxyConfig.scope = 'regular'
    proxyConfig.value = {
      mode: 'pac_script',
      pacScript: {
        data: pacData,
        mandatory: false,
      },
    }
  }
  try {
    await browser.proxy.settings.set(proxyConfig)
    await enable()
    await grantIncognitoAccess()
    console.warn('PAC has been set successfully!')
  } catch (error) {
    console.error(`PAC could not be set: ${error}`)
    await disable()
    await requestIncognitoAccess()
    return false
  }
  if (customProxyInUse || premiumProxyInUse) {
    await triggerAuth()
  }
  return true
}

export const removeProxy = async () => {
  await browser.proxy.settings.clear({})
  console.warn('Proxy settings removed.')
}

export const alive = async () => {
  const { proxyIsAlive } = await configManager.get('proxyIsAlive')

  return proxyIsAlive
}

export const ping = async () => {
  const customProxyInUse = await usingCustomProxy()
  const premiumProxyInUse = await usingPremiumProxy()

  if (!customProxyInUse && !premiumProxyInUse) {
    const { proxyPingURI } = await configManager.get('proxyPingURI')

    fetch(`https://${proxyPingURI}`, {
      method: 'POST',
      headers: {
        'Content-type': 'application/json; charset=UTF-8',
      },
      body: JSON.stringify({
        type: 'ping',
      }),
    }).catch(() => {
      // We don't care about the result.
      console.log(`Pinged ${proxyPingURI}!`)
    })
  }
}

export const checkPremiumBackend = async (url, apiKey) => {
  try {
    const res = await fetch(`${url}`, {
      method: 'POST',
      headers: {
        'Content-type': 'application/json; charset=UTF-8',
        Authorization: `Api-Key ${apiKey}`,
      },
    })

    if (!res.ok) {
      console.error(`Error trying to reach ${url}. Response code ${res.status}:`, res.statusText)
      return undefined
    }
    const data = await res.json()

    await configManager.set({
      usePremiumProxy: true,
      haveActivePremiumConfig: true,
      premiumProxyServerURI: `${data.proxyServerHost}:${data.proxyServerPort}`,
      premiumUsername: data.username,
      premiumPassword: data.password,
      premiumExpirationDate: data.expirationDate * 1000,
    })
    await setProxy()

    return data
  } catch (error) {
    console.error(`Error trying to reach ${url}`, error)
    return undefined
  }
}

export const usingCustomProxy = async () => {
  const { useOwnProxy } = await configManager.get('useOwnProxy')

  return useOwnProxy
}

export const usingPremiumProxy = async () => {
  const { usePremiumProxy } = await configManager.get('usePremiumProxy')

  return usePremiumProxy
}

export const controlledByThisExtension = async () => {
  const { levelOfControl } = await browser.proxy.settings.get({})

  if (levelOfControl === 'controlled_by_this_extension') {
    return true
  }
  if (levelOfControl === 'controllable_by_this_extension') {
    const self = await browser.management.getSelf()
    const installedExtensions = await browser.management.getAll()
    const extensionsWithProxyPermissions =
      installedExtensions?.filter(({ name, permissions, enabled }) => {
        return permissions?.includes('proxy') && name !== self.name && enabled
      })

    if (extensionsWithProxyPermissions.length === 0) {
      return true
    }
  }
  return false
}

export const controlledByOtherExtensions = async () => {
  const isControlledByThisExtension = await controlledByThisExtension()

  return !isControlledByThisExtension
}

export const takeControl = async () => {
  const self = await browser.management.getSelf()
  const extensions = await browser.management.getAll()

  for (const { id, name, permissions } of extensions) {
    if (permissions?.includes('proxy') && name !== self?.name) {
      console.warn(`Disabling ${name}...`)
      await browser.management.setEnabled(id, false)
    }
  }
}

export const removeCustomProxy = async () => {
  configManager.set({
    useOwnProxy: false,
  })
  await configManager.remove(
    'customProxyProtocol',
    'customProxyServerURI',
  )
}

export const removeBadProxies = async () => {
  configManager.set({ badProxies: [] })
}

export const getBadProxies = async () => {
  const { badProxies } = await configManager.get('badProxies')

  return badProxies
}

export { handlers }
