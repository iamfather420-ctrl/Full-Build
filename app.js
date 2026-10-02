// Core Javascript Logic for DAISY MMTAI WebView Hybrid Applet

// Global State
let currentTab = 'TETHERS';
let tetherNodes = [];
let ingressFiles = [];
let discoveryLinks = [];
let consensusTasks = [];
let logEvents = [];
let isSpeaking = false;
let currentUtterance = 'Co-Pilot Idle. Awaiting commands.';
let waveAmplitudes = [0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1];

// Initialize Canvas layouts
const tetherCanvas = document.getElementById('tetherCanvas');
const tetherCtx = tetherCanvas.getContext('2d');
const waveCanvas = document.getElementById('waveCanvas');
const waveCtx = waveCanvas.getContext('2d');

window.addEventListener('resize', resizeCanvases);
window.addEventListener('load', () => {
    resizeCanvases();
    updateUtcClock();
    setInterval(updateUtcClock, 1000);
    animateWaveform();
    animateTethers();
});

function resizeCanvases() {
    tetherCanvas.width = window.innerWidth;
    tetherCanvas.height = window.innerHeight;
    waveCanvas.width = waveCanvas.parentElement.clientWidth;
    waveCanvas.height = waveCanvas.parentElement.clientHeight;
}

// UTC Bridge Clock
function updateUtcClock() {
    const d = new Date();
    const utcTime = d.getUTCFullYear() + '-' +
        String(d.getUTCMonth() + 1).padStart(2, '0') + '-' +
        String(d.getUTCDate()).padStart(2, '0') + ' ' +
        String(d.getUTCHours()).padStart(2, '0') + ':' +
        String(d.getUTCMinutes()).padStart(2, '0') + ':' +
        String(d.getUTCSeconds()).padStart(2, '0') + ' UTC';
    document.getElementById('utcBridge').textContent = 'UTC Bridge: ' + utcTime;
}

// Helper: Safely decode Base64 containing UTF-8 characters
function decodeBase64Utf8(base64) {
    try {
        const binString = atob(base64);
        const bytes = Uint8Array.from(binString, (m) => m.codePointAt(0));
        return new TextDecoder().decode(bytes);
    } catch (e) {
        console.error("decodeBase64Utf8 error: ", e);
        return atob(base64);
    }
}

// 1. STATE RECEIVERS FROM ANDROID (NATIVE -> WEB)
window.updateTetherNodes = function(nodesBase64) {
    try {
        const nodesJson = decodeBase64Utf8(nodesBase64);
        tetherNodes = JSON.parse(nodesJson);
        renderTetherNodes();
        renderWidgetNodes();
    } catch (e) {
        console.error("Error parsing nodes base64: ", e);
    }
};

window.updateIngressFiles = function(filesBase64) {
    try {
        const filesJson = decodeBase64Utf8(filesBase64);
        ingressFiles = JSON.parse(filesJson);
        renderIngressFiles();
    } catch (e) {
        console.error("Error parsing files base64: ", e);
    }
};

window.updateDiscoveryLinks = function(linksBase64) {
    try {
        const linksJson = decodeBase64Utf8(linksBase64);
        discoveryLinks = JSON.parse(linksJson);
        renderDiscoveryLinks();
    } catch (e) {
        console.error("Error parsing discovery links base64: ", e);
    }
};

window.updateConsensusTasks = function(tasksBase64) {
    try {
        const tasksJson = decodeBase64Utf8(tasksBase64);
        consensusTasks = JSON.parse(tasksJson);
        renderConsensusTasks();
    } catch (e) {
        console.error("Error parsing consensus tasks base64: ", e);
    }
};

window.updateLogEvents = function(logsBase64) {
    try {
        const logsJson = decodeBase64Utf8(logsBase64);
        logEvents = JSON.parse(logsJson);
        renderLogEvents();
    } catch (e) {
        console.error("Error parsing log events base64: ", e);
    }
};

window.updateVoiceState = function(speaking, utteranceBase64, waveBase64) {
    isSpeaking = speaking;
    try {
        currentUtterance = decodeBase64Utf8(utteranceBase64);
    } catch (e) {
        currentUtterance = "Co-Pilot active.";
    }
    try {
        const waveJson = decodeBase64Utf8(waveBase64);
        waveAmplitudes = JSON.parse(waveJson);
    } catch (e) {}

    // Update bottom panel text and mic capsule class
    document.getElementById('copilotUtterance').textContent = currentUtterance;
    const copilotMic = document.getElementById('copilotMic');
    if (isSpeaking) {
        copilotMic.classList.add('speaking');
    } else {
        copilotMic.classList.remove('speaking');
    }
};

