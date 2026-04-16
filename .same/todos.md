# VersaTalent Todos

## Completed
- [x] Fix SQL parameter placeholder bug in talents.ts updateTalent function
- [x] Add multi-select talent picker for event creation form
- [x] Auto-complete events as "completed" after their date passes
- [x] Fix admin/nfc page client-side error - NFCCardRegistration.tsx was empty
- [x] Deploy fix to production (v249)
- [x] Fix NFC reader CCID protected class browser limitation (v251)
  - Added WebSocket bridge support for physical NFC readers
  - Added Simulation Mode for testing without hardware
  - Improved error messaging and UI guidance
- [x] Create NFC Bridge server documentation (for users who want to use physical NFC readers)
- [x] Build NFC Bridge executables for all platforms (Windows, macOS Intel/ARM, Linux x64/ARM)
- [x] Create GitHub repository for NFC Bridge Server (https://github.com/versatalent-tech/nfc-bridge-server)
- [x] Remove "VersaTalent in Action" section from homepage
- [x] Remove "Follow Our Artists" / DynamicInstagramFeed section from homepage

## Backlog
- [ ] Upload release assets to GitHub (requires manual upload or gh auth)
- [ ] Clean up unused imports across project (warnings in linter)
- [ ] Escape apostrophes in JSX strings (multiple files have react/no-unescaped-entities errors)
- [ ] Replace img tags with Next.js Image component for performance
