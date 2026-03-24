// ✅ Improved fetch handler for SPA + offline support
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') return;
  
  // Skip Clerk/auth requests (let them go to network)
  if (event.request.url.includes('clerk') || 
      event.request.url.includes('supabase') ||
      event.request.url.includes('localhost')) {
    return;
  }
  
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // If successful, cache and return
        if (response.ok) {
          const clone = response.clone();
          caches.open('arctic-ledger-v1').then((cache) => {
            cache.put(event.request, clone);
          });
        }
        return response;
      })
      .catch(() => {
        // Only serve offline.html for navigation requests (SPA routes)
        if (event.request.mode === 'navigate') {
          return caches.match('/index.html').then((cached) => {
            return cached || caches.match('/offline.html');
          });
        }
        // For assets, try cache first
        return caches.match(event.request).then((cached) => {
          return cached || caches.match('/offline.html');
        });
      })
  );
});