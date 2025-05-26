import { db, collection, getDocs, setDoc, doc, deleteDoc } from '../firebase/firebase.js';

export const StorageController = {
  async load() {
    const snapshot = await getDocs(collection(db, "inventory_items"));
    const items = snapshot.docs.map(doc => doc.data());
    console.log("Loaded inventory from Firebase:", items.length, "items");
    return items;
  },

  async save(data) {
    for (const item of data) {
      await setDoc(doc(db, "inventory_items", item.id), item);
    }
    console.log("Inventory saved to Firebase.");
  }

  ,

  async delete(id) {
    await deleteDoc(doc(db, "inventory_items", id));
    console.log("Deleted item with ID:", id);
  }
};