import React from 'react';
import { Link } from 'react-router-dom';
import { PATHS } from '../constants/paths';

const NotFoundPage: React.FC = () => (
  <div className="min-h-screen flex flex-col items-center justify-center text-center p-4 bg-white">
    <h1 className="text-6xl font-bold text-[#9F1D35] font-headline">404</h1>
    <h2 className="mt-4 text-3xl font-semibold text-[#2E1E1E]">Page Not Found</h2>
    <p className="mt-2 text-gray-600">Sorry, the page you are looking for does not exist.</p>
    <Link
      to={PATHS.HOME}
      className="mt-8 px-6 py-3 bg-[#9F1D35] text-white font-semibold rounded-full shadow-lg hover:bg-[#80172a] transition-colors"
    >
      Go Back Home
    </Link>
  </div>
);

export default NotFoundPage;
