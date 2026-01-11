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
- 😀 Emoji stamps
- 📝 Text input
- 🔄 Real-time sync via Firebase
- 📌 Desktop widget - stays on background behind other windows
- 🗑️ Clear your own drawings
- 💌 Send button for explicit sync

## Data Model

Each user writes to their own fields:
- `user1Strokes` / `user2Strokes` - drawing strokes
- `user1Stamps` / `user2Stamps` - emoji stamps
- `user1Text` / `user2Text` - text content

Partner's content appears below yours.
