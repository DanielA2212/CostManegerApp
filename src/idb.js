/**
 * Wrapper class for IndexedDB operations
 * Provides a Promise-based API for common IndexedDB operations
 */
export default class IDBWrapper {
    /**
     * Creates an instance of IDBWrapper
     * @param {string} dbName - Name of the IndexedDB database
     * @param {string} storeName - Name of the object store
     */
    constructor(dbName, storeName) {
        this.dbName = dbName;
        this.storeName = storeName;
    }

    /**
     * Opens a connection to the IndexedDB database
     * Creates an object store if it doesn't exist
     * @returns {Promise<IDBDatabase>} A promise that resolves with the database instance
     * @throws {Error} When database connection fails
     */
    async open() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName);

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains(this.storeName)) {
                    db.createObjectStore(this.storeName, { keyPath: 'id', autoIncrement: true });
                }
            };

            request.onsuccess = (event) => resolve(event.target.result);
            request.onerror = (event) => reject(event.target.error);
        });
    }

    /**
     * Saves or updates data in the object store
     * @param {Object} data - Data to be stored
     * @returns {Promise<number>} A promise that resolves with the ID of the stored item
     * @throws {Error} When save operation fails
     */
    async save(data) {
        const db = await this.open();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(this.storeName, 'readwrite');
            const store = transaction.objectStore(this.storeName);

            const request = store.put(data);
            request.onsuccess = () => resolve(request.result);
            request.onerror = (event) => reject(event.target.error);
        });
    }

    /**
     * Retrieves all records from the object store
     * @returns {Promise<Array>} A promise that resolves with an array of all stored items
     * @throws {Error} When retrieval operation fails
     */
    async getAll() {
        const db = await this.open();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(this.storeName, 'readonly');
            const store = transaction.objectStore(this.storeName);

            const request = store.getAll();
            request.onsuccess = () => resolve(request.result);
            request.onerror = (event) => reject(event.target.error);
        });
    }

    /**
     * Deletes a record from the object store by its ID
     * @param {number|string} id - ID of the record to delete
     * @returns {Promise<undefined>} A promise that resolves when the deletion is complete
     * @throws {Error} When deletion operation fails
     */
    async delete(id) {
        const db = await this.open();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(this.storeName, 'readwrite');
            const store = transaction.objectStore(this.storeName);

            const request = store.delete(id);
            request.onsuccess = () => resolve(request.result);
            request.onerror = (event) => reject(event.target.error);
        });
    }
}