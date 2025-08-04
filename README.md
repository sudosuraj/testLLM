# Garak API Service

An automated backend system that exposes an API to perform security testing on REST-based LLMs using Garak, a powerful prompt injection and vulnerability testing tool.

## Overview

This service allows users to perform comprehensive penetration tests on their LLM APIs without needing to understand or install Garak manually. Users send API requests with their LLM configuration details, and the system dynamically generates Garak configurations, runs security scans, and returns detailed vulnerability reports.

## Features

- **REST API Interface**: Simple HTTP POST endpoint for initiating scans
- **Dynamic Configuration**: Automatically generates Garak configs based on user input
- **Subprocess Management**: Safely executes Garak as isolated subprocesses
- **Comprehensive Reporting**: Returns detailed JSON vulnerability reports
- **Error Handling**: Robust error handling and logging throughout the pipeline
- **Docker Support**: Fully containerized for easy deployment
- **Modern ES Modules**: Built with Node.js using .mjs modules and modern syntax

## API Specification

### POST /api/scan

Initiates a security scan on the specified LLM endpoint.

**Request Body:**
```json
{
  "name": "My LLM API",
  "uri": "https://api.example.com/v1/chat/completions",
  "method": "POST",
  "headers": {
    "Content-Type": "application/json",
    "User-Agent": "GarakScanner/1.0"
  },
  "body_template": {
    "model": "gpt-3.5-turbo",
    "messages": [
      {
        "role": "user",
        "content": "$INPUT"
      }
    ],
    "max_tokens": 150
  },
  "response_field": "choices.0.message.content",
  "api_key": "optional-bearer-token",
  "probes": ["optional", "list", "of", "probes"],
  "detectors": ["optional", "list", "of", "detectors"]
}
```

**Response:**
```json
{
  "success": true,
  "scan_id": "uuid-v4-scan-id",
  "name": "My LLM API",
  "status": "completed",
  "timestamp": "2025-01-01T12:00:00.000Z",
  "report": {
    // Detailed Garak vulnerability report
  }
}
```

**Error Response:**
```json
{
  "success": false,
  "scan_id": "uuid-v4-scan-id",
  "name": "My LLM API",
  "status": "failed",
  "timestamp": "2025-01-01T12:00:00.000Z",
  "error": "Error message",
  "report": null
}
```

### GET /api/health

Health check endpoint.

**Response:**
```json
{
  "status": "healthy",
  "service": "garak-api-service",
  "timestamp": "2025-01-01T12:00:00.000Z",
  "version": "1.0.0"
}
```

## Installation & Setup

### Prerequisites

- Node.js 18+ 
- Python 3.8+
- Garak (`pip install garak`)

### Local Development

1. Clone the repository:
```bash
git clone <repository-url>
cd garak-api-service
```

2. Install Node.js dependencies:
```bash
npm install
```

3. Install Garak:
```bash
pip install garak
```

4. Start the development server:
```bash
npm run dev
```

The API will be available at `http://localhost:3000`

### Docker Deployment

1. Build the Docker image:
```bash
docker build -t garak-api-service .
```

2. Run the container:
```bash
docker run -p 3000:3000 garak-api-service
```

## Configuration

The service uses the following directory structure:

- `src/` - Source code
- `config/` - Generated Garak configuration files (temporary)
- `temp/` - Temporary scan output files
- `logs/` - Garak execution logs

## Request Parameters

### Required Parameters

- **name**: Human-readable name for the scan
- **uri**: REST API endpoint URL of the target LLM
- **method**: HTTP method (GET or POST)
- **headers**: HTTP headers object
- **body_template**: JSON request body with `$INPUT` placeholder for prompt injection
- **response_field**: JSONPath to the LLM response content in the API response

### Optional Parameters

- **api_key**: Bearer token to be added to Authorization header
- **probes**: Array of specific Garak probes to run
- **detectors**: Array of specific Garak detectors to use

## Architecture

The service follows a modular architecture:

- **Server** (`server.mjs`): Express.js application setup
- **Routes** (`routes/`): API endpoint handlers
- **Services** (`services/`): Core business logic
- **Middleware** (`middleware/`): Request validation and error handling

### Key Components

1. **GarakService**: Handles configuration generation, subprocess execution, and result parsing
2. **Validation Middleware**: Validates incoming scan requests
3. **Error Handler**: Centralized error handling and logging

## Security Considerations

- Input validation on all API parameters
- Subprocess isolation for Garak execution
- Temporary file cleanup after scans
- Request size limits (10MB)
- CORS and security headers via Helmet

## Logging

The service provides comprehensive logging:

- HTTP request logging via Morgan
- Garak subprocess output capture
- Error logging with stack traces
- Scan execution logs in `logs/` directory

## Error Handling

The service handles various error scenarios:

- Invalid request parameters
- Garak installation issues
- Subprocess execution failures
- File system errors
- Network connectivity issues

## Development

### Project Structure

```
garak-api-service/
├── src/
│   ├── server.mjs              # Main application entry point
│   ├── routes/
│   │   ├── health.mjs          # Health check endpoint
│   │   └── scan.mjs            # Scan endpoint
│   ├── services/
│   │   └── garakService.mjs    # Core Garak integration
│   └── middleware/
│       ├── validation.mjs      # Request validation
│       └── errorHandler.mjs    # Error handling
├── config/                     # Generated Garak configs (temp)
├── temp/                       # Temporary scan outputs
├── logs/                       # Execution logs
├── Dockerfile                  # Container configuration
├── package.json               # Node.js dependencies
└── README.md                  # This file
```

### Scripts

- `npm start` - Start production server
- `npm run dev` - Start development server with auto-reload
- `npm test` - Run tests (placeholder)

## Contributing

1. Follow ES module syntax with .mjs extensions
2. Use async/await for asynchronous operations
3. Implement proper error handling
4. Add logging for debugging
5. Update documentation for any changes

## License

MIT License
