# lsw1.dev

A modern, fast, speedrunning leaderboard platform for LEGO Star Wars: The Video Game. Built with React, TypeScript, and Vite as an alternative to traditional database sites.

## Features

### Leaderboards
- **Full Game Leaderboards** - Track runs across different categories (Any%, 100%, Free Play, etc.)
- **Individual Level Runs** - Separate leaderboards for each level with Story/Free Play categories
- **Community Golds** - Community Gold splits leaderboard for each category and level
- **Multi-platform Support** - PC, PS2, Xbox, GameCube
- **Run Types** - Solo and Co-op runs
- **Filtering** - Filter by category, platform, run type, and level for ILs and CGs
- **Real-time Rankings** - Automatic rank calculation with stud icons for top 3 positions

### Points System
- **Exponential Point Calculation** - Faster times earn exponentially more points
- **Points Leaderboard** - Top players ranked by total points

### User Profiles
- **Customizable Profiles** - Profile pictures, bios, and pronouns
- **Name Colors** - Customize your display name color
- **Run Statistics** - View total runs, best rank
- **Run History** - See all submitted and pending runs
- **Twitch Integration** - Add your Twitch username to appear on the live page

### Run Submission
- **Easy Submission** - Submit runs with video proof (YouTube)
- **Multiple Leaderboard Types** - Submit Full Game, Individual Level, or Community Gold runs
- **Category Selection** - Choose from available categories for each leaderboard type
- **Level Selection** - Select levels for IL and Community Gold submissions
- **Run Verification** - Admin verification system for submitted runs

### Live Streaming
- **Official Stream** - Embedded Twitch player for the official community stream
- **Community Streams** - Automatically displays community members streaming when official stream is offline
- **Live Status** - Real-time status checking for all streams
- **Chat Integration** - Twitch chat embedded

### Admin Panel
- **Run Management** - Verify, reject, or delete runs
- **Manual Run Addition** - Admins can manually add verified runs
- **Category Management** - Create, edit, delete, and reorder categories
- **Level Management** - Manage levels for Individual Level and Community Gold leaderboards
- **Platform Management** - Manage available platforms
- **Download Management** - Add and organize downloads (tools, guides, save files)
- **Admin Management** - Add or remove admin privileges
- **Points Backfill** - Recalculate points for all verified runs

### Downloads
- **Organized Resources** - Tools, guides, save files, and more
- **File Uploads** - Support for both file uploads using uploadthing and external links
- **Categories** - Organize downloads by category

### Design & UX
- **Catppuccin Mocha** - Beautiful, consistent pastel color scheme throughout
- **Smooth Animations** - Polished animations and transitions
- **Fast Performance** - Optimized queries and data fetching

### Authentication & Security
- **Firebase Authentication** - Secure user authentication
- **Role-Based Access** - Admin and user roles
- **Run Ownership** - Run owners can edit comments and dates
- **Firestore Security Rules** - Secure database access

## Tech Stack

- **Frontend**: React 18 + TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS + Catppuccin Mocha
- **UI Components**: shadcn/ui
- **Routing**: React Router
- **Database**: Firebase Firestore
- **Authentication**: Firebase Auth
- **File Uploads**: UploadThing
- **Analytics**: Vercel Analytics
- **Deployment**: Vercel

## TODO

### High Priority
- [ ] Add pagination for leaderboards with many entries
- [ ] Create API documentation
- [ ] Add run export/import functionality
- [ ] Implement notification system for run verification

### Medium Priority
- [ ] Add run history timeline on profiles
- [ ] Create run graphs/charts (WR progression, etc.)

### Low Priority
- [ ] Add dark/light theme toggle (currently using Mocha)
- [ ] Create mobile app version

## Contributing

This project is designed to be forked for other speedrunning communities. The codebase is structured to be easily adaptable to different games and leaderboard structures.

## Credits

**Technologies**
- [React](https://react.dev) - The library for web and native user interfaces
- [Vercel](https://vercel.com) - Deployment and hosting
- [Firebase](https://firebase.google.com) - Authentation and storage
- [uploadthing](https://uploadthing.com) - File uploading

**Design**
- [Catppuccin](https://github.com/catppuccin) - Beautiful color scheme (Mocha palette)
- [shadcn/ui](https://ui.shadcn.com) - UI component library

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

This project is open source and available for forking and modification for other speedrunning communities.

---

Built with ❤️ for the LEGO Star Wars speedrunning community
