// Configuration
const FRAME_CHECK_INTERVAL = 1000; // Check for motion every 1 second
const MOTION_THRESHOLD = 15; // Sensitivity for motion detection (lower = more sensitive)
const GEMINI_API_URL = 'https://llmfoundry.straivedemo.com/gemini/v1beta/models/gemini-3.7-flash:generateContent';

// DOM Elements
const videoInput = document.getElementById('videoInput');
const videoPlayer = document.getElementById('videoPlayer');
const frameCanvas = document.getElementById('frameCanvas');
const summaryOutput = document.getElementById('summaryOutput');
const exportBtn = document.getElementById('exportBtn');
const clearBtn = document.getElementById('clearBtn');
const loadingSpinner = document.getElementById('loading-spinner');
const apiTokenInput = document.getElementById('apiToken');
const analysisStatus = document.getElementById('analysisStatus');
const videoPlaceholder = document.getElementById('videoPlaceholder');
const framePlaceholder = document.getElementById('framePlaceholder');
const findingsCount = document.getElementById('findingsCount');

// Canvas setup
const ctx = frameCanvas.getContext('2d');
frameCanvas.width = 640;
frameCanvas.height = 360;

// Video processing variables
let frameInterval;
let isProcessing = false;
let analysisResults = [];
let previousImageData = null;
let isAnalyzing = false;
let analysisPaused = false;

// Event Listeners
videoInput.addEventListener('change', handleVideoUpload);
videoPlayer.addEventListener('play', startFrameCapture);
videoPlayer.addEventListener('pause', stopFrameCapture);
videoPlayer.addEventListener('ended', stopFrameCapture);
videoPlayer.addEventListener('loadeddata', () => {
    videoPlayer.hidden = false;
    videoPlaceholder.hidden = true;
});
exportBtn.addEventListener('click', exportAnalysis);
clearBtn.addEventListener('click', clearResults);
updateFindingsCount();
apiTokenInput.addEventListener('input', () => {
    analysisPaused = false;
    setAnalysisStatus(apiTokenInput.value.trim() ? 'Token entered. AI analysis is ready.' : '', 'muted');
});

// Handle video upload
function handleVideoUpload(event) {
    const file = event.target.files[0];
    if (file) {
        const videoURL = URL.createObjectURL(file);
        videoPlayer.src = videoURL;
        videoPlayer.hidden = true;
        videoPlayer.controls = true;
        videoPlaceholder.hidden = false;
        framePlaceholder.hidden = false;
        showEmptyState('No findings yet', 'Flagged moments will appear here as the video plays.');
        analysisResults = [];
        updateFindingsCount();
        previousImageData = null;
        
        videoPlayer.onloadedmetadata = function() {
            videoPlayer.play();
        };
    }
}

// Start capturing frames
function startFrameCapture() {
    if (!isProcessing) {
        isProcessing = true;
        frameInterval = setInterval(checkForMotion, FRAME_CHECK_INTERVAL);
    }
}

// Stop capturing frames
function stopFrameCapture() {
    if (isProcessing) {
        isProcessing = false;
        clearInterval(frameInterval);
    }
}

// Check if there's significant motion in the frame
function checkForMotion() {
    if (analysisPaused) return;

    if (!apiTokenInput.value.trim()) {
        analysisPaused = true;
        setAnalysisStatus('Enter an LLM Foundry token to start AI analysis.', 'warning');
        return;
    }

    ctx.drawImage(videoPlayer, 0, 0, frameCanvas.width, frameCanvas.height);
    framePlaceholder.hidden = true;
    const currentImageData = ctx.getImageData(0, 0, frameCanvas.width, frameCanvas.height);
    
    if (previousImageData) {
        const diff = detectMotion(previousImageData.data, currentImageData.data);
        
        if (diff > MOTION_THRESHOLD) {
            console.log(`Motion detected (diff: ${diff}), analyzing frame`);
            analyzeCurrentFrame();
        } else {
            console.log(`No significant motion (diff: ${diff}), skipping analysis`);
        }
    } else {
        // First frame - analyze it
        analyzeCurrentFrame();
    }
    
    previousImageData = currentImageData;
}

// Calculate difference between two frames
function detectMotion(previous, current) {
    let diff = 0;
    const pixelsToCheck = previous.length / 4; // RGBA data
    const samplingRate = 10; // Check every 10th pixel for performance
    
    for (let i = 0; i < pixelsToCheck; i += samplingRate) {
        const offset = i * 4;
        // Compare RGB values (skip Alpha)
        diff += Math.abs(previous[offset] - current[offset]); // R
        diff += Math.abs(previous[offset + 1] - current[offset + 1]); // G
        diff += Math.abs(previous[offset + 2] - current[offset + 2]); // B
    }
    
    return diff / (pixelsToCheck / samplingRate);
}

