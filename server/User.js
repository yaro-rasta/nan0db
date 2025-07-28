/**
 * Interface for user configuration options
 * @typedef UserInput
 * @property {string} [name]
 * @property {string} [email]
 * @property {string} [passwordHash]
 * @property {boolean} [verified]
 * @property {string | null} [verificationCode]
 * @property {string | null} [resetCode]
 * @property {string | null} [resetCodeAt]
 * @property {string} [role]
 * @property {string} [createdAt]
 * @property {string} [updatedAt]
 */

/**
 * Represents a user in the authentication system
 */
class User {
	/** @type {string} */
	name
	/** @type {string} */
	email
	/** @type {string} */
	passwordHash
	/** @type {boolean} */
	verified
	/** @type {string} */
	verificationCode
	/** @type {string} */
	resetCode
	/** @type {string} */
	resetCodeAt
	/** @type {string} */
	role
	/** @type {string} */
	createdAt
	/** @type {string} */
	updatedAt
	/** @type {string} */
	isPublic
	/**
	 * Creates a new User instance
	 * @param {UserInput} input - User configuration options
	 */
	constructor(input = {}) {
		const {
			name = "",
			email = "",
			passwordHash = "",
			verified = false,
			verificationCode = "",
			resetCode = "",
			resetCodeAt = "",
			role = "user",
			createdAt = "",
			updatedAt = "",
			isPublic = false,
		} = input
		this.name = String(name)
		this.email = String(email)
		this.passwordHash = String(passwordHash)
		this.verified = Boolean(verified)
		this.verificationCode = String(verificationCode)
		this.resetCode = String(resetCode)
		this.resetCodeAt = resetCodeAt ? new Date(resetCodeAt) : null
		this.role = String(role)
		this.createdAt = createdAt ? new Date(createdAt) : new Date()
		this.updatedAt = updatedAt ? new Date(updatedAt) : new Date()
		this.isPublic = Boolean(isPublic)
	}

	/**
	 * Converts user data to a plain object
	 * @returns {object} - User data as a plain object
	 */
	toObject() {
		return { ...this }
	}

	/**
	 * Represents object as a string (debugger version).
	 * @returns {string}
	 */
	toString() {
		return [
			this.name,
			this.email ? `<${this.email}>` : 0,
			this.createdAt
		].filter(Boolean).join(" ")
	}

	/**
	 * Creates a new User instance from a raw object
	 * @param {object} input - Raw user data
	 * @returns {User} - User instance
	 */
	static from(input) {
		if (input instanceof User) return input
		return new User(input)
	}
}

export default User
