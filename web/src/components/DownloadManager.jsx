export default function DownloadManager({ downloads, onDownloadFile, onRemove }) {
  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return (
          <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        );
      case 'error':
        return (
          <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        );
      default:
        return (
          <svg className="animate-spin h-5 w-5 text-purple-500" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        );
    }
  };

  const getStageLabel = (stage) => {
    const labels = {
      queued: 'Queued',
      metadata: 'Fetching metadata',
      manifest: 'Getting stream',
      downloading: 'Downloading',
      cover: 'Downloading cover',
      lyrics: 'Fetching lyrics',
      muxing: 'Processing',
      completed: 'Completed',
      error: 'Error',
    };
    return labels[stage] || stage;
  };

  return (
    <div className="mt-8">
      <h2 className="text-2xl font-bold text-white mb-4">Downloads</h2>
      <div className="space-y-3">
        {downloads.map((download) => (
          <div
            key={download.id}
            className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-lg p-4"
          >
            <div className="flex items-start justify-between gap-4 mb-3">
              <div className="flex items-start gap-3 flex-1 min-w-0">
                {getStatusIcon(download.status)}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-white">{getStageLabel(download.status)}</span>
                    {download.status !== 'completed' && download.status !== 'error' && (
                      <span className="text-gray-400 text-sm">
                        {download.progress > 0 && `${Math.round(download.progress)}%`}
                      </span>
                    )}
                  </div>
                  <p className="text-gray-400 text-sm truncate">{download.message}</p>
                  {download.fileName && (
                    <p className="text-gray-500 text-xs truncate mt-1">{download.fileName}</p>
                  )}
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                {download.status === 'completed' && download.filePath && (
                  <button
                    onClick={() => onDownloadFile(download.id)}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors duration-200 flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Download File
                  </button>
                )}
                
                {(download.status === 'completed' || download.status === 'error') && (
                  <button
                    onClick={() => onRemove(download.id)}
                    className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors duration-200"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
            
            {download.status !== 'completed' && download.status !== 'error' && download.progress > 0 && (
              <div className="w-full bg-gray-700 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-purple-600 h-2 transition-all duration-300 ease-out"
                  style={{ width: `${download.progress}%` }}
                />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
