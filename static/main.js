document.addEventListener('DOMContentLoaded', () => {
    // --- State & Elements ---
    const socket = io();
    let room = '';
    let username = '';
    let mySid = '';
    let followingSid = null; // SID of the user we are currently following

    // Application state received from the server
    let roomState = {
        participants: [],
        documents: {},
        user_states: {}
    };

    // UI Elements
    const elements = {
        roomName: document.getElementById('room-name'),
        userName: document.getElementById('user-name'),
        participantsList: document.getElementById('participants-list'),
        documentsList: document.getElementById('documents-list'),
        fileUpload: document.getElementById('file-upload'),
        status: document.getElementById('status'),
        viewerContainer: document.getElementById('viewer-container'),
        pageImage: document.getElementById('page-image'),
        highlightCanvas: document.getElementById('highlight-canvas'),
        prevPageBtn: document.getElementById('prev-page-btn'),
        nextPageBtn: document.getElementById('next-page-btn'),
        pageIndicator: document.getElementById('page-indicator')
    };

    let isDrawing = false;
    let highlightRect = {};

    // --- Initial Connection & Room Setup ---
    function setupConnection() {
        socket.on('connect', () => {
            mySid = socket.id;
            console.log(`Connected to server with SID: ${mySid}`);

            while (!room) room = prompt('Enter a room name:');
            while (!username) username = prompt('Enter your username:');

            elements.roomName.textContent = room;
            elements.userName.textContent = username;

            socket.emit('join', { room, username });
        });

        socket.on('room_update', (newState) => {
            console.log('Received room update:', newState);
            roomState = newState;
            renderAll();
        });
    }

    // --- Rendering Functions ---
    function renderAll() {
        renderParticipants();
        renderDocuments();
        renderViewer();
    }

    function renderParticipants() {
        elements.participantsList.innerHTML = '';
        for (const sid in roomState.participants) {
            const name = roomState.participants[sid];
            const li = document.createElement('li');
            li.className = 'p-2 rounded cursor-pointer';
            li.textContent = name;
            
            if (sid === mySid) {
                li.classList.add('bg-blue-700', 'font-bold');
                li.textContent += ' (You)';
            } else {
                 li.classList.add('hover:bg-gray-600');
            }

            if(sid === followingSid) {
                li.classList.add('bg-green-600');
            }

            li.addEventListener('click', () => {
                if (sid !== mySid) {
                    followingSid = followingSid === sid ? null : sid; // Toggle following
                    console.log(`Toggled following. Now following: ${followingSid}`);
                    renderAll();
                }
            });
            elements.participantsList.appendChild(li);
        }
    }

    function renderDocuments() {
        elements.documentsList.innerHTML = '';
        
        // Group documents by uploader
        const docsByUploader = {};
        for (const docId in roomState.documents) {
            const doc = roomState.documents[docId];
            if (!docsByUploader[doc.uploader]) {
                docsByUploader[doc.uploader] = [];
            }
            docsByUploader[doc.uploader].push({ id: docId, ...doc });
        }

        for (const uploaderName in docsByUploader) {
            // Add a heading for the uploader
            const heading = document.createElement('h4');
            heading.className = 'font-semibold text-gray-400 mt-2';
            heading.textContent = uploaderName;
            elements.documentsList.appendChild(heading);
            
            // Add the documents for this uploader
            docsByUploader[uploaderName].forEach(doc => {
                const li = document.createElement('li');
                li.className = 'p-2 rounded cursor-pointer hover:bg-gray-600';
                li.textContent = doc.name;
                
                const myState = roomState.user_states[mySid];
                if (myState && myState.current_doc == doc.id && !followingSid) {
                    li.classList.add('bg-blue-700', 'font-bold');
                }
                
                li.addEventListener('click', () => {
                    followingSid = null; // Stop following when selecting a document
                    socket.emit('set_view', { room, doc_id: doc.id, page: 0 });
                });
                elements.documentsList.appendChild(li);
            });
        }
    }

    function renderViewer() {
        const viewSid = followingSid || mySid;
        if (!roomState.user_states[viewSid]) {
            elements.viewerContainer.classList.add('hidden');
            elements.status.textContent = 'User data not available.';
            return;
        }

        const viewState = roomState.user_states[viewSid];
        const docId = viewState.current_doc;

        if (!docId || !roomState.documents[docId]) {
            elements.viewerContainer.classList.add('hidden');
            elements.status.textContent = followingSid ? `Following ${roomState.participants[followingSid]}. They have not selected a document.` : 'Select a document to begin.';
            return;
        }

        elements.viewerContainer.classList.remove('hidden');
        const doc = roomState.documents[docId];
        const currentPage = viewState.current_page;
        
        elements.status.textContent = followingSid ? `Following ${roomState.participants[followingSid]} on ${doc.name}` : `Viewing: ${doc.name}`;
        elements.pageImage.src = `/pdf/${docId}?page=${currentPage}`;
        elements.pageIndicator.textContent = `Page ${currentPage + 1} / ${doc.pages}`;

        elements.prevPageBtn.disabled = currentPage <= 0 || followingSid;
        elements.nextPageBtn.disabled = currentPage >= doc.pages - 1 || followingSid;
        
        drawHighlights(viewState.highlights);
    }
    
    function drawHighlights(highlights) {
        const canvas = elements.highlightCanvas;
        const ctx = canvas.getContext('2d');
        const rect = canvas.getBoundingClientRect();
        
        canvas.width = rect.width;
        canvas.height = rect.height;

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        if (highlights) {
            ctx.fillStyle = 'rgba(255, 255, 0, 0.4)';
            highlights.forEach(h => {
                const [x0, y0, x1, y1] = h;
                ctx.fillRect(x0 * rect.width, y0 * rect.height, (x1-x0) * rect.width, (y1-y0) * rect.height);
            });
        }
    }

    // --- UI Event Handlers ---
    function setupEventHandlers() {
        elements.fileUpload.addEventListener('change', (event) => {
            const file = event.target.files[0];
            if (!file) return;
            
            const reader = new FileReader();
            reader.onload = (e) => {
                socket.emit('upload_file', { room, name: file.name, file: e.target.result });
            };
            reader.readAsArrayBuffer(file);
        });

        elements.prevPageBtn.addEventListener('click', () => {
            if (followingSid) return;
            const myState = roomState.user_states[mySid];
            if (myState && myState.current_page > 0) {
                socket.emit('set_view', { room, page: myState.current_page - 1 });
            }
        });

        elements.nextPageBtn.addEventListener('click', () => {
            if (followingSid) return;
            const myState = roomState.user_states[mySid];
            const doc = roomState.documents[myState.current_doc];
            if (myState && doc && myState.current_page < doc.pages - 1) {
                socket.emit('set_view', { room, page: myState.current_page + 1 });
            }
        });

        // --- Drawing Logic ---
        elements.highlightCanvas.addEventListener('mousedown', (e) => {
            if (followingSid) return;
            isDrawing = true;
            const rect = elements.highlightCanvas.getBoundingClientRect();
            highlightRect.x0 = (e.clientX - rect.left) / rect.width;
            highlightRect.y0 = (e.clientY - rect.top) / rect.height;
        });

        elements.highlightCanvas.addEventListener('mouseup', () => {
            if (followingSid || !isDrawing) return;
            isDrawing = false;
            
            const highlights = [[highlightRect.x0, highlightRect.y0, highlightRect.x1, highlightRect.y1]];
            socket.emit('update_highlight', { room, highlights });
        });

        elements.highlightCanvas.addEventListener('mousemove', (e) => {
            if (followingSid || !isDrawing) return;
            const rect = elements.highlightCanvas.getBoundingClientRect();
            highlightRect.x1 = (e.clientX - rect.left) / rect.width;
            highlightRect.y1 = (e.clientY - rect.top) / rect.height;
            
            // Draw a temporary rectangle for immediate feedback
            const myState = roomState.user_states[mySid];
            drawHighlights(myState.highlights); // Redraw existing highlights
            const tempCtx = elements.highlightCanvas.getContext('2d');
            tempCtx.fillStyle = 'rgba(255, 20, 20, 0.4)';
            tempCtx.fillRect(
                highlightRect.x0 * rect.width,
                highlightRect.y0 * rect.height,
                (highlightRect.x1 - highlightRect.x0) * rect.width,
                (highlightRect.y1 - highlightRect.y0) * rect.height
            );
        });
    }

    // --- Initialize ---
    setupConnection();
    setupEventHandlers();
});
