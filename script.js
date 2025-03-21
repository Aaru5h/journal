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

// Load entries from localStorage on page load
document.addEventListener('DOMContentLoaded', function() {
    loadEntries();
    updateDate();
    updateInsights();
    initMoodChart();
    
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
    
    // Filter entries
    moodFilterSelect.addEventListener('change', function() {
        currentMoodFilter = this.value;
        displayEntries();
    });
    
    // Close modal when clicking outside
    window.addEventListener('click', function(event) {
        const modal = document.getElementById('confirmation-modal');
        if (event.target === modal) {
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
        
        journalEntries.unshift(newEntry);
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