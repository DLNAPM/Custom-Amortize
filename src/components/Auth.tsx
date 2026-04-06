import React, { useState } from 'react';
import { loginWithGoogle, loginAsGuest } from '../lib/firebase';
import FaceAuth from './FaceAuth';
import { Calculator, LogIn, UserCircle2, ScanFace, LineChart, FileText, Calendar, ArrowRight } from 'lucide-react';

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
    <div className="min-h-screen bg-white font-sans text-gray-900 selection:bg-blue-100">
      {/* Navbar */}
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-md transform -rotate-6">
            <Calculator className="w-5 h-5 text-white transform rotate-6" />
          </div>
          <span className="text-xl font-bold tracking-tight text-gray-900">Custom Amortize</span>
        </div>
        <div className="flex items-center gap-6">
          <button 
            onClick={handleGuestLogin} 
            disabled={isLoading}
            className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors disabled:opacity-50"
          >
            Try as Guest
          </button>
          <button 
            onClick={handleGoogleLogin} 
            disabled={isLoading}
            className="text-sm font-medium bg-blue-600 text-white px-5 py-2.5 rounded-lg hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50 flex items-center gap-2"
          >
            Sign In <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-24">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div className="space-y-8">
            <h1 className="text-5xl sm:text-6xl font-extrabold tracking-tight text-gray-900 leading-[1.1]">
              Take complete control of your <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">loan payoff schedule</span>.
            </h1>
            <p className="text-lg text-gray-600 max-w-lg leading-relaxed">
              Custom Amortize helps you visualize, plan, and execute custom payment strategies to save money on interest and pay off your loans faster.
            </p>
            
            {/* Login Box in Hero */}
            <div className="bg-white p-6 rounded-2xl shadow-xl border border-gray-100 max-w-md relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-indigo-500"></div>
              
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Get Started Today</h3>
              
              {error && (
                <div className="mb-4 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}
              
              <div className="space-y-3">
                <button
                  onClick={handleGoogleLogin}
                  disabled={isLoading}
                  className="w-full flex justify-center items-center gap-3 py-3 px-4 border border-gray-300 rounded-xl shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 transition-all disabled:opacity-50"
                >
                  <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
                  Continue with Google
                </button>
                
                <div className="relative py-2">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-100" />
                  </div>
                  <div className="relative flex justify-center text-xs">
                    <span className="px-2 bg-white text-gray-400 uppercase tracking-wider font-semibold">Premium Feature</span>
                  </div>
                </div>

                <button
                  onClick={() => setShowFaceAuth(true)}
                  disabled={isLoading}
                  className="w-full flex justify-center items-center gap-3 py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 transition-all disabled:opacity-50"
                >
                  <ScanFace className="w-5 h-5" />
                  Face Recognition Login
                </button>
              </div>
            </div>
          </div>
          
          {/* Image Section */}
          <div className="relative lg:ml-auto w-full max-w-lg">
            <div className="absolute inset-0 bg-gradient-to-tr from-blue-100 to-indigo-50 rounded-3xl transform rotate-3 scale-105"></div>
            {/* Truncated Amortize Report UI */}
            <div className="relative rounded-2xl shadow-2xl border border-gray-200 w-full bg-white overflow-hidden aspect-[4/3] flex flex-col">
              {/* Report Header */}
              <div className="bg-gray-50 border-b border-gray-200 p-4 flex justify-between items-center">
                <div>
                  <h4 className="font-semibold text-gray-900 text-sm">Amortization Schedule</h4>
                  <p className="text-xs text-gray-500 mt-0.5">Loan Amount: $250,000 • 30 Years</p>
                </div>
                <div className="flex gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-400"></div>
                  <div className="w-2.5 h-2.5 rounded-full bg-yellow-400"></div>
                  <div className="w-2.5 h-2.5 rounded-full bg-green-400"></div>
                </div>
              </div>
              {/* Report Table */}
              <div className="p-0 flex-1 overflow-hidden relative">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-gray-500 uppercase bg-gray-50/50">
                    <tr>
                      <th className="px-4 py-3 font-medium">Pmt #</th>
                      <th className="px-4 py-3 font-medium">Payment</th>
                      <th className="px-4 py-3 font-medium">Principal</th>
                      <th className="px-4 py-3 font-medium">Interest</th>
                      <th className="px-4 py-3 font-medium">Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-gray-600">
                    <tr className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">1</td>
                      <td className="px-4 py-3 font-medium text-gray-900">$1,342.05</td>
                      <td className="px-4 py-3 text-green-600">$300.38</td>
                      <td className="px-4 py-3 text-red-500">$1,041.67</td>
                      <td className="px-4 py-3 font-medium">$249,699.62</td>
                    </tr>
                    <tr className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">2</td>
                      <td className="px-4 py-3 font-medium text-gray-900">$1,342.05</td>
                      <td className="px-4 py-3 text-green-600">$301.63</td>
                      <td className="px-4 py-3 text-red-500">$1,040.42</td>
                      <td className="px-4 py-3 font-medium">$249,397.99</td>
                    </tr>
                    <tr className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">3</td>
                      <td className="px-4 py-3 font-medium text-gray-900">$1,342.05</td>
                      <td className="px-4 py-3 text-green-600">$302.89</td>
                      <td className="px-4 py-3 text-red-500">$1,039.16</td>
                      <td className="px-4 py-3 font-medium">$249,095.10</td>
                    </tr>
                    <tr className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">4</td>
                      <td className="px-4 py-3 font-medium text-gray-900">$1,342.05</td>
                      <td className="px-4 py-3 text-green-600">$304.15</td>
                      <td className="px-4 py-3 text-red-500">$1,037.90</td>
                      <td className="px-4 py-3 font-medium">$248,790.95</td>
                    </tr>
                    <tr className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">5</td>
                      <td className="px-4 py-3 font-medium text-gray-900">$1,342.05</td>
                      <td className="px-4 py-3 text-green-600">$305.42</td>
                      <td className="px-4 py-3 text-red-500">$1,036.63</td>
                      <td className="px-4 py-3 font-medium">$248,485.53</td>
                    </tr>
                  </tbody>
                </table>
                {/* Fade out effect at the bottom to show it's truncated */}
                <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-white via-white/80 to-transparent pointer-events-none"></div>
              </div>
            </div>
            
            {/* Floating Badge */}
            <div className="absolute -bottom-6 -left-6 bg-white p-4 rounded-xl shadow-xl border border-gray-100 animate-bounce" style={{ animationDuration: '3s' }}>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <LineChart className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Interest Saved</p>
                  <p className="text-xl font-bold text-gray-900">$12,450</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Features Section */}
      <section className="bg-gray-50 py-24 border-t border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl font-bold text-gray-900 tracking-tight">Everything you need to manage your loans</h2>
            <p className="mt-4 text-lg text-gray-600">Powerful tools designed to give you clarity and control over your financial future.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-all hover:-translate-y-1">
              <div className="w-14 h-14 bg-blue-50 rounded-xl flex items-center justify-center mb-6 border border-blue-100">
                <Calendar className="w-7 h-7 text-blue-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Custom Payment Schedules</h3>
              <p className="text-gray-600 leading-relaxed">
                Add extra payments on specific dates, set up recurring additional contributions, and instantly see how they affect your payoff date.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-all hover:-translate-y-1">
              <div className="w-14 h-14 bg-indigo-50 rounded-xl flex items-center justify-center mb-6 border border-indigo-100">
                <LineChart className="w-7 h-7 text-indigo-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Visual Analytics</h3>
              <p className="text-gray-600 leading-relaxed">
                Interactive charts and graphs break down your principal vs. interest over time, making complex financial data easy to understand.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-all hover:-translate-y-1">
              <div className="w-14 h-14 bg-green-50 rounded-xl flex items-center justify-center mb-6 border border-green-100">
                <FileText className="w-7 h-7 text-green-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">PDF Export & Sharing</h3>
              <p className="text-gray-600 leading-relaxed">
                Generate professional PDF reports of your amortization schedule to share with financial advisors, partners, or keep for your records.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white py-12 border-t border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <Calculator className="w-5 h-5 text-blue-600" />
            <span className="text-lg font-bold text-gray-900">Custom Amortize</span>
          </div>
          <p className="text-sm text-gray-500">
            © {new Date().getFullYear()} Custom Amortize. All rights reserved.
          </p>
        </div>
      </footer>

      {showFaceAuth && (
        <FaceAuth 
          onSuccess={handleFaceAuthSuccess} 
          onCancel={() => setShowFaceAuth(false)} 
        />
      )}
    </div>
  );
}
