declare module '@nanoweb/db' {
	/**
	 * Base database class with common operations
	 */
	export class DB {
		encoding: string;
		data: Map<string, DocumentEntry>;
		meta: Map<string, DocumentStat>;
		connected: boolean;
		root: string;
		cwd: string;
		dbs: DB[];

		constructor(input?: {
			root?: string;
			cwd?: string;
			data?: Map<string, DocumentEntry>;
			meta?: Map<string, DocumentStat>;
			connected?: boolean;
			dbs?: DB[];
		});

		/** @returns {Promise<Record<string, any>>} */
		load(): Promise<Record<string, any>>;

		/**
		 * Load a document from the database
		 * @param {string} uri - Document URI
		 * @param {any} [defaultValue] - Default value if document not found
		 * @returns {Promise<any>}
		 */
		loadDocument(uri: string, defaultValue?: any): Promise<any>;

		/**
		 * Save a document to the database
		 * @param {string} uri - Document URI
		 * @param {any} document - Document data to save
		 * @returns {Promise<boolean>}
		 */
		saveDocument(uri: string, document: any): Promise<boolean>;

		/**
		 * Delete a document from the database
		 * @param {string} uri - Document URI
		 * @returns {Promise<boolean>}
		 */
		dropDocument(uri: string): Promise<boolean>;

		/**
		 * Check access permissions
		 * @param {string} uri - Document URI
		 * @param {'r'|'w'|'d'} [level='r'] - Required access level
		 * @returns {Promise<boolean>}
		 */
		ensureAccess(uri: string, level?: 'r' | 'w' | 'd'): Promise<boolean>;

		/**
		 * Connect to the database
		 * @returns {Promise<void>}
		 */
		connect(): Promise<void>;

		/**
		 * Disconnect from the database
		 * @returns {Promise<void>}
		 */
		disconnect(): Promise<void>;

		/**
		 * Get document statistics
		 * @param {string} uri - Document URI
		 * @returns {Promise<DocumentStat>}
		 */
		statDocument(uri: string): Promise<DocumentStat>;

		/**
		 * Move a document to new location
		 * @param {string} from - Source URI
		 * @param {string} to - Target URI
		 * @returns {Promise<void>}
		 */
		moveDocument(from: string, to: string): Promise<void>;

		/**
		 * Push changes to remote
		 * @param {string} [uri] - Optional specific URI to push
		 * @returns {Promise<string[]>} - Array of changed URIs
		 */
		push(uri?: string): Promise<string[]>;

		/**
		 * Create a new DB instance from properties if object provided and return the
		 * same instance of DB if it is the same Class.
		 * @param {object|DB} props - Properties or existing DB instance
		 * @returns {DB}
		 */
		static from(props: object | DB): DB;
	}

	/**
	 * Document entry representation
	 */
	export class DocumentEntry {
		name: string;
		stat: DocumentStat;
		depth: number;
		path: string;
		parent: string;
		fulfilled: boolean;

		constructor(input?: {
			name?: string;
			stat?: DocumentStat;
			depth?: number;
			path?: string;
			parent?: string;
			fulfilled?: boolean;
		});

		/** @returns {boolean} */
		get isDirectory(): boolean;

		/** @returns {boolean} */
		get isFile(): boolean;

		/** @returns {boolean} */
		get isSymbolicLink(): boolean;

		/** @returns {string} */
		toString(): string;

		/**
		 * Create from plain object or existing instance
		 * @param {object|DocumentEntry} input
		 * @returns {DocumentEntry}
		 */
		static from(input: object | DocumentEntry): DocumentEntry;
	}

	/**
	 * Document statistics
	 */
	export class DocumentStat {
		atimeMs?: number;
		btimeMs?: number;
		blksize?: number;
		blocks?: number;
		ctimeMs?: number;
		dev?: number;
		gid?: number;
		ino?: number;
		mode?: number;
		mtimeMs?: number;
		size?: number;
		nlink?: number;
		rdev?: number;
		uid?: number;
		isBlockDevice?: boolean;
		isDirectory?: boolean;
		isFile?: boolean;
		isFIFO?: boolean;
		isSocket?: boolean;
		isSymbolicLink?: boolean;
		error?: Error;

		constructor(props?: {
			atimeMs?: number;
			btimeMs?: number;
			blksize?: number;
			blocks?: number;
			ctimeMs?: number;
			dev?: number;
			gid?: number;
			ino?: number;
			mode?: number;
			mtimeMs?: number;
			size?: number;
			nlink?: number;
			rdev?: number;
			uid?: number;
			isBlockDevice?: boolean;
			isDirectory?: boolean;
			isFile?: boolean;
			isFIFO?: boolean;
			isSocket?: boolean;
			isSymbolicLink?: boolean;
			error?: Error;
		});

		/** @returns {Date} */
		get atime(): Date;

		/** @returns {Date} */
		get btime(): Date;

		/** @returns {Date} */
		get ctime(): Date;

		/** @returns {Date} */
		get mtime(): Date;

		/** @returns {boolean} */
		get exists(): boolean;

		/**
		 * Create from plain object or existing instance
		 * @param {object|DocumentStat} props
		 * @returns {DocumentStat}
		 */
		static from(props: object | DocumentStat): DocumentStat;
	}

	/**
	 * Stream entry with progress information
	 */
	export class StreamEntry {
		file: DocumentEntry;
		files: DocumentEntry[];
		dirs: Map<string, DocumentEntry>;
		top: Map<string, DocumentEntry>;
		errors: Map<string, string>;
		progress: number;
		totalSize: { dirs: number, files: number };

		constructor(input?: {
			file?: DocumentEntry;
			files?: DocumentEntry[];
			dirs?: Map<string, DocumentEntry>;
			top?: Map<string, DocumentEntry>;
			errors?: Map<string, string>;
			progress?: number;
			totalSize?: { dirs: number, files: number };
		});
	}

	/**
	 * Data manipulation utilities
	 */
	export class Data {
		static OBJECT_DIVIDER: string;
		static ARRAY_WRAPPER: string;
		static MAX_DEEP_UNFLATTEN: number;

		/**
		 * Flatten nested object
		 * @param {object} obj - Object to flatten
		 * @param {string} [parent=''] - Parent key prefix
		 * @param {object} [res={}] - Result object
		 * @returns {object} Flattened object
		 */
		static flatten(obj: object, parent?: string, res?: object): object;

		/**
		 * Find value by path
		 * @param {string|string[]} path - Path to value
		 * @param {object} obj - Object to search
		 * @returns {any} Found value or undefined
		 */
		static find(path: string | string[], obj: object): any;

		/**
		 * Find value by path with options
		 * @param {string[]} path - Path to value
		 * @param {object} obj - Object to search
		 * @param {boolean} [skipScalar=false] - Skip scalar values
		 * @returns {{value: any, path: string[]}} Found value and path
		 */
		static findValue(path: string[], obj: object, skipScalar?: boolean): { value: any, path: string[] };

		/**
		 * Unflatten object with path keys
		 * @param {object} data - Flattened object
		 * @returns {object} Nested object
		 */
		static unflatten(data: object): object;

		/**
		 * Deep merge objects
		 * @param {object} target - Target object
		 * @param {object} source - Source object
		 * @returns {object} Merged object
		 */
		static merge(target: object, source: object): object;
	}

	export default DB;
}
