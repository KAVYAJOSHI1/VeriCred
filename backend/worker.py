import ezkl
import os

def run_gen_witness(input_path, model_path, witness_path):
    print(f"Worker: Generating witness from {input_path}...")
    res = ezkl.gen_witness(input_path, model_path, witness_path)
    return res

def run_prove(witness_path, model_path, pk_path, proof_path, srs_path):
    print(f"Worker: Generating proof to {proof_path}...")
    res = ezkl.prove(
        witness_path,
        model_path,
        pk_path,
        proof_path,
        srs_path=srs_path
    )
    return res

def run_verify(proof_path, settings_path, vk_path, srs_path):
    print(f"Worker: Verifying proof {proof_path}...")
    res = ezkl.verify(proof_path, settings_path, vk_path, srs_path=srs_path)
    return res
