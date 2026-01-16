# IDFace Integration Project

This project is a Node.js application that integrates with the Control ID IDFace device. It provides functionalities for user authentication and facial recognition through a RESTful API.

## Project Structure

```
idface-integration
├── src
│   ├── index.js               # Entry point of the application
│   ├── config
│   │   └── index.js           # Configuration settings
│   ├── services
│   │   └── idface.service.js   # Service for interacting with IDFace API
│   ├── controllers
│   │   └── device.controller.js # Controller for handling device requests
│   ├── routes
│   │   └── index.js           # Route definitions
│   ├── utils
│   │   └── logger.js          # Logger utility
│   └── types
│       └── index.d.ts         # Type definitions
├── docker
│   └── Dockerfile             # Dockerfile for building the application image
├── .dockerignore               # Files to ignore during Docker build
├── .env.example                # Example environment variables
├── docker-compose.yml          # Docker Compose configuration
├── package.json                # npm configuration file
└── README.md                   # Project documentation
```

## Setup Instructions

1. **Clone the repository:**
   ```
   git clone https://github.com/pwl1m/paulo-onix.git
   cd paulo-onix/idface-integration
   ```

2. **Install dependencies:**
   ```
   npm install
   ```

3. **Configure environment variables:**
   Copy the `.env.example` file to `.env` and fill in the required values.

4. **Run the application:**
   You can run the application locally using:
   ```
   npm start
   ```

   Or, to run it in a Docker container:
   ```
   docker-compose up
   ```

## Usage

The API provides endpoints for user authentication and facial recognition. Refer to the API documentation for detailed usage instructions.

## API Details

- **Login Endpoint:** `/api/login`
- **Recognition Endpoint:** `/api/recognize`

## Contributing

Contributions are welcome! Please open an issue or submit a pull request for any improvements or bug fixes.

## License

This project is licensed under the MIT License. See the LICENSE file for details.