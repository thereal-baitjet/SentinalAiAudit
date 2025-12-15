# Sentinal AI Audit

![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)
![Gemini API](https://img.shields.io/badge/Google%20Gemini-8E75B2?style=for-the-badge&logo=googlebard&logoColor=white)
![AI Model](https://img.shields.io/badge/Model-Gemini%202.5%20Flash-4285F4?style=for-the-badge)
![License](https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge)
![Status](https://img.shields.io/badge/Status-MVP-success?style=for-the-badge)
![Platform](https://img.shields.io/badge/Platform-Web-blue?style=for-the-badge)
![Created By](https://img.shields.io/badge/Created%20By-Vibe-ff69b4?style=for-the-badge)

**Sentinal AI Audit** is an advanced security intelligence tool designed to automate the analysis of CCTV and surveillance footage. By leveraging the multimodal capabilities of **Google's Gemini 2.5 Flash** model, it transforms raw video data into structured, searchable security logs.

## 🚀 Features

*   **Automated Video Analysis**: Upload CCTV footage (supports large files >20MB via Google File API) to detect entities, behaviors, and anomalies automatically.
*   **Smart Event Timeline**: Generates a precise, clickable timeline of events (Routine, Suspicious, Critical) allowing operators to jump instantly to key moments.
*   **Executive Summaries**: specific lighting conditions, duration analysis, and a high-level summary of the entire footage.
*   **Security Grading**: Automatically scores events based on severity (e.g., weapons or force detection vs. routine traffic).
*   **Secure Architecture**: API keys are handled securely via environment variables or dynamic selection, ensuring safe deployment.

## 🛠️ Tech Stack

*   **Frontend**: React 19, TypeScript
*   **Styling**: Tailwind CSS
*   **AI/ML**: Google Gemini API (`@google/genai`)
*   **Model**: `gemini-2.5-flash`

## 🔒 Security & Deployment

To deploy this application safely without exposing your personal API quota:

1.  **Do NOT set the `API_KEY` environment variable** in your hosting provider (Vercel, Netlify, etc.).
2.  Deploy the application as a static site.
3.  When you (or a user) opens the deployed site, click the **Key Icon** in the top right.
4.  Enter a Gemini API Key manually. This key is stored in the **User's Browser Local Storage** only.
5.  This ensures that every user provides their own key, and your personal key remains private and safe.

## 📦 How it Works

1.  **Upload**: The user uploads a video file. Small files are processed inline; large files are securely uploaded via the Gemini File API.
2.  **Analyze**: The Gemini 2.5 Flash model processes the visual data to identify security-relevant events, filtering out environmental noise (rain, trees).
3.  **Report**: The app renders a dashboard with a video player synced to a structured event log and intelligence summary.

## 👨‍💻 Credits

**Created by Vibe.**

This project was built to demonstrate the power of multimodal AI in physical security and surveillance auditing.