// 2. DISPATCHERS (WEB -> NATIVE)
function callNative(funcName, ...args) {
    if (window.DaisyBridge && typeof window.DaisyBridge[funcName] === 'function') {
        window.DaisyBridge[funcName](...args);
    } else {
        console.warn(`DaisyBridge.${funcName} not available in browser. Simulated run.`);
        simulateActionInBrowser(funcName, ...args);
    }
}

// 3. UI RENDERING METHODS
function switchTab(tabId) {
    currentTab = tabId;
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));

    const activeBtn = document.querySelector(`.tab-btn[data-tab="${tabId}"]`);
    if (activeBtn) activeBtn.classList.add('active');

    const targetContent = document.getElementById('tab-' + tabId);
    if (targetContent) targetContent.classList.add('active');
}

function renderWidgetNodes() {
    const grid = document.getElementById('widgetNodesGrid');
    grid.innerHTML = '';
    
    document.getElementById('connectedNodesCount').textContent = tetherNodes.filter(n => n.active).length + ' CONNECTED NODES';

    tetherNodes.forEach(node => {
        const caps = document.createElement('div');
        caps.className = 'widget-node-capsule';
        
        const dot = document.createElement('div');
        dot.className = 'widget-node-dot ' + (node.active ? 'active' : 'tripped');
        
        const name = document.createElement('span');
        name.className = 'widget-node-name';
        name.textContent = node.sessionName.toUpperCase().substring(0, 15) + (node.sessionName.length > 15 ? '..' : '');

        caps.appendChild(dot);
        caps.appendChild(name);
        grid.appendChild(caps);
    });
}

function renderTetherNodes() {
    const container = document.getElementById('nodesContainer');
    container.innerHTML = '';

    if (tetherNodes.length === 0) {
        container.innerHTML = `<p class="subtitle" style="text-align: center; padding: 24px; color: var(--text-muted);">No active tether nodes. Create one to begin.</p>`;
        return;
    }

    tetherNodes.forEach(node => {
        const card = document.createElement('div');
        card.id = `node-card-${node.sessionId}`;
        card.className = `node-card ${node.active ? 'active' : 'tripped'}`;

        card.innerHTML = `
            <div class="node-header">
                <div class="node-title-group">
                    <div class="node-dot-large ${node.active ? 'active' : 'tripped'}"></div>
                    <h4>${node.sessionName}</h4>
                </div>
                <div class="node-actions">
                    ${node.active ? 
                        `<button class="small-btn small-btn-pink" onclick="tripNode('${node.sessionId}')">TRIP BREAKER</button>` : 
                        `<button class="small-btn small-btn-green" onclick="reconnectNode('${node.sessionId}')">RESET</button>`
                    }
                    <button class="small-btn small-btn-outlined" onclick="severTether('${node.sessionId}')">SEVER</button>
                </div>
            </div>
            <div class="node-detail-row">
                <span class="detail-label">SELECTOR:</span>
                <span class="detail-value">${node.domSelector}</span>
            </div>
            <div class="node-detail-row">
                <span class="detail-label">SANDBOX BUCKET:</span>
                <span class="detail-value">${node.targetBucket}</span>
            </div>
            <div class="node-status-bar">
                <span>MUTATIONS COUNT: ${node.mutationsCount}</span>
                <span>STATE: ${node.active ? 'MUTATION_WATCH_RUNNING' : 'TRIPPED_CIRCUIT_BREAKER'}</span>
            </div>
        `;
        container.appendChild(card);
    });
}

