# LoveNote

A minimalist Electron app for two people to share a live sticky note with drawing and text.

## Setup

1. Install dependencies:

```bash
npm install
```

2. Configure Firebase:
   - Create a Firebase project at https://console.firebase.google.com
   - Create a Firestore database
   - Go to Firestore Database → Rules and set:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /notes/{noteId} {
      allow read, write: if true;
    }
  }
}
```

   - Copy `firebase-config.example.js` to `firebase-config.js`
   - Add your Firebase credentials to `firebase-config.js`
   - Set `OWNER` to `'user1'` on first device, `'user2'` on second device

3. Run:

```bash
npm start
```

## Security Notes

- **Never commit `firebase-config.js`** - it's in `.gitignore`
- Firebase rules allow public read/write for simplicity (2-user app only)
- For production, add Firestore security rules or use App Check
- No sensitive data should be stored in this app

## Features

- ✏️ Freehand drawing with color palette
- 😀 Emoji messages
- 📝 Text messages
- 🔄 Real-time sync via Firebase
- 📌 Desktop widget - stays on background behind other windows
- 💬 Chat-style layout - your messages on right, partner's on left
- 💌 Send button to share messages

## How to Use

1. **Text Mode** (default): Type and press Enter or click Send 💌
2. **Draw Mode** ✏️: Draw on canvas, click Send 💌 to share
3. **Emoji Mode** 😀: Click an emoji to send it instantly
4. **Clear** 🗑️: Clears current input (doesn't delete sent messages)

## Data Model

Each user has their own message array:
- `user1Messages` - Array of messages from user 1
- `user2Messages` - Array of messages from user 2

Messages are displayed chronologically in chat bubbles.
