import DocumentStat from "./DocumentStat.js"

/**
 * Represents a document entry in the filesystem
 */
class DocumentEntry {
	/** @type {string} */
	name
	/** @type {DocumentStat} */
	stat
	/** @type {number} */
	depth
	/** @type {string} */
	path
	/** @type {string} */
	parent
	/** @type {boolean} */
	isDirectory
	/** @type {boolean} */
	isFile
	/** @type {boolean} */
	fulfilled

	/**
	 * @param {object} input
	 * @param {string} input.name
	 * @param {DocumentStat} input.stat
	 * @param {number} input.depth
	 * @param {string} input.path
	 * @param {string} [input.parent]
	 */
	constructor(input = {}) {
		const {
			name = "",
			stat = {},
			depth = 0,
			path = "",
			parent = "",
			isDirectory = false,
			isFile = false,
			fulfilled = false
		} = input

		this.name = String(name)
		this.stat = DocumentStat.from(stat)
		this.depth = Number(depth)
		this.path = String(path)
		this.parent = String(parent)
		this.isDirectory = Boolean(isDirectory)
		this.isFile = Boolean(isFile)
		this.fulfilled = Boolean(fulfilled)

		if (!this.name && this.path) {
			this.name = this.path.split("/").pop()
		}
	}

	/**
	 * Creates a DocumentEntry from input
	 * @param {object|DocumentEntry} input
	 * @returns {DocumentEntry}
	 */
	static from(input) {
		if (input instanceof DocumentEntry) return input
		return new DocumentEntry(input)
	}
}

export default DocumentEntry
