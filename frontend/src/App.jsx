import './App.css';
import VideoUpload from './components/VideoUpload.jsx';

function App() {
  return (
    <div className="app" style={{ padding: '2rem', maxWidth: '800px', margin: 'auto' }}>
      <h2>Video Transcription Demo</h2>
      <VideoUpload />
    </div>
  );
}

export default App;
