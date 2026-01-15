import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getFirestore, doc, onSnapshot, updateDoc, setDoc, arrayUnion } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { firebaseConfig, OWNER } from './firebase-config.js';

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const docRef = doc(db, 'notes', 'shared');

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const receivedNotes = document.getElementById('receivedNotes');

// Determine field names based on who I am
const MY_SENT_FIELD = OWNER === 'user1' ? 'user1Sent' : 'user2Sent';
const PARTNER_SENT_FIELD = OWNER === 'user1' ? 'user2Sent' : 'user1Sent';

// State
let currentColor = '#000000';
let isDrawing = false;
let strokes = []; // Current drawing strokes

// Setup canvas size
function resizeCanvas() {
  // Set internal canvas resolution to match display size
  canvas.width = canvas.offsetWidth;
  canvas.height = canvas.offsetHeight;
  
  redrawCanvas();
}

// Initial resize (wait for layout to settle)
setTimeout(resizeCanvas, 100);
window.addEventListener('resize', resizeCanvas);

// Color picker
document.querySelectorAll('.color-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    currentColor = btn.dataset.color;
    document.querySelectorAll('.color-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
  });
});

// Clear button
document.getElementById('clearBtn').addEventListener('click', () => {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  strokes = [];
});

// Send button
document.getElementById('sendBtn').addEventListener('click', async () => {
  if (strokes.length === 0) {
    alert('Draw something first!');
    return;
  }
  
  const btn = document.getElementById('sendBtn');
  btn.classList.add('sending');
  btn.textContent = 'Sending...';
  
  try {
    // Convert canvas to image data URL
    const imageData = canvas.toDataURL('image/png');
    
    // Create note object
    const note = {
      image: imageData,
      timestamp: Date.now()
    };
    
    // Send to Firebase
    await sendNote(note);
    
    // Clear canvas after sending
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    strokes = [];
    
    btn.textContent = 'Sent! ✓';
    setTimeout(() => {
      btn.textContent = 'Send 💌';
    }, 1500);
    
  } catch (error) {
    console.error('Send error:', error);
    alert('Failed to send. Check console.');
    btn.textContent = 'Send 💌';
  } finally {
    btn.classList.remove('sending');
  }
});

async function sendNote(note) {
  try {
    // Try to update existing document
    await updateDoc(docRef, {
      [MY_SENT_FIELD]: arrayUnion(note)
    });
  } catch (error) {
    // Document doesn't exist, create it
    if (error.code === 'not-found') {
      await setDoc(docRef, {
        user1Sent: OWNER === 'user1' ? [note] : [],
        user2Sent: OWNER === 'user2' ? [note] : []
      });
    } else {
      throw error;
    }
  }
}

// Drawing events
canvas.addEventListener('mousedown', startDrawing);
canvas.addEventListener('mousemove', draw);
canvas.addEventListener('mouseup', stopDrawing);
canvas.addEventListener('mouseleave', stopDrawing);

// Touch events for mobile/tablet
canvas.addEventListener('touchstart', (e) => {
  e.preventDefault();
  const touch = e.touches[0];
  const rect = canvas.getBoundingClientRect();
  const mouseEvent = new MouseEvent('mousedown', {
    clientX: touch.clientX,
    clientY: touch.clientY
  });
  canvas.dispatchEvent(mouseEvent);
});

canvas.addEventListener('touchmove', (e) => {
  e.preventDefault();
  const touch = e.touches[0];
  const mouseEvent = new MouseEvent('mousemove', {
    clientX: touch.clientX,
    clientY: touch.clientY
  });
  canvas.dispatchEvent(mouseEvent);
});

canvas.addEventListener('touchend', (e) => {
  e.preventDefault();
  const mouseEvent = new MouseEvent('mouseup', {});
  canvas.dispatchEvent(mouseEvent);
});

function startDrawing(e) {
  isDrawing = true;
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  
  strokes.push({
    points: [{ x, y }],
    color: currentColor
  });
}

function draw(e) {
  if (!isDrawing) return;
  
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  
  const currentStroke = strokes[strokes.length - 1];
  currentStroke.points.push({ x, y });
  
  redrawCanvas();
}

function stopDrawing() {
  isDrawing = false;
}

function redrawCanvas() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  strokes.forEach(stroke => {
    if (stroke.points.length < 2) return;
    
    ctx.strokeStyle = stroke.color;
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
    
    for (let i = 1; i < stroke.points.length; i++) {
      ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
    }
    
    ctx.stroke();
  });
}

// Listen for partner's notes
onSnapshot(docRef, (snapshot) => {
  if (!snapshot.exists()) {
    showEmptyState();
    return;
  }
  
  const data = snapshot.data();
  const partnerNotes = data[PARTNER_SENT_FIELD] || [];
  
  if (partnerNotes.length === 0) {
    showEmptyState();
  } else {
    displayReceivedNotes(partnerNotes);
  }
});

function showEmptyState() {
  receivedNotes.innerHTML = '<div class="empty-state">No notes yet...</div>';
}

function displayReceivedNotes(notes) {
  receivedNotes.innerHTML = '';
  
  // Display notes in chronological order (oldest first)
  notes.forEach(note => {
    const noteDiv = document.createElement('div');
    noteDiv.className = 'note-item';
    
    const img = document.createElement('img');
    img.src = note.image;
    noteDiv.appendChild(img);
    
    const timestamp = document.createElement('div');
    timestamp.className = 'note-timestamp';
    timestamp.textContent = formatTime(note.timestamp);
    noteDiv.appendChild(timestamp);
    
    receivedNotes.appendChild(noteDiv);
  });
  
  // Scroll to bottom to show latest note
  receivedNotes.scrollTop = receivedNotes.scrollHeight;
}

function formatTime(timestamp) {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now - date;
  
  if (diff < 60000) return 'Just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  
  return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// Window controls
document.getElementById('closeBtn').addEventListener('click', () => {
  window.close();
});