function renderIngressFiles() {
    const container = document.getElementById('filesContainer');
    container.innerHTML = '';

    if (ingressFiles.length === 0) {
        container.innerHTML = `<p class="subtitle" style="text-align: center; padding: 12px; color: var(--text-muted);">No files ingested. Drop a ZIP or add one manually.</p>`;
        return;
    }

    ingressFiles.forEach((file, index) => {
        const item = document.createElement('div');
        item.className = 'file-item';
        
        item.innerHTML = `
            <div class="file-row" onclick="toggleCodePreview(${index})">
                <div class="file-info">
                    <span class="file-icon">${file.name.endsWith('.json') ? '&#128203;' : '&#128196;'}</span>
                    <div class="file-meta">
                        <h5>${file.name}</h5>
                        <span>Size: ${(file.content.length / 1024).toFixed(2)} KB | Path: src/main/java/${file.name}</span>
                    </div>
                </div>
                <button class="inspect-btn" id="inspect-btn-${index}">INSPECT</button>
            </div>
            <div class="file-code-preview" id="code-preview-${index}">
                <pre><code>${escapeHtml(file.content)}</code></pre>
            </div>
        `;
        container.appendChild(item);
    });
}

function renderDiscoveryLinks() {
    const board = document.getElementById('discoveryBoard');
    const container = document.getElementById('discoveryLinksContainer');
    container.innerHTML = '';

    if (discoveryLinks.length === 0) {
        board.style.display = 'none';
        return;
    }

    board.style.display = 'block';
    discoveryLinks.forEach(link => {
        const card = document.createElement('div');
        card.className = 'discovery-link-card';
        card.innerHTML = `
            <div class="link-title">
                <span>&#128279; ${link.sourceUrl}</span>
                <span class="badge" style="background-color: var(--neon-amber); color: var(--cyber-dark);">GAP TRACE</span>
            </div>
            <div class="link-req-info">${link.requiredInformation}</div>
        `;
        container.appendChild(card);
    });
}

function renderConsensusTasks() {
    const wrapper = document.getElementById('consensusQueueContainer');
    const container = document.getElementById('consensusTasksContainer');
    container.innerHTML = '';

    if (consensusTasks.length === 0) {
        wrapper.style.display = 'none';
        return;
    }

    wrapper.style.display = 'block';
    consensusTasks.forEach(task => {
        const item = document.createElement('div');
        item.className = 'consensus-task-item';
        item.innerHTML = `
            <div class="task-info-col">
                <span class="task-label">${task.operation}</span>
                <span class="task-sub">Payload size: ${task.payloadSize} chars</span>
            </div>
            <span class="task-status ${task.verified ? 'matched' : 'pending'}">${task.verified ? 'MATCHED' : 'PENDING'}</span>
        `;
        container.appendChild(item);
    });
}

function renderLogEvents() {
    const container = document.getElementById('logsContainer');
    container.innerHTML = '';

    logEvents.forEach(event => {
        const log = document.createElement('div');
        log.className = 'log-event';
        log.innerHTML = `
            <div class="log-row-top">
                <span class="log-tag ${event.type}">[${event.type}]</span>
                <span class="log-time">Bridge ${event.timestamp % 100000}</span>
            </div>
            <div class="log-msg">${event.message}</div>
        `;
        container.appendChild(log);
    });

    // Auto scroll terminal to bottom
    container.scrollTop = container.scrollHeight;
}

// 4. DIALOG & INTERACTION DISPATCHERS
function openModal(id) {
    document.getElementById(id).classList.add('active');
}

function closeModal(id) {
    document.getElementById(id).classList.remove('active');
}

function submitBindElement() {
    const name = document.getElementById('nodeName').value;
    const element = document.getElementById('nodeElement').value;
    const bucket = document.getElementById('nodeBucket').value;

    callNative('performBindElement', name, element, bucket);
    closeModal('addNodeModal');
}

function submitAddFile() {
    const name = document.getElementById('fileName').value;
    const content = document.getElementById('fileContent').value;

    if (!name || !content) return;
    callNative('ingestManualFile', name, content);
    closeModal('addFileModal');

    // clear fields
    document.getElementById('fileName').value = '';
    document.getElementById('fileContent').value = '';
}

function toggleCodePreview(index) {
    const preview = document.getElementById(`code-preview-${index}`);
    const btn = document.getElementById(`inspect-btn-${index}`);
    if (preview.classList.contains('show')) {
        preview.classList.remove('show');
        btn.textContent = 'INSPECT';
    } else {
        preview.classList.add('show');
        btn.textContent = 'CLOSE';
    }
}

function triggerZipDrop() {
    const input = document.getElementById('zipFileInput');
    if (input) input.click();
}

