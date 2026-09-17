'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Camera, RefreshCw, Shield, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { faceVerificationApi } from '../lib/api/face-verification';

type VerificationState = 'idle' | 'capturing' | 'verifying' | 'success' | 'failed' | 'error';

interface FaceVerificationProps {
  onVerified: () => void;
  onRetry?: () => void;
}

const FACE_VERIFICATION_INSTRUCTIONS = [
  'Position your face inside the frame',
  'Ensure your face is clearly visible',
  'Remove anything obstructing the face',
  'Use adequate lighting',
];

export const FaceVerification: React.FC<FaceVerificationProps> = ({ onVerified, onRetry }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [hasCamera, setHasCamera] = useState(false);
  const [verificationState, setVerificationState] = useState<VerificationState>('idle');
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const startCamera = useCallback(async () => {
    try {
      setError('');
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      setStream(mediaStream);
      setHasCamera(true);
    } catch {
      setError('Camera access denied. Please allow camera access to proceed with face verification.');
      setHasCamera(false);
    }
  }, [verificationState]);

  useEffect(() => {
    startCamera();
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [startCamera]);

  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [stream]);

  const handleRetry = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
    }
    setPreviewImage(null);
    setVerificationState('idle');
    setMessage('');
    setError('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    startCamera();
    onRetry?.();
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0);
    const imageData = canvas.toDataURL('image/jpeg', 0.8);

    setPreviewImage(imageData);
    setVerificationState('verifying');
    setMessage('');
    setError('');

    verifyFace(imageData);
  };

  const verifyFace = async (imageData: string) => {
    try {
      const result = await faceVerificationApi.verifyFace(imageData);

      if (result.status === 'verified') {
        setVerificationState('success');
        setMessage(result.message || 'Your face has been verified successfully!');
        setTimeout(() => {
          onVerified();
        }, 1500);
      } else {
        setVerificationState('failed');
        setMessage(result.message || 'Face verification failed. Please try again.');
      }
    } catch (err) {
      setVerificationState('error');
      setError(err instanceof Error ? err.message : 'Verification failed. Please try again.');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be under 5 MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const imageData = reader.result as string;
      setPreviewImage(imageData);
      setVerificationState('verifying');
      setMessage('');
      setError('');
      verifyFace(imageData);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="w-full max-w-md mx-auto space-y-5">
      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-2">
        <div className="flex items-center gap-1.5 text-[11px] font-black text-[#f04438]">
          <div className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black bg-[#f04438] text-white">
            3
          </div>
          <span className="hidden sm:block">Face Verification</span>
        </div>
        <div className="flex-1 h-px bg-gray-200" />
        <div className="flex items-center gap-1.5 text-[11px] font-black text-gray-400">
          <div className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black bg-gray-200 text-[#999]">
            4
          </div>
          <span className="hidden sm:block">Review</span>
        </div>
      </div>

      <h2 className="text-[24px] font-black text-[#151515]">Face Verification</h2>
      <p className="text-[13px] text-[#888] mt-1 mb-4">
        Verify your identity with a quick face scan. This helps keep your account secure.
      </p>

      {/* Instructions */}
      <div className="rounded bg-[#f04438]/5 border border-[#f04438]/20 p-4 space-y-2">
        <p className="text-[11px] font-black uppercase tracking-wider text-[#f04438] mb-2">
          <Shield size={12} className="inline mr-1" /> Instructions
        </p>
        {FACE_VERIFICATION_INSTRUCTIONS.map((instruction, i) => (
          <p key={i} className="text-[12px] text-[#555] flex items-start gap-2">
            <span className="text-[#f04438] font-bold">{i + 1}.</span>
            {instruction}
          </p>
        ))}
      </div>

      {/* Error message */}
      {error && (
        <div className="rounded bg-red-50 px-3 py-3 text-[12px] text-red-700 border border-red-100 flex items-start gap-2">
          <AlertCircle size={14} className="mt-0.5 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Camera / Preview area */}
      <div className="space-y-3">
        {verificationState === 'idle' || verificationState === 'capturing' ? (
          <>
            {/* Camera preview */}
            <div className="relative rounded border-2 border-gray-200 overflow-hidden bg-black aspect-video">
              {hasCamera ? (
                <>
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover scale-x-[-1]"
                  />
                  {/* Camera frame overlay */}
                  <div className="absolute inset-0 border-[3px] border-[#f04438]/40 rounded pointer-events-none" />
                  <div className="absolute top-2 left-2 text-white text-[10px] font-bold bg-black/50 px-2 py-0.5 rounded pointer-events-none">
                    Face Frame
                  </div>
                  {/* Camera icon overlay when not capturing */}
                  {verificationState === 'idle' && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <Camera size={48} className="text-white/30" />
                    </div>
                  )}
                </>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center gap-3 bg-gray-900 text-white p-6">
                  <Camera size={40} className="text-gray-600" />
                  <p className="text-sm text-gray-400 text-center">Camera unavailable</p>
                  <p className="text-[11px] text-gray-500 text-center">
                    You can also upload a clear photo of your face
                  </p>
                </div>
              )}
            </div>

            {/* Hidden canvas for capture */}
            <canvas ref={canvasRef} className="hidden" />

            {/* Action buttons */}
            <div className="flex gap-3">
              {hasCamera && (
                <button
                  type="button"
                  onClick={capturePhoto}
                  className="flex-1 h-11 rounded bg-[#151515] text-[13px] font-black text-white hover:bg-[#f04438] transition-colors flex items-center justify-center gap-1.5"
                >
                  <Camera size={15} />
                  Take Photo
                </button>
              )}

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex-1 h-11 rounded border border-gray-200 text-[13px] font-black text-[#151515] hover:border-[#f04438] hover:text-[#f04438] transition-colors flex items-center justify-center gap-1.5"
              >
                Upload Photo
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileUpload}
              />
            </div>
          </>
        ) : (
          /* Captured / Preview state */
          <div className="space-y-3">
            <div className="relative rounded border-2 border-gray-200 overflow-hidden bg-black aspect-video">
              {previewImage ? (
                <img
                  src={previewImage}
                  alt="Captured face"
                  className="w-full h-full object-cover scale-x-[-1]"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gray-900 text-white p-6">
                  <p>No image captured</p>
                </div>
              )}
              {/* Overlay for verification states */}
              {verificationState === 'verifying' && (
                <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center text-white gap-3">
                  <Loader2 size={40} className="animate-spin text-[#f04438]" />
                  <p className="text-sm font-bold">Verifying your face...</p>
                </div>
              )}
              {verificationState === 'success' && (
                <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center text-white gap-3">
                  <CheckCircle2 size={48} className="text-green-400" />
                  <p className="text-sm font-bold text-green-400">Verified!</p>
                </div>
              )}
              {verificationState === 'failed' && (
                <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center text-white gap-3">
                  <AlertCircle size={48} className="text-red-400" />
                  <p className="text-sm font-bold text-red-400">Verification Failed</p>
                </div>
              )}
              {verificationState === 'error' && (
                <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center text-white gap-3">
                  <AlertCircle size={48} className="text-red-400" />
                  <p className="text-sm font-bold text-red-400">Error</p>
                </div>
              )}
            </div>

            {/* Success message */}
            {verificationState === 'success' && (
              <div className="rounded bg-green-50 px-3 py-3 text-[12px] text-green-700 border border-green-100 flex items-start gap-2">
                <CheckCircle2 size={14} className="mt-0.5 flex-shrink-0" />
                {message}
              </div>
            )}

            {/* Failure / Error message with retry */}
            {(verificationState === 'failed' || verificationState === 'error') && (
              <div className="space-y-3">
                <div className="rounded bg-red-50 px-3 py-3 text-[12px] text-red-700 border border-red-100 flex items-start gap-2">
                  <AlertCircle size={14} className="mt-0.5 flex-shrink-0" />
                  {message || error || 'Verification failed. Please try again.'}
                </div>
                <button
                  type="button"
                  onClick={handleRetry}
                  className="w-full h-11 rounded bg-[#151515] text-[13px] font-black text-white hover:bg-[#f04438] transition-colors flex items-center justify-center gap-1.5"
                >
                  <RefreshCw size={15} />
                  Try Again
                </button>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full h-11 rounded border border-gray-200 text-[13px] font-black text-[#151515] hover:border-[#f04438] hover:text-[#f04438] transition-colors flex items-center justify-center gap-1.5"
                >
                  Upload Different Photo
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileUpload}
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Privacy note */}
      <div className="flex items-start gap-2 bg-[#f04438]/5 border border-[#f04438]/20 rounded p-3">
        <Shield size={14} className="text-[#f04438] mt-0.5 flex-shrink-0" />
        <p className="text-[11px] text-[#555]">
          Your face image is processed securely and not stored on our servers. Verification is handled by a secure, reputable facial recognition service.
        </p>
      </div>
    </div>
  );
};