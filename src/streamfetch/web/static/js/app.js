const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const resultsList = document.getElementById('resultsList');
const connectionStatus = document.getElementById('connectionStatus');
const resultTemplate = document.getElementById('resultTemplate');

const queueList = document.getElementById('queueList');
const queueItemTemplate = document.getElementById('queueItemTemplate');
const currentDownload = document.getElementById('currentDownload');
const currentTitle = document.getElementById('currentTitle');
const progressBar = document.getElementById('progressBar');
const progressText = document.getElementById('progressText');
const statusText = document.getElementById('statusText');

let ws;

// --- WebSocket ---

function connectWebSocket() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    ws = new WebSocket(`${protocol}//${window.location.host}/api/ws`);

    ws.onopen = () => {
        connectionStatus.classList.add('hidden');
        console.log("Connected to WebSocket");
    };

    ws.onclose = () => {
        connectionStatus.classList.remove('hidden');
        connectionStatus.textContent = "Disconnected. Reconnecting...";
        setTimeout(connectWebSocket, 3000);
    };

    ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        handleWsMessage(data);
    };
}

function handleWsMessage(data) {
    console.log("WS Message:", data);
    
    switch(data.type) {
        case 'queue_update':
            updateQueueUI(data.queue, data.current);
            break;
        case 'progress':
            updateProgressUI(data);
            break;
        case 'complete':
            // Completion might be handled by queue_update automatically, 
            // but we can use this for specific notifications
            if (data.downloadUrl) {
                // Trigger download
                const link = document.createElement('a');
                link.href = data.downloadUrl;
                link.download = ''; // Browser should handle filename
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                
                // Optional: Toast
                const toast = document.createElement('div');
                toast.className = 'fixed bottom-4 right-4 bg-green-600 text-white px-4 py-2 rounded shadow-lg animate-bounce';
                toast.textContent = 'Saving to device...';
                document.body.appendChild(toast);
                setTimeout(() => toast.remove(), 3000);
            }
            break;
        case 'error':
            alert(`Error: ${data.message}`);
            break;
    }
}

// --- UI Updates ---

function updateQueueUI(queue, current) {
    // Current Download
    if (current) {
        currentDownload.classList.remove('hidden');
        currentTitle.textContent = current.title;
        // Reset progress if it's a new track? 
        // We rely on 'progress' events for bar updates
    } else {
        currentDownload.classList.add('hidden');
        resetProgress();
    }

    // Queue List
    queueList.innerHTML = '';
    if (queue.length === 0) {
        queueList.innerHTML = '<p class="text-center text-gray-600 text-sm py-4">Queue is empty</p>';
        return;
    }

    queue.forEach(item => {
        const clone = queueItemTemplate.content.cloneNode(true);
        clone.querySelector('.queue-title').textContent = item.title;
        clone.querySelector('.queue-artist').textContent = item.artist;
        queueList.appendChild(clone);
    });
}

function updateProgressUI(data) {
    if (data.status === 'start') {
        progressBar.style.width = '0%';
        progressText.textContent = '0%';
        statusText.textContent = 'Starting download...';
    } else if (data.status === 'progress') {
        const percent = Math.round((data.completed / data.total) * 100);
        progressBar.style.width = `${percent}%`;
        progressText.textContent = `${percent}%`;
        statusText.textContent = `Downloading...`;
    } else if (data.status === 'processing') {
        progressBar.style.width = '100%';
        progressText.textContent = '100%';
        statusText.textContent = 'Processing metadata/muxing...';
    } else if (data.status === 'finish') {
        statusText.textContent = 'Done!';
    }
}

function resetProgress() {
    progressBar.style.width = '0%';
    progressText.textContent = '0%';
    statusText.textContent = 'Idle';
}


// --- Search ---

async function performSearch() {
    const query = searchInput.value.trim();
    if (!query) return;

    resultsList.innerHTML = '<div class="text-center py-8"><i class="fas fa-spinner fa-spin text-cyan-500 text-2xl"></i></div>';

    try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        const data = await response.json();
        
        renderResults(data.results);
    } catch (e) {
        resultsList.innerHTML = `<div class="text-center text-red-500 py-8">Error: ${e.message}</div>`;
    }
}

function renderResults(results) {
    resultsList.innerHTML = '';
    
    if (!results || results.length === 0) {
        resultsList.innerHTML = '<div class="text-center text-gray-500 py-8">No results found</div>';
        return;
    }

    results.forEach(track => {
        const clone = resultTemplate.content.cloneNode(true);
        clone.querySelector('.result-title').textContent = track.title;
        clone.querySelector('.result-artist').textContent = track.artist;
        clone.querySelector('.result-album').textContent = track.album;
        clone.querySelector('.result-quality').textContent = track.quality;
        
        const btn = clone.querySelector('.download-btn');
        btn.onclick = () => addToQueue(track);
        
        resultsList.appendChild(clone);
    });
}


// --- Queue Handling ---

async function addToQueue(track) {
    try {
        const response = await fetch('/api/download', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ items: [track] })
        });
        
        if (response.ok) {
            // Animation or toast could go here
            console.log("Added to queue");
        }
    } catch (e) {
        console.error("Failed to add to queue", e);
    }
}


// --- Events ---

searchBtn.addEventListener('click', performSearch);
searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') performSearch();
});

// Init
connectWebSocket();
