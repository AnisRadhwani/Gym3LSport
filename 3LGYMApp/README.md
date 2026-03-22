# GymLaunch

A mobile application for gym management built with React Native + Expo.

## Features

### For Users
- Sign in and sign up using phone and password
- View events and classes, mark interest
- See coaches available at the gym now (based on working hours)
- View remaining membership days
- Receive push notifications (for interested events)

### For Admins
- View dashboard (summary of users, coaches, events)
- Manage events (create, edit, delete)
- Manage coaches and their schedules
- View/edit user profiles and membership days
- Send push notifications to all users

## Tech Stack

- React Native + Expo
- Tailwind CSS (via twrnc)
- React Navigation
- Firebase (Auth, Firestore, Storage, Notifications)
- Expo Push Notifications

## Project Structure

- `app/` - Main application screens using Expo Router
- `components/` - Reusable UI components
- `config/` - Configuration files (Firebase, Tailwind, etc.)
- `navigation/` - Additional navigation configurations
- `screens/` - Screen components
- `constants/` - App constants and theme configuration
- `assets/` - Images, fonts, and other static assets

## Getting Started

### Prerequisites

- Node.js (v14 or newer)
- npm or yarn
- Expo CLI (`npm install -g expo-cli`)
- Expo Go app on your mobile device or an iOS/Android emulator

### Installation

1. Clone the repository:
   ```
   git clone <repository-url>
   cd GymLaunchApp
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Update Firebase configuration:
   Open `config/firebase.js` and replace the placeholder values with your Firebase project configuration.

### Running the App

```
npm start
```

This will start the Expo development server. You can then:
- Scan the QR code with your Expo Go app (Android) or Camera app (iOS)
- Press 'a' to run on an Android emulator
- Press 'i' to run on an iOS simulator (requires macOS)
- Press 'w' to run in a web browser

## License

MIT
