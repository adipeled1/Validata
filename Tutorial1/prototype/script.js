/**
 * ---------------------------------------------------------
 * Data Layer (Mocking Database / State)
 * Creating mock data to avoid working with static HTML.
 * ---------------------------------------------------------
 */
const state = {
    currentView: 'participants',
    participants: [
        { id: '201234567', name: 'Israel Israeli', consent: true, status: 'Active' },
        { id: '309876543', name: 'Rona Cohen', consent: true, status: 'Active' },
        { id: '012345678', name: 'Avi Levi', consent: true, status: 'Dropped' }
    ],
    measurements: [
        { timestamp: '10/05/2026 08:30', participant: '201234567', name: 'Israel Israeli', type: 'Heart Rate', value: '72 bpm', notes: 'Resting' },
        { timestamp: '11/05/2026 09:15', participant: '309876543', name: 'Rona Cohen', type: 'Weight', value: '64 kg', notes: '' }
    ]
};

/**
 * ---------------------------------------------------------
 * Application Logic & UI Controller
 * 'app' object centralizes operations (High Cohesion) 
 * and maintains low coupling by separating logic from DOM updates.
 * ---------------------------------------------------------
 */
const app = {
    // Initialize app on load
    init() {
        this.bindEvents();
        this.navigate('participants'); // Default screen
    },

    // Switching between screens - Layout Management
    navigate(viewId) {
        state.currentView = viewId;

        // Hide all screens and reset menu colors
        document.querySelectorAll('.app-section').forEach(s => s.classList.add('hidden-section'));
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.remove('bg-blue-600', 'text-white');
            btn.classList.add('hover:bg-slate-800', 'text-slate-100');
        });

        // Show active screen
        document.getElementById(`section-${viewId}`).classList.remove('hidden-section');

        // Highlight active menu button
        const activeBtn = document.getElementById(`nav-${viewId}`);
        activeBtn.classList.remove('hover:bg-slate-800');
        activeBtn.classList.add('bg-blue-600', 'text-white');

        // Refresh screen-specific data (Render Data)
        if (viewId === 'participants') this.renderParticipants();
        if (viewId === 'data') this.renderParticipantSelect();
        if (viewId === 'analysis') this.renderMeasurements();
    },

    // Form event binding (Event Binding)
    bindEvents() {
        // Participant registration form (Registration & Consent)
        document.getElementById('form-register').addEventListener('submit', (e) => {
            e.preventDefault();
            const id = document.getElementById('reg-id').value;
            const name = document.getElementById('reg-name').value;
            const consent = document.getElementById('reg-consent').checked;

            // Check if exists
            if (state.participants.find(p => p.id === id)) {
                alert("Error: A participant with this ID number already exists in the system.");
                return;
            }

            // Add to database
            state.participants.push({ id, name, consent, status: 'Active' });
            e.target.reset(); // Reset form
            this.renderParticipants();
            this.showToast("Participant registered successfully!");
        });

        // Measurement documentation form (Measurement Log)
        document.getElementById('form-measurement').addEventListener('submit', (e) => {
            e.preventDefault();
            const partId = document.getElementById('meas-participant').value;
            const partName = document.getElementById('meas-participant').options[document.getElementById('meas-participant').selectedIndex].text;
            const type = document.getElementById('meas-type').value;
            const value = document.getElementById('meas-value').value;
            const notes = document.getElementById('meas-notes').value;

            const now = new Date();
            const timestamp = `${now.getDate().toString().padStart(2, '0')}/${(now.getMonth() + 1).toString().padStart(2, '0')}/${now.getFullYear()} ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

            state.measurements.unshift({ participant: partId, name: partName, type, value, notes, timestamp });

            e.target.reset();
            this.showToast("Measurement logged and saved!");
        });
    },

    // Render participants table (Participant Tracking)
    renderParticipants() {
        const tbody = document.getElementById('table-participants');
        tbody.innerHTML = '';

        document.getElementById('participants-count').innerText = `Total: ${state.participants.length}`;

        state.participants.forEach((p, index) => {
            const row = document.createElement('tr');
            row.className = 'border-b border-slate-100 hover:bg-slate-50 transition-colors';
            row.innerHTML = `
                <td class="py-3 px-2 text-slate-600">${p.id}</td>
                <td class="py-3 px-2 font-medium text-slate-800">${p.name}</td>
                <td class="py-3 px-2">
                    ${p.consent ? '<span class="text-green-600 font-bold">✓ Signed</span>' : '<span class="text-red-500">Missing</span>'}
                </td>
                <td class="py-3 px-2">
                    <span class="text-xs px-2 py-1 rounded-full ${p.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-slate-200 text-slate-600'}">${p.status}</span>
                </td>
                <td class="py-3 px-2">
                    ${p.status === 'Active' ? `<button onclick="app.suspendParticipant(${index})" class="text-sm text-red-500 hover:text-red-700 hover:underline">Suspend</button>` : ''}
                </td>
            `;
            tbody.appendChild(row);
        });
    },

    // Suspend participant registration
    suspendParticipant(index) {
        if (confirm(`Are you sure you want to suspend the participation of ${state.participants[index].name}?`)) {
            state.participants[index].status = 'Dropped';
            this.renderParticipants();
            this.showToast("Participant status updated.");
        }
    },

    // Update participants list in data form
    renderParticipantSelect() {
        const select = document.getElementById('meas-participant');
        select.innerHTML = '<option value="" disabled selected>-- Select Participant --</option>';

        // Active participants only
        const actives = state.participants.filter(p => p.status === 'Active');
        actives.forEach(p => {
            const option = document.createElement('option');
            option.value = p.id;
            option.textContent = `${p.name} (${p.id})`;
            select.appendChild(option);
        });
    },

    // File upload simulation (File Upload)
    handleFileUpload(input) {
        if (input.files && input.files[0]) {
            const fileName = input.files[0].name;
            document.getElementById('uploaded-filename').innerText = fileName;
            document.getElementById('file-upload-list').classList.remove('hidden');
            this.showToast("Raw file uploaded successfully.");
            input.value = ''; // Reset
        }
    },

    // Render data table (Research Data View)
    renderMeasurements() {
        const tbody = document.getElementById('table-measurements');
        tbody.innerHTML = '';

        if (state.measurements.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center py-6 text-slate-500">No data to display</td></tr>';
            return;
        }

        state.measurements.forEach(m => {
            const row = document.createElement('tr');
            row.className = 'border-b border-slate-100 hover:bg-slate-50';
            row.innerHTML = `
                <td class="py-3 px-3 text-sm text-slate-500" dir="ltr">${m.timestamp}</td>
                <td class="py-3 px-3 font-medium text-slate-800">${m.name}</td>
                <td class="py-3 px-3 text-slate-700">${m.type}</td>
                <td class="py-3 px-3 text-slate-800" dir="ltr">${m.value}</td>
                <td class="py-3 px-3 text-sm text-slate-500">${m.notes || '-'}</td>
            `;
            tbody.appendChild(row);
        });
    },

    // Generate report (Reports)
    generateReport() {
        this.showToast("Preparing PDF report... Download will begin shortly.");
    },

    // AI Analysis module - simulation
    runAIAnalysis() {
        const btn = document.getElementById('btn-ai');
        const resultDiv = document.getElementById('ai-results');
        const resultText = document.getElementById('ai-text');

        // Loading state
        btn.innerHTML = '<span class="loader"></span> Analyzing (API)...';
        btn.disabled = true;
        btn.classList.add('opacity-80', 'cursor-not-allowed');
        resultDiv.classList.add('hidden');

        // Simulate OpenAI server request time
        setTimeout(() => {
            const measurementCount = state.measurements.length;

            // Create dummy text based on data
            let analysis = `Analysis performed on ${measurementCount} records from the database.\n\n`;
            analysis += `• Data Integrity: High level of reliability identified in reports.\n`;
            analysis += `• Trends: No significant statistical anomalies found in "Heart Rate" metrics among active participants.\n`;
            analysis += `• AI Recommendation: Consider increasing measurement frequency for participant "Israel Israeli" for better data resolution.`;

            resultText.innerText = analysis;

            // Reset button state and show result
            btn.innerHTML = 'Rerun Analysis';
            btn.disabled = false;
            btn.classList.remove('opacity-80', 'cursor-not-allowed');
            resultDiv.classList.remove('hidden');
        }, 2500);
    },

    // Pop-up messages (Toast)
    showToast(message) {
        const toast = document.getElementById('toast');
        toast.innerText = message;
        toast.classList.remove('opacity-0');
        toast.classList.add('opacity-100');

        setTimeout(() => {
            toast.classList.remove('opacity-100');
            toast.classList.add('opacity-0');
        }, 3000);
    }
};

// Run on page load
window.addEventListener('DOMContentLoaded', () => {
    app.init();
});
