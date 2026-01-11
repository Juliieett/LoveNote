# Security Policy

## Reporting Security Issues

If you discover a security vulnerability, please email the maintainer directly instead of using the issue tracker.

## Security Considerations

This app is designed for **exactly 2 users** (a couple) with the following assumptions:

- No authentication system
- Firebase Firestore rules allow public read/write
- No encryption of data at rest
- Last-write-wins conflict resolution

**Do not store sensitive information** in this app. It's designed for casual notes and drawings between trusted partners.

## Securing Your Instance

1. **Keep `firebase-config.js` private** - never commit or share it
2. **Use Firestore Security Rules** to restrict access to your document
3. **Enable Firebase App Check** to prevent API key abuse
4. **Monitor Firebase usage** to detect unexpected access

### Recommended Firestore Rules

For better security, use these rules instead of the open ones:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /notes/{noteId} {
      // Replace with your actual document ID
      allow read, write: if noteId == 'shared';
    }
  }
}
```

Or add App Check for additional protection.
