export default function TrackList({ tracks, onDownload, downloads }) {
  const isDownloading = (trackId) => {
    return downloads.some(d => d.trackId === trackId && d.status !== 'completed' && d.status !== 'error');
  };

  const getQualityBadgeColor = (quality) => {
    switch (quality) {
      case 'HI_RES':
        return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/50';
      case 'LOSSLESS':
        return 'bg-blue-500/20 text-blue-300 border-blue-500/50';
      case 'HIGH':
        return 'bg-green-500/20 text-green-300 border-green-500/50';
      default:
        return 'bg-gray-500/20 text-gray-300 border-gray-500/50';
    }
  };

  return (
    <div className="mb-8">
      <h2 className="text-2xl font-bold text-white mb-4">Search Results</h2>
      <div className="space-y-3">
        {tracks.map((track) => (
          <div
            key={track.id}
            className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-lg p-4 hover:bg-gray-800/70 transition-all duration-200"
          >
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-semibold text-white truncate">
                  {track.title}
                </h3>
                <p className="text-gray-400 text-sm truncate">{track.artist}</p>
                <p className="text-gray-500 text-xs truncate">{track.album}</p>
              </div>
              
              <div className="flex items-center gap-3">
                <span className={`px-3 py-1 text-xs font-semibold rounded-full border ${getQualityBadgeColor(track.quality)}`}>
                  {track.quality}
                </span>
                
                <button
                  onClick={() => onDownload(track.id)}
                  disabled={isDownloading(track.id)}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors duration-200 flex items-center gap-2"
                >
                  {isDownloading(track.id) ? (
                    <>
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Downloading...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      Download
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
