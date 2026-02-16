# Baby Boo Ringtone Gallery

This app is supposed to be a ringtone gallery for TikTok "baby boo" audios.

## Drop-in workflow (your requested version)

1. Put your audio files in `assets/audio/` (`.mp3`, `.m4a`, `.wav`, `.ogg`)
2. Run:

```bash
npm run build-tracks
```

3. Start the app (or push and have a build run later)

```bash
npm run start
```

The app auto-generates tiles from whatever files you dropped in.

## What it does

- Shows a gallery of Baby Boo audio variants from local files
- Lets you preview each clip
- Lets you download/export clips so they can be set as ringtones

## Built with

- Expo
- React Native
- TypeScript
