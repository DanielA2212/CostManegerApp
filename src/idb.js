// Define the IDBWrapper class globally
window.IDBWrapper = class IDBWrapper {
    constructor(dbName, storeName) {
        this.dbName = dbName;
        this.storeName = storeName;
    }

    async open() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName);

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains(this.storeName)) {
                    db.createObjectStore(this.storeName, { keyPath: "id", autoIncrement: true });
                }
            };

            request.onsuccess = (event) => resolve(event.target.result);
            request.onerror = (event) => reject(event.target.error);
        });
    }

    async save(data) {
        const db = await this.open();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(this.storeName, "readwrite");
            const store = transaction.objectStore(this.storeName);

            const request = store.put(data);
            request.onsuccess = () => resolve(true);
            request.onerror = (event) => reject(event.target.error);
        });
    }

    async getAll() {
        const db = await this.open();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(this.storeName, "readonly");
            const store = transaction.objectStore(this.storeName);

            const request = store.getAll();
            request.onsuccess = () => resolve(request.result);
            request.onerror = (event) => reject(event.target.error);
        });
    }

    async delete(id) {
        const db = await this.open();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(this.storeName, "readwrite");
            const store = transaction.objectStore(this.storeName);

            const request = store.delete(id);
            request.onsuccess = () => resolve(request.result);
            request.onerror = (event) => reject(event.target.error);
        });
    }
};

// Create the global idb object
window.idb = {
    wrapper: null,
    async openCostsDB(dbName) {
        this.wrapper = new window.IDBWrapper(dbName, "costs");
        await this.wrapper.open();
        return this;
    },

    async addCost(costData) {
        try {
            await this.wrapper.save(costData);
            return true;
        } catch (error) {
            console.error("Error adding cost:", error);
            return false;
        }
    }
};