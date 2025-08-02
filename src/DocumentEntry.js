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
	fulfilled

	/**
	 * @param {object} input
	 * @param {string} [input.name]
	 * @param {DocumentStat|object} [input.stat]
	 * @param {number} [input.depth]
	 * @param {string} [input.path]
	 * @param {string} [input.parent]
	 * @param {boolean} [input.fulfilled]
	 */
	constructor(input = {}) {
		const {
			name = "",
			stat = {},
			depth = 0,
			path = "",
			parent = "",
			fulfilled = false
		} = input

		this.name = String(name)
		this.stat = DocumentStat.from(stat)
		this.depth = Number(depth)
		this.path = String(path)
		this.parent = String(parent)
		this.fulfilled = Boolean(fulfilled)

		if (!this.name && this.path) {
			this.name = this.path.split("/").pop()
		}
	}

	get isDirectory() {
		return !!this.stat.isDirectory
	}

	get isFile() {
		return !!this.stat.isFile
	}

	get isSymbolicLink() {
		return !!this.stat.isSymbolicLink
	}

	toString() {
		return [
			this.isDirectory ? "D"
				: this.isFile ? "F"
					: this.isSymbolicLink ? "L"
						: "?",
			this.path || this.name
		].filter(Boolean).join(" ")
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
