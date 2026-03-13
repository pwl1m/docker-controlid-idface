interface IdFaceResponse {
    success: boolean;
    message: string;
    data?: any;
}

interface IdFaceLoginRequest {
    username: string;
    password: string;
}

interface IdFaceRecognitionRequest {
    image: string; // Base64 encoded image
}

interface DeviceController {
    login(request: IdFaceLoginRequest): Promise<IdFaceResponse>;
    recognize(request: IdFaceRecognitionRequest): Promise<IdFaceResponse>;
}