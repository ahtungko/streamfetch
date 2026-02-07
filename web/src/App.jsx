import { useState } from 'react';
import SearchBar from './components/SearchBar';
import TrackList from './components/TrackList';
import DownloadManager from './components/DownloadManager';
import './App.css';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

function App() {
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [downloads, setDownloads] = useState([]);

  const handleSearch = async (query) => {
    setIsSearching(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query }),
      });
      const data = await response.json();
      setSearchResults(data.results || []);
    } catch (error) {
      console.error('Search failed:', error);
      alert('Search failed. Please try again.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleDownload = async (trackId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/download`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ track_id: trackId }),
      });
      const data = await response.json();
      
      const newDownload = {
        id: data.download_id,
        trackId: trackId,
        status: 'queued',
        progress: 0,
        message: 'Starting download...',
      };
      
      setDownloads(prev => [...prev, newDownload]);
      
      // Connect to SSE for progress updates
      const eventSource = new EventSource(
        `${API_BASE_URL}/api/download/${data.download_id}/stream`
      );
      
      eventSource.onmessage = (event) => {
        const progressData = JSON.parse(event.data);
        
        setDownloads(prev =>
          prev.map(d =>
            d.id === data.download_id
              ? {
                  ...d,
                  status: progressData.stage,
                  message: progressData.message || '',
                  progress: progressData.current && progressData.total
                    ? (progressData.current / progressData.total) * 100
                    : d.progress,
                  filePath: progressData.file_path,
                  fileName: progressData.file_name,
                }
              : d
          )
        );
        
        // Close connection on completion or error
        if (progressData.stage === 'completed' || progressData.stage === 'error') {
          eventSource.close();
        }
      };
      
      eventSource.onerror = () => {
        eventSource.close();
      };
    } catch (error) {
      console.error('Download failed:', error);
      alert('Failed to start download. Please try again.');
    }
  };

  const handleDownloadFile = async (downloadId) => {
    window.open(`${API_BASE_URL}/api/download/${downloadId}/file`, '_blank');
  };

  const handleRemoveDownload = (downloadId) => {
    setDownloads(prev => prev.filter(d => d.id !== downloadId));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900">
      <div className="container mx-auto px-4 py-8">
        <header className="mb-8 text-center">
          <h1 className="text-5xl font-bold text-white mb-2">
            🎵 StreamFetch
          </h1>
          <p className="text-gray-300">Search and download music from TIDAL</p>
        </header>

        <div className="max-w-4xl mx-auto">
          <SearchBar onSearch={handleSearch} isSearching={isSearching} />
          
          {searchResults.length > 0 && (
            <TrackList 
              tracks={searchResults} 
              onDownload={handleDownload}
              downloads={downloads}
            />
          )}
          
          {downloads.length > 0 && (
            <DownloadManager
              downloads={downloads}
              onDownloadFile={handleDownloadFile}
              onRemove={handleRemoveDownload}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
