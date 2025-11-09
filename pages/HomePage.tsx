import React from 'react';
import { useNavigate } from 'react-router-dom';
import { User } from '../types';
import { VirtualPhotoshootIcon, AssetGeneratorIcon, ProductForgeIcon, StyleSceneIcon } from '../components/icons';
import { PATHS } from '../constants/paths';

interface HomePageProps {
  user: User;
}

const FeatureCard: React.FC<{
  icon: React.ReactElement;
  title: string;
  subtitle: string;
  description: string;
  onClick: () => void;
  tourId: string;
}> = ({ icon, title, subtitle, description, onClick, tourId }) => (
  <button
    onClick={onClick}
    data-tour-id={tourId}
    className="bg-white p-6 rounded-2xl shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-300 text-left w-full flex flex-col border border-gray-200/50"
  >
    <div className="flex-shrink-0 w-12 h-12 text-[#9F1D35] mb-4">{icon}</div>
    <div className="flex-grow">
      {subtitle && <p className="text-xs font-semibold text-[#9F1D35] uppercase tracking-wider">{subtitle}</p>}
      <h3 className={`text-xl font-bold text-[#2E1E1E] ${subtitle ? 'mt-1' : ''}`}>{title}</h3>
      <p className="text-gray-600 mt-2 text-sm">{description}</p>
    </div>
    <div className="mt-6">
      <span className="font-semibold text-[#9F1D35]">
        Get Started &rarr;
      </span>
    </div>
  </button>
);

const HomePage: React.FC<HomePageProps> = ({ user }) => {
  const navigate = useNavigate();
  return (
      <div className="min-h-screen p-4 sm:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto">
          <main>
            <div className="text-center mb-16">
              <h1 className="text-5xl font-bold text-[#2E1E1E] font-headline">ZOLA AI</h1>
              <p className="text-gray-600 mt-2 text-lg max-w-3xl mx-auto">Welcome back, <span className="font-bold">{user.username}</span>! Disrupting e-commerce product photography with automated visual asset creation.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
              <FeatureCard
                tourId="virtual-photoshoot"
                icon={<VirtualPhotoshootIcon />}
                title="Virtual Photoshoot"
                subtitle="Seamless Swap"
                description="Swap any product onto your model with 100% facial preservation and cinematic realism. Get a 4K portfolio in minutes."
                onClick={() => navigate(PATHS.VIRTUAL_PHOTOSHOOT)}
              />
               <FeatureCard
                tourId="style-scene"
                icon={<StyleSceneIcon />}
                title="Style|Scene Campaigner"
                subtitle="AI Lifestyle Director"
                description="Generate an entire lifestyle campaign. Choose a model and a scene, and our AI creates a batch of photorealistic images."
                onClick={() => navigate(PATHS.STYLE_SCENE)}
              />
              <FeatureCard
                tourId="asset-generator"
                icon={<AssetGeneratorIcon />}
                title="E-commerce Asset Generator"
                subtitle="Core Extraction"
                description="Instantly turn lifestyle shots into a full set of ghost mannequin assets, including all apparel and accessories."
                onClick={() => navigate(PATHS.ASSET_GENERATOR)}
              />
              <FeatureCard
                tourId="catalog-forged"
                icon={<ProductForgeIcon />}
                title="Perfect Product Forge"
                subtitle="Catalog | Forged"
                description="Eliminate wrinkles, correct shape, and generate 4K hyper-realistic studio shots on a custom background in seconds."
                onClick={() => navigate(PATHS.CATALOG_FORGED)}
              />
            </div>
          </main>
          
          <footer className="text-center mt-16 text-gray-400 text-sm">
            <p>&copy; {new Date().getFullYear()} ZOLA AI. All rights reserved.</p>
            <button 
              onClick={() => navigate(PATHS.ABOUT)}
              className="mt-2 text-gray-500 hover:text-[#9F1D35] font-semibold transition-colors"
            >
              About ZOLA AI
            </button>
          </footer>
        </div>
      </div>
  );
};

export default HomePage;
