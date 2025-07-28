/**
 * Base auth class for BrowserDB
 */
class BrowserDBAuth {
	/**
	 * @param {BrowserDB} db
	 */
	constructor(db) {
		this.db = db
	}

	/**
	 * @param {string} uri
	 * @param {string} level
	 * @returns {Promise<boolean>}
	 */
	async ensureAccess(uri, level = 'r') {
		if (!oneOf('r', 'w', 'd')(level)) {
			throw new TypeError('Access level must be one of [r, w, d]')
		}

		// Public routes don't require auth
		if (uri.startsWith('auth/') || uri.startsWith('public/')) {
			return true
		}

		// Require auth token for other routes
		if (!this.db.token) {
			throw new Error('Authentication required')
		}

		return true
	}
}

export default BrowserDBAuth
