import BrowserDBAuth from './BrowserDBAuth.js'

/**
 * Hardware key auth provider for BrowserDB
 */
class HardwareAuth extends BrowserDBAuth {
	/**
	 * @param {string} keyId
	 * @param {string} challenge
	 * @returns {Promise<{token: string}>}
	 */
	async auth(keyId, challenge) {
		const result = await this.db.saveDocument('auth/hardware', { keyId, challenge })
		if (result?.token) this.db.token = result.token
		return result
	}
}

export default HardwareAuth
