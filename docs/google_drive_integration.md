# Google Drive Integration

Knowlix can import supported files from one Google Drive folder selected by the authenticated Knowlix user.

## Current Behavior

- The integration uses Google OAuth with read-only Drive access.
- The user connects a Google account, then chooses one folder from My Drive.
- The folder picker lists only folders owned by the Google user in My Drive.
- Sync imports supported direct-child files in the selected folder.
- Subfolders are ignored.
- Existing Knowlix sources remain preserved if files are removed from Drive.
- Modified Drive files update their existing tracked Knowlix source.
- Sync runs on a schedule and can also be triggered with Sync now.

## Supported Files

Drive sync accepts the same document family as manual upload:

- PDF
- DOCX
- TXT
- Markdown
- Google Docs, exported to DOCX before ingestion

Unsupported files are skipped and tracked with sync status metadata.

## OAuth Setup

Create a Google OAuth web client and configure:

- **Authorized JavaScript origins**: the frontend origin, such as `http://127.0.0.1:5173`
- **Authorized redirect URIs**: the backend callback, such as `http://127.0.0.1:4000/api/v1/integrations/google-drive/oauth/callback`

For deployed environments, replace localhost values with the production frontend origin and production backend callback URL.

Backend environment variables:

```text
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_DRIVE_REDIRECT_URI=
GOOGLE_TOKEN_ENCRYPTION_KEY=
GOOGLE_DRIVE_SYNC_INTERVAL_MS=
```

Generate `GOOGLE_TOKEN_ENCRYPTION_KEY` with:

```bash
openssl rand -hex 32
```

The key must be stable for the deployed backend. If it changes, previously encrypted refresh tokens cannot be decrypted and users will need to reconnect Drive.

## Security Model

Google Drive is an account integration owned by the Knowlix `user_id`.

- Google email is display metadata only.
- Refresh tokens are encrypted before storage.
- OAuth state is random, hashed, single-use, time-limited, and user-bound.
- Tokens are never returned to the frontend.
- Disconnect removes the connection and tracking records, not existing sources or Knowledge.

## Troubleshooting

### OAuth says the app is not verified

If the OAuth consent screen is in testing mode, add the Google account under test users. For public deployment, complete Google's OAuth app verification if required by the scopes and audience.

### Choose folder asks to connect again

The backend likely has no valid refresh token for the authenticated Knowlix user. Reconnect Drive, confirm the backend callback URL matches Google Cloud Console, and make sure cookies are being sent between frontend and backend.

### Folder does not appear

The folder picker currently shows My Drive folders owned by the Google user. Shared folders and shared drives are intentionally excluded.

### Sync shows zero imported

Check that supported files are direct children of the selected folder. Files inside subfolders are not imported by the current contract.
