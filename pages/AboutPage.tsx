import React from 'react';

interface AboutPageProps {}

const AboutPage: React.FC<AboutPageProps> = () => {
  return (
    <div className="min-h-screen flex flex-col items-center p-4 sm:p-6 lg:p-8">
      <main className="w-full max-w-5xl bg-white rounded-3xl shadow-2xl p-6 sm:p-10 lg:p-12 border border-gray-200/50">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl sm:text-5xl font-bold text-[#2E1E1E] font-headline">About ZOLA AI</h1>
            <p className="text-gray-600 mt-3 text-lg">The Future of Fashion E-commerce, Powered by Generative AI.</p>
          </div>

          <div className="space-y-12">
            <section>
              <h2 className="text-2xl sm:text-3xl font-bold text-[#9F1D35] mb-4">Our Features</h2>
              <div className="space-y-6 text-gray-700">
                <div>
                  <h3 className="font-bold text-lg text-[#2E1E1E]">Virtual Photoshoot (Seamless Swap)</h3>
                  <p>Instantly swap any product onto your model with 100% facial and identity preservation. Our AI achieves cinematic realism, generating a 4K portfolio in minutes, not weeks, saving you time and money on expensive photoshoots.</p>
                </div>
                <div>
                  <h3 className="font-bold text-lg text-[#2E1E1E]">E-commerce Asset Generator (Core Extraction)</h3>
                  <p>Transform a single lifestyle photo into a complete set of e-commerce assets. The "Core Extraction" tool intelligently isolates every apparel item, creating professional, ready-to-use ghost mannequin images for your product pages.</p>
                </div>
                <div>
                  <h3 className="font-bold text-lg text-[#2E1E1E]">Perfect Product Forge (Catalog | Forged)</h3>
                  <p>Say goodbye to wrinkles, poor lighting, and inconsistent shapes. The "Product Forge" tool takes any phone snapshot and transforms it into a 4K, hyper-realistic, studio-quality product shot on a background of your choice, ensuring your catalog always looks pristine.</p>
                </div>
              </div>
            </section>
            
            <section>
              <h2 className="text-2xl sm:text-3xl font-bold text-[#9F1D35] mb-4">How AI Powers ZOLA AI</h2>
              <div className="space-y-4 text-gray-700">
                <p>
                  Our entire platform is built on Google's state-of-the-art multimodal AI model, Gemini. Unlike older AI, Gemini doesn't just "see" your images; it understands them on a deeper level.
                </p>
                <p>
                  This multimodal capability allows our tools to comprehend the 3D shape of clothing from a 2D photo, analyze the context of an image, and replicate the complex nuances of light, shadow, and fabric texture. When you use our Virtual Photoshoot, the AI performs what is essentially a complex 3D simulation to realistically drape the new garment onto your model, ensuring a perfect, physically accurate fit every time. This advanced processing is what sets our results apart, making them indistinguishable from reality.
                </p>
              </div>
            </section>
            
            <section>
              <h2 className="text-2xl sm:text-3xl font-bold text-[#9F1D35] mb-4">About Us</h2>
              <div className="space-y-4 text-gray-700">
                <p>
                  <strong>Our Mission:</strong> To democratize high-end e-commerce photography for fashion brands of all sizes.
                </p>
                <p>
                  We are ZOLA AI, a team of engineers and fashion industry veterans who believe that stunning product visuals shouldn't require expensive photoshoots and long turnaround times. By harnessing the power of generative AI, we provide tools that are fast, cost-effective, and produce results that rival traditional photography. We're passionate about empowering brands to tell their stories and sell their products more effectively in the digital marketplace.
                </p>
              </div>
            </section>
          </div>
        </div>
      </main>

      <footer className="text-center mt-8 text-gray-400 text-sm">
        <p>&copy; {new Date().getFullYear()} ZOLA AI. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default AboutPage;