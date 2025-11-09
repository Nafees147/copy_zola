import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { GoogleIcon } from '../components/icons';
import { PATHS } from '../constants/paths';

interface AuthPageProps {}

const AuthPage: React.FC<AuthPageProps> = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [signupSuccess, setSignupSuccess] = useState(false);
  const [redirectUrl, setRedirectUrl] = useState('');
  
  const navigate = useNavigate();

  useEffect(() => {
    // Set the redirect URL on component mount.
    // This ensures it's available to render and avoids any server-side rendering issues.
    setRedirectUrl(window.location.origin);
  }, []);


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!email.trim() || !password.trim()) {
      setError('Email and password cannot be empty.');
      setLoading(false);
      return;
    }

    if (isLogin) {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) setError(error.message);
      // onAuthStateChange in App.tsx will handle navigation
    } else { // Register
      if (!username.trim()) {
        setError('Username cannot be empty.');
        setLoading(false);
        return;
      }
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username: username,
          },
        },
      });

      if (error) {
        setError(error.message);
      } else if (data.user) {
        // Supabase handles profile creation via a database trigger.
        // Check if email confirmation is required.
        if (data.user.identities?.length === 0) {
            // This condition is often true for magic link, but for email/pass it means confirmation is required.
            // A more reliable check is if the session is null.
             setSignupSuccess(true);
        } else if (!data.session) {
            setSignupSuccess(true);
        }
        // If a session exists (e.g., auto-confirm is on), the onAuthStateChange listener in App.tsx will handle navigation.
      }
    }
    setLoading(false);
  };

  const handleGoogleSignIn = async () => {
    setError('');
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin, // Ensure Supabase redirects back to your app
      }
    });
    if (error) {
      setError(`Google sign-in error: ${error.message}`);
    }
    // onAuthStateChange will handle navigation after Google redirect
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Branding Panel */}
      <div className="hidden lg:flex w-1/2 bg-[#2E1E1E] p-12 text-white flex-col justify-between">
        <div>
          <h1 
            className="text-3xl font-bold font-headline cursor-pointer"
            onClick={() => navigate(PATHS.LANDING)}
          >
            ZOLA AI
          </h1>
        </div>
        <div>
          <h2 className="text-4xl font-bold leading-snug">The AI Photoshoot that pays for itself.</h2>
          <p className="mt-4 text-white/70">
            Join the brands building the future of fashion e-commerce.
          </p>
        </div>
        <div className="text-sm text-white/50">
          &copy; {new Date().getFullYear()} ZOLA AI. All rights reserved.
        </div>
      </div>
      
      {/* Right Auth Form Panel */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-white text-[#2E1E1E]">
        <div className="w-full max-w-sm">
          <div className="text-center lg:text-left mb-10">
            <h1 
              className="text-4xl font-bold text-gray-800 font-headline lg:hidden cursor-pointer"
              onClick={() => navigate(PATHS.LANDING)}
            >
              ZOLA AI
            </h1>
          </div>

          {signupSuccess ? (
            <div className="text-center animate-fade-in">
              <div className="w-16 h-16 mx-auto mb-4 text-green-500">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                </svg>
              </div>
              <h2 className="text-3xl font-bold text-gray-800 mb-2">
                Please check your email
              </h2>
              <p className="text-gray-500">
                We've sent a confirmation link to <strong>{email}</strong>. Click the link to activate your account.
              </p>
              <button
                onClick={() => {
                  setSignupSuccess(false);
                  setIsLogin(true);
                  setPassword('');
                }}
                className="mt-8 w-full py-3 bg-[#9F1D35] text-white font-semibold rounded-full shadow-lg hover:bg-[#80172a] transition-colors"
              >
                Back to Login
              </button>
            </div>
          ) : (
            <>
              <h2 className="text-3xl font-bold text-gray-800 mb-2">
                {isLogin ? 'Welcome Back' : 'Create an Account'}
              </h2>
              <p className="text-gray-500 mb-8">
                {isLogin ? 'Login to continue to your dashboard.' : 'Get started with 10 free generations.'}
              </p>
              <form onSubmit={handleSubmit}>
                {!isLogin && (
                  <div className="mb-6">
                    <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="username">
                      Username
                    </label>
                    <input
                      id="username"
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full px-1 py-3 bg-transparent border-b-2 border-gray-200 focus:outline-none focus:border-[#9F1D35] transition-colors"
                      placeholder="e.g. fashion_house"
                      required
                    />
                  </div>
                )}
                <div className="mb-6">
                  <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="email">
                    Email
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-1 py-3 bg-transparent border-b-2 border-gray-200 focus:outline-none focus:border-[#9F1D35] transition-colors"
                    placeholder="you@example.com"
                    required
                  />
                </div>
                <div className="mb-8">
                  <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="password">
                    Password
                  </label>
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-1 py-3 bg-transparent border-b-2 border-gray-200 focus:outline-none focus:border-[#9F1D35] transition-colors"
                    placeholder="&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;"
                    required
                  />
                </div>
                {error && <p className="text-red-500 text-xs text-center mb-4">{error}</p>}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-[#9F1D35] text-white font-semibold rounded-full shadow-lg hover:bg-[#80172a] transition-colors disabled:bg-gray-400"
                >
                  {loading ? 'Processing...' : (isLogin ? 'Login' : 'Create Account')}
                </button>
              </form>
              <p className="text-center text-sm text-gray-600 mt-6">
                {isLogin ? "Don't have an account?" : 'Already have an account?'}
                <button onClick={() => { setIsLogin(!isLogin); setError(''); }} className="font-semibold text-[#9F1D35] hover:underline ml-1">
                  {isLogin ? 'Sign up' : 'Login'}
                </button>
              </p>
              
              <div className="relative flex py-5 items-center">
                  <div className="flex-grow border-t border-gray-200"></div>
                  <span className="flex-shrink mx-4 text-gray-500 text-xs uppercase">Or</span>
                  <div className="flex-grow border-t border-gray-200"></div>
              </div>

              <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={loading}
                  className="w-full flex items-center justify-center py-3 bg-white border border-gray-300 text-gray-700 font-semibold rounded-full shadow-sm hover:bg-gray-50 transition-colors disabled:bg-gray-200 disabled:cursor-not-allowed"
              >
                  <GoogleIcon />
                  <span>{isLogin ? 'Sign in with Google' : 'Sign up with Google'}</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
