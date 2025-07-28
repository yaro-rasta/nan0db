import BrowserDBAuth from './BrowserDBAuth.js'

/**
 * Google auth provider for BrowserDB
 */
class GoogleAuth extends BrowserDBAuth {
	/**
	 * @param {string} token
	 * @returns {Promise<{token: string}>}
	 */
	async auth(token) {
		const result = await this.db.saveDocument('auth/google', { token })
		if (result?.token) this.db.token = result.token
		return result
	}
}

export default GoogleAuth