function handleZipFileSelect(event) {
    const file = event.target.files[0];
    if (!file) return;

    if (!window.JSZip) {
        alert("JSZip library is not loaded yet. Please wait a moment or ensure internet connectivity.");
        return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        const arrayBuffer = e.target.result;
        JSZip.loadAsync(arrayBuffer).then(function(zip) {
            let filesFound = 0;
            const promises = [];

            zip.forEach(function (relativePath, zipEntry) {
                if (!zipEntry.dir) {
                    // Ignore metadata files, macOS metadata, etc.
                    if (!relativePath.includes('__MACOSX') && !relativePath.endsWith('.DS_Store')) {
                        filesFound++;
                        const promise = zipEntry.async("string").then(function (content) {
                            callNative('ingestManualFile', zipEntry.name, content);
                        });
                        promises.push(promise);
                    }
                }
            });

            Promise.all(promises).then(() => {
                const logMsg = `Successfully unpacked and ingested ${filesFound} source files from ZIP file: ${file.name}`;
                logEvents.push({
                    type: 'ROUTING',
                    timestamp: Date.now(),
                    message: logMsg
                });
                renderLogEvents();
                
                // Speak confirmation
                isSpeaking = true;
                currentUtterance = `Ingested ${filesFound} sandbox files from ZIP payload. Check the INGRESS tab list.`;
                document.getElementById('copilotUtterance').textContent = currentUtterance;
            });
        }).catch(function(err) {
            alert("Error parsing ZIP file: " + err.message);
        });
    };
    reader.readAsArrayBuffer(file);
}

function triggerDragDropSimulation() {
    callNative('simulateDragDropFile', "RemoteController.kt", "class RemoteController {\n  fun initNode() {\n    // Dynamically loaded remote controller schema\n  }\n}");
}

function triggerScanGaps() {
    callNative('analyzeCodebaseGaps');
}

function triggerMapReduce() {
    const prompt = document.getElementById('promptInput').value || "Build robust dynamic routing modules.";
    callNative('triggerMapReduce', prompt);
}

function triggerConsensusCheck() {
    callNative('runConsensusValidation');
}

function tripNode(sessionId) {
    callNative('forceTripNode', sessionId);
}

function reconnectNode(sessionId) {
    // Reconnect node back to active state
    callNative('reconnectNode', sessionId);
}

function severTether(sessionId) {
    callNative('severTether', sessionId);
}

function triggerClearLogs() {
    callNative('clearLogs');
}

// Helper: Escape code HTML tags
function escapeHtml(text) {
    return text
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");
}

// 5. GRAPHICS ANIMATIONS (CANVAS DRAWINGS)

// A. Real-time Co-Pilot Voice Waveform Visualizer Animation
function animateWaveform() {
    requestAnimationFrame(animateWaveform);
    
    waveCtx.clearRect(0, 0, waveCanvas.width, waveCanvas.height);
    
    const spacing = waveCanvas.width / (waveAmplitudes.length + 1);
    const centerY = waveCanvas.height / 2;

    waveAmplitudes.forEach((amp, i) => {
        const x = (i + 1) * spacing;
        let barHeight = waveCanvas.height * amp;
        if (!isSpeaking) {
            // idle wave pulse
            barHeight = 4 + Math.sin(Date.now() / 200 + i) * 3;
        }

        waveCtx.beginPath();
        waveCtx.moveTo(x, centerY - barHeight / 2);
        waveCtx.lineTo(x, centerY + barHeight / 2);
        waveCtx.lineWidth = 3;
        waveCtx.lineCap = 'round';
        waveCtx.strokeStyle = isSpeaking ? '#00ff66' : 'rgba(122, 141, 165, 0.4)';
        waveCtx.stroke();
    });
}

