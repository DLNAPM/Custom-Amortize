import React, { useState } from 'react';
import { loginWithGoogle, loginAsGuest } from '../lib/firebase';
import FaceAuth from './FaceAuth';
import { Calculator, LogIn, UserCircle2, ScanFace } from 'lucide-react';

export default function Auth() {
  const [showFaceAuth, setShowFaceAuth] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleGoogleLogin = async () => {
    try {
      setIsLoading(true);
      setError(null);
      await loginWithGoogle();
    } catch (err: any) {
      setError(err.message || 'Failed to login with Google');
      setIsLoading(false);
    }
  };

  const handleGuestLogin = async () => {
    try {
      setIsLoading(true);
      setError(null);
      await loginAsGuest();
    } catch (err: any) {
      setError(err.message || 'Failed to login as guest');
      setIsLoading(false);
    }
  };

  const handleFaceAuthSuccess = async () => {
    setShowFaceAuth(false);
    // In a real app, this would verify the face against a stored biometric template
    // and then issue a custom token. For this demo, we'll just log them in via Google
    // or simulate a successful login.
    await handleGoogleLogin();
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg transform -rotate-6">
            <Calculator className="w-8 h-8 text-white transform rotate-6" />
          </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 tracking-tight">
          Custom Amortize
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Take control of your loan payoff schedule
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-xl sm:rounded-2xl sm:px-10 border border-gray-100">
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <button
              onClick={handleGoogleLogin}
              disabled={isLoading}
              className="w-full flex justify-center items-center gap-3 py-3 px-4 border border-gray-300 rounded-xl shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all disabled:opacity-50"
            >
              <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
              Continue with Google
            </button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">Premium Feature</span>
              </div>
            </div>

            <button
              onClick={() => setShowFaceAuth(true)}
              disabled={isLoading}
              className="w-full flex justify-center items-center gap-3 py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all disabled:opacity-50"
            >
              <ScanFace className="w-5 h-5" />
              Face Recognition Login
            </button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">Or try it out</span>
              </div>
            </div>

            <button
              onClick={handleGuestLogin}
              disabled={isLoading}
              className="w-full flex justify-center items-center gap-3 py-3 px-4 border border-gray-300 rounded-xl shadow-sm bg-gray-50 text-sm font-medium text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-all disabled:opacity-50"
            >
              <UserCircle2 className="w-5 h-5 text-gray-500" />
              Continue as Guest
            </button>
          </div>
        </div>
      </div>

      {showFaceAuth && (
        <FaceAuth 
          onSuccess={handleFaceAuthSuccess} 
          onCancel={() => setShowFaceAuth(false)} 
        />
      )}
    </div>
  );
}
