import './App.css';
import VideoUpload from './components/VideoUpload.jsx';
import Sidebar from './components/Sidebar.jsx';

function App() {
  return (
    <div style={{ display: "flex", width: "100vw", minHeight: "100vh" }}>
      {/* Sidebar: fixed 260px wide, full height */}
      <div style={{ width: "260px", minWidth: "260px", minHeight: "100vh", flexShrink: 0 }}>
        <Sidebar />
      </div>

      {/* Main content: fills all remaining space */}
      <div style={{ flex: 1, minHeight: "100vh", overflow: "auto" }}>
        <VideoUpload />
      </div>
    </div>
  );
}

export default App;
