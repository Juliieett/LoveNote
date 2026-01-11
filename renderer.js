import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getFirestore, doc, onSnapshot, updateDoc, setDoc } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { firebaseConfig, OWNER } from './firebase-config.js';


const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const docRef = doc(db, 'notes', 'shared');


const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const textArea = document.getElementById('textArea');
const emojiToolbar = document.querySelector('.emoji-toolbar');
const colorPalette = document.querySelector('.color-palette');


let currentTool = 'draw';
let currentColor = '#000000';
let isDrawing = false;
let currentStroke = [];
let myStrokes = [];
let myStamps = [];
let myText = '';
let partnerStrokes = [];
let partnerStamps = [];
let partnerText = '';


const MY_FIELDS = {
  strokes: OWNER === 'user1' ? 'user1Strokes' : 'user2Strokes',
  stamps: OWNER === 'user1' ? 'user1Stamps' : 'user2Stamps',
  text: OWNER === 'user1' ? 'user1Text' : 'user2Text'
};

const PARTNER_FIELDS = {
  strokes: OWNER === 'user1' ? 'user2Strokes' : 'user1Strokes',
  stamps: OWNER === 'user1' ? 'user2Stamps' : 'user1Stamps',
  text: OWNER === 'user1' ? 'user2Text' : 'user1Text'
};


function resizeCanvas() {
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width;
  canvas.height = rect.height;
  render();
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

// Initialize UI - show color palette since draw is default tool
colorPalette.classList.add('active');

// Color picker
document.querySelectorAll('.color-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    currentColor = btn.dataset.color;
    document.querySelectorAll('.color-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
  });
});

document.querySelectorAll('.tool-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const tool = btn.dataset.tool;
    
    if (tool === 'clear') {
      clearMyDrawings();
      return;
    }
    
    currentTool = tool;
    document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    
    // Toggle UI elements based on tool
    textArea.style.pointerEvents = tool === 'text' ? 'auto' : 'none';
    canvas.style.pointerEvents = tool === 'draw' || tool === 'emoji' ? 'auto' : 'none';
    emojiToolbar.classList.toggle('active', tool === 'emoji');
    colorPalette.classList.toggle('active', tool === 'draw');
    
    if (tool === 'text') {
      textArea.focus();
    }
  });
});

// Drawing
canvas.addEventListener('mousedown', startDrawing);
canvas.addEventListener('mousemove', draw);
canvas.addEventListener('mouseup', stopDrawing);
canvas.addEventListener('mouseleave', stopDrawing);

function startDrawing(e) {
  if (currentTool !== 'draw') return;
  isDrawing = true;
  const rect = canvas.getBoundingClientRect();
  currentStroke = {
    points: [{ x: e.clientX - rect.left, y: e.clientY - rect.top }],
    color: currentColor
  };
}

function draw(e) {
  if (!isDrawing || currentTool !== 'draw') return;
  const rect = canvas.getBoundingClientRect();
  currentStroke.points.push({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  render();
  drawStroke(currentStroke.points, currentStroke.color, 2);
}

function stopDrawing() {
  if (!isDrawing) return;
  isDrawing = false;
  if (currentStroke.points && currentStroke.points.length > 0) {
    myStrokes.push(currentStroke);
    currentStroke = { points: [], color: currentColor };
    syncToFirebase();
  }
}

// Emoji stamps
document.querySelectorAll('.emoji-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    if (currentTool !== 'emoji') return;
    // Will be placed on next canvas click
    canvas.addEventListener('click', placeEmoji, { once: true });
    
    function placeEmoji(e) {
      const rect = canvas.getBoundingClientRect();
      const stamp = {
        emoji: btn.dataset.emoji,
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      };
      myStamps.push(stamp);
      render();
      syncToFirebase();
    }
  });
});

// Text sync
let textTimeout;
textArea.addEventListener('input', () => {
  myText = textArea.value;
  clearTimeout(textTimeout);
  textTimeout = setTimeout(() => syncToFirebase(), 500);
});

// Clear my drawings
function clearMyDrawings() {
  myStrokes = [];
  myStamps = [];
  myText = '';
  textArea.value = '';
  render();
  syncToFirebase();
}

// Render everything
function render() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  // Partner layer (bottom)
  partnerStrokes.forEach(stroke => {
    const color = stroke.color || 'rgba(255, 105, 180, 0.6)';
    const points = stroke.points || stroke;
    drawStroke(points, color, 2);
  });
  partnerStamps.forEach(stamp => drawStamp(stamp));
  
  // My layer (top)
  myStrokes.forEach(stroke => {
    const color = stroke.color || '#000';
    const points = stroke.points || stroke;
    drawStroke(points, color, 2);
  });
  myStamps.forEach(stamp => drawStamp(stamp));
  
  // Current stroke
  if (currentStroke.points && currentStroke.points.length > 0) {
    drawStroke(currentStroke.points, currentStroke.color, 2);
  }
}

function drawStroke(points, color, width) {
  if (points.length < 2) return;
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) {
    ctx.lineTo(points[i].x, points[i].y);
  }
  ctx.stroke();
}

function drawStamp(stamp) {
  ctx.font = '32px Arial';
  ctx.fillText(stamp.emoji, stamp.x - 16, stamp.y + 16);
}

// Firebase sync
async function syncToFirebase() {
  try {
    await updateDoc(docRef, {
      [MY_FIELDS.strokes]: myStrokes,
      [MY_FIELDS.stamps]: myStamps,
      [MY_FIELDS.text]: myText
    });
  } catch (error) {
    // Document might not exist yet
    await setDoc(docRef, {
      [MY_FIELDS.strokes]: myStrokes,
      [MY_FIELDS.stamps]: myStamps,
      [MY_FIELDS.text]: myText,
      [PARTNER_FIELDS.strokes]: [],
      [PARTNER_FIELDS.stamps]: [],
      [PARTNER_FIELDS.text]: ''
    });
  }
}

// Listen to partner updates
onSnapshot(docRef, (snapshot) => {
  if (!snapshot.exists()) return;
  
  const data = snapshot.data();
  

  partnerStrokes = data[PARTNER_FIELDS.strokes] || [];
  partnerStamps = data[PARTNER_FIELDS.stamps] || [];
  partnerText = data[PARTNER_FIELDS.text] || '';
  
  
  myStrokes = data[MY_FIELDS.strokes] || myStrokes;
  myStamps = data[MY_FIELDS.stamps] || myStamps;
  myText = data[MY_FIELDS.text] || myText;
  
  render();
});


document.getElementById('sendBtn').addEventListener('click', async () => {
  const btn = document.getElementById('sendBtn');
  btn.classList.add('sending');
  btn.textContent = 'Sending...';
  
  await syncToFirebase();
  
  setTimeout(() => {
    btn.classList.remove('sending');
    btn.textContent = 'Sent! 💌';
    setTimeout(() => {
      btn.textContent = 'Send 💌';
    }, 1500);
  }, 500);
});

document.getElementById('closeBtn').addEventListener('click', () => {
  window.close();
});

// Make window draggable
const header = document.getElementById('header');
header.addEventListener('mousedown', (e) => {
  if (e.target === header || e.target.classList.contains('title')) {
    
  }
});
