<div align="center">
  <div style="font-size: 60px; margin-bottom: 10px;">🐼</div>
  <h1>Lingora</h1>
  <p><strong>A modern, full-stack language learning platform with custom dictionaries, 3D flashcards, and AI translations.</strong></p>

  ![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react)
  ![Vite](https://img.shields.io/badge/Vite-8-646CFF?style=flat-square&logo=vite)
  ![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript)
  ![Supabase](https://img.shields.io/badge/Supabase-Backend-3ECF8E?style=flat-square&logo=supabase)
  ![Stripe](https://img.shields.io/badge/Stripe-Payments-008CDD?style=flat-square&logo=stripe)
  ![License](https://img.shields.io/badge/license-MIT-green?style=flat-square)
</div>

---

## ✨ Overview

**Lingora** is a beautiful, interactive language learning application designed to help users build and memorize their custom vocabulary. 

Whether you are learning Spanish, French, or Japanese, Lingora provides a unified workspace to create custom dictionaries, instantly translate words using an integrated AI Translation Engine, and master your vocabulary using Anki-style 3D flashcards and multiple-choice quizzes. It also features a fully-functional Premium Subscription tier powered by Stripe.

## 📸 Screenshots
<table>
  <tr>
    <td><img src="https://placehold.co/500x300/1e1e1e/fff?text=Dashboard" width="500"></td>
    <td><img src="https://placehold.co/500x300/1e1e1e/fff?text=3D+Flashcards" width="500"></td>
    <td><img src="https://placehold.co/500x300/1e1e1e/fff?text=Dictionary+Manager" width="500"></td>
    <td><img src="https://placehold.co/500x300/1e1e1e/fff?text=Premium+Pricing" width="500"></td>
  </tr>
</table>

*(Note: Add your actual screenshots to a `screenshots/` folder and update the links above!)*

## 🚀 Features

### 📚 Custom Dictionaries
- Create multiple **custom dictionaries** categorized by target language.
- Define your native language for precise bidirectional translations.
- Public/Private toggles: **Clone public dictionaries** from other users in the Global Library.

### 🧠 Practice Modes
- **3D Flashcards**: A beautifully animated, Anki-style spatial repetition system. Flip cards to reveal definitions.
- **Quiz Mode**: Test your knowledge with dynamically generated 4-option multiple-choice quizzes.
- Words are queued intelligently based on your learning progress.

### 🤖 AI Auto-Translate
- **Bidirectional Translation**: Add words seamlessly. Type in your Native language or Target language, and the AI instantly fetches the correct translation using the MyMemory API.
- Ensures perfect data integrity without breaking your workflow.

### 💳 Premium Subscriptions (Stripe)
- Integrated **Stripe Checkout** via secure Payment Links.
- **Free Tier**: Limited to 3 dictionaries and basic features.
- **Lingora PRO Tier**: Unlimited dictionaries, ad-free experience, and advanced quizzes.
- Handled securely via **Supabase Edge Functions** validating Stripe Webhooks in real-time.

### 🔐 Authentication & Cloud Sync
- Secure Email/Password **sign up & login** via Supabase Auth.
- All vocabulary, stats, and premium status sync instantly across devices.

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Framework | React 19 + TypeScript |
| Build Tool | Vite 8 |
| Styling | Modern Vanilla CSS (Dark/Light themes) |
| Routing | React Router DOM 7 |
| Backend / DB | Supabase (PostgreSQL) |
| Payments | Stripe (Payment Links + Webhooks) |
| Serverless | Deno (Supabase Edge Functions) |

---

## 📁 Project Structure

```
lingora/
├── src/
│   ├── components/          # Reusable UI components (Sidebar, Modals, Forms)
│   ├── hooks/               # Custom hooks (useAuth, useDictionaries, useProfile)
│   ├── layouts/             # App shell and routing wrappers
│   ├── lib/                 # Core utilities (Supabase client, i18n)
│   ├── pages/               # Main route views (Home, Dictionaries, Practice, Pricing)
│   ├── App.tsx              # React Router definitions
│   └── main.tsx             # Entry point
├── supabase/
│   ├── functions/           # Supabase Edge Functions (Stripe Webhook)
│   └── schema.sql           # Database schema and RLS policies
├── .env.example             # Environment variable templates
└── vite.config.ts           # Vite configuration
```

---

## ⚙️ Getting Started

### Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com) project
- A [Stripe](https://stripe.com) account (for Premium features)

### 1. Clone the repository

```bash
git clone https://github.com/Sushanyn/Lingora.git
cd lingora
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up environment variables

Copy the `.env.example` file to `.env`:

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-key
VITE_STRIPE_MONTHLY_LINK=https://buy.stripe.com/...
VITE_STRIPE_YEARLY_LINK=https://buy.stripe.com/...
```

### 4. Set up Supabase tables

Run the SQL script located at `supabase/schema.sql` in your Supabase **SQL Editor** to create the `profiles`, `dictionaries`, and `words` tables, along with all Row Level Security (RLS) policies.

### 5. Deploy the Stripe Webhook (Optional)

If you are setting up payments, use the Supabase CLI to deploy the Edge Function:

```bash
supabase functions deploy stripe-webhook
supabase secrets set STRIPE_SECRET_KEY=sk_test_...
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
```

### 6. Run the development server

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 📦 Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start the Vite dev server |
| `npm run build` | Build for production |
| `npm run preview` | Preview the production build locally |

---

## 🗺️ Roadmap

- [x] Core vocabulary CRUD operations
- [x] 3D Flashcards and Quiz modes
- [x] AI Auto-Translation Integration
- [x] Stripe Premium Subscriptions
- [ ] Spaced Repetition System (SRS) algorithm implementation
- [ ] Mobile-native app wrappers (React Native / Capacitor)
- [ ] Gamification (Streaks, Badges, Leaderboards)

---

## 🤝 Contributing

Contributions are welcome! Please open an issue first to discuss what you'd like to change, then submit a pull request.

1. Fork the project
2. Create your feature branch: `git checkout -b feature/my-feature`
3. Commit your changes: `git commit -m 'Add my feature'`
4. Push to the branch: `git push origin feature/my-feature`
5. Open a Pull Request

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
