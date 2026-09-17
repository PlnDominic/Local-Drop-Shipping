import { api } from './client';

export interface FaceVerificationResponse {
  status: 'verified' | 'failed';
  provider: string;
  message: string;
}

export interface FaceVerificationStatusResponse {
  face_verification_status: 'pending' | 'verified' | 'failed';
  face_verification_at: string | null;
}

export const faceVerificationApi = {
  verifyFace: (image: string, provider?: string) =>
    api.post<FaceVerificationResponse>('/face-verification/verify', { image, provider }),

  getStatus: () =>
    api.get<FaceVerificationStatusResponse>('/face-verification/status'),
};
