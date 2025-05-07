# Hospital Video Analytics

This project is an automated anomaly detection system using AI for hospital surveillance videos. It analyzes video footage to identify predefined abnormal conditions and alerts the user.

## Features

*   **Video Upload:** Users can upload video files for analysis.
*   **Motion Detection:** The system processes video frames and triggers analysis only when significant motion is detected, optimizing resource usage.
*   **AI-Powered Frame Analysis:** Detected frames are sent to a Gemini-based AI model to identify specific abnormal situations.
*   **Anomaly Categories:** The AI is prompted to look for:
    1.  Overcrowding
    2.  Cleanliness issues (garbage, spills)
    3.  Staff inactivity when patients need attention
    4.  Unattended patients in distress or waiting too long
    5.  Aggressive behavior (arguments, altercations)
    6.  PPE/mask violations
*   **Alert Display:** Detected abnormal events are displayed with a timestamp and a description of the issue.
*   **Export Analysis:** Users can export the list of detected alerts as a text file.
*   **Clear Results:** Option to clear the displayed analysis results.

## How it Works

1.  The user uploads a video file through the web interface (`index.html`).
2.  The video plays, and `script.js` captures frames at a regular interval (`FRAME_CHECK_INTERVAL`).
3.  A basic motion detection algorithm compares consecutive frames.
4.  If motion exceeding a `MOTION_THRESHOLD` is detected, the current frame is captured from a canvas element.
5.  This frame is converted to a base64 JPEG image and sent to the Gemini API (`GEMINI_API_URL`) along with a specific prompt detailing the abnormal conditions to look for.
6.  If the API response indicates an abnormal condition (i.e., not "NORMAL"), the timestamp and the AI's analysis are displayed on the page.
7.  All detected alerts can be exported.

## Setup

1.  Clone this repository.
2.  Open `index.html` in a web browser.
3.  **Important:** You need to configure the Gemini API endpoint. In `script.js`, update the `GEMINI_API_URL` constant with your valid Gemini API endpoint:
    ```javascript
    const GEMINI_API_URL = 'YOUR_GEMINI_API_ENDPOINT_HERE';
    ```
    The current placeholder is `https://llmfoundry.straive.com/gemini/v1beta/models/gemini-2.5-flash-preview-04-17:generateContent`. Ensure this is correctly set up for API calls, including any necessary authentication or API keys if required by your specific endpoint. The script currently uses `credentials: 'include'` which might be relevant for your setup.

## Technologies Used

*   HTML5
*   CSS3 (Bootstrap 5)
*   JavaScript (Vanilla)
*   Gemini AI (for image analysis)


