/**
 * Real-Time Scoreboard Frontend Application
 */

const API_BASE_URL = 'http://localhost:8000';
let currentGameId = null;
let websocket = null;

// DOM Elements
const sportSelect = document.getElementById('sport-select');
const gameSelect = document.getElementById('game-select');
const loadingDiv = document.getElementById('loading');
const emptyStateDiv = document.getElementById('empty-state');
const scoreboardContainer = document.getElementById('scoreboard-container');
const teamAName = document.getElementById('team-a-name');
const teamBName = document.getElementById('team-b-name');
const teamAColumn = document.getElementById('team-a-column');
const teamBColumn = document.getElementById('team-b-column');

/**
 * Initialize the application
 */
async function init() {
    await loadSports();
    setupEventListeners();
}

/**
 * Load sports from API
 */
async function loadSports() {
    try {
        showLoading();
        const response = await fetch(`${API_BASE_URL}/sports`);
        if (!response.ok) {
            throw new Error('Failed to load sports');
        }
        const sports = await response.json();
        
        // Populate sport dropdown
        sportSelect.innerHTML = '<option value="">Select a sport...</option>';
        sports.forEach(sport => {
            const option = document.createElement('option');
            option.value = sport.id;
            option.textContent = sport.name;
            sportSelect.appendChild(option);
        });
        
        hideLoading();
        showEmptyState();
    } catch (error) {
        console.error('Error loading sports:', error);
        hideLoading();
        alert('Failed to load sports. Make sure the backend is running.');
    }
}

/**
 * Load games for selected sport
 */
async function loadGames(sportId) {
    try {
        showLoading();
        const response = await fetch(`${API_BASE_URL}/sports/${sportId}/games`);
        if (!response.ok) {
            throw new Error('Failed to load games');
        }
        const games = await response.json();
        
        // Populate game dropdown
        gameSelect.innerHTML = '<option value="">Select a game...</option>';
        games.forEach(game => {
            const option = document.createElement('option');
            option.value = game.id;
            option.textContent = `${game.team_a_name} vs ${game.team_b_name}`;
            gameSelect.appendChild(option);
        });
        
        gameSelect.disabled = false;
        hideLoading();
    } catch (error) {
        console.error('Error loading games:', error);
        hideLoading();
        alert('Failed to load games.');
    }
}

/**
 * Load game state and connect WebSocket
 */
async function loadGame(gameId) {
    try {
        showLoading();
        
        // Close existing WebSocket connection
        if (websocket) {
            websocket.close();
            websocket = null;
        }
        
        // Load game state
        const response = await fetch(`${API_BASE_URL}/games/${gameId}`);
        if (!response.ok) {
            throw new Error('Failed to load game');
        }
        const game = await response.json();
        
        // Update UI
        teamAName.textContent = game.team_a_name;
        teamBName.textContent = game.team_b_name;
        
        // Clear previous events
        teamAColumn.innerHTML = '';
        teamBColumn.innerHTML = '';
        
        // Render existing events
        game.events.forEach(event => {
            addEventToUI(event);
        });
        
        // Connect WebSocket
        connectWebSocket(gameId);
        
        hideLoading();
        showScoreboard();
    } catch (error) {
        console.error('Error loading game:', error);
        hideLoading();
        alert('Failed to load game.');
    }
}

/**
 * Connect to WebSocket for real-time updates
 */
function connectWebSocket(gameId) {
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsHost = API_BASE_URL.replace(/^https?:/, wsProtocol);
    const wsUrl = `${wsHost}/ws/games/${gameId}`;
    
    try {
        websocket = new WebSocket(wsUrl);
        currentGameId = gameId;
        
        websocket.onopen = () => {
            console.log('WebSocket connected');
        };
        
        websocket.onmessage = (event) => {
            const data = JSON.parse(event.data);
            addEventToUI(data);
        };
        
        websocket.onerror = (error) => {
            console.error('WebSocket error:', error);
        };
        
        websocket.onclose = () => {
            console.log('WebSocket disconnected');
            // Optionally attempt to reconnect
        };
    } catch (error) {
        console.error('Failed to connect WebSocket:', error);
    }
}

/**
 * Add event to UI
 */
function addEventToUI(event) {
    const entry = document.createElement('div');
    entry.className = 'play-by-play-entry';
    
    const minute = document.createElement('div');
    minute.className = 'entry-minute';
    minute.textContent = `${event.minute}'`;
    
    const description = document.createElement('div');
    description.className = 'entry-description';
    description.textContent = event.description;
    
    entry.appendChild(minute);
    entry.appendChild(description);
    
    // Add to appropriate column
    if (event.team === 'A') {
        teamAColumn.appendChild(entry);
    } else {
        teamBColumn.appendChild(entry);
    }
    
    // Scroll to bottom
    const scoreboardContent = document.querySelector('.scoreboard-content');
    scoreboardContent.scrollTop = scoreboardContent.scrollHeight;
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
    sportSelect.addEventListener('change', async (e) => {
        const sportId = e.target.value;
        if (sportId) {
            await loadGames(sportId);
        } else {
            gameSelect.innerHTML = '<option value="">Select a game...</option>';
            gameSelect.disabled = true;
            showEmptyState();
        }
    });
    
    gameSelect.addEventListener('change', async (e) => {
        const gameId = e.target.value;
        if (gameId) {
            await loadGame(gameId);
        } else {
            if (websocket) {
                websocket.close();
                websocket = null;
            }
            showEmptyState();
        }
    });
}

/**
 * UI State Management
 */
function showLoading() {
    loadingDiv.classList.remove('hidden');
    emptyStateDiv.classList.add('hidden');
    scoreboardContainer.classList.add('hidden');
}

function hideLoading() {
    loadingDiv.classList.add('hidden');
}

function showEmptyState() {
    emptyStateDiv.classList.remove('hidden');
    scoreboardContainer.classList.add('hidden');
}

function showScoreboard() {
    emptyStateDiv.classList.add('hidden');
    scoreboardContainer.classList.remove('hidden');
}

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