// Analyze current frame
async function analyzeCurrentFrame() {
    if (isAnalyzing || analysisPaused) return;

    const apiToken = apiTokenInput.value.trim();
    if (!apiToken) {
        analysisPaused = true;
        setAnalysisStatus('Enter an LLM Foundry token to start AI analysis.', 'warning');
        return;
    }

    isAnalyzing = true;
    try {
        const currentTime = videoPlayer.currentTime;
        const frameData = frameCanvas.toDataURL('image/jpeg', 0.8);
        const timestamp = formatTime(currentTime);

        console.log("Sending frame to LLM at timestamp:", timestamp);
        
        // Show loading spinner
        loadingSpinner.style.display = 'inline-block';
        
        const prompt = `Analyze this hospital surveillance frame and ONLY report if you detect any of these abnormal conditions:
        1. Overcrowding: Too many people in one area or long queues
        2. Cleanliness issues: Visible garbage, spills, or unclean areas
        3. Staff inactivity: Medical staff idle when patients need attention
        4. Unattended patients: Patients visibly in distress or waiting too long
        5. Aggressive behavior: Arguments, physical altercations or threatening postures
        6. PPE/mask violations: Staff or patients without required protective equipment
        7. For every frame, detect the number of people in the frame and report the count.
        
        If NONE of these issues are detected, respond with "NORMAL". 
        If any issues ARE detected, briefly describe ONLY the specific issue(s).`;
        
        const response = await analyzeFrame(frameData, prompt, apiToken);
        
        // Only record and display abnormal situations
        if (response.trim() !== "NORMAL") {
            const result = { timestamp, analysis: response };
            analysisResults.push(result);
            updateFindingsCount();
            displayAnalysis(timestamp, response);
        }
        
        // Hide loading spinner
        loadingSpinner.style.display = 'none';
    } catch (error) {
        console.error('Error analyzing frame:', error);
        analysisPaused = true;
        setAnalysisStatus(error.message, 'danger');
    } finally {
        loadingSpinner.style.display = 'none';
        isAnalyzing = false;
    }
}

function setAnalysisStatus(message, tone) {
    analysisStatus.textContent = message;
    analysisStatus.className = message ? `status-copy status-copy--${tone}` : 'status-copy';
}

function showEmptyState(title, message) {
    const emptyState = document.createElement('div');
    emptyState.className = 'empty-state';

    const mark = document.createElement('span');
    mark.className = 'empty-state__mark';
    mark.setAttribute('aria-hidden', 'true');

    const heading = document.createElement('strong');
    heading.textContent = title;
    const description = document.createElement('span');
    description.textContent = message;

    emptyState.append(mark, heading, description);
    summaryOutput.replaceChildren(emptyState);
}

function updateFindingsCount() {
    const count = analysisResults.length;
    findingsCount.textContent = String(count);
    exportBtn.disabled = count === 0;
    clearBtn.disabled = count === 0;
}

// Format time in MM:SS format
function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

// Display analysis result
function displayAnalysis(timestamp, analysis) {
    summaryOutput.querySelector('.empty-state')?.remove();

    const analysisElement = document.createElement('div');
    analysisElement.className = 'finding';
    const heading = document.createElement('strong');
    heading.className = 'finding__time';
    heading.textContent = timestamp;
    const detail = document.createElement('p');
    detail.className = 'finding__detail';
    detail.textContent = analysis.replaceAll('**', '').trim();
    analysisElement.append(heading, detail);
    summaryOutput.insertBefore(analysisElement, summaryOutput.firstChild);
}

// Export analysis results
function exportAnalysis() {
    if (analysisResults.length === 0) {
        alert('No alerts to export');
        return;
    }

    const exportData = analysisResults.map(result => 
        `${result.timestamp} - ${result.analysis}`
    ).join('\n');

    const blob = new Blob([exportData], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'abnormal-events.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// Clear results
function clearResults() {
    analysisResults = [];
    updateFindingsCount();
    showEmptyState('No findings yet', 'Flagged moments will appear here as the video plays.');
}

// Call Gemini API
async function analyzeFrame(frameData, prompt, apiToken) {
    try {
        console.log("Preparing API request to Gemini...");
        
        const base64Data = frameData.split(',')[1];
        
        const response = await fetch(GEMINI_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiToken}`,
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: prompt
                    }, {
                        inline_data: {
                            mime_type: 'image/jpeg',
                            data: base64Data
                        }
                    }]
                }]
            })
        });

        if (!response.ok) {
            if (response.status === 401) {
                throw new Error('Authentication failed. Check the LLM Foundry token and try again.');
            }
            if (response.status === 403) {
                throw new Error('This token is not allowed to use the configured Gemini model.');
            }
            throw new Error(`AI analysis request failed (HTTP ${response.status}). Check the endpoint and try again.`);
        }

        const data = await response.json();
        
        if (!data.candidates || !data.candidates[0] || !data.candidates[0].content || !data.candidates[0].content.parts) {
            console.error("Unexpected API response format:", data);
            throw new Error("Invalid API response format");
        }
        
        return data.candidates[0].content.parts[0].text;
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
} 
