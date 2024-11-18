/**
 * Return PAC Script data.
 * @param domains {Array<string>} - List of domains to proxy.
 * @param proxyServerURI {string} - URI of the proxy server.
 * @param proxyServerProtocol {string} - Protocol of the proxy server.
 * @returns {string} PAC script
 */
export const getPremiumPacScript = (
  {
    premiumProxyServerURI,
    ignoredHosts,
    serviceHosts,
  },
) => {
  return `
  function FindProxyForURL(url, host) {
    if ([${serviceHosts.map((el) => `'${el}'`)}].includes(host)) {
      return 'DIRECT';
    }
    if ([${ignoredHosts.map((el) => `'${el}'`)}].includes(host)) {
      return 'DIRECT';
    } else {
      return 'HTTP ${premiumProxyServerURI}; HTTPS ${premiumProxyServerURI};';
    }
  }`
}
