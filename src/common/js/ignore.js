import storage from './storage'
import { extractHostnameFromUrl } from './utilities'

const ipRangeCheck = require('ip-range-check')

const SPECIAL_PURPOSE_IPS = [
  '0.0.0.0/8',
  '10.0.0.0/8',
  '100.64.0.0/10',
  '127.0.0.0/8',
  '169.254.0.0/16',
  '172.16.0.0/12',
  '192.168.0.0/16',
  '198.51.100.0/24',
  '203.0.113.0/24',
  '224.0.0.0/4',
  '240.0.0.0/4',
  '::/128',
  '::1/128',
  '::/96',
  '::ffff:/96',
  '2001:db8::/32',
  'fe80::/10',
  'fec0::/10',
  'fc00::/7',
  'ff00::/8',
]

const IGNORE_SYNC_INTERVAL_MS = 60 * 30 * 1000

class Ignore {
  constructor () {
    this.ignoredHosts = new Set()
    setInterval(async () => {
      console.warn('Syncing ignored hosts...')
      await this.save()
    }, IGNORE_SYNC_INTERVAL_MS)
  }

  isSpecialPurposeIP = (ip) => {
    try {
      return ipRangeCheck(ip, SPECIAL_PURPOSE_IPS)
    } catch (error) {
      return false
    }
  }

  save = () => {
    storage.get({ ignoredHosts: [] })
      .then(({ ignoredHosts }) => {
        for (const hostname of ignoredHosts) {
          this.ignoredHosts.add(hostname)
        }
        console.log('All ignored domain saved!')
      })
  }

  add = async (url) => {
    const hostname = extractHostnameFromUrl(url)
    const { ignoredHosts } = await storage.get({ ignoredHosts: [] })

    if (!ignoredHosts.includes(hostname)) {
      ignoredHosts.push(hostname)
    }

    for (const item of ignoredHosts) {
      this.ignoredHosts.add(item)
    }

    await storage.set({ ignoredHosts })
  }

  contains = (hostname) => {
    const ignoreRegEx = /localhost/

    hostname = extractHostnameFromUrl(hostname)

    if (this.ignoredHosts.has(hostname) || hostname.match(ignoreRegEx)) {
      console.warn(`Ignoring host: ${hostname}`)
      return true
    }
    return this.isSpecialPurposeIP(hostname)
  }
}

export default new Ignore()
