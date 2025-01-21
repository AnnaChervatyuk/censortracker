const API_BASE_URL = 'http://localhost:8080/api/v1'

class ProxyClient {
  constructor (serverUrl = API_BASE_URL) {
    this.serverUrl = serverUrl
  }

  constructUrl (path) {
    return `${this.serverUrl}${path}`
  }

  async apiRequest (method, path, body = null) {
    const url = this.constructUrl(path)
    const options = {
      method,
      headers: { 'Content-Type': 'application/json' },
    }

    if (body) {
      options.body = JSON.stringify(body)
    }

    try {
      const response = await fetch(url, options)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || `HTTP error: ${response.status}`)
      }

      return data
    } catch (error) {
      console.error(`[ProxyClient] API Request failed for ${url}: ${error.message}`)
      throw error
    }
  }

  async handleRequest (method, endpoint, body = null, successCallback = null) {
    try {
      const data = await this.apiRequest(method, endpoint, body)

      if (data.status === 'success') {
        if (successCallback) {
          return successCallback(data)
        }
        return data
      }
      throw new Error(data.message || 'Unexpected API response.')
    } catch (error) {
      console.error(`[ProxyClient] Request to ${endpoint} failed: ${error.message}`)
      return null
    }
  }

  async getConfig () {
    return this.handleRequest('GET', '/config', null, (data) => data.config)
  }

  async setConfig (config) {
    return this.handleRequest('POST', '/config', config, () => {
      console.log('Configuration saved successfully.')
      return true
    })
  }

  async startProxy () {
    return this.handleRequest('POST', '/up', null, () => {
      console.log('Proxy started successfully.')
      return true
    })
  }

  async stopProxy () {
    return this.handleRequest('POST', '/down', null, () => {
      console.log('Proxy stopped successfully.')
      return true
    })
  }

  async isRunning () {
    console.log('[PROXYCLIENT] Checking if proxy is running...')
    return this.handleRequest('GET', '/ping', null, (data) => {
      console.log('Ping response received:', data)
      return true
    })
  }

  validateConfig = (configUri) => {
    const configRegex = /^(vmess|vless|ss):\/\//

    if (!configRegex.test(configUri)) {
      return false
    }

    const [protocol, path] = configUri.split('://')

    if (protocol === 'vmess') {
      try {
        window.atob(path)
        return true
      } catch (error) {
        return false
      }
    }
    return true
  }
}

export default new ProxyClient()
