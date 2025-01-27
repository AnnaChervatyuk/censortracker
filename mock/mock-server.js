const express = require('express')
const bodyParser = require('body-parser')
const morgan = require('morgan')

const app = express()
const PORT = 8080

// Middleware
app.use(bodyParser.json())
app.use(morgan('dev'))

// Mock data
let config = {
  config: 'vless://I6MTczNzM3ODIzMH0.TK9Fk6FSEr8IsxcXIskLtj2HkqXSJiST6gl4aOeBCZE',
}

// Get configuration
app.get('/api/v1/config', (req, res) => {
  res.json({
    status: 'success',
    config,
  })
})

// Set configuration
app.post('/api/v1/config', (req, res) => {
  config = req.body
  console.log('New configuration received:', config)
  res.json({
    status: 'success',
    message: 'Configuration updated successfully.',
  })
})

// Start proxy
app.post('/api/v1/up', (req, res) => {
  res.json({
    message: 'Xray process started successfully',
    status: 'success',
    xray_port: 10808,
  })
})

// Stop proxy
app.post('/api/v1/down', (req, res) => {
  res.json({
    status: 'success',
    message: 'Proxy stopped successfully.',
  })
})

// Ping endpoint
app.get('/api/v1/ping', (req, res) => {
  res.json({
    status: 'success',
    message: 'Ping received. Server is ready.',
  })
})

// Start the server
app.listen(PORT, () => {
  console.log(`Mock server running at http://localhost:${PORT}/api/v1`)
})
