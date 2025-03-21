// Initialize or load existing journal entries
let journalEntries = [];
let currentMoodFilter = 'all';
let editingEntryIndex = null;
let moodChart = null;

// DOM elements
const emojiButtons = document.querySelectorAll('.emoji-btn');
const promptButtons = document.querySelectorAll('.prompt-btn');
const saveEntryButton = document.getElementById('save-entry');
const clearEntryButton = document.getElementById('clear-entry');
const clearAllEntriesButton = document.getElementById('clear-all-entries');
const exportEntriesButton = document.getElementById('export-entries');
const confirmActionButton = document.getElementById('confirm-action');
const cancelActionButton = document.getElementById('cancel-action');
const moodFilterSelect = document.getElementById('mood-filter');
const confirmationModal = document.getElementById('confirmation-modal');
const notification = document.getElementById('notification');

// Load entries from localStorage on page load
document.addEventListener('DOMContentLoaded', function() {
    loadEntries();
    updateDate();
    updateInsights();
    initMoodChart();
    
    // Default mood to neutral if none selected
    if (document.getElementById('mood-today').textContent === '...') {
        selectMood('😐');
    }
    
    // Set up event listeners
    setupEventListeners();
});

// Set current date and time
function updateDate() {
    const currentDate = new Date();
    document.getElementById('current-date').textContent = currentDate.toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    });
    
    document.getElementById('entry-time').textContent = currentDate.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Set up all event listeners
function setupEventListeners() {
    // Mood selection
    emojiButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            selectMood(btn.dataset.mood);
        });
    });
    
    // Journal prompts
    promptButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            usePrompt(btn.dataset.prompt);
        });
    });
    
    // Entry actions
    saveEntryButton.addEventListener('click', saveEntry);
    clearEntryButton.addEventListener('click', clearEntry);
    clearAllEntriesButton.addEventListener('click', confirmClearAllEntries);
    exportEntriesButton.addEventListener('click', exportEntries);
    
    // Modal actions
    cancelActionButton.addEventListener('click', closeModal);
    confirmActionButton.addEventListener('click', handleConfirmAction);
    
    // Filter entries
    moodFilterSelect.addEventListener('change', function() {
        currentMoodFilter = this.value;
        displayEntries();
    });
    
    // Close modal when clicking outside
    window.addEventListener('click', function(event) {
        if (event.target === confirmationModal) {
            closeModal();
        }
    });
}

// Load entries from localStorage
function loadEntries() {
    const savedEntries = localStorage.getItem('journalEntries');
    if (savedEntries) {
        journalEntries = JSON.parse(savedEntries);
        displayEntries();
    }
}

// Save entries to localStorage
function saveEntriesToStorage() {
    localStorage.setItem('journalEntries', JSON.stringify(journalEntries));
}

// Display entries in the UI with filtering
function displayEntries() {
    const entriesContainer = document.getElementById('entries-container');
    entriesContainer.innerHTML = '';
    
    let filteredEntries = [...journalEntries];
    
    // Apply mood filter
    if (currentMoodFilter !== 'all') {
        filteredEntries = filteredEntries.filter(entry => entry.mood === currentMoodFilter);
    }
    
    if (filteredEntries.length === 0) {
        entriesContainer.innerHTML = '<p class="no-entries">No entries to display. ' + 
            (currentMoodFilter !== 'all' ? 'Try changing the mood filter.' : 'Start journaling to see your entries here.') + '</p>';
        return;
    }
    
    // Sort by newest first
    filteredEntries.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    filteredEntries.forEach((entry, index) => {
        const originalIndex = journalEntries.findIndex(e => e.id === entry.id);
        const entryEl = document.createElement('div');
        entryEl.className = 'entry-item';
        
        const formattedDate = new Date(entry.timestamp).toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        
        entryEl.innerHTML = `
            <div class="entry-actions">
                <button class="edit-entry" title="Edit entry">
                    <i class="fas fa-pencil-alt"></i>
                </button>
                <button class="delete-entry" title="Delete entry">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
            <h3><span class="entry-mood">${entry.mood}</span> ${entry.title}</h3>
            <div class="entry-meta">
                <span>${formattedDate}</span>
            </div>
            <div class="entry-content" id="entry-content-${originalIndex}">${entry.content}</div>
        `;
        
        // Add event listeners for entry actions
        entryEl.querySelector('.delete-entry').addEventListener('click', (e) => {
            e.stopPropagation();
            confirmDeleteEntry(originalIndex);
        });
        
        entryEl.querySelector('.edit-entry').addEventListener('click', (e) => {
            e.stopPropagation();
            editEntry(originalIndex);
        });
        
        // Toggle content visibility when clicking the title
        entryEl.querySelector('h3').addEventListener('click', () => {
            toggleEntryContent(originalIndex);
        });
        
        entriesContainer.appendChild(entryEl);
    });
}

