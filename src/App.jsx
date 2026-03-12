function App() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100">
      <h1 className="text-4xl font-bold text-blue-600">
        ARCTIC COOLERS LEDGER
      </h1>
    </div>
  )
// At the very top of your component return:
useEffect(() => {
  // Add a visible marker to the page
  const marker = document.createElement('div');
  marker.id = 'app-mounted-marker';
  marker.style.cssText = 'position:fixed;top:0;left:0;background:#0f0;color:#000;padding:5px;font-size:12px;z-index:9999;';
  marker.textContent = '✅ APP MOUNTED - ' + new Date().toLocaleTimeString();
  document.body.appendChild(marker);
  
  console.log('🚀 App component mounted!');
  
  return () => {
    marker.remove();
  };
}, []);

}

export default App