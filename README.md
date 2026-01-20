# MentorMatch - Mobile App

A cross-platform mobile application built with React Native and Expo for matching mentors and mentees.

## Features

- **Email Authentication**: Sign up and log in with email
- **Profile Creation**: Create a comprehensive profile with:
  - Name
  - Expertise (where you can mentor others)
  - Interest (where you want to learn)
  - Years of experience in both expertise and interest
  - Email and phone number
- **Matching System**: Discover potential mentors/mentees based on matching interests
- **Profile Management**: View and edit your profile
- **Cross-Platform**: Works on both Android and iOS

## Getting Started

### Prerequisites

- Node.js (v18 or later)
- npm or yarn
- Expo CLI (install globally: `npm install -g expo-cli`)
- Expo Go app on your mobile device (available on App Store and Google Play)

### Installation

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm start
```

3. Run on your device:
   - **iOS**: Press `i` in the terminal or scan the QR code with your camera (iOS)
   - **Android**: Press `a` in the terminal or scan the QR code with Expo Go app (Android)

### Building for Production

#### Android
```bash
npm run android
```

#### iOS
```bash
npm run ios
```

## Project Structure

```
app/
  ├── _layout.tsx          # Root layout with navigation
  ├── index.tsx            # Welcome/landing screen
  ├── signup.tsx           # Sign up screen
  ├── login.tsx            # Login screen
  ├── (tabs)/              # Tab navigation
  │   ├── _layout.tsx      # Tab layout
  │   ├── home.tsx         # Discover/matching screen
  │   └── profile.tsx      # User profile screen
  └── profile/
      ├── create.tsx       # Create profile screen
      ├── edit.tsx         # Edit profile screen
      └── view.tsx         # View other user's profile
```

## Technologies Used

- **React Native**: Cross-platform mobile framework
- **Expo**: Development platform and toolchain
- **Expo Router**: File-based routing
- **AsyncStorage**: Local data persistence
- **TypeScript**: Type safety

## Notes

- Currently uses local storage (AsyncStorage) for data persistence
- In a production app, you would integrate with a backend API
- Password storage is not encrypted (for demo purposes only)
- Consider implementing proper authentication with Firebase, Auth0, or similar services

## License

ISC