// B. Active SVG Bezier curves from Tether Nodes to Sandbox Hub
let tetherPhase = 0;
function animateTethers() {
    requestAnimationFrame(animateTethers);
    tetherCtx.clearRect(0, 0, tetherCanvas.width, tetherCanvas.height);

    if (currentTab !== 'TETHERS' || tetherNodes.length === 0) return;

    tetherPhase += 0.05;

    // We locate the "Inget Sandbox" button or tab bar element coordinates as the "target endpoint cluster"
    const tabNav = document.querySelector('.cyber-tabs');
    if (!tabNav) return;
    
    // Target anchor is roughly near the center bottom of the screen or the Ingress SandBox Tab button
    const targetRect = tabNav.getBoundingClientRect();
    const targetX = targetRect.left + (targetRect.width / 2);
    const targetY = targetRect.top + 20;

    tetherNodes.forEach(node => {
        const card = document.getElementById(`node-card-${node.sessionId}`);
        if (!card) return;

        const cardRect = card.getBoundingClientRect();
        const startX = cardRect.left + 24;
        const startY = cardRect.top + (cardRect.height / 2);

        // Draw bezier wire connecting the card point to the target tab
        tetherCtx.beginPath();
        tetherCtx.moveTo(startX, startY);
        
        // Control point for smooth cyberpunk curve
        const controlX = (startX + targetX) / 2;
        const controlY = startY + Math.sin(tetherPhase + startX) * 40;
        
        tetherCtx.quadraticCurveTo(controlX, controlY, targetX, targetY);
        
        tetherCtx.lineWidth = node.active ? 1.5 : 0.8;
        tetherCtx.strokeStyle = node.active ? `rgba(0, 240, 255, ${0.15 + Math.sin(tetherPhase * 2) * 0.05})` : 'rgba(255, 0, 85, 0.08)';
        tetherCtx.stroke();

        // Draw running current light packet along the curve
        if (node.active) {
            const t = (tetherPhase * 0.1) % 1.0;
            // Bezier formula for quadratic curve: B(t) = (1-t)^2 * P0 + 2*(1-t)*t * P1 + t^2 * P2
            const packetX = Math.pow(1 - t, 2) * startX + 2 * (1 - t) * t * controlX + Math.pow(t, 2) * targetX;
            const packetY = Math.pow(1 - t, 2) * startY + 2 * (1 - t) * t * controlY + Math.pow(t, 2) * targetY;

            tetherCtx.beginPath();
            tetherCtx.arc(packetX, packetY, 3, 0, Math.PI * 2);
            tetherCtx.fillStyle = '#00f0ff';
            tetherCtx.shadowColor = '#00f0ff';
            tetherCtx.shadowBlur = 6;
            tetherCtx.fill();
            tetherCtx.shadowBlur = 0; // reset
        }
    });
}

