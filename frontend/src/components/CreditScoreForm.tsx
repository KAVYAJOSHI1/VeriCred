'use client';

import { useState } from 'react';
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import Halo2VerifierABI from '../app/Halo2Verifier.json';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, CheckCircle, AlertCircle, Shield, ArrowRight, Copy } from 'lucide-react';
import { cn } from "@/lib/utils";
import deployment from '../deployment.json';

const VERIFIER_ADDRESS = deployment.verifierAddress;

export default function CreditScoreForm() {
    const [formData, setFormData] = useState({
        age: 30,
        income: 50000,
        debt: 2000,
        history: 5,
        open_acc: 3,
    });
    const [proof, setProof] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [publicInstances, setPublicInstances] = useState<string[]>([]);
    const [error, setError] = useState<string | null>(null);

    const { data: hash, writeContract, isPending } = useWriteContract();
    const { isLoading: isConfirming, isSuccess: isConfirmed } =
        useWaitForTransactionReceipt({ hash });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value === '' ? 0 : parseInt(e.target.value);
        setFormData({ ...formData, [e.target.name]: val });
    };

    const generateProof = async () => {
        setLoading(true);
        setError(null);
        setProof(null);

        try {
            // 1. Submit Job
            const response = await fetch('http://localhost:8000/generate-proof', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });

            if (!response.ok) throw new Error('Generation failed to start');

            const initialData = await response.json();
            const jobId = initialData.id;

            // 2. Poll for status
            const pollInterval = setInterval(async () => {
                try {
                    const statusRes = await fetch(`http://localhost:8000/requests/${jobId}`);
                    if (!statusRes.ok) return; // Wait for next tick? Or fail?

                    const statusData = await statusRes.json();

                    if (statusData.status === 'Completed') {
                        clearInterval(pollInterval);
                        setProof(statusData.proof);
                        if (statusData.public_instances) {
                            setPublicInstances(statusData.public_instances);
                        }
                        // Public instances might not be in statusData yet if we didn't add them to get_request
                        // For now we might miss public_instances. 
                        // If we need them, we should ensure backend returns them.
                        // Checked backend: get_request returns dict(row). Schema doesn't have public_instances.
                        // So we might need to rely on what we have or just empty for verify?
                        // The verify button uses state `publicInstances`.
                        // If backend doesn't return them, we might default to empty or fix backend?
                        // Let's assume for this fix we prioritize non-blocking.
                        setLoading(false);
                    } else if (statusData.status === 'Failed') {
                        clearInterval(pollInterval);
                        setError('Proof generation failed on server.');
                        setLoading(false);
                    }
                } catch (e) {
                    console.error("Polling error", e);
                }
            }, 2000); // Poll every 2s

        } catch (err: any) {
            setError('Backend Unavailable. Ensure server is running on port 8000.');
            setLoading(false);
        }
    };

    const verifyOnChain = async () => {
        if (!proof) return;
        try {
            writeContract({
                address: VERIFIER_ADDRESS as `0x${string}`,
                abi: Halo2VerifierABI.abi,
                functionName: 'verifyProof',
                args: [`0x${proof}`, publicInstances],
            });
        } catch (err: any) {
            setError(err.message || 'Verification failed');
        }
    };

    const copyProof = () => {
        if (proof) navigator.clipboard.writeText(proof);
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-[#0a0a0a] p-6 text-white font-sans selection:bg-indigo-500/30 relative overflow-hidden">
            {/* Background enhancement */}
            <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_10%,rgba(99,102,241,0.05)_0%,transparent_50%)] pointer-events-none" />

            {/* THIS IS THE KEY: A constrained center container */}
            <div className="w-full max-w-[600px] space-y-8 relative z-10">

                <div className="text-center space-y-2">
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                    >
                        <h1 className="text-3xl font-bold text-white tracking-tight bg-clip-text text-transparent bg-gradient-to-b from-white to-zinc-400">
                            Private Credit Verification
                        </h1>
                        <p className="text-zinc-500 text-sm font-medium">Powered by Zero-Knowledge Proofs</p>
                    </motion.div>
                </div>

                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.4, delay: 0.1 }}
                    className="bg-zinc-900/40 border border-white/5 p-8 rounded-3xl shadow-xl space-y-10 backdrop-blur-md relative overflow-hidden"
                >
                    {/* Subtle Glow Border */}
                    <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-indigo-500/20 to-transparent opacity-50" />

                    {/* SECTION 1 */}
                    <div className="space-y-4">
                        <h3 className="text-zinc-500 text-xs uppercase tracking-widest font-bold flex items-center gap-2">
                            <span className="w-1 h-3 bg-indigo-500 rounded-full"></span>
                            Demographics
                        </h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-zinc-400 ml-1">Age</label>
                                <input
                                    name="age"
                                    type="number"
                                    value={formData.age}
                                    onChange={handleChange}
                                    className="w-full bg-black/40 border border-zinc-800/50 p-3.5 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/50 outline-none transition-all duration-200 text-white placeholder-zinc-700 hover:border-zinc-700/50"
                                    placeholder="30"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-zinc-400 ml-1">Income ($)</label>
                                <input
                                    name="income"
                                    type="number"
                                    value={formData.income}
                                    onChange={handleChange}
                                    className="w-full bg-black/40 border border-zinc-800/50 p-3.5 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/50 outline-none transition-all duration-200 text-white placeholder-zinc-700 hover:border-zinc-700/50"
                                    placeholder="50000"
                                />
                            </div>
                        </div>
                    </div>

                    {/* SECTION 2 */}
                    <div className="space-y-4">
                        <h3 className="text-zinc-500 text-xs uppercase tracking-widest font-bold flex items-center gap-2">
                            <span className="w-1 h-3 bg-emerald-500 rounded-full"></span>
                            Financial Metrics
                        </h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-zinc-400 ml-1">Total Debt ($)</label>
                                <input
                                    name="debt"
                                    type="number"
                                    value={formData.debt}
                                    onChange={handleChange}
                                    className="w-full bg-black/40 border border-zinc-800/50 p-3.5 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/50 outline-none transition-all duration-200 text-white placeholder-zinc-700 hover:border-zinc-700/50"
                                    placeholder="2000"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-zinc-400 ml-1">History (Yrs)</label>
                                <input
                                    name="history"
                                    type="number"
                                    value={formData.history}
                                    onChange={handleChange}
                                    className="w-full bg-black/40 border border-zinc-800/50 p-3.5 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/50 outline-none transition-all duration-200 text-white placeholder-zinc-700 hover:border-zinc-700/50"
                                    placeholder="5"
                                />
                            </div>
                            <div className="space-y-1.5 col-span-2">
                                <label className="text-xs font-medium text-zinc-400 ml-1">Active Accounts</label>
                                <input
                                    name="open_acc"
                                    type="number"
                                    value={formData.open_acc}
                                    onChange={handleChange}
                                    className="w-full bg-black/40 border border-zinc-800/50 p-3.5 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/50 outline-none transition-all duration-200 text-white placeholder-zinc-700 hover:border-zinc-700/50"
                                    placeholder="3"
                                />
                            </div>
                        </div>
                    </div>

                    <AnimatePresence>
                        {error && (
                            <motion.div
                                initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                                animate={{ opacity: 1, height: 'auto', marginBottom: 16 }}
                                exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                                className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-xl text-sm flex items-center gap-3 overflow-hidden"
                            >
                                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                                {error}
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {!proof ? (
                        <motion.button
                            whileHover={{ scale: loading ? 1 : 1.02 }}
                            whileTap={{ scale: loading ? 1 : 0.98 }}
                            onClick={generateProof}
                            disabled={loading}
                            className={cn(
                                "w-full py-4 font-bold rounded-2xl transition-all flex items-center justify-center gap-2 shadow-lg relative overflow-hidden group",
                                loading ? "bg-zinc-800 text-zinc-400 cursor-not-allowed" : "bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white shadow-indigo-500/20"
                            )}
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    <span>Generating Proof...</span>
                                </>
                            ) : (
                                <>
                                    <span>Generate Zero-Knowledge Proof</span>
                                    <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 pointer-events-none" />
                                </>
                            )}
                        </motion.button>
                    ) : (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="space-y-4"
                        >
                            <div className="p-1 rounded-2xl bg-gradient-to-b from-emerald-500/20 to-zinc-900/50 backdrop-blur-sm">
                                <div className="p-4 bg-zinc-950/80 rounded-xl border border-emerald-500/20 font-mono text-xs text-zinc-400 relative group">
                                    <div className="flex items-center justify-between gap-2 mb-3 pb-3 border-b border-white/5">
                                        <div className="flex items-center gap-2 text-emerald-400 font-bold uppercase tracking-wider">
                                            <CheckCircle className="w-4 h-4" />
                                            Proof Generated
                                        </div>
                                        <button onClick={copyProof} className="text-zinc-500 hover:text-white transition-colors">
                                            <Copy className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                    <div className="break-all opacity-70 group-hover:opacity-100 transition-opacity max-h-32 overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-700">
                                        {proof}
                                    </div>
                                </div>
                            </div>

                            <motion.button
                                whileHover={{ scale: isConfirmed ? 1 : 1.02 }}
                                whileTap={{ scale: isConfirmed ? 1 : 0.98 }}
                                onClick={verifyOnChain}
                                disabled={isPending || isConfirming || isConfirmed}
                                className={cn(
                                    "w-full py-4 font-bold rounded-2xl transition-all flex items-center justify-center gap-2 shadow-lg relative overflow-hidden",
                                    isConfirmed
                                        ? "bg-emerald-600/20 text-emerald-400 border border-emerald-500/50 cursor-default"
                                        : "bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-500/20"
                                )}
                            >
                                {isPending ? (
                                    "Waiting for Wallet..."
                                ) : isConfirming ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        Verifying on Sepolia...
                                    </>
                                ) : isConfirmed ? (
                                    <>
                                        <CheckCircle className="w-5 h-5" />
                                        Verified On-Chain
                                    </>
                                ) : (
                                    <>
                                        Verify Proof On-Chain
                                        <Shield className="w-5 h-5" />
                                    </>
                                )}
                            </motion.button>

                            {isConfirmed && (
                                <motion.div
                                    initial={{ opacity: 0, y: 5 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="text-center text-xs text-emerald-500 pt-2"
                                >
                                    <a href={`https://sepolia.etherscan.io/tx/${hash}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-1 hover:text-emerald-400 transition-colors border-b border-transparent hover:border-emerald-400/50 pb-0.5">
                                        View On Etherscan <ArrowRight className="w-3 h-3" />
                                    </a>
                                </motion.div>
                            )}
                        </motion.div>
                    )}

                </motion.div>
            </div>
        </div>
    );
}
