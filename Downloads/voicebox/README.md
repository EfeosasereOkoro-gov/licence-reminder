# VoiceBox 🎤

A high-engagement team tool designed to diversify meeting participation. VoiceBox ensures that every role in your team has a voice by intelligently selecting speakers while preventing dominant voices from overshadowing others.

## 🚀 Features

- **Role-Aware Selection**: Never picks two people from the same role in a single round.
- **Fairness Algorithm**: Participants who have already spoken are **95% less likely** to be selected again in the same session, ensuring quieter team members get the spotlight.
- **Gender Balance**: Automatically attempts to balance gender representation in every selection (minimum 1 male and 1 female per set of 4).
- **Persistent Stats**: Track selection counts throughout your meeting (saved locally in your browser).
- **Mobile Optimized**: Designed to show all speakers clearly on any device without excessive scrolling.

## 🛠️ Tech Stack

- **Framework**: React 19 + Vite
- **Styling**: Tailwind CSS
- **Animations**: Motion (framer-motion)
- **Icons**: Lucide React

## 📋 How to Use

1. **Randomize**: Click the large "Randomize" button to select 4 speakers.
2. **View Selected**: The 4 chosen team members appear in high-visibility cards.
3. **Track History**: Check the sidebar to see the full roster and how many times each person has been called.
4. **Reset**: Use the "Reset Stats" button at the top to clear the selection history for a new meeting.

## 📊 Selection Logic

- **Weights**: Each time a person is selected, their "weight" in the pool is multiplied by 0.05.
- **Constraints**:
  - Exactly 4 speakers.
  - Unique roles for each speaker.
  - At least 1 male and 1 female.

---
Built for high-engagement collaboration.
