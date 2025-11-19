# lsw1.dev

A modern, fast, speedrunning leaderboard platform for LEGO Star Wars: The Video Game. Built with React, TypeScript, and Vite as an alternative to traditional database sites.

## Features

### Leaderboards
- **Full Game Leaderboards** - Track runs across different categories (Any%, 100%, Free Play, etc.)
- **Individual Level Runs** - Separate leaderboards for each level with Story/Free Play categories
- **Community Golds** - Community Gold splits leaderboard for each category and level
  - Configurable categories per level
  - Disable categories for specific levels
- **Multi-platform Support** - PC, PS2, Xbox, GameCube
- **Run Types** - Solo and Co-op runs
- **Filtering** - Filter by category, platform, run type, and level for ILs and CGs
- **Real-time Rankings** - Automatic rank calculation with stud icons for top 3 positions
- **Pagination** - Paginated leaderboards, points leaderboard, and admin views for better performance

### Points System
- **Balanced Points System** Points system rewards totals runs submitted and Top 3 across all categories
- **Points Leaderboard** - Top players ranked by total points

### User Profiles
- **Customizable Profiles** - Profile pictures, bios, and pronouns
- **Name Colors** - Customize your display name color
- **Run Statistics** - View total runs, best rank
- **Run History** - See all submitted and pending runs
- **Twitch Integration** - Add your Twitch username to appear on the live page
- **Run Claiming** - Claim runs that match your display name from imported or manually submitted runs

### Run Submission
- **Easy Submission** - Submit runs with video proof (YouTube)
- **Multiple Leaderboard Types** - Submit Full Game, Individual Level, or Community Gold runs
- **Category Selection** - Choose from available categories for each leaderboard type
- **Level Selection** - Select levels for IL and Community Gold submissions
- **Run Verification** - Admin verification system for submitted runs
- **Run Claiming** - Claim runs imported from speedrun.com or manually submitted by matching your display name

### Live Streaming
- **Official Stream** - Embedded Twitch player for the official community stream
- **Community Streams** - Automatically displays community members streaming when official stream is offline
- **Live Status** - Real-time status checking for all streams
- **Chat Integration** - Twitch chat embedded

### Admin Panel
- **Run Management** - Verify, reject, or delete runs
- **Manual Run Addition** - Admins can manually add verified runs
- **Speedrun.com Import** - Import runs directly from speedrun.com using the API with automatic mapping
  - Import Full Game and Individual Level runs
  - Automatic category, platform, and level mapping
  - Duplicate detection to prevent importing existing runs
  - Player matching indicators (checkmarks for matched players, warnings for unmatched)
  - Edit imported runs before verification
  - Filter and paginate imported runs by category, platform, level, and run type
  - Clear all imported runs functionality
- **Category Management** - Create, edit, delete, and reorder categories
  - Support for different categories per leaderboard type (Regular, Individual Level, Community Golds)
  - Disable categories for specific levels
- **Level Management** - Manage levels for Individual Level and Community Gold leaderboards
  - Disable categories for specific levels
- **Platform Management** - Manage available platforms
- **Download Management** - Add and organize downloads (tools, guides, save files)
- **Admin Management** - Add or remove admin privileges
- **Points Backfill** - Recalculate points for all verified runs
- **Verified Runs with Invalid Data** - View and edit verified runs that have missing or incorrect data

### Downloads
- **Organized Resources** - Tools, guides, save files, and more
- **File Uploads** - Support for both file uploads using uploadthing and external links
- **Categories** - Organize downloads by category

### Design & UX
- **Catppuccin Mocha** - Beautiful, consistent pastel color scheme throughout
- **Smooth Animations** - Polished animations and transitions
- **Fast Performance** - Optimized queries and data fetching
- **Run Details Page** - Detailed view of individual runs with verification status
  - Shows "Imported from Speedrun.com" for imported runs with link to original run
  - Displays verification status and verifier information

## Tech Stack

- **Frontend**: React 18 + TypeScript
- **Build Tool**: Vite & rolldown-vite
- **Styling**: Tailwind CSS + Catppuccin Mocha
- **UI Components**: shadcn/ui
- **Routing**: React Router
- **Database**: Firebase Firestore
  - Optimized queries with composite indexes
  - Data validation and normalization utilities
- **Authentication**: Firebase Auth
- **File Uploads**: UploadThing
- **External APIs**: Speedrun.com API integration
- **Analytics**: Vercel Analytics
- **Deployment**: Vercel

## TODO

### High Priority
- [ ] Create API documentation
- [ ] Implement notification system for run verification
- [ ] Add more robust error handling for speedrun.com API rate limits

## Contributing

This project is designed to be forked for other speedrunning communities. The codebase is structured to be easily adaptable to different games and leaderboard structures.

## Credits

**Technologies**
- [React](https://react.dev) - The library for web and native user interfaces
- [Vite](https://vite.dev/) - The Build Tool for the Web
- [Rolldown](https://rolldown.rs) - Fast Rust-based bundler for JavaScript
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
