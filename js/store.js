// App State Management (Vanilla JS Store with Cloud Firestore)

const firebaseConfig = {
  // ⚠️ TODO: Replace with your actual Firebase project configuration from the Firebase Console!
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

let db = null;
if (typeof firebase !== 'undefined' && firebaseConfig.apiKey !== "YOUR_API_KEY") {
  firebase.initializeApp(firebaseConfig);
  db = firebase.firestore();
  console.log("Firebase Firestore Initialized!");
} else {
  console.warn("Firestore not configured. Using dummy local memory/localStorage state.");
}

const defaultInventory = [
  { 
    id: '1001', 
    name: 'Rib Eye', 
    deptId: 'meat', 
    batches: [{ batchNo: 'B-1102', weight: 75.84, dateMan: '02/15/2026', dateRecv: '03/01/26', loc: 'Cooler A' }],
    unitsPerCase: 1, 
    shelfCapacity: 10,
    isRandomWeight: true,
    allowedDaysToSell: 35
  },
  { 
    id: '1002', 
    name: 'Red Pack Tomato Puree', 
    deptId: 'dry', 
    batches: [
      { batchNo: 'B-0991', qtyCases: 2, totalUnits: 12, dateRecv: '02/25/26', dateExp: '12/01/27', loc: 'Aisle 4' },
      { batchNo: 'B-1050', qtyCases: 4, totalUnits: 24, dateRecv: '03/05/26', dateExp: '12/01/27', loc: 'Backroom D' }
    ],
    unitsPerCase: 6,
    unitSize: '110 oz',
    shelfCapacity: 24,
    isRandomWeight: false
  }
];

const Store = {
  state: {
    departments: [
      { id: 'meat', name: 'Meat', icon: 'beef' },
      { id: 'seafood', name: 'Seafood', icon: 'fish' },
      { id: 'dairy', name: 'Dairy', icon: 'milk' },
      { id: 'produce', name: 'Produce', icon: 'apple' },
      { id: 'dry', name: 'Dry Goods', icon: 'wheat' },
      { id: 'frozen', name: 'Frozen', icon: 'snowflake' },
      { id: 'equip', name: 'Equipment', icon: 'hammer' }
    ],
    inventory: JSON.parse(localStorage.getItem('inventoryDB')) || defaultInventory,
    activeChecklist: null,
    currentUser: null,
    currentRole: null
  },
  
  determineRole(email) {
     if (!email) return 'standard';
     const lower = email.toLowerCase();
     if (lower.includes('admin')) return 'admin';
     if (lower.includes('receive')) return 'receiver';
     if (lower.includes('cash') || lower.includes('sale')) return 'cashier';
     return 'standard';
  },

  listeners: [],

  subscribe(listener) {
    this.listeners.push(listener);
  },

  saveToDB() {
    if (db) {
       this.state.inventory.forEach(item => {
           db.collection("inventory").doc(item.id.toString()).set(item, { merge: true })
             .catch(err => console.error("Error writing to Firestore:", err));
       });
    } else {
       localStorage.setItem('inventoryDB', JSON.stringify(this.state.inventory));
    }
  },

  initFirestoreSync() {
     if (!db) return;
     // Real-time listener for Inventory Collection from the Cloud
     db.collection("inventory").onSnapshot((snapshot) => {
         const remoteData = [];
         snapshot.forEach(doc => remoteData.push(doc.data()));
         if (remoteData.length > 0) {
             this.state.inventory = remoteData;
             this.rawNotify();
             if (typeof AITeacher !== 'undefined') {
                 AITeacher.showTip("Cloud Sync: Inventory updated from Firestore.", 3000);
             }
         }
     }, err => console.error("Firestore sync error:", err));
  },

  rawNotify() {
     this.listeners.forEach(listener => listener(this.state));
  },

  removeBatch(itemId, batchIndex) {
      const item = this.state.inventory.find(i => i.id === itemId);
      if (item && item.batches && item.batches.length > batchIndex) {
         item.batches.splice(batchIndex, 1);
         this.notify();
      }
  },

  notify() {
    this.saveToDB();
    this.rawNotify();
  },

  searchItems(query) {
    if (!query || query.trim() === "") return this.state.inventory;
    const lowerQ = query.toLowerCase();
    return this.state.inventory.filter(item => 
      item.name.toLowerCase().includes(lowerQ) || 
      item.id.toLowerCase().includes(lowerQ) ||
      (item.unitSize && item.unitSize.toLowerCase().includes(lowerQ)) ||
      (item.batches && item.batches.some(b => b.batchNo && b.batchNo.toLowerCase().includes(lowerQ)))
    );
  },

  getExpirationStatus(item, batch) {
     if (!item.allowedDaysToSell || !batch.dateMan) return { status: 'SAFE', daysLeft: 999 };
     const manufDate = new Date(batch.dateMan);
     if(isNaN(manufDate)) return { status: 'SAFE', daysLeft: 999 };
     
     const expiryDate = new Date(manufDate);
     expiryDate.setDate(expiryDate.getDate() + item.allowedDaysToSell);
     
     const today = new Date();
     const diffTime = expiryDate - today;
     const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
     
     if (diffDays < 0) return { status: 'EXPIRED', daysLeft: diffDays };
     if (diffDays === 0) return { status: 'CRITICAL', daysLeft: 0, msg: "PULL TODAY" };
     if (diffDays === 1) return { status: 'CRITICAL', daysLeft: 1, msg: "PULL TOMORROW" };
     if (diffDays <= 3) return { status: 'WARNING', daysLeft: diffDays, msg: `PULL IN ${diffDays} DAYS` };
     if (diffDays <= 5) return { status: 'WARNING', daysLeft: diffDays, msg: `APPROACHING PULL (${diffDays}d)` };
     if (diffDays <= 10) return { status: 'NOTICE', daysLeft: diffDays, msg: `10 DAY WARNING` };
     
     return { status: 'SAFE', daysLeft: diffDays };
  },

  calcTotal(item) {
     if (!item.batches) return '0';
     if (item.isRandomWeight) {
        return item.batches.reduce((sum, b) => sum + (b.weight||0), 0).toFixed(2) + ' lbs';
     } else {
        const totalU = item.batches.reduce((sum, b) => sum + (b.totalUnits||0), 0);
        return totalU + ' units';
     }
  },

  getDepartmentItems(deptId) {
    return this.state.inventory.filter(item => item.deptId === deptId);
  },

  getAllItems() {
    return this.state.inventory;
  },
  
  // Incoming Shipment Logic
  receiveNewBatches(batches) {
     batches.forEach(b => {
         const item = this.state.inventory.find(i => i.id === b.itemId || i.name === b.name);
         if (item) {
             if(!item.batches) item.batches = [];
             // Ensure numeric quantity
             const qty = parseFloat(b.qty) || 1;
             item.batches.push({
                 batchNo: 'B-' + Math.floor(Math.random() * 10000),
                 dateRecv: new Date().toLocaleDateString(),
                 dateMan: b.dateMan || new Date().toLocaleDateString(),
                 loc: 'Storefront',
                 ...(item.isRandomWeight ? { weight: qty } : { totalUnits: qty, qtyCases: Math.floor(qty / (item.unitsPerCase||1)) })
             });
         }
     });
     this.notify();
     if (typeof AITeacher !== 'undefined') AITeacher.showTip(`Successfully committed simulated incoming items to Live Inventory Database.`);
  },
  
  // FIFO Deduction Logic
  deductInventory(itemsToDeduct) {
    itemsToDeduct.forEach(req => {
        const item = this.state.inventory.find(i => i.id === req.itemId || i.name === req.name);
        if (!item || !item.batches) return;
        
        // Sort batches by oldest received date to enforce FIFO
        item.batches.sort((a, b) => new Date(a.dateRecv) - new Date(b.dateRecv));
        
        let remainingToDeduct = parseFloat(req.qty) || 1;
        
        for (let batch of item.batches) {
          if (remainingToDeduct <= 0) break;
          if (item.isRandomWeight) {
            batch.weight -= remainingToDeduct; 
            remainingToDeduct = 0;
          } else {
            if (batch.totalUnits >= remainingToDeduct) {
              batch.totalUnits -= remainingToDeduct;
              remainingToDeduct = 0;
            } else {
              remainingToDeduct -= batch.totalUnits;
              batch.totalUnits = 0;
            }
            batch.qtyCases = Math.floor(batch.totalUnits / (item.unitsPerCase||1));
          }
        }
        
        // Filter out empty batches
        item.batches = item.batches.filter(b => (item.isRandomWeight ? (b.weight && b.weight > 0) : (b.totalUnits && b.totalUnits > 0)));
    });
    this.notify();
    if (typeof AITeacher !== 'undefined') AITeacher.showTip(`Successfully finalized EOD sales deductions.`);
  }
};
