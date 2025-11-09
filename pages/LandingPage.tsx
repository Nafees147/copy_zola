import React from 'react';
import { useNavigate } from 'react-router-dom';
import { VirtualPhotoshootIcon, AssetGeneratorIcon, ProductForgeIcon, StyleSceneIcon } from '../components/icons';
import { PATHS } from '../constants/paths';

interface LandingPageProps {}

const LandingPage: React.FC<LandingPageProps> = () => {
  const navigate = useNavigate();
  return (
    <div className="bg-[#FFFFFF] text-[#2E1E1E]">
      <header className="absolute top-0 left-0 right-0 z-10 py-4 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-bold font-headline">ZOLA AI</h1>
          <button
            onClick={() => navigate(PATHS.AUTH)}
            className="px-6 py-2 bg-[#2E1E1E] text-white font-semibold rounded-full hover:bg-black transition-colors"
          >
            Login / Sign Up
          </button>
        </div>
      </header>

      <main>
        {/* Hero Section */}
        <section className="relative min-h-screen flex items-center justify-center text-center p-4 bg-[#FAFAFA]">
          <div className="z-10 relative">
            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-bold font-headline leading-tight">
              Stop Shooting. Start Selling.
            </h1>
            <p className="mt-4 text-lg sm:text-xl max-w-3xl mx-auto text-[#2E1E1E]/80">
              Generate studio-quality ghost mannequin shots, virtual try-ons, and full e-commerce asset packages from any model image in minutes, not weeks.
            </p>
            <button
              onClick={() => navigate(PATHS.AUTH)}
              className="mt-8 px-10 py-4 bg-[#9F1D35] text-white font-bold rounded-full text-lg shadow-lg hover:bg-[#80172a] transition-transform hover:scale-105"
            >
              Start Your Free Trial
            </button>
            <p className="mt-2 text-sm text-gray-500">10 free image generations. No credit card required.</p>
          </div>
        </section>

        {/* Core Features Section */}
        <section className="py-20 sm:py-24 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <h2 className="text-4xl font-bold font-headline">The AI Photoshoot That Pays for Itself</h2>
              <p className="mt-4 text-lg text-[#2E1E1E]/70 max-w-3xl mx-auto">One photo is all you need. Our AI pipeline handles the rest, delivering consistent, high-quality assets at scale.</p>
            </div>
            <div className="mt-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              <div className="text-center flex flex-col">
                <div className="w-16 h-16 mx-auto text-[#9F1D35] flex-shrink-0"><VirtualPhotoshootIcon /></div>
                <h3 className="mt-6 text-xl font-bold text-[#9F1D35] tracking-tight">Virtual Photoshoot</h3>
                <p className="mt-2 text-gray-600 flex-grow">Swap any product onto your model with 100% facial preservation and cinematic realism. Get a 4K portfolio in minutes.</p>
              </div>
              <div className="text-center flex flex-col">
                  <div className="w-16 h-16 mx-auto text-[#9F1D35] flex-shrink-0"><StyleSceneIcon /></div>
                  <h3 className="mt-6 text-xl font-bold text-[#9F1D35] tracking-tight">StyleScene Campaign Generator</h3>
                  <p className="mt-1 text-xs font-bold text-[#2E1E1E] uppercase tracking-wider">AI LIFESTYLE DIRECTOR</p>
                  <p className="mt-2 text-gray-600 flex-grow">
                    Generate full 4K lifestyle campaigns. Transform a static product image into a dynamic photoshoot with a model in any scene you choose. Our invisible AI Director automatically adds cinematic lighting and composition.
                  </p>
              </div>
              <div className="text-center flex flex-col">
                <div className="w-16 h-16 mx-auto text-[#9F1D35] flex-shrink-0"><AssetGeneratorIcon /></div>
                <h3 className="mt-6 text-xl font-bold text-[#9F1D35] tracking-tight">E-commerce Asset Generator</h3>
                <p className="mt-2 text-gray-600 flex-grow">Instantly turn lifestyle shots into a full set of ghost mannequin assets, including all apparel and accessories.</p>
              </div>
              <div className="text-center flex flex-col">
                <div className="w-16 h-16 mx-auto text-[#9F1D35] flex-shrink-0"><ProductForgeIcon /></div>
                <h3 className="mt-6 text-xl font-bold text-[#9F1D35] tracking-tight">Perfect Product Forge</h3>
                 <p className="mt-1 text-xs font-bold text-[#2E1E1E] uppercase tracking-wider">Catalog | Forged</p>
                <p className="mt-2 text-gray-600 flex-grow">Eliminate Wrinkles & Noise. Instantly transform phone snapshots into 4K, hyper-realistic, studio-quality product images.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Trust/Social Proof */}
        <section className="py-20 sm:py-24 bg-[#2E1E1E] text-white">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl font-bold font-headline">Trusted by Modern E-commerce Brands</h2>
            <blockquote className="mt-8 text-xl italic text-white/80">
              "We cut our product photography budget by 65% and launched new collections 4x faster. ZOLA AI is an essential part of our workflow."
            </blockquote>
            <p className="mt-4 font-semibold text-white/90">- E-commerce Manager, <span className="text-[#A9A9A9]">Aperture Apparel</span></p>
          </div>
        </section>

        {/* Final CTA */}
        <section className="py-20 sm:py-32 bg-white">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-4xl font-bold font-headline">Ready to Transform Your Catalog?</h2>
            <p className="mt-4 text-lg text-gray-600">Join the brands building the future of fashion e-commerce.</p>
            <button
              onClick={() => navigate(PATHS.AUTH)}
              className="mt-8 px-10 py-4 bg-[#9F1D35] text-white font-bold rounded-full text-lg shadow-lg hover:bg-[#80172a] transition-transform hover:scale-105"
            >
              Get Started Free
            </button>
          </div>
        </section>
      </main>

      <footer className="bg-[#FAFAFA] border-t border-gray-200">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 text-center text-sm text-gray-500">
          <p>&copy; {new Date().getFullYear()} ZOLA AI. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
