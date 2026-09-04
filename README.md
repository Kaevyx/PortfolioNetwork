# Portfolio Network

A professional portfolio and networking platform built with Next.js, Clerk, and Supabase. Perfect for individuals and businesses to showcase their work, connect with professionals, and build their network.

## ✨ Features

### Core Features
- **User Authentication**: Secure authentication using Clerk
- **Profile Types**: Support for both individual and business profiles
- **Portfolio Showcase**: Display skills, CV, services, and portfolio items
- **Reviews & Ratings**: Get reviews from previous employers and clients
- **Social Network**: Follow/followers system to connect with professionals
- **Verified Accounts**: Blue checkmark for verified profiles
- **Posts & Updates**: Share professional updates with your network
- **Engagement**: Like, comment, and share posts
- **View Tracking**: Track post views and engagement metrics
- **Activity Feed**: Real-time activity updates
- **Advanced Search**: Find professionals, skills, and services
- **Analytics Dashboard**: Track your profile performance
- **Settings Page**: Comprehensive user settings and preferences
- **News Feed**: Dedicated feed page for all posts
- **Notifications**: Real-time notification system

### Pages
- **Homepage**: Beautiful landing page with feature showcase
- **Dashboard**: Comprehensive dashboard with feed and analytics
- **Profile Pages**: Full profile pages with posts, portfolio, and reviews
- **Explore**: Discover and search profiles
- **Feed**: News feed with all posts
- **Analytics**: Detailed analytics and insights
- **Settings**: Advanced settings page
- **Pricing**: Transparent pricing plans
- **About**: Company information
- **Blog**: Blog posts and articles
- **Careers**: Job openings
- **Contact**: Contact form
- **Features**: Feature showcase
- **Privacy Policy**: Privacy policy page
- **Terms of Service**: Terms and conditions

## 🚀 Tech Stack

- **Next.js 14**: React framework with App Router
- **TypeScript**: Type-safe development
- **Clerk**: Authentication and user management
- **Supabase**: Database and backend services
- **Tailwind CSS**: Styling and responsive design
- **Lucide React**: Icon library
- **date-fns**: Date formatting

## 📦 Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd portfolio-network
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   Create a `.env.local` file:
   ```env
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
   CLERK_SECRET_KEY=your_clerk_secret_key
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. **Set up database**
   - Run `supabase/schema.sql` in Supabase SQL Editor
   - Run `supabase/posts-schema.sql`
   - Run `supabase/post-views-schema.sql`
   - Run `supabase/rls-policies.sql`

5. **Run the development server**
   ```bash
   npm run dev
   ```

6. **Open [http://localhost:3000](http://localhost:3000)**

## 📚 Database Schema

The application uses the following tables:
- `profiles` - User profiles with settings
- `reviews` - Reviews and ratings
- `follows` - Follow relationships
- `portfolio_items` - Portfolio showcase items
- `posts` - User posts/updates
- `post_likes` - Post likes
- `post_comments` - Post comments
- `post_views` - Post view tracking

## 🎨 Features in Detail

### For Individuals
- Create a professional profile
- Showcase skills and experience
- Upload CV/resume
- Share posts and updates
- Receive reviews from employers
- Build a professional network
- Track engagement metrics

### For Businesses
- Create a business profile
- Advertise services
- Showcase portfolio items
- Share company updates
- Receive client reviews
- Connect with potential partners
- Analytics and insights

### Social Features
- Follow other profiles
- Get followers
- View profiles and portfolios
- Leave reviews and ratings
- Like and comment on posts
- Share posts to social media
- Real-time notifications
- Activity feed
- Verified account badges

## 🔧 Configuration

### Settings Page
The advanced settings page allows users to configure:
- Profile visibility settings
- Notification preferences
- Privacy controls
- Appearance preferences (theme, animations, etc.)

### Analytics
Track comprehensive metrics including:
- Followers and following
- Reviews and ratings
- Portfolio items
- Post statistics (views, likes, comments)
- Engagement trends

## 📖 Documentation

See [SETUP.md](./SETUP.md) for detailed setup instructions.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

MIT

## 🙏 Acknowledgments

- Built with Next.js, Clerk, and Supabase
- Icons by Lucide
- Styling with Tailwind CSS
