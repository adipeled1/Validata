/**
 * ---------------------------------------------------------
 * Data Layer (Mocking Database / State)
 * Creating mock data to avoid working with static HTML.
 * ---------------------------------------------------------
 */
const state = {
    currentView: 'participants',
    participants: [
        { id: 'P-1001', consent: true, status: 'Active' },
        { id: 'P-1002', consent: true, status: 'Active' },
        { id: 'P-1003', consent: true, status: 'Dropped' },
        { id: 'P-1004', consent: true, status: 'Active' },
        { id: 'P-1005', consent: true, status: 'Active' },
        { id: 'P-1006', consent: true, status: 'Active' },
        { id: 'P-1007', consent: true, status: 'Dropped' },
        { id: 'P-1008', consent: true, status: 'Active' }
    ],
    measurements: [],
    nextId: 1009
};

// Generate fake measurements for graphs and table
const now = Date.now();
for (let i = 0; i < 40; i++) {
    const p = state.participants[Math.floor(Math.random() * state.participants.length)];
    
    // Random date in the last 14 days
    const date = new Date(now - Math.floor(Math.random() * 14) * 24 * 60 * 60 * 1000);
    const timestamp = `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
    
    state.measurements.push({
        participant: p.id,
        notes: 'Session completed successfully',
        timestamp,
        dateObj: date
    });
}
// Sort measurements descending by date for the table
state.measurements.sort((a, b) => b.dateObj - a.dateObj);

/**
 * ---------------------------------------------------------
 * Application Logic & UI Controller
 * 'app' object centralizes operations (High Cohesion) 
 * and maintains low coupling by separating logic from DOM updates.
 * ---------------------------------------------------------
 */
const app = {
    chartMeasurements: null,
    chartStatus: null,

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
        if (viewId === 'analysis') {
            this.renderMeasurements();
            this.renderCharts();
        }
    },

    // Form event binding (Event Binding)
    bindEvents() {
        // Participant registration form (Registration & Consent)
        document.getElementById('form-register').addEventListener('submit', (e) => {
            e.preventDefault();
            const consent = document.getElementById('reg-consent').checked;

            const newId = `P-${state.nextId++}`;
            
            // Add to database
            state.participants.push({ id: newId, consent, status: 'Active' });
            e.target.reset(); // Reset form
            this.renderParticipants();
            this.showToast(`Participant ${newId} registered successfully!`);
        });

        // Measurement documentation form (Measurement Log)
        document.getElementById('form-measurement').addEventListener('submit', (e) => {
            e.preventDefault();
            const partId = document.getElementById('meas-participant').value;
            const notes = document.getElementById('meas-notes').value;

            const nowObj = new Date();
            const timestamp = `${nowObj.getDate().toString().padStart(2, '0')}/${(nowObj.getMonth() + 1).toString().padStart(2, '0')}/${nowObj.getFullYear()} ${nowObj.getHours().toString().padStart(2, '0')}:${nowObj.getMinutes().toString().padStart(2, '0')}`;

            state.measurements.unshift({ 
                participant: partId, 
                notes, 
                timestamp,
                dateObj: nowObj 
            });

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
                <td class="py-3 px-2 font-medium text-slate-800">${p.id}</td>
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
        if (confirm(`Are you sure you want to suspend participant ${state.participants[index].id}?`)) {
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
            option.textContent = `Participant ${p.id}`;
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
                <td class="py-3 px-3 font-medium text-slate-800">${m.participant}</td>
                <td class="py-3 px-3 text-sm text-slate-500">${m.notes || '-'}</td>
            `;
            tbody.appendChild(row);
        });
    },

    // Render Charts
    renderCharts() {
        // Destroy existing charts to prevent duplication
        if (this.chartMeasurements) this.chartMeasurements.destroy();
        if (this.chartStatus) this.chartStatus.destroy();

        // Calculate Measured vs Pending
        const measurementsByParticipant = {};
        state.participants.forEach(p => {
            measurementsByParticipant[p.id] = 0;
        });
        
        state.measurements.forEach(m => {
            if (measurementsByParticipant[m.participant] !== undefined) {
                measurementsByParticipant[m.participant]++;
            }
        });

        const labelsParticipants = Object.keys(measurementsByParticipant);
        const measuredCount = labelsParticipants.filter(id => measurementsByParticipant[id] > 0).length;
        const pendingCount = labelsParticipants.length - measuredCount;

        // Chart 1: Measurement Progress
        const ctxMeas = document.getElementById('chart-measurements').getContext('2d');
        this.chartMeasurements = new Chart(ctxMeas, {
            type: 'bar',
            data: {
                labels: ['Measured', 'Pending'],
                datasets: [{
                    label: 'Participants',
                    data: [measuredCount, pendingCount],
                    backgroundColor: ['#4f46e5', '#94a3b8'],
                    borderRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    y: { beginAtZero: true, ticks: { stepSize: 1 } }
                }
            }
        });

        // Chart 2: Participant Status Distribution
        const activeCount = state.participants.filter(p => p.status === 'Active').length;
        const droppedCount = state.participants.filter(p => p.status === 'Dropped').length;

        const ctxStatus = document.getElementById('chart-status').getContext('2d');
        this.chartStatus = new Chart(ctxStatus, {
            type: 'doughnut',
            data: {
                labels: ['Active', 'Dropped'],
                datasets: [{
                    data: [activeCount, droppedCount],
                    backgroundColor: ['#10b981', '#f43f5e'],
                    hoverOffset: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'bottom' }
                }
            }
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
            const activeCount = state.participants.filter(p => p.status === 'Active').length;

            // Create dummy text based on data
            let analysis = `Analysis performed on ${measurementCount} records from ${state.participants.length} total participants (${activeCount} active).\n\n`;
            analysis += `• Data Integrity: High level of reliability identified in reports. ID anonymization confirmed.\n`;
            analysis += `• Trends: No significant statistical anomalies found in the primary metrics among active participants.\n`;
            analysis += `• AI Recommendation: Consider increasing measurement frequency for participants with ID P-1003 and P-1004 for better data resolution.`;

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
