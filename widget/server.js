const express = require('express');
const path = require('path');

const app = express();
const port = process.env.PORT || 5000;

// Enable CORS middleware
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*'); // Or specify your allowed origins
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  next();
});

// Serve static files from the 'dist' directory
app.use(express.static(path.join(__dirname, 'dist')));

// Start the server
app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});