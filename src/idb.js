// Create a global idb object
(function() {
    'use strict';

    window.idb = {
        db: null,

        openCostsDB: function(dbName, version) {
            return new Promise((resolve, reject) => {
                try {
                    if (!window.indexedDB) {
                        throw new Error('IndexedDB is not supported in this browser');
                    }

                    if (this.db) {
                        resolve(this.db);
                        return;
                    }

                    const request = window.indexedDB.open(dbName, version);

                    request.onupgradeneeded = (event) => {
                        const db = event.target.result;
                        if (!db.objectStoreNames.contains('costs')) {
                            db.createObjectStore('costs', { keyPath: 'id', autoIncrement: true });
                        }
                    };

                    request.onerror = (event) => {
                        console.error('Database error:', event.target.error);
                        reject(new Error('Failed to open database: ' + event.target.error));
                    };

                    request.onsuccess = (event) => {
                        this.db = event.target.result;

                        this.db.onerror = (event) => {
                            console.error('Database error:', event.target.error);
                        };

                        this.db.addCost = (data) => {
                            return new Promise((resolve, reject) => {
                                try {
                                    const transaction = this.db.transaction('costs', 'readwrite');
                                    const store = transaction.objectStore('costs');

                                    const request = store.add({
                                        ...data,
                                        date: data.date || new Date().toISOString().split('T')[0]
                                    });

                                    request.onsuccess = () => resolve(true);
                                    request.onerror = (event) => {
                                        console.error('Add cost error:', event.target.error);
                                        reject(new Error('Failed to add cost: ' + event.target.error));
                                    };
                                } catch (error) {
                                    console.error('Transaction error:', error);
                                    reject(error);
                                }
                            });
                        };

                        resolve(this.db);
                    };
                } catch (error) {
                    console.error('Initialization error:', error);
                    reject(error);
                }
            });
        }
    };
})();