// Toggle entry content visibility
function toggleEntryContent(index) {
    const contentEl = document.getElementById(`entry-content-${index}`);
    contentEl.classList.toggle('show');
}

// Mood selection
function selectMood(mood) {
    emojiButtons.forEach(btn => {
        btn.classList.remove('selected');
        if (btn.dataset.mood === mood) {
            btn.classList.add('selected');
        }
    });
    
    document.getElementById('mood-today').textContent = mood;
}

// Use a journal prompt
function usePrompt(prompt) {
    const textarea = document.getElementById('entry-content');
    textarea.value = prompt + '\n\n' + (textarea.value || '');
    textarea.focus();
    
    // Set cursor position after the prompt text
    const cursorPosition = prompt.length + 2;
    textarea.setSelectionRange(cursorPosition, cursorPosition);
}

// Save or update an entry
function saveEntry() {
    const title = document.getElementById('entry-title').value.trim();
    const content = document.getElementById('entry-content').value.trim();
    const mood = document.getElementById('mood-today').textContent;
    
    if (!title || !content) {
        showNotification('Please add a title and content for your entry.', 'error');
        return;
    }
    
    if (mood === '...') {
        showNotification('Please select your mood.', 'error');
        return;
    }
    
    // If editing an existing entry
    if (editingEntryIndex !== null) {
        journalEntries[editingEntryIndex] = {
            ...journalEntries[editingEntryIndex],
            title: title,
            content: content,
            mood: mood,
            updatedAt: new Date().toISOString()
        };
        
        showNotification('Entry updated successfully!', 'success');
        editingEntryIndex = null;
        saveEntryButton.innerHTML = '<i class="fas fa-save"></i> Save Entry';
    } else {
        // Create a new entry
        const newEntry = {
            id: Date.now().toString(),
            title: title,
            content: content,
            mood: mood,
            timestamp: new Date().toISOString()
        };
        
        journalEntries.push(newEntry);
        showNotification('Entry saved successfully!', 'success');
    }
    
    saveEntriesToStorage();
    displayEntries();
    updateInsights();
    updateMoodChart();
    clearEntry();
}

// Edit an existing entry
function editEntry(index) {
    const entry = journalEntries[index];
    
    document.getElementById('entry-title').value = entry.title;
    document.getElementById('entry-content').value = entry.content;
    selectMood(entry.mood);
    
    editingEntryIndex = index;
    saveEntryButton.innerHTML = '<i class="fas fa-check"></i> Update Entry';
    
    // Scroll to the input form
    document.querySelector('.journal-entry').scrollIntoView({ behavior: 'smooth' });
}

// Clear the entry form
function clearEntry() {
    document.getElementById('entry-title').value = '';
    document.getElementById('entry-content').value = '';
    
    // Reset editing state if applicable
    if (editingEntryIndex !== null) {
        editingEntryIndex = null;
        saveEntryButton.innerHTML = '<i class="fas fa-save"></i> Save Entry';
    }
}

// Show confirmation modal for delete entry
function confirmDeleteEntry(index) {
    confirmationModal.dataset.action = 'delete';
    confirmationModal.dataset.index = index;
    openModal();
}

// Show confirmation modal for clear all entries
function confirmClearAllEntries() {
    if (journalEntries.length === 0) {
        showNotification('No entries to clear.', 'error');
        return;
    }
    
    confirmationModal.dataset.action = 'clear-all';
    openModal();
}

// Handle confirmation action
function handleConfirmAction() {
    const action = confirmationModal.dataset.action;
    
    if (action === 'delete') {
        const index = parseInt(confirmationModal.dataset.index);
        deleteEntry(index);
    } else if (action === 'clear-all') {
        clearAllEntries();
    }
    
    closeModal();
}

// Delete a specific entry
function deleteEntry(index) {
    journalEntries.splice(index, 1);
    saveEntriesToStorage();
    displayEntries();
    updateInsights();
    updateMoodChart();
    showNotification('Entry deleted.', 'success');
}

// Clear all entries
function clearAllEntries() {
    journalEntries = [];
    saveEntriesToStorage();
    displayEntries();
    updateInsights();
    updateMoodChart();
    showNotification('All entries cleared.', 'success');
}

// Export entries as JSON
function exportEntries() {
    if (journalEntries.length === 0) {
        showNotification('No entries to export.', 'error');
        return;
    }
    
    const dataStr = JSON.stringify(journalEntries, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    
    const exportFileDefaultName = 'mindful-journal-export-' + new Date().toISOString().slice(0, 10) + '.json';
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
    
    showNotification('Entries exported successfully!', 'success');
}

// Update insights based on journal entries
function updateInsights() {
    const insightsText = document.getElementById('insights-text');
    
    if (journalEntries.length === 0) {
        insightsText.textContent = 'Start journaling to see your weekly insights.';
        return;
    }
    
    // Get entries from the past 7 days
    const now = new Date();
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(now.getDate() - 7);
    
    const recentEntries = journalEntries.filter(entry => 
        new Date(entry.timestamp) >= oneWeekAgo
    );
    
    if (recentEntries.length === 0) {
        insightsText.textContent = 'No entries from the past week. Keep journaling for insights!';
        return;
    }
    
    // Count moods
    const moodCounts = {};
    recentEntries.forEach(entry => {
        if (!moodCounts[entry.mood]) {
            moodCounts[entry.mood] = 0;
        }
        moodCounts[entry.mood]++;
    });
    
    // Find dominant mood
    let dominantMood;
    let maxCount = 0;
    
    for (const mood in moodCounts) {
        if (moodCounts[mood] > maxCount) {
            dominantMood = mood;
            maxCount = moodCounts[mood];
        }
    }
    
    // Generate insight text
    let insightText = `This week, you've made ${recentEntries.length} journal entries. `;
    
    if (dominantMood) {
        const moodPercentage = Math.round((moodCounts[dominantMood] / recentEntries.length) * 100);
        
        let moodText;
        switch (dominantMood) {
            case '😊': moodText = 'great'; break;
            case '🙂': moodText = 'good'; break;
            case '😐': moodText = 'neutral'; break;
            case '😟': moodText = 'worried'; break;
            case '😔': moodText = 'sad'; break;
            default: moodText = 'variable';
        }
        
        insightText += `You've been feeling ${moodText} ${moodPercentage}% of the time. `;
        
        // Add some encouragement based on dominant mood
        if (moodText === 'great' || moodText === 'good') {
            insightText += 'Keep up the positive energy!';
        } else if (moodText === 'neutral') {
            insightText += 'Try doing something that brings you joy today.';
        } else {
            insightText += 'Remember that it\'s okay to have difficult emotions. Be kind to yourself.';
        }
    } else {
        insightText += 'Keep journaling to track your mood patterns.';
    }
    
    insightsText.textContent = insightText;
    
    // Update affirmation based on mood
    updateAffirmation(dominantMood);
}

// Update affirmation based on mood
function updateAffirmation(dominantMood) {
    const affirmationEl = document.getElementById('affirmation');
    let affirmation = '';
    
    if (!dominantMood) {
        affirmation = '"I am growing stronger each day, even when I don\'t feel it."';
    } else if (dominantMood === '😊' || dominantMood === '🙂') {
        const positiveAffirmations = [
            '"I am grateful for the joy in my life."',
            '"My positive energy is contagious."',
            '"I deserve the happiness I feel."',
            '"I celebrate my accomplishments, both big and small."'
        ];
        affirmation = positiveAffirmations[Math.floor(Math.random() * positiveAffirmations.length)];
    } else if (dominantMood === '😐') {
        const neutralAffirmations = [
            '"Every day is a new opportunity."',
            '"I am open to positive change."',
            '"I am finding balance in my life."',
            '"I have the power to improve my day."'
        ];
        affirmation = neutralAffirmations[Math.floor(Math.random() * neutralAffirmations.length)];
    } else {
        const challengingAffirmations = [
            '"This feeling is temporary, not permanent."',
            '"I am resilient and can handle difficult emotions."',
            '"I give myself permission to rest and heal."',
            '"I am not alone in my struggles."'
        ];
        affirmation = challengingAffirmations[Math.floor(Math.random() * challengingAffirmations.length)];
    }
    
    affirmationEl.textContent = affirmation;
}

// Initialize mood chart
function initMoodChart() {
    const ctx = document.getElementById('mood-chart');
    
    if (!ctx) return;
    
    // Map emojis to numeric values for the chart
    const moodValues = {
        '😊': 5,
        '🙂': 4,
        '😐': 3,
        '😟': 2,
        '😔': 1
    };
    
    // Get the past 7 days
    const labels = [];
    const today = new Date();
    
    for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(today.getDate() - i);
        labels.push(date.toLocaleDateString('en-US', { weekday: 'short' }));
    }
    
    // Create default data (no entries)
    const defaultData = labels.map(() => null);
    
    if (moodChart) {
        moodChart.destroy();
    }
    
    // Create the chart
    moodChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Mood',
                data: defaultData,
                fill: false,
                borderColor: 'rgba(255, 255, 255, 0.8)',
                tension: 0.1,
                pointBackgroundColor: 'rgba(255, 255, 255, 0.8)',
                pointBorderColor: 'rgba(255, 255, 255, 0.8)',
                pointRadius: 5,
                pointHoverRadius: 7
            }]
        },
        options: {
            scales: {
                y: {
                    min: 0,
                    max: 6,
                    ticks: {
                        stepSize: 1,
                        callback: function(value) {
                            switch (value) {
                                case 1: return '😔';
                                case 2: return '😟';
                                case 3: return '😐';
                                case 4: return '🙂';
                                case 5: return '😊';
                                default: return '';
                            }
                        },
                        color: 'rgba(255, 255, 255, 0.7)'
                    },
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    }
                },
                x: {
                    ticks: {
                        color: 'rgba(255, 255, 255, 0.7)'
                    },
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    }
                }
            },
            plugins: {
                legend: {
                    display: false
                }
            },
            responsive: true,
            maintainAspectRatio: false
        }
    });
    
    updateMoodChart();
}

