/**
 * API Base URL for the ProxyClient
 * @constant {string}
 */
const API_URL = 'http://localhost:8080/api/v1'

/**
 * ProxyClient class to interact with the local web server.
 */
class ProxyClient {
  /**
   * Sends an API request to the server.
   * @param {string} method - The HTTP method (e.g., GET, POST).
   * @param {string} path - The API endpoint path.
   * @param {Object|null} [body=null] - The request payload.
   * @returns {Promise<Object>} - The parsed JSON response.
   * @throws Will throw an error if the request fails.
   */
  async apiRequest (method, path, body = null) {
    const url = `${API_URL}${path}`
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
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
      console.error(
        `[ProxyClient] API Request failed for ${url}: ${error.message}`,
      )
      throw error
    }
  }

  /**
   * Handles API requests with optional success callbacks.
   * @param {string} method - The HTTP method.
   * @param {string} endpoint - The API endpoint.
   * @param {Object|null} [body=null] - The request payload.
   * @param {Function|null} [successCallback=null] - Callback for successful responses.
   * @returns {Promise<Object|null>} - The API response or null if an error occurs.
   */
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
      console.error(
        `[ProxyClient] Request to ${endpoint} failed: ${error.message}`,
      )
      return null
    }
  }

  /**
   * Fetches the proxy configuration.
   * @returns {Promise<Object|null>} - The proxy configuration or null on failure.
   */
  async getConfig () {
    return this.handleRequest('GET', '/config', null, (data) => data.config)
  }

  /**
   * Sets the proxy configuration.
   * @param {Object} config - The proxy configuration object.
   * @returns {Promise<boolean>} - True if successful, otherwise false.
   */
  async setConfig (config) {
    return this.handleRequest('POST', '/config', config, () => {
      console.log('Configuration saved successfully.')
      return true
    })
  }

  /**
   * Starts the proxy server.
   * @returns {Promise<boolean>} - True if successful, otherwise false.
   */
  async startProxy () {
    return this.handleRequest('POST', '/up', null, () => {
      console.log('Proxy started successfully.')
      return true
    })
  }

  /**
   * Stops the proxy server.
   * @returns {Promise<boolean>} - True if successful, otherwise false.
   */
  async stopProxy () {
    return this.handleRequest('POST', '/down', null, () => {
      console.log('Proxy stopped successfully.')
      return true
    })
  }

  /**
   * Checks if the proxy server is running.
   * @returns {Promise<boolean>} - True if running, otherwise false.
   */
  async isRunning () {
    console.log('[PROXYCLIENT] Checking if proxy is running...')
    return this.handleRequest('GET', '/ping', null, (data) => {
      console.log('Ping response received:', data)
      return true
    })
  }

  /**
   * Validates a proxy configuration URI.
   * @param {string} configUri - The configuration URI to validate.
   * @returns {boolean} - True if the URI is valid, otherwise false.
   */
  validateConfig = (configUri) => {
    const configRegex = /^(vmess|vless|ss):\/\//

    if (!configRegex.test(configUri)) {
      return false
    }

    const [protocol, path] = configUri.split('://')

    // Vmess URIs are just base64 encoded JSON objects
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
