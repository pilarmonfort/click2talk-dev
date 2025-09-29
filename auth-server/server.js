const express = require('express');
const axios = require('axios');
const dotenv = require('dotenv');
const cors = require('cors'); 

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Environment variable validation
const sessionUrl = process.env.SESSION_URL;
const sessionLogin = process.env.SESSION_LOGIN;
const sessionPassword = process.env.SESSION_PASSWORD;

if (!sessionUrl || !sessionLogin || !sessionPassword) {
    console.error('Error: Missing required environment variables.');
    process.exit(1); // Exit if environment variables are missing
}

app.use(cors());
app.use(express.json());

//Random string generator.
function generateRamdomString(length) {
    let result = '';
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const charactersLength = characters.length;
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
}

app.get('/api/auth', async (req, res) => {
    try {
        const response = await axios.post(sessionUrl, {
            identifier: generateRamdomString(16),
            login: sessionLogin,
            password: sessionPassword,
            type: 'web',
        });

        if (response.status === 200 && response.data && response.data.token && response.data.token.length) {
            res.json({ token: response.data.token });
        } else {
            res.status(401).json({ message: 'Authentication failed' });
        }
    } catch (error) {
        console.error('Authentication error:', error);
        if (error.response) {
            // The request was made and the server responded with a status code
            // that falls out of the range of 2xx
            console.error(error.response.data);
            console.error(error.response.status);
            console.error(error.response.headers);
            res.status(error.response.status || 500).json({ message: 'Authentication failed' });
        } else if (error.request) {
            // The request was made but no response was received
            // `error.request` is an instance of XMLHttpRequest in the browser and an instance of
            // http.ClientRequest in node.js
            console.error(error.request);
            res.status(500).json({ message: 'Network error' });
        } else {
            // Something happened in setting up the request that triggered an Error
            console.error('Error', error.message);
            res.status(500).json({ message: 'Internal server error' });
        }
    }
});

app.listen(port, () => {
    console.log(`Server listening at http://localhost:${port}`);
});