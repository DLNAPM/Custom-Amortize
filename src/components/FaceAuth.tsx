import React, { useState, useRef, useCallback } from 'react';
import Webcam from 'react-webcam';
import { Camera, CheckCircle, XCircle, Loader2 } from 'lucide-react';

interface FaceAuthProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export default function FaceAuth({ onSuccess, onCancel }: FaceAuthProps) {
  const webcamRef = useRef<Webcam>(null);
  const [status, setStatus] = useState<'idle' | 'scanning' | 'success' | 'error'>('idle');

  const capture = useCallback(() => {
    setStatus('scanning');
    
    // Simulate API call for facial recognition
    setTimeout(() => {
      // 80% chance of success for demo purposes
      if (Math.random() > 0.2) {
        setStatus('success');
        setTimeout(() => {
          onSuccess();
        }, 1500);
      } else {
        setStatus('error');
        setTimeout(() => {
          setStatus('idle');
        }, 2000);
      }
    }, 2000);
  }, [onSuccess]);

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full overflow-hidden shadow-2xl">
        <div className="p-6 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Face Recognition</h2>
          <p className="text-gray-500 mb-6">Premium Feature: Authenticate with your face</p>
          
          <div className="relative rounded-xl overflow-hidden bg-gray-100 aspect-video mb-6 flex items-center justify-center">
            {status === 'idle' || status === 'scanning' ? (
              // @ts-ignore
              <Webcam
                audio={false}
                ref={webcamRef}
                screenshotFormat="image/jpeg"
                className="w-full h-full object-cover"
                mirrored
              />
            ) : status === 'success' ? (
              <div className="flex flex-col items-center justify-center text-green-500">
                <CheckCircle className="w-16 h-16 mb-2" />
                <p className="font-medium">Face Recognized</p>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center text-red-500">
                <XCircle className="w-16 h-16 mb-2" />
                <p className="font-medium">Recognition Failed</p>
              </div>
            )}
            
            {status === 'scanning' && (
              <div className="absolute inset-0 bg-blue-500/20 flex items-center justify-center">
                <div className="absolute inset-0 border-4 border-blue-500/50 rounded-xl animate-pulse"></div>
                <div className="w-full h-1 bg-blue-500 absolute top-0 animate-[scan_2s_ease-in-out_infinite]"></div>
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <button
              onClick={onCancel}
              disabled={status === 'scanning' || status === 'success'}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 disabled:opacity-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={capture}
              disabled={status === 'scanning' || status === 'success'}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
            >
              {status === 'scanning' ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Scanning...
                </>
              ) : (
                <>
                  <Camera className="w-4 h-4" />
                  Scan Face
                </>
              )}
            </button>
          </div>
        </div>
      </div>
      <style>{`
        @keyframes scan {
          0% { top: 0; }
          50% { top: 100%; }
          100% { top: 0; }
        }
      `}</style>
    </div>
  );
}
