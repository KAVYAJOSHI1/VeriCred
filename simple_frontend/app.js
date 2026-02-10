document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('proofForm');
    const generateBtn = document.getElementById('generateBtn');
    const resultSection = document.getElementById('resultSection');
    const reqIdSpan = document.getElementById('reqId');
    const verificationStatusSpan = document.getElementById('verificationStatus');
    const proofOutput = document.getElementById('proofOutput');
    const btnText = generateBtn.querySelector('.btn-text');
    const loader = generateBtn.querySelector('.loader');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        // UI Loading State
        setLoading(true);
        resultSection.classList.add('hidden');

        // Collect Data
        const formData = new FormData(form);
        const data = {
            age: parseInt(formData.get('age')),
            income: parseInt(formData.get('income')),
            debt: parseInt(formData.get('debt')),
            history: parseInt(formData.get('history')),
            open_acc: parseInt(formData.get('open_acc'))
        };

        try {
            console.log("Sending data:", data);

            // Call Backend
            const response = await fetch('http://localhost:8000/generate-proof', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || 'Failed to generate proof');
            }

            const result = await response.json();
            console.log("Result:", result);

            // Update UI
            displayResult(result);

        } catch (error) {
            console.error("Error:", error);
            alert(`Error: ${error.message}`);
        } finally {
            setLoading(false);
        }
    });

    function setLoading(isLoading) {
        generateBtn.disabled = isLoading;
        if (isLoading) {
            btnText.textContent = 'Generating...';
            loader.classList.remove('hidden');
        } else {
            btnText.textContent = 'Generate ZK Proof';
            loader.classList.add('hidden');
        }
    }

    function displayResult(result) {
        reqIdSpan.textContent = result.id;

        if (result.verified) {
            verificationStatusSpan.textContent = "Valid";
            verificationStatusSpan.style.color = "var(--success)";
        } else {
            verificationStatusSpan.textContent = "Invalid";
            verificationStatusSpan.style.color = "#ef4444";
        }

        // Truncate proof for display if too long, or show full in scrollable area
        proofOutput.textContent = result.proof;

        resultSection.classList.remove('hidden');

        // Scroll to result
        resultSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
});
