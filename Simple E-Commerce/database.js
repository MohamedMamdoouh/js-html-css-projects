// Database Configuration
const DB_CONFIG = {
  name: "ShopDB",
  version: 4,
  stores: [
    {
      name: "users",
      keyPath: "id",
      options: { autoIncrement: true },
      indexes: [{ name: "email", keyPath: "email", options: { unique: true } }],
    },
    { name: "products", keyPath: "id", options: { autoIncrement: false } },
    { name: "cart", keyPath: "id", options: { autoIncrement: false } },
    {
      name: "purchases",
      keyPath: "id",
      options: { autoIncrement: true },
      indexes: [
        { name: "userId", keyPath: "userId", options: { unique: false } },
        { name: "date", keyPath: "date", options: { unique: false } },
      ],
    },
  ],
};

// Seed data for products
const SEED_DATA = {
  products: [
    {
      id: 1,
      name: "JavaScript Fundamentals",
      price: 49.99,
      description:
        "Master the basics of JavaScript including variables, functions, loops, and DOM manipulation. Perfect for beginners.",
    },
    {
      id: 2,
      name: "Advanced React Patterns",
      price: 79.99,
      description:
        "Learn advanced React concepts like hooks, context, render props, and performance optimization techniques.",
    },
    {
      id: 3,
      name: "Python for Data Science",
      price: 89.99,
      description:
        "Comprehensive Python course covering NumPy, Pandas, Matplotlib, and machine learning basics with scikit-learn.",
    },
    {
      id: 4,
      name: "Node.js Backend Development",
      price: 69.99,
      description:
        "Build scalable backend applications with Node.js, Express, REST APIs, and MongoDB integration.",
    },
    {
      id: 5,
      name: "CSS & Tailwind Mastery",
      price: 39.99,
      description:
        "From CSS fundamentals to Tailwind CSS framework. Create beautiful, responsive designs with modern techniques.",
    },
    {
      id: 6,
      name: "TypeScript Complete Guide",
      price: 59.99,
      description:
        "Learn TypeScript from scratch. Types, interfaces, generics, and integrating TypeScript with React and Node.js.",
    },
  ],
};

let db = null;

function removeObsoleteStores(dbInstance) {
  const configuredStoreNames = DB_CONFIG.stores.map((store) => store.name);
  const existingStoreNames = Array.from(dbInstance.objectStoreNames);

  existingStoreNames.forEach((storeName) => {
    if (!configuredStoreNames.includes(storeName)) {
      dbInstance.deleteObjectStore(storeName);
      console.log(`Deleted obsolete store: ${storeName}`);
    }
  });
}

function initializeStores(dbInstance) {
  DB_CONFIG.stores.forEach((storeConfig) => {
    if (!dbInstance.objectStoreNames.contains(storeConfig.name)) {
      const store = dbInstance.createObjectStore(storeConfig.name, {
        keyPath: storeConfig.keyPath,
        ...storeConfig.options,
      });

      // Create indexes if specified
      if (storeConfig.indexes) {
        storeConfig.indexes.forEach((indexConfig) => {
          if (!store.indexNames.contains(indexConfig.name)) {
            store.createIndex(
              indexConfig.name,
              indexConfig.keyPath,
              indexConfig.options,
            );
          }
        });
      }
    }
  });
}

function seedDatabase(transaction) {
  Object.entries(SEED_DATA).forEach(([storeName, data]) => {
    if (transaction.db.objectStoreNames.contains(storeName)) {
      const store = transaction.objectStore(storeName);
      data.forEach((item) => {
        const request = store.put(item); // Use put instead of add to avoid ConstraintError
        request.onerror = (e) => {
          console.error(`Error seeding ${storeName}:`, e.target.error);
          e.preventDefault(); // Prevent the transaction from aborting
        };
      });
    }
  });
}

function openDatabaseAsync() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_CONFIG.name, DB_CONFIG.version);

    request.onerror = () => reject(request.error);

    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const dbInstance = event.target.result;
      const transaction = event.target.transaction;

      removeObsoleteStores(dbInstance);
      initializeStores(dbInstance);
      seedDatabase(transaction);
    };
  });
}

function getDatabase() {
  return db;
}

const dbHelpers = {
  getAll: (storeName) =>
    new Promise((resolve, reject) => {
      if (!db) return reject(new Error("Database not initialized"));
      const tx = db.transaction(storeName, "readonly");
      const store = tx.objectStore(storeName);
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    }),
  get: (storeName, key) =>
    new Promise((resolve, reject) => {
      if (!db) return reject(new Error("Database not initialized"));
      const tx = db.transaction(storeName, "readonly");
      const store = tx.objectStore(storeName);
      const request = store.get(key);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    }),
  add: (storeName, data) =>
    new Promise((resolve, reject) => {
      if (!db) return reject(new Error("Database not initialized"));
      const tx = db.transaction(storeName, "readwrite");
      const store = tx.objectStore(storeName);
      const request = store.add(data);
      tx.oncomplete = () => resolve(request.result);
      tx.onerror = () => reject(tx.error);
    }),
  put: (storeName, data) =>
    new Promise((resolve, reject) => {
      if (!db) return reject(new Error("Database not initialized"));
      const tx = db.transaction(storeName, "readwrite");
      const store = tx.objectStore(storeName);
      const request = store.put(data);
      tx.oncomplete = () => resolve(request.result);
      tx.onerror = () => reject(tx.error);
    }),
  delete: (storeName, key) =>
    new Promise((resolve, reject) => {
      if (!db) return reject(new Error("Database not initialized"));
      const tx = db.transaction(storeName, "readwrite");
      const store = tx.objectStore(storeName);
      const request = store.delete(key);
      tx.oncomplete = () => resolve(request.result);
      tx.onerror = () => reject(tx.error);
    }),
  clear: (storeName) =>
    new Promise((resolve, reject) => {
      if (!db) return reject(new Error("Database not initialized"));
      const tx = db.transaction(storeName, "readwrite");
      const store = tx.objectStore(storeName);
      const request = store.clear();
      tx.oncomplete = () => resolve(request.result);
      tx.onerror = () => reject(tx.error);
    }),
  getByIndex: (storeName, indexName, key) =>
    new Promise((resolve, reject) => {
      if (!db) return reject(new Error("Database not initialized"));
      const tx = db.transaction(storeName, "readonly");
      const store = tx.objectStore(storeName);
      const index = store.index(indexName);
      const request = index.get(key);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    }),
};

// Export functions and helpers
export { DB_CONFIG, SEED_DATA, openDatabaseAsync, getDatabase, dbHelpers };