// Update mood chart with entry data
function updateMoodChart() {
    if (!moodChart) return;
    
    // Map emojis to numeric values for the chart
    const moodValues = {
        '😊': 5,
        '🙂': 4,
        '😐': 3,
        '😟': 2,
        '😔': 1
    };
    
    // Get the past 7 days
    const today = new Date();
    const dailyMoods = {};
    
    for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(today.getDate() - i);
        const dateKey = date.toLocaleDateString('en-US');
        dailyMoods[dateKey] = [];
    }
    
    // Group entries by date
    journalEntries.forEach(entry => {
        const entryDate = new Date(entry.timestamp);
        const now = new Date();
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(now.getDate() - 7);
        
        if (entryDate >= oneWeekAgo) {
            const dateKey = entryDate.toLocaleDateString('en-US');
            if (dailyMoods[dateKey]) {
                dailyMoods[dateKey].push(moodValues[entry.mood] || 3);
            }
        }
    });
    
    // Calculate average mood for each day
    const data = Object.values(dailyMoods).map(moods => {
        if (moods.length === 0) return null;
        const sum = moods.reduce((a, b) => a + b, 0);
        return sum / moods.length;
    });
    
    // Update chart data
    moodChart.data.datasets[0].data = data;
    moodChart.update();
}

// Show notification
function showNotification(message, type = 'success') {
    const notificationEl = document.getElementById('notification');
    const notificationMessage = document.getElementById('notification-message');
    
    notificationMessage.textContent = message;
    notificationEl.className = 'notification ' + type;
    notificationEl.classList.add('show');
    
    setTimeout(() => {
        notificationEl.classList.remove('show');
    }, 3000);
}

// Open modal
function openModal() {
    confirmationModal.classList.add('show');
}

// Close modal
function closeModal() {
    confirmationModal.classList.remove('show');
}