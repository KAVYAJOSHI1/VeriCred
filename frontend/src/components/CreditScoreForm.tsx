'use client';

import { useState } from 'react';
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import Halo2VerifierABI from '../app/Halo2Verifier.json';
import { useEffect } from 'react';

const VERIFIER_ADDRESS = '0x5FbDB2315678afecb367f032d93F642f64180aa3'; // Local Hardhat Address

export default function CreditScoreForm() {
    const [formData, setFormData] = useState({
        age: 30,
        income: 50000,
        debt: 1000,
        history: 5,
        open_acc: 2,
    });
    const [proof, setProof] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState('');
    const [history, setHistory] = useState([]);
    const [publicInstances, setPublicInstances] = useState<string[]>([]);

    useEffect(() => {
        fetchHistory();
    }, []);

    const fetchHistory = async () => {
        try {
            const res = await fetch('http://localhost:8000/history');
            const data = await res.json();
            setHistory(data);
        } catch (e) {
            console.error("Failed to fetch history", e);
        }
    };

    const { data: hash, writeContract, isPending } = useWriteContract();
    const { isLoading: isConfirming, isSuccess: isConfirmed } =
        useWaitForTransactionReceipt({ hash });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: parseInt(e.target.value) });
    };

    const generateProof = async () => {
        setLoading(true);
        setStatus('Generating Proof via Backend...');
        try {
            const response = await fetch('http://localhost:8000/generate-proof', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });
            const data = await response.json();
            if (data.proof) {
                setProof(data.proof);
                if (data.public_instances) {
                    setPublicInstances(data.public_instances);
                }
                setStatus('Proof Generated! Ready to Verify.');
                fetchHistory(); // Refresh history
            } else {
                setStatus('Failed to generate proof.');
            }
        } catch (error) {
            console.error(error);
            setStatus('Error calling backend.');
        }
        setLoading(false);
    };

    const verifyOnChain = async () => {
        if (!proof) return;
        setStatus('Verifying on-chain...');
        try {
            // MockVerifier.verifyProof(bytes proof, uint256[] inputs)
            // Proof is hex string.
            writeContract({
                address: VERIFIER_ADDRESS,
                abi: Halo2VerifierABI.abi,
                functionName: 'verifyProof',
                args: [`0x${proof}`, publicInstances],
            });
        } catch (error) {
            console.error(error);
            setStatus('Verification failed request.');
        }
    };

    return (
        <div className="glass-panel p-8 rounded-2xl w-full max-w-lg mx-auto shadow-2xl border border-gray-800/50">
            <h2 className="text-2xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-blue-200">
                Generate Proof
            </h2>

            <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="text-xs uppercase tracking-wider text-gray-500 ml-1">Age</label>
                        <input name="age" type="number" value={formData.age} onChange={handleChange}
                            className="w-full p-3 rounded-xl glass-input focus:ring-2 focus:ring-blue-500/50" />
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs uppercase tracking-wider text-gray-500 ml-1">Income</label>
                        <input name="income" type="number" value={formData.income} onChange={handleChange}
                            className="w-full p-3 rounded-xl glass-input focus:ring-2 focus:ring-blue-500/50" />
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-xs uppercase tracking-wider text-gray-500 ml-1">Debt</label>
                    <input name="debt" type="number" value={formData.debt} onChange={handleChange}
                        className="w-full p-3 rounded-xl glass-input focus:ring-2 focus:ring-blue-500/50" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="text-xs uppercase tracking-wider text-gray-500 ml-1">History (Yrs)</label>
                        <input name="history" type="number" value={formData.history} onChange={handleChange}
                            className="w-full p-3 rounded-xl glass-input focus:ring-2 focus:ring-blue-500/50" />
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs uppercase tracking-wider text-gray-500 ml-1">Open Acc</label>
                        <input name="open_acc" type="number" value={formData.open_acc} onChange={handleChange}
                            className="w-full p-3 rounded-xl glass-input focus:ring-2 focus:ring-blue-500/50" />
                    </div>
                </div>
            </div>

            <button
                onClick={generateProof}
                disabled={loading}
                className="w-full mt-8 py-3 rounded-xl btn-primary font-bold text-lg text-white shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {loading ? (
                    <span className="flex items-center justify-center gap-2">
                        <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Generating...
                    </span>
                ) : 'Generate Proof'}
            </button>

            {proof && (
                <div className="mt-6 p-4 rounded-xl bg-green-900/20 border border-green-500/30">
                    <div className="flex items-center gap-2 mb-2 text-green-400">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                        <span className="font-bold">Proof Generated</span>
                    </div>
                    <p className="text-xs text-green-300/70 font-mono break-all mb-3 bg-black/40 p-2 rounded">
                        {proof.substring(0, 40)}...
                    </p>
                    <button
                        onClick={verifyOnChain}
                        disabled={isPending || isConfirming}
                        className="w-full py-2 rounded-lg bg-green-600 hover:bg-green-500 text-white font-semibold transition-colors disabled:opacity-50"
                    >
                        {isPending ? 'Confirming...' : isConfirming ? 'Verifying...' : 'Verify On-Chain'}
                    </button>
                </div>
            )}

            {status && <p className="text-center text-sm font-medium mt-4 text-blue-300 animate-pulse">{status}</p>}

            {(hash || isConfirmed) && (
                <div className="mt-4 p-3 rounded-lg bg-blue-900/20 border border-blue-500/20 text-center">
                    {hash && <a href={`https://sepolia.etherscan.io/tx/${hash}`} target="_blank" className="text-xs text-blue-400 hover:text-blue-300 underline block mb-1">View Transaction</a>}
                    {isConfirmed && <p className="text-green-400 font-bold bg-green-500/10 inline-block px-3 py-1 rounded-full text-sm">Verified on Blockchain ✅</p>}
                </div>
            )}

            {history.length > 0 && (
                <div className="mt-8 border-t border-gray-800 pt-6">
                    <h3 className="font-semibold mb-3 text-gray-400 text-sm uppercase tracking-wider">Recent Activity</h3>
                    <div className="flex flex-col gap-2 max-h-[150px] overflow-y-auto pr-1 custom-scrollbar">
                        {history.map((item: any) => (
                            <div key={item.id} className="flex justify-between items-center text-xs p-3 rounded-lg bg-gray-900/50 border border-gray-800 hover:border-gray-700 transition-colors">
                                <span className="text-gray-400">Request #{item.id}</span>
                                <span className={`px-2 py-1 rounded-full ${item.status === 'Verified' ? 'bg-green-500/20 text-green-400' : 'bg-blue-500/20 text-blue-400'}`}>
                                    {item.status || 'Generated'}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
