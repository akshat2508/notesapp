

# 📝 akshat2508-notesapp

A modern, full-featured **Notes App** built with **React Native**, **TypeScript**, **Expo**, and **Supabase**. Designed with offline-first capabilities and cloud sync, it features a beautiful UI, one-time authentication, Redux-powered state management, and seamless note filtering by title or tags.

---
# 💬Download Link:
For Now The App is available for android (Soon for ios)

Android Download Link: [@Secure Notes](https://expo.dev/artifacts/eas/dm8fpxDr9cagjaxA4v3W1M.apk)
---

## ✨ Features

- 🔐 **One-Time Login** using Supabase Auth
- 💾 **Offline Notes Storage** with automatic **Cloud Sync**
- 🔍 **Filter Notes** by **Title** or **Tag**
- 📝 **Create, Edit & Delete Notes**
- 🎨 **Modern, Responsive UI**
- ⚛️ Built with **Expo**, **React Native**, and **TypeScript**
- 📦 Uses **Redux** for robust global state management
- 📲 Ready for **EAS Build** (Android/iOS)

---

## 🛠️ Tech Stack

| Tool / Library   | Purpose                                      |
|------------------|-----------------------------------------------|
| **React Native** | Cross-platform mobile development             |
| **Expo**         | App runtime & development workflow            |
| **Redux**        | State management                              |
| **TypeScript**   | Type safety and scalable codebase             |
| **Supabase**     | Auth, Database & Cloud Sync                   |
| **AsyncStorage** | Offline data persistence                      |
| **EAS Build**    | Cloud builds for Android and iOS              |

---

## 📁 Folder Structure

```

akshat2508-notesapp/
├── app.json            # Expo config
├── App.tsx             # Entry point of the app
├── eas.json            # EAS build configuration
├── index.ts            # App registry
├── package.json        # Dependencies and scripts
├── tsconfig.json       # TypeScript config
└── src/
├── AuthScreen.tsx     # Login UI & logic
├── NotesScreen.tsx    # Notes display, filter, delete
├── store.ts           # Redux store setup
├── supabase.ts        # Supabase client config
└── types.ts           # Shared types & interfaces

````
<h2 align="center">📸 Screenshots</h2>

<p align="center">
  <img src="https://github.com/user-attachments/assets/277e0727-bf13-4c98-a8c4-f410f263cbc2" height="400" style="margin: 0 10px;" />
  <img src="https://github.com/user-attachments/assets/bc508797-45d1-4c62-b048-796430bf709e" height="400" style="margin: 0 10px;" />
  <img src="https://github.com/user-attachments/assets/44c67f4f-6d01-4934-ae83-fd97c8eadcc5" height="400" style="margin: 0 10px;" />
</p>




---

## 📸 Preview



---

## 🚀 Getting Started

### 📦 Prerequisites

- Node.js ≥ 18
- Expo CLI: `npm install -g expo-cli`
- Supabase account with a project set up
- Android Studio or Xcode (for testing builds)

### 🔧 Installation

```bash
# 1. Clone the repo
git clone https://github.com/akshat2508/akshat2508-notesapp.git
cd akshat2508-notesapp

# 2. Install dependencies
npm install

# 3. Configure Supabase keys
# Add your Supabase URL and anon key in supabase.ts

# 4. Start the development server
npx expo start
````

---

## ⚙️ EAS Build Setup

Make sure you're logged in:

```bash
npx expo login
```

Then run:

```bash
eas build --platform android
# or
eas build --platform ios
```

You can configure your build in:

* `eas.json`
* `app.json`

---

## 🧠 Supabase Table Schema (PostgreSQL)

```sql
CREATE TABLE notes (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  tags TEXT DEFAULT '',
  user_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own notes" ON notes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own notes" ON notes
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own notes" ON notes
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notes" ON notes
  FOR DELETE USING (auth.uid() = user_id);
```

---

## 🧩 Redux Store (Overview)

All global state like `notes`, `user session`, and `sync status` are managed through **Redux**.

```tsx
// Example structure: store.ts
import { configureStore } from '@reduxjs/toolkit';
import notesReducer from './notesSlice';

export const store = configureStore({
  reducer: {
    notes: notesReducer,
  },
});
```

---

## 🌟 Roadmap / Future Features

* [ ] 🔔 Push notifications for reminders
* [ ] 🌙 Dark mode support
* [ ] 📌 Pin notes to top
* [ ] 🖼️ Add image attachments
* [ ] 🔄 Auto backup/restore

---

## 🤝 Contributing

Contributions are welcome! To contribute:

```bash
# 1. Fork the repo
# 2. Create your branch
git checkout -b feature/amazing-feature

# 3. Commit and push
git commit -m 'Add amazing feature'
git push origin feature/amazing-feature

# 4. Open a Pull Request
```



---

## 👤 Author

**Akshat Paul**

* GitHub: [@akshat2508](https://github.com/akshat2508)
* Linkedin: [@akshatpaul](https://www.linkedin.com/in/akshat-paul/)

---

## ⭐️ Show Your Support

If you found this project useful, please ⭐️ star the repo and share it with others!

