const express = require('express');
const fetch = require('node-fetch');
const app = express();
const PORT = process.env.PORT || 3000;
const YODECK_API_KEY = process.env.YODECK_API_KEY; 

// Base URL for the Yodeck Management Platform API
const YODECK_API_BASE = 'https://api.yodeck.com/v1'; 
const MEDIA_LIST_ENDPOINT = `${YODECK_API_BASE}/media?limit=100`; // Fetch up to 100 items

// CORS Middleware: Essential to allow the Yodeck Player to access this API
app.use((req, res, next) => {
    // Allow access from any origin (safe for an API endpoint that only returns public data)
    res.setHeader('Access-Control-Allow-Origin', '*'); 
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    next();
});

// The main API endpoint that the Yodeck Custom App will call via the /request proxy
app.get('/api/get-yodeck-media-data', async (req, res) => {
    if (!YODECK_API_KEY) {
        // This means you forgot to set the YODECK_API_KEY environment variable in Render!
        return res.status(500).json({ error: "Server misconfigured: YODECK_API_KEY missing." });
    }

    try {
        // 1. Call the Yodeck Cloud API using the secret API Key
        const apiResponse = await fetch(MEDIA_LIST_ENDPOINT, {
            method: 'GET',
            headers: {
                'Authorization': `ApiKey ${YODECK_API_KEY}`,
                'Content-Type': 'application/json'
            }
        });

        if (!apiResponse.ok) {
            console.error(`Yodeck API Error: ${apiResponse.status} - ${await apiResponse.text()}`);
            return res.status(apiResponse.status).json({ error: "Failed to fetch media from Yodeck Cloud." });
        }

        const data = await apiResponse.json();
        
        // 2. Process Data: Build the simple map for the Yodeck App
        const mediaCache = {};
        
        data.results.forEach(media => {
            // ⚠️ CRITICAL ADJUSTMENT HERE ⚠️
            // You must inspect the actual JSON response from the Yodeck API to find the field 
            // that contains the direct CDN/playback URL for display. It might be:
            // - media.arguments.source_url
            // - media.url
            // - media.arguments.playback_url 
            
            // For now, we'll use a placeholder structure and default to a dummy URL if not found.
            let playbackUrl = 'NO_DIRECT_URL_FOUND';
            if (media.media_type === 'image' || media.media_type === 'video') {
                // *** REPLACE 'media.direct_playback_url' with the correct field name ***
                playbackUrl = media.arguments ? media.arguments.source_url : 'MISSING_URL'; 
            }
            
            // Map the media ID to its URL and Type
            mediaCache[media.id] = {
                url: playbackUrl,
                type: media.media_type
            };
        });

        // 3. Return the simplified map to the Yodeck App
        res.json(mediaCache);

    } catch (error) {
        console.error("Server fetch error:", error);
        res.status(500).json({ error: "Internal server error." });
    }
});

app.get('/', (req, res) => {
    res.send('Yodeck Media Connector is running.');
});

app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});