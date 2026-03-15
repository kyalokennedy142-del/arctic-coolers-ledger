// Offline detection + queue for sync
class OfflineManager {
  constructor() {
    this.isOnline = navigator.onLine;
    this.pendingOperations = [];
    
    // Listen for online/offline events
    window.addEventListener('online', () => this.handleOnline());
    window.addEventListener('offline', () => this.handleOffline());
  }

  handleOnline() {
    console.log('🌐 Back online! Syncing pending operations...');
    this.isOnline = true;
    this.syncPendingOperations();
  }

  handleOffline() {
    console.log('📴 Went offline. Queuing operations...');
    this.isOnline = false;
  }

  // Queue operation for later sync
  queueOperation(operation) {
    this.pendingOperations.push({
      ...operation,
      timestamp: Date.now(),
      id: Date.now() + Math.random()
    });
    
    // Save to localStorage as backup
    localStorage.setItem('pendingOperations', JSON.stringify(this.pendingOperations));
    
    console.log('⏳ Queued operation:', operation.type);
  }

  // Sync all pending operations
  async syncPendingOperations() {
    if (this.pendingOperations.length === 0) return;

    console.log(`🔄 Syncing ${this.pendingOperations.length} pending operations...`);

    const failed = [];

    for (const op of this.pendingOperations) {
      try {
        await this.executeOperation(op);
        console.log(`✅ Synced: ${op.type} - ${op.id}`);
      } catch (error) {
        console.error(`❌ Failed to sync: ${op.type}`, error);
        failed.push(op);
      }
    }

    this.pendingOperations = failed;
    localStorage.setItem('pendingOperations', JSON.stringify(this.pendingOperations));
  }

  // Execute a single operation
  async executeOperation(operation) {
    const { supabase } = await import('./supabaseClient');

    switch (operation.type) {
      case 'INSERT_CUSTOMERS':
        return await supabase.from('customers').insert(operation.data);
      case 'UPDATE_CUSTOMERS':
        return await supabase.from('customers').update(operation.data).eq('id', operation.id);
      case 'DELETE_CUSTOMERS':
        return await supabase.from('customers').delete().eq('id', operation.id);
      // Add more types as needed
      default:
        throw new Error(`Unknown operation type: ${operation.type}`);
    }
  }

  // Load pending operations from localStorage
  loadPendingOperations() {
    const saved = localStorage.getItem('pendingOperations');
    if (saved) {
      this.pendingOperations = JSON.parse(saved);
      console.log(`📋 Loaded ${this.pendingOperations.length} pending operations from storage`);
    }
  }
}

// Export singleton instance
export const offlineManager = new OfflineManager();