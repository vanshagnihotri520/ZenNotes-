/* ZenNotes Core Logic */

// State Management
let notes = JSON.parse(localStorage.getItem('zennotes')) || [];
let currentFilter = 'all';
let isDarkMode = true; // Default

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    renderNotes();
    registerServiceWorker();
    setupColorPicker();
});

// Theme Management
function initTheme() {
    const savedTheme = localStorage.getItem('zennotes-theme');
    if (savedTheme === 'light') {
        isDarkMode = false;
        document.body.classList.remove('dark-theme');
        document.body.classList.add('light-theme');
        updateThemeUI();
    }
}

function toggleDarkMode() {
    isDarkMode = !isDarkMode;
    document.body.classList.toggle('dark-theme', isDarkMode);
    document.body.classList.toggle('light-theme', !isDarkMode);
    localStorage.setItem('zennotes-theme', isDarkMode ? 'dark' : 'light');
    updateThemeUI();
}

function updateThemeUI() {
    const themeIcon = document.querySelector('.theme-icon');
    const themeText = document.querySelector('.theme-text');
    if (isDarkMode) {
        themeIcon.textContent = '☀️';
        themeText.textContent = 'Daylight Mode';
    } else {
        themeIcon.textContent = '🌌';
        themeText.textContent = 'Cosmic Mode';
    }
}

// Sidebar Management
function toggleMenu() {
    const sidebar = document.getElementById('sidebar');
    sidebar.classList.toggle('active');
    sidebar.classList.toggle('hidden');
}

// CRUD Operations
function openNoteModal(noteIndex = null) {
    const modal = document.getElementById('noteModal');
    const titleInput = document.getElementById('noteTitle');
    const textInput = document.getElementById('noteText');
    const modalBtn = document.querySelector('.save-btn');

    modal.classList.remove('hidden');
    
    if (noteIndex !== null) {
        const note = notes[noteIndex];
        titleInput.value = note.title;
        textInput.value = note.text;
        modalBtn.textContent = 'Update Note';
        modalBtn.onclick = () => saveNote(noteIndex);
        setSelectedColor(note.color || 'default');
    } else {
        titleInput.value = '';
        textInput.value = '';
        modalBtn.textContent = 'Save Note';
        modalBtn.onclick = () => saveNote();
        setSelectedColor('default');
    }
    titleInput.focus();
}

function closeNoteModal() {
    document.getElementById('noteModal').classList.add('hidden');
}

function saveNote(index = null) {
    const title = document.getElementById('noteTitle').value.trim();
    const text = document.getElementById('noteText').value.trim();
    const color = document.querySelector('.color-opt.active').dataset.color;

    if (!title && !text) return closeNoteModal();

    const noteObj = {
        title: title || 'Untitled',
        text: text,
        date: new Date().toLocaleString(),
        timestamp: Date.now(),
        pinned: index !== null ? notes[index].pinned : false,
        color: color
    };

    if (index !== null) {
        notes[index] = noteObj;
    } else {
        notes.unshift(noteObj);
    }

    saveToLocalStorage();
    renderNotes();
    closeNoteModal();
}

function deleteNote(index, event) {
    if (event) event.stopPropagation();
    if (confirm('Are you sure you want to delete this note?')) {
        notes.splice(index, 1);
        saveToLocalStorage();
        renderNotes();
    }
}

function togglePin(index, event) {
    if (event) event.stopPropagation();
    notes[index].pinned = !notes[index].pinned;
    saveToLocalStorage();
    renderNotes();
}

// Storage
function saveToLocalStorage() {
    localStorage.setItem('zennotes', JSON.stringify(notes));
}

// Rendering
function renderNotes(filter = currentFilter, query = '') {
    const container = document.getElementById('notesContainer');
    const emptyState = document.getElementById('emptyState');
    container.innerHTML = '';

    let filteredNotes = notes.map((note, index) => ({ ...note, originalIndex: index }));

    // Apply Filter
    if (filter === 'pinned') {
        filteredNotes = filteredNotes.filter(n => n.pinned);
    }

    // Apply Search
    if (query) {
        const q = query.toLowerCase();
        filteredNotes = filteredNotes.filter(n => 
            n.title.toLowerCase().includes(q) || 
            n.text.toLowerCase().includes(q)
        );
    }

    // Sort: Pinned first, then by timestamp
    filteredNotes.sort((a, b) => {
        if (a.pinned && !b.pinned) return -1;
        if (!a.pinned && b.pinned) return 1;
        return b.timestamp - a.timestamp;
    });

    if (filteredNotes.length === 0) {
        emptyState.classList.remove('hidden');
    } else {
        emptyState.classList.add('hidden');
        filteredNotes.forEach(note => {
            const card = createNoteCard(note);
            container.appendChild(card);
        });
    }

    updateNavActive(filter);
}

function createNoteCard(note) {
    const div = document.createElement('div');
    div.className = `note-card ${note.pinned ? 'pinned' : ''}`;
    div.style.background = getNoteColor(note.color);
    div.onclick = () => openNoteModal(note.originalIndex);

    div.innerHTML = `
        <span class="pin-icon" onclick="togglePin(${note.originalIndex}, event)">📌</span>
        <h3 class="note-title">${note.title}</h3>
        <p class="note-body">${note.text.replace(/\n/g, '<br>')}</p>
        <div class="note-footer">
            <span class="note-date">${note.date}</span>
            <div class="note-actions">
                <button class="action-btn delete-btn" onclick="deleteNote(${note.originalIndex}, event)">🗑️</button>
            </div>
        </div>
    `;
    return div;
}

function getNoteColor(color) {
    const colors = {
        'blue': 'rgba(0, 122, 255, 0.15)',
        'purple': 'rgba(175, 82, 222, 0.15)',
        'green': 'rgba(52, 199, 89, 0.15)',
        'red': 'rgba(255, 59, 48, 0.15)',
        'default': 'var(--card-bg)'
    };
    return colors[color] || colors['default'];
}

// Search & Filtering
function searchNotes() {
    const query = document.getElementById('searchInput').value;
    renderNotes(currentFilter, query);
}

function filterNotes(filter) {
    currentFilter = filter;
    renderNotes(filter);
    if (window.innerWidth <= 768) toggleMenu();
}

function updateNavActive(filter) {
    const navItems = document.querySelectorAll('.sidebar-nav li');
    navItems.forEach(li => {
        if (li.textContent.toLowerCase().includes(filter)) {
            li.classList.add('active');
        } else if (filter === 'all' && li.textContent.toLowerCase().includes('all')) {
            li.classList.add('active');
        } else {
            li.classList.remove('active');
        }
    });
}

// Color Picker Setup
function setupColorPicker() {
    const opts = document.querySelectorAll('.color-opt');
    opts.forEach(opt => {
        opt.onclick = () => {
            opts.forEach(o => o.classList.remove('active'));
            opt.classList.add('active');
        };
    });
}

function setSelectedColor(color) {
    const opts = document.querySelectorAll('.color-opt');
    opts.forEach(opt => {
        if (opt.dataset.color === color) {
            opt.classList.add('active');
        } else {
            opt.classList.remove('active');
        }
    });
}

// PWA Registration
function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('sw.js')
                .then(reg => console.log('SW Registered!', reg))
                .catch(err => console.log('SW Registration Failed!', err));
        });
    }
}
