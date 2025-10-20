const express = require('express');
const fetch = require('node-fetch');
const app = express();
const PORT = process.env.PORT || 3000;
const YODECK_API_KEY = process.env.YODECK_API_KEY; 
const API_LABEL = "YodeckApp"; // Label required by the Yodeck API format

// Base URL for the Yodeck Management Platform API
const YODECK_API_BASE = 'https://api.yodeck.com/v1'; 
const MEDIA_LIST_ENDPOINT = `${YODECK_API_BASE}/media?limit=100`; 

// CORS Middleware: Essential to allow the Yodeck Player to access this API
app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*'); 
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    next();
});

// ==========================================================
// 🚨 TEMPORARY DEBUGGING ROUTE (For Key Status Check) 🚨
// Use this to verify if the environment variable is loaded.
// ==========================================================
app.get('/', (req, res) => {
    const keyLoaded = !!YODECK_API_KEY; 
    const keyStatus = keyLoaded ? "KEY IS LOADED" : "KEY IS NOT LOADED";
    const authHeader = `Authorization: Token ${API_LABEL}:${keyLoaded ? '[KEY_SET]' : '[KEY_MISSING]'}`;
    
    res.send(`
        <h2>Yodeck Media Connector is Running</h2>
        <p><strong>Key Status:</strong> ${keyStatus}</p>
        <p><strong>Auth Header Format:</strong> ${authHeader}</p>
        <p>If the key is loaded, please test the full API endpoint.</p>
    `);
});
// ==========================================================

// The main API endpoint that the Yodeck Custom App will call
app.get('/api/get-yodeck-media-data', async (req, res) => {
    if (!YODECK_API_KEY) {
        return res.status(500).json({ error: "Server misconfigured: YODECK_API_KEY missing." });
    }

    try {
        // 1. Call the Yodeck Cloud API using the secret API Key
        const apiResponse = await fetch(MEDIA_LIST_ENDPOINT, {
            method: 'GET',
            headers: {
                'Authorization': `Token ${API_LABEL}:${YODECK_API_KEY}`,
                'Content-Type': 'application/json'
            }
        });
        
        // --- 🛑 ROBUST ERROR HANDLING FIX 🛑 ---
        if (!apiResponse.ok) {
            let errorText = '';
            try {
                // Safely read the response body as text (in case it's HTML)
                errorText = await apiResponse.text();
            } catch (e) {
                console.error("Error reading API response body:", e.message);
            }
            
            console.error(`Yodeck API Error: ${apiResponse.status} - Response Preview: ${errorText.substring(0, 150)}...`); 
            
            // Check for common authentication failure signs (401 or receiving HTML)
            if (apiResponse.status === 401 || errorText.includes('<html>')) {
                 return res.status(401).json({ error: "Yodeck Authentication Failed. Check API Key validity and permissions." });
            }
            return res.status(apiResponse.status).json({ error: "Failed to fetch media from Yodeck Cloud." });
        }
        // --- END ROBUST ERROR HANDLING FIX ---

        // 2. Process Data (This part only runs if the response was successful, status 200)
        const data = await apiResponse.json();
        
        const mediaCache = {};
        
        data.results.forEach(media => {
            let playbackUrl = 'UNAVAILABLE_FOR_DIRECT_PLAYBACK'; 
            let mediaType = media.media_type;

            // Safely extract the direct URL
            if (media.arguments && media.arguments.source_url) {
                playbackUrl = media.arguments.source_url;
            } else if (media.url) {
                playbackUrl = media.url; 
            }

            // Map the media ID to its URL and Type
            mediaCache[media.id] = {
                url: playbackUrl,
                type: mediaType
            };
        });

        // 3. Return the simplified map to the Yodeck App
        res.json(mediaCache);

    } catch (error) {
        console.error("Server fetch error:", error);
        res.status(500).json({ error: `Internal server error during fetch: ${error.message}` });
    }
});

app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});