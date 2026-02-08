'use client';

import { ConnectButton } from '@rainbow-me/rainbowkit';
import CreditScoreForm from '../components/CreditScoreForm';

export default function Home() {
    return (
        <main className="flex min-h-screen flex-col items-center justify-center p-8 relative overflow-hidden">
            {/* Background Orbs */}
            <div className="absolute top-0 left-0 w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
            <div className="absolute top-0 right-0 w-96 h-96 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
            <div className="absolute -bottom-8 left-20 w-96 h-96 bg-pink-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>

            <div className="z-10 max-w-5xl w-full flex flex-col items-center gap-10">
                <nav className="w-full flex justify-between items-center glass-panel p-4 rounded-2xl mb-10">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center font-bold text-white">V</div>
                        <span className="text-xl font-bold tracking-tight">VeriScore</span>
                    </div>
                    <ConnectButton showBalance={false} />
                </nav>

                <div className="text-center space-y-4 mb-4">
                    <h1 className="text-5xl md:text-7xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-600 pb-2">
                        Trust, Verified.
                    </h1>
                    <p className="text-gray-400 max-w-2xl mx-auto text-lg">
                        Generate a Zero-Knowledge Proof of your creditworthiness without revealing your sensitive financial data.
                    </p>
                </div>

                <CreditScoreForm />

                <footer className="mt-20 text-gray-600 text-sm">
                    Powered by EZKL & Halo2
                </footer>
            </div>
        </main>
    );
}
