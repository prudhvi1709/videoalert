// Configuration
const FRAME_CHECK_INTERVAL = 1000; // Check for motion every 1 second
const MOTION_THRESHOLD = 15; // Sensitivity for motion detection (lower = more sensitive)
// Add your Gemini API key here
const GEMINI_API_URL = 'https://llmfoundry.straive.com/gemini/v1beta/models/gemini-2.5-flash-preview-04-17:generateContent';

// DOM Elements
const videoInput = document.getElementById('videoInput');
const videoPlayer = document.getElementById('videoPlayer');
const frameCanvas = document.getElementById('frameCanvas');
const summaryOutput = document.getElementById('summaryOutput');
const exportBtn = document.getElementById('exportBtn');
const clearBtn = document.getElementById('clearBtn');
const loadingSpinner = document.getElementById('loading-spinner');

// Canvas setup
const ctx = frameCanvas.getContext('2d');
frameCanvas.width = 640;
frameCanvas.height = 360;

// Video processing variables
let frameInterval;
let isProcessing = false;
let analysisResults = [];
let previousImageData = null;

// Event Listeners
videoInput.addEventListener('change', handleVideoUpload);
videoPlayer.addEventListener('play', startFrameCapture);
videoPlayer.addEventListener('pause', stopFrameCapture);
videoPlayer.addEventListener('ended', stopFrameCapture);
exportBtn.addEventListener('click', exportAnalysis);
clearBtn.addEventListener('click', clearResults);

// Handle video upload
function handleVideoUpload(event) {
    const file = event.target.files[0];
    if (file) {
        const videoURL = URL.createObjectURL(file);
        videoPlayer.src = videoURL;
        summaryOutput.innerHTML = '<p class="text-muted">Waiting for abnormal events to be detected...</p>';
        analysisResults = [];
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
    ctx.drawImage(videoPlayer, 0, 0, frameCanvas.width, frameCanvas.height);
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
        
        const response = await analyzeFrame(frameData, prompt);
        console.log("Received response from LLM:", response);
        
        // Only record and display abnormal situations
        if (response.trim() !== "NORMAL") {
            const result = { timestamp, analysis: response };
            analysisResults.push(result);
            displayAnalysis(timestamp, response);
        }
        
        // Hide loading spinner
        loadingSpinner.style.display = 'none';
    } catch (error) {
        // Hide loading spinner in case of error
        loadingSpinner.style.display = 'none';
        console.error('Error analyzing frame:', error);
    }
}

// Format time in MM:SS format
function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

// Display analysis result
function displayAnalysis(timestamp, analysis) {
    const analysisElement = document.createElement('div');
    analysisElement.className = 'alert alert-warning mb-2';
    analysisElement.innerHTML = `<strong><i class="bi bi-exclamation-triangle"></i> ALERT [${timestamp}]</strong> - ${analysis}`;
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
    summaryOutput.innerHTML = '<p class="text-muted">Waiting for abnormal events to be detected...</p>';
}

// Call Gemini API
async function analyzeFrame(frameData, prompt) {
    try {
        console.log("Preparing API request to Gemini...");
        
        // Log the first 50 chars of base64 data to verify content
        const base64Data = frameData.split(',')[1];
        console.log("Frame data sample:", base64Data.substring(0, 50) + "...");
        
        const response = await fetch(GEMINI_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include',
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

        console.log("API response status:", response.status);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error("API error response:", errorText);
            throw new Error(`API request failed with status ${response.status}`);
        }

        const data = await response.json();
        console.log("API response received:", data);
        
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