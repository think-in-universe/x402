import Image from "next/image";
import Link from 'next/link';
import {
  BoltIcon,
  CloudIcon,
  MusicalNoteIcon,
  CheckIcon,
} from '@heroicons/react/24/outline';
import { FeatureItem } from './components/FeatureItem';
import GithubIcon from './assets/github.svg';
import x402Diagram from './assets/x402-protocol-flow.png';

const whatIsItFeatures = [
  {
    description: 'Instant, Low-Cost Payments (with No Gas for Users)',
    icon: <CheckIcon className="w-5 h-5 text-indigo-400" />,
  },
  {
    description: 'Frictionless Integration',
    icon: <CheckIcon className="w-5 h-5 text-indigo-400" />,
  },

  {
    description: 'Security and Trust via an Open Standard',
    icon: <CheckIcon className="w-5 h-5 text-indigo-400" />,
  },
  {
    description: 'Backed by Coinbase',
    icon: <CheckIcon className="w-5 h-5 text-indigo-400" />,
  },
];
const whyItMattersFeatures = [
  {
    title: 'AI Agents',
    description:
      'Agents can use the x402 Protocol to pay for API requests in real-time as they query external data sources',
    icon: <BoltIcon className="w-5 h-5 text-indigo-400" />,
  },
  {
    title: 'Cloud Storage Providers',
    description:
      'Using x402, customers can easily access storage services without account creation, payment method collection, or contract management',
    icon: <CloudIcon className="w-5 h-5 text-indigo-400" />,
  },
  {
    title: 'Content Creators',
    description:
      'x402 unlocks nearly zero cost, instant transactions enabling monetization of content and true micropayments',
    icon: <MusicalNoteIcon className="w-5 h-5 text-indigo-400" />,
  },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white">
      {/* Hero Section */}
      <section className="container mx-auto px-4 pt-28 pb-20">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl md:text-7xl !leading-[1.1] font-bold mb-6 bg-gradient-to-r from-blue-400 to-purple-500 text-transparent bg-clip-text">
            1 Line of Code to Accept Digital Dollars
          </h1>
          <p className="text-xl text-gray-400 mb-8 font-mono">
            x402: No fee. 200ms settlement. It just works.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <a
              href="/whitepaper.pdf"
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-mono transition-colors"
            >
              Read the Whitepaper
            </a>
            <Link
              href="https://github.com/coinbase/x402"
              target="_blank"
              rel="noopener noreferrer"
              className="px-6 py-3 bg-gray-800 hover:bg-gray-700 rounded-lg font-mono transition-colors flex items-center gap-2"
            >
              <GithubIcon className="w-5 h-5 mr-1" fill="currentColor" />
              View on GitHub
            </Link>
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 py-20">
        <div className="max-w-6xl mx-auto space-y-24">
          {/* What is it? */}
          <div className="relative">
            <div className="absolute -left-4 top-0 w-1 h-full bg-gradient-to-b from-blue-500 to-purple-500 rounded-full hidden lg:block"></div>
            <div className="lg:pl-12">
              <div className="flex items-center gap-4 mb-6">
                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center">
                  <span className="text-blue-400 font-mono text-xl">01</span>
                </div>
                <h2 className="text-3xl font-bold text-blue-400">
                  What is the x402 Payment Protocol?
                </h2>
              </div>
              <div className="bg-gray-800/30 rounded-2xl p-8 backdrop-blur-sm border border-gray-700/50">
                <p className="text-gray-300 leading-relaxed text-lg mb-4">
                  <span className="font-bold">x402 (API Pay)</span> is a payment
                  protocol that allows blockchain payments over HTTP, activating
                  the long-reserved{' '}
                  <Link
                    href="https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/402"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-500"
                  >
                    HTTP 402 code
                  </Link>{' '}
                  as a standard way to request payment for API calls or web
                  content.
                </p>
                <p className="text-gray-300 leading-relaxed text-lg mb-8">
                  Users can pay for resources via API without registration,
                  emails, OAuth, or complex signatures. x402 provides a standard
                  for developers and users to interact seamlessly.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-gray-400">
                  {whatIsItFeatures.map((feature, index) => (
                    <FeatureItem key={index} {...feature} />
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Why it matters */}
          <div className="relative">
            <div className="absolute -left-4 top-0 w-1 h-full bg-gradient-to-b from-purple-500 to-indigo-500 rounded-full hidden lg:block"></div>

            <div className="lg:pl-12">
              <div className="flex items-center gap-4 mb-6">
                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-purple-500/10 flex items-center justify-center">
                  <span className="text-purple-400 font-mono text-xl">02</span>
                </div>
                <h2 className="text-3xl font-bold text-purple-400">
                  Why it matters
                </h2>
              </div>
              <div className="bg-gray-800/30 rounded-2xl p-8 backdrop-blur-sm border border-gray-700/50">
                <p className="text-gray-300 leading-relaxed text-lg mb-8">
                  x402 unlocks new monetization models that were previously
                  impractical due to high fees and friction, like{' '}
                  <span className="font-bold">pay-per-use APIs</span>,{' '}
                  <span className="font-bold">
                    per-article/song/stream payments
                  </span>
                  , <span className="font-bold">data monetization for AI</span>,
                  and more. It offers developers and content creators a
                  frictionless way to earn revenue from small transactions
                  without forcing subscriptions or showing ads.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {whyItMattersFeatures.map((feature, index) => (
                    <FeatureItem
                      key={index}
                      {...feature}
                      iconBgColor="bg-indigo-500/10"
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* How it works */}
          <div className="relative">
            <div className="absolute -left-4 top-0 w-1 h-full bg-gradient-to-b from-indigo-500 to-blue-500 rounded-full hidden lg:block"></div>
            <div className="lg:pl-12">
              <div className="flex items-center gap-4 mb-6">
                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-indigo-500/10 flex items-center justify-center">
                  <span className="text-indigo-400 font-mono text-xl">03</span>
                </div>
                <h2 className="text-3xl font-bold text-indigo-400">
                  How it works
                </h2>
              </div>
              <div className="bg-gray-800/30 rounded-2xl p-8 backdrop-blur-sm border border-gray-700/50">
                <p className="text-gray-300 leading-relaxed text-lg mb-8">
                  With minimal integration &mdash; just a drop-in middleware or
                  a single line of code in your app &mdash; providers can
                  require a small USDC payment for each request. If a request
                  comes without payment, the server responds with HTTP 402,
                  prompting the client to pay and retry.
                </p>
                <div className="mb-8">
                  <div className="bg-black/50 rounded-lg p-4 font-mono text-sm text-gray-300 relative overflow-hidden">
                    <pre>{`app.use(
  "/your-endpoint",
  // How much you want to charge, and where you want the funds to land
  paymentMiddleware("$0.10", "0x209693Bc6afc0C5328bA36FaF03C514EF312287C")
);`}</pre>
                  </div>
                </div>
                <Image src={x402Diagram} alt="x402 Diagram" />
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
