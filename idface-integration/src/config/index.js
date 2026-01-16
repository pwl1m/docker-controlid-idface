module.exports = {
    apiEndpoint: process.env.API_ENDPOINT || 'http://localhost:3000/api',
    idFaceApi: {
        loginUrl: process.env.IDFACE_LOGIN_URL || 'http://localhost:3000/idface/login',
        recognitionUrl: process.env.IDFACE_RECOGNITION_URL || 'http://localhost:3000/idface/recognize',
    },
    authentication: {
        apiKey: process.env.API_KEY || 'your-api-key',
        secret: process.env.API_SECRET || 'your-api-secret',
    },
};