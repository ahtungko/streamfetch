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
const toastContainer = document.getElementById('toastContainer');
const mobileQueueBtn = document.getElementById('mobileQueueBtn');

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
    // console.log("WS Message:", data);
    
    switch(data.type) {
        case 'queue_update':
            updateQueueUI(data.queue, data.current);
            break;
        case 'progress':
            updateProgressUI(data);
            break;
        case 'complete':
            if (data.downloadUrl) {
                // Trigger download
                const link = document.createElement('a');
                link.href = data.downloadUrl;
                link.download = ''; // Browser should handle filename
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                
                showToast(`Download started: ${data.trackId}`, 'success');
            }
            break;
        case 'error':
            showToast(`Error: ${data.message}`, 'error');
            break;
    }
}

function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    const bgClass = type === 'error' ? 'bg-red-600' : 'bg-cyan-600';
    const icon = type === 'error' ? 'fa-exclamation-circle' : 'fa-check-circle';
    
    toast.className = `${bgClass} text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 animate-slide-up transform transition-all duration-500`;
    toast.innerHTML = `
        <i class="fas ${icon}"></i>
        <span class="font-medium">${message}</span>
    `;
    
    toastContainer.appendChild(toast);
    
    // Remove after 3 seconds
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(10px)';
        setTimeout(() => toast.remove(), 500);
    }, 3000);
}

// --- UI Updates ---

function updateQueueUI(queue, current) {
    // Current Download
    if (current) {
        currentDownload.classList.remove('hidden');
        currentTitle.textContent = current.title;
    } else {
        currentDownload.classList.add('hidden');
        resetProgress();
    }

    // Queue List
    queueList.innerHTML = '';
    if (queue.length === 0) {
        queueList.innerHTML = '<p class="text-center text-slate-500 text-xs py-4">Queue is empty</p>';
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
    const bar = document.getElementById('progressBar');
    
    // Handle different status types
    if (data.status === 'start') {
        bar.style.width = '0%';
        progressText.textContent = '0%';
        statusText.textContent = 'Starting download...';
    } 
    else if (data.status === 'progress') {
        const percent = Math.round((data.completed / data.total) * 100);
        bar.style.width = `${percent}%`;
        progressText.textContent = `${percent}%`;
        statusText.textContent = 'Downloading segments...';
    } 
    else if (data.status === 'processing') {
        bar.style.width = '100%';
        progressText.textContent = '100%';
        statusText.textContent = `Processing: ${data.step}...`;
    } 
    else if (data.status === 'finish') {
        statusText.textContent = 'Finalizing...';
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

    resultsList.innerHTML = '<div class="col-span-full text-center py-12"><i class="fas fa-circle-notch fa-spin text-cyan-500 text-3xl"></i><p class="mt-4 text-slate-400">Searching Tidal...</p></div>';

    try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        const data = await response.json();
        
        renderResults(data.results);
    } catch (e) {
        resultsList.innerHTML = `<div class="col-span-full text-center text-red-400 py-8"><i class="fas fa-exclamation-triangle text-3xl mb-2"></i><p>Error: ${e.message}</p></div>`;
    }
}

function renderResults(results) {
    resultsList.innerHTML = '';
    
    if (!results || results.length === 0) {
        resultsList.innerHTML = '<div class="col-span-full text-center text-slate-500 py-12"><p class="text-lg">No results found.</p></div>';
        return;
    }

    results.forEach(track => {
        const clone = resultTemplate.content.cloneNode(true);
        
        // Populate data
        clone.querySelector('.result-title').textContent = track.title;
        clone.querySelector('.result-artist').textContent = track.artist;
        clone.querySelector('.result-album').textContent = track.album;
        clone.querySelector('.result-quality').textContent = track.quality;
        
        // Handle Album Art Placeholder (if we had URLs we would set img src)
        // Currently we don't have direct image URLs in the search result object easily without proxying
        // But we can try if the backend provides it. 
        // For now, the placeholder icon is fine.
        
        const btn = clone.querySelector('.download-btn');
        btn.onclick = (e) => {
            e.stopPropagation(); // Prevent card click if we add one later
            
            // Visual feedback
            const icon = btn.querySelector('i');
            icon.className = 'fas fa-spinner fa-spin';
            
            addToQueue(track).then(() => {
                icon.className = 'fas fa-check';
                setTimeout(() => {
                    icon.className = 'fas fa-download';
                }, 2000);
            });
        };
        
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
            showToast(`Added to queue: ${track.title}`, 'success');
        } else {
            showToast('Failed to add to queue', 'error');
        }
    } catch (e) {
        console.error("Failed to add to queue", e);
        showToast('Network error', 'error');
    }
}


// --- Events ---

searchBtn.addEventListener('click', performSearch);
searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') performSearch();
});

// Mobile Queue Toggle
if (mobileQueueBtn) {
    mobileQueueBtn.addEventListener('click', () => {
        // Simple toggle for now, or just alert?
        // Ideally we slide in a drawer. 
        // For MVP redesign, let's just scroll to queue or toggle visibility class
        const queueColumn = document.querySelector('.lg\\:block'); // select the queue container
        if (queueColumn) {
            queueColumn.classList.toggle('hidden');
            queueColumn.classList.toggle('fixed');
            queueColumn.classList.toggle('inset-0');
            queueColumn.classList.toggle('bg-slate-900');
            queueColumn.classList.toggle('z-50');
            queueColumn.classList.toggle('p-4');
            // This is a bit hacky for a "toggle", but suffices for "responsive" requirement if improved later.
            // Better: use a real modal/drawer implementation. 
            // I'll stick to non-modal for now to avoid complexity in one go.
        }
    });
}

// Init
connectWebSocket();
