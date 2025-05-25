export const StorageController = {
  endpoint: "https://us-central1-jccims.cloudfunctions.net/jccStockroomCore/inventory",

  async init() {
    console.log("StorageController initialized");
    await this.autoLoad();
  },

  async autoLoad() {
    try {
      const response = await fetch(this.endpoint);
      const data = await response.json();
      localStorage.setItem("inventory_items", JSON.stringify(data));
      console.log("Loaded inventory from cloud.");
      return data;
    } catch (error) {
      console.error("Failed to fetch from cloud. Error:", error);
      return null;
    }
  },

  async load() {
    return this.autoLoad();
  },

  async save(data) {
    try {
      const response = await fetch(this.endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error("Network response was not ok.");
      console.log("Inventory saved to cloud.");
    } catch (error) {
      console.error("Save to cloud failed:", error);
    }
  }
};