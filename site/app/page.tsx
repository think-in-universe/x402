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

const whatIsItFeatures = [
  {
    title: 'Instant settlement',
    description:
      'Accept payments at the speed of the blockchain. Money in your wallet in 2 seconds, not T+2.',
    icon: <CheckIcon className="w-5 h-5 text-indigo-400" />,
  },
  {
    title: 'Frictionless integration',
    description:
      'Just a single line of middleware or configuration in your existing web server stack can enable x402.',
    icon: <CheckIcon className="w-5 h-5 text-indigo-400" />,
  },

  {
    title: 'Security & trust via an open standard',
    description:
      "Anyone can implement or extend x402. It's not tied to any centralized provider, and encourages broad community participation.",
    icon: <CheckIcon className="w-5 h-5 text-indigo-400" />,
  },
  {
    title: 'Web native',
    description:
      "Activates the dormant 402 HTTP status code and works with any HTTP stack. If it's on the web, it can be paid for with x402.",
    icon: <CheckIcon className="w-5 h-5 text-indigo-400" />,
  },
];
const whyItMattersFeatures = [
  {
    title: 'AI Agents',
    description:
      'Agents can use the x402 Protocol to pay for API requests in real-time',
    icon: <BoltIcon className="w-5 h-5 text-indigo-400" />,
  },
  {
    title: 'Cloud Storage Providers',
    description:
      'Using x402, customers can easily access storage services without account creation',
    icon: <CloudIcon className="w-5 h-5 text-indigo-400" />,
  },
  {
    title: 'Content Creators',
    description:
      'x402 unlocks instant transactions, enabling true micropayments for content',
    icon: <MusicalNoteIcon className="w-5 h-5 text-indigo-400" />,
  },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white">
      {/* Hero Section */}
      <section className="container px-4 pt-20 lg:pt-28 lg:pb-20">
        <div className="max-w-6xl mx-auto text-center">
          <h1 className="text-5xl md:text-8xl font-bold mb-6 bg-gradient-to-r from-blue-400 to-purple-500 text-transparent bg-clip-text inline-block">
            x402
          </h1>
          <p className="text-xl text-gray-400 mb-8 font-mono">
            An open protocol for internet-native payments
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

      <section className="container px-4 pb-20">
        <div className="max-w-6xl mx-auto">
          {/* What is it? */}
          <div className="relative">
            <div className="absolute -left-4 top-0 w-1 h-full bg-gradient-to-b from-blue-500 to-purple-500 rounded-full hidden lg:block"></div>
            <div className="lg:pl-12">
              <div className="flex items-center gap-4 mb-6">
                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center">
                  <span className="text-blue-400 font-mono text-xl">01</span>
                </div>
                <h2 className="text-3xl font-bold text-blue-400">
                  What is x402?
                </h2>
              </div>
              <div className="bg-gray-800/30 rounded-2xl p-8 backdrop-blur-sm border border-gray-700/50">
                <p className="text-gray-300 leading-relaxed text-lg mb-4">
                  <span className="font-bold">
                    x402 is a chain-agnostic protocol for web payments
                  </span>{' '}
                  built around the{' '}
                  <Link
                    href="https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/402"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-500"
                  >
                    HTTP 402
                  </Link>{' '}
                  status code.
                </p>
                <p className="text-gray-300 leading-relaxed text-lg mb-8">
                  With x402, users can pay for resources via API without
                  registration, emails, OAuth, or complex signatures.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10 text-gray-400">
                  {whatIsItFeatures.map((feature, index) => (
                    <FeatureItem key={index} {...feature} />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="container px-4 pb-20">
        <div className="max-w-6xl mx-auto">
          {/* Why it matters */}
          <div className="relative">
            <div className="absolute -left-4 top-0 w-1 h-full bg-gradient-to-b from-purple-500 to-indigo-500 rounded-full hidden lg:block"></div>

            <div className="lg:pl-12">
              <div className="flex items-center gap-4 mb-6">
                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-purple-500/10 flex items-center justify-center">
                  <span className="text-purple-400 font-mono text-xl">02</span>
                </div>
                <h2 className="text-3xl font-bold text-purple-400">
                  Why x402 matters
                </h2>
              </div>
              <div className="bg-gray-800/30 rounded-2xl p-8 backdrop-blur-sm border border-gray-700/50">
                <p className="text-gray-300 leading-relaxed text-lg mb-8">
                  <span className="font-bold">
                    x402 unlocks new monetization models,
                  </span>{' '}
                  offering developers and content creators a frictionless way to
                  earn revenue from small transactions without forcing
                  subscriptions or showing ads.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
        </div>
      </section>

      <section className="container px-4 pb-20">
        <div className="max-w-6xl mx-auto">
          {/* How it works */}
          <div className="relative">
            <div className="absolute -left-4 top-0 w-1 h-full bg-gradient-to-b from-indigo-500 to-blue-500 rounded-full hidden lg:block"></div>
            <div className="lg:pl-12">
              <div className="flex items-center gap-4 mb-6">
                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-indigo-500/10 flex items-center justify-center">
                  <span className="text-indigo-400 font-mono text-xl">03</span>
                </div>
                <h2 className="text-3xl font-bold text-indigo-400">
                  How x402 works
                </h2>
              </div>
              <div className="bg-gray-800/30 rounded-2xl p-8 backdrop-blur-sm border border-gray-700/50">
                <p className="text-gray-300 leading-relaxed text-lg mb-8">
                  Just add a single line of code in your app, and you can
                  require a small USDC payment for each incoming request.
                </p>
                <div className="mb-8">
                  <div className="bg-black/50 rounded-lg p-4 font-mono text-sm text-gray-300 relative overflow-hidden">
                    <pre>{`app.use("/your-route", paymentMiddleware("$0.10", myAddress));
// thats all!`}</pre>
                  </div>
                </div>
                <p className="text-gray-300 leading-relaxed text-lg mb-8">
                  If a request arrives without payment, the server responds with
                  HTTP 402, prompting the client to pay and retry.
                </p>
                <div className="mb-8">
                  <div className="bg-black/50 rounded-lg p-4 font-mono text-sm text-gray-300 relative overflow-hidden">
                    <pre>{`HTTP/1.1 402 Payment Required`}</pre>
                  </div>
                </div>

                <p className="text-gray-300 leading-relaxed text-lg">
                  x402 allows any web developer to accept crypto payments
                  without the complexity of having to interact with the
                  blockchain.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