// 6. SIMULATOR OF NATIVE LOGIC FOR PURE WEB VIEW TESTING (WHEN RUNNING OUTSIDE OF APK)
function simulateActionInBrowser(funcName, ...args) {
    if (funcName === 'performBindElement') {
        const name = args[0];
        const selector = args[1];
        const bucket = args[2];
        const id = 'sess_' + Math.floor(Math.random() * 100000);
        tetherNodes.push({
            sessionId: id,
            sessionName: name,
            domSelector: selector,
            targetBucket: bucket,
            mutationsCount: 0,
            active: true
        });
        renderTetherNodes();
        renderWidgetNodes();
        
        logEvents.push({
            type: 'ROUTING',
            timestamp: Date.now(),
            message: `Bound browser session to element node '${selector}' as ${name}. ID: ${id}`
        });
        renderLogEvents();
        
        isSpeaking = true;
        currentUtterance = `Successfully bound new MMTAI node ${name}. Ready to stream.`;
        document.getElementById('copilotUtterance').textContent = currentUtterance;
    } else if (funcName === 'forceTripNode') {
        const id = args[0];
        const node = tetherNodes.find(n => n.sessionId === id);
        if (node) {
            node.active = false;
            node.mutationsCount += 1;
            renderTetherNodes();
            renderWidgetNodes();
            
            logEvents.push({
                type: 'CIRCUIT_BREAKER',
                timestamp: Date.now(),
                message: `Circuit breaker TRIPPED for ${node.sessionName}: DOM element layout mutated unexpectedly.`
            });
            renderLogEvents();
            
            isSpeaking = true;
            currentUtterance = `${node.sessionName} hit a limit. Automatically tripping circuit breaker and rerouting workload.`;
            document.getElementById('copilotUtterance').textContent = currentUtterance;
        }
    } else if (funcName === 'reconnectNode') {
        const id = args[0];
        const node = tetherNodes.find(n => n.sessionId === id);
        if (node) {
            node.active = true;
            renderTetherNodes();
            renderWidgetNodes();
            
            logEvents.push({
                type: 'ROUTING',
                timestamp: Date.now(),
                message: `Reconnected / Reset circuit breaker for ${node.sessionName}`
            });
            renderLogEvents();
        }
    } else if (funcName === 'severTether') {
        const id = args[0];
        const node = tetherNodes.find(n => n.sessionId === id);
        tetherNodes = tetherNodes.filter(n => n.sessionId !== id);
        renderTetherNodes();
        renderWidgetNodes();
        
        logEvents.push({
            type: 'WARNING',
            timestamp: Date.now(),
            message: `Severed active tether node: ${node ? node.sessionName : id}`
        });
        renderLogEvents();
    } else if (funcName === 'ingestManualFile') {
        const name = args[0];
        const content = args[1];
        ingressFiles.push({
            name: name,
            content: content
        });
        renderIngressFiles();
        
        logEvents.push({
            type: 'ROUTING',
            timestamp: Date.now(),
            message: `Ingested code file sandbox partition: ${name}`
        });
        renderLogEvents();
    } else if (funcName === 'clearLogs') {
        logEvents = [];
        renderLogEvents();
    } else if (funcName === 'simulateZipDrop') {
        // Trigger the file input dialog
        const input = document.getElementById('zipFileInput');
        if (input) input.click();
    } else if (funcName === 'simulateDragDropFile') {
        const name = args[0];
        const content = args[1];
        ingressFiles.push({
            name: name,
            content: content
        });
        renderIngressFiles();
        
        logEvents.push({
            type: 'ROUTING',
            timestamp: Date.now(),
            message: `Simulated drag & drop ingestion of ${name}`
        });
        renderLogEvents();
        
        isSpeaking = true;
        currentUtterance = `Simulated drag-drop ingestion of ${name}. Check Ingress Sandbox.`;
        document.getElementById('copilotUtterance').textContent = currentUtterance;
    } else if (funcName === 'analyzeCodebaseGaps') {
        discoveryLinks = [
            { sourceUrl: 'Android UI / Jetpack Compose', requiredInformation: 'M3 scaffold structure and custom canvas wave rendering APIs.' },
            { sourceUrl: 'Node Client Socket API', requiredInformation: 'Bi-directional text stream buffers and chunk frame schemas.' }
        ];
        renderDiscoveryLinks();
        
        logEvents.push({
            type: 'INFO',
            timestamp: Date.now(),
            message: `Completed codebase gap analysis. Located 2 gaps in required structure.`
        });
        renderLogEvents();
        
        isSpeaking = true;
        currentUtterance = `Located two critical API gaps on the discovery board. Run map reduce to resolve them.`;
        document.getElementById('copilotUtterance').textContent = currentUtterance;
    } else if (funcName === 'triggerMapReduce') {
        const prompt = args[0];
        consensusTasks = [
            { operation: 'Analyze ' + (prompt.length > 20 ? prompt.substring(0, 20) + '...' : prompt), payloadSize: prompt.length, verified: false },
            { operation: 'Verify Tether Bridge API', payloadSize: 256, verified: false }
        ];
        renderConsensusTasks();
        
        logEvents.push({
            type: 'ROUTING',
            timestamp: Date.now(),
            message: `Triggered distributed map-reduce cluster with prompt: "${prompt}"`
        });
        renderLogEvents();
        
        isSpeaking = true;
        currentUtterance = `Dispatched map-reduce queries to cluster nodes. Run Consensus Check to validate results.`;
        document.getElementById('copilotUtterance').textContent = currentUtterance;
    } else if (funcName === 'runConsensusValidation') {
        if (consensusTasks.length === 0) {
            isSpeaking = true;
            currentUtterance = `No consensus tasks in the queue. Trigger a map-reduce action first.`;
            document.getElementById('copilotUtterance').textContent = currentUtterance;
            return;
        }
        consensusTasks.forEach(t => t.verified = true);
        renderConsensusTasks();
        
        logEvents.push({
            type: 'INFO',
            timestamp: Date.now(),
            message: `Consensus validation complete. All task structures successfully matched and verified!`
        });
        renderLogEvents();
        
        isSpeaking = true;
        currentUtterance = `Consensus integrity checked. All models successfully matched and verified!`;
        document.getElementById('copilotUtterance').textContent = currentUtterance;
    }
}
