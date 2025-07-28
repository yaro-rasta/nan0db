import BrowserDBAuth from './BrowserDBAuth.js'

/**
 * LinkedIn auth provider for BrowserDB
 */
class LinkedInAuth extends BrowserDBAuth {
	/**
	 * @param {string} token
	 * @returns {Promise<{token: string}>}
	 */
	async auth(token) {
		const result = await this.db.saveDocument('auth/linkedin', { token })
		if (result?.token) this.db.token = result.token
		return result
	}
}

export default LinkedInAuth
