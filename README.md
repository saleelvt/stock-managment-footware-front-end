# Elegance Footwear Stock Manager

A modern, offline-first stock management system for footwear retailers, built with React, TypeScript, and IndexedDB for complete offline functionality.

## ✨ Features

- **📦 Complete Inventory Management** - Add, edit, delete products with size-based stock tracking
- **💰 Sales Recording** - Record sales with customer details and automatic stock updates
- **↩️ Return Processing** - Handle returns with stock restoration
- **📊 Dashboard & Reports** - View statistics and low-stock alerts
- **🔍 Search & Filter** - Find products quickly by code, name, or color
- **💾 Offline-First** - All data stored locally using IndexedDB, works without internet
- **🔄 Future Sync Ready** - Built-in synchronization utilities for API integration
- **📱 Responsive Design** - Works on desktop and mobile devices

## 🚀 Quick Start

### For Development

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start development server:**
   ```bash
   npm run dev
   ```

3. **Open your browser:**
   Navigate to `http://localhost:8080`

### For Production Deployment

1. **Create deployment package:**
   ```bash
   npm run package
   ```

2. **Deliver to client:**
   - The deployment package will be created in the `deployment/` folder
   - Send the generated ZIP file to your client
   - Client can simply extract and run the startup script

## 🛠 Technology Stack

- **Frontend:** React 18 + TypeScript + Vite
- **UI Components:** shadcn/ui + Radix UI + Tailwind CSS
- **State Management:** React Context + useReducer
- **Data Storage:** IndexedDB (offline-first)
- **Routing:** React Router DOM
- **Forms:** React Hook Form + Zod validation
- **Charts:** Recharts
- **Icons:** Lucide React

## 📁 Project Structure

```
src/
├── api/                 # Legacy API configuration (kept for reference)
├── components/          # Reusable UI components
│   ├── ui/             # shadcn/ui components
│   └── OfflineIndicator.tsx # Offline status indicator
├── contexts/
│   └── StoreContext.tsx # Main app state management
├── data/               # Sample data (legacy)
├── hooks/              # Custom React hooks
├── lib/                # Utility functions
├── pages/              # Route components
├── services/           # Business logic and data access
│   ├── indexedDBService.ts # Main database service
│   ├── productService.ts   # Product operations
│   ├── salesService.ts     # Sales operations
│   ├── returnService.ts    # Return operations
│   ├── syncService.ts      # Future sync utilities
│   └── errorHandler.ts     # Error handling utilities
└── types/              # TypeScript type definitions
```

## 🔧 Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run build:prod` - Build for production with optimizations
- `npm run package` - Create deployment package for clients
- `npm run preview` - Preview production build locally
- `npm run lint` - Run ESLint

## 📦 Deployment

### For Clients (End Users)

The application is designed to be extremely easy to deploy:

1. **Automated Packaging:** Run `npm run package` to create a client-ready package
2. **Cross-Platform:** Works on Windows, macOS, and Linux
3. **Zero Configuration:** Client just needs to extract and run a script
4. **No Dependencies:** Everything included in the package

### Package Contents

When you run `npm run package`, it creates:

```
deployment/
└── elegance-footwear-stock-manager-v{version}.zip
    ├── app/                    # Built application files
    ├── server.js              # Simple HTTP server
    ├── start-windows.bat      # Windows startup script
    ├── start-unix.sh         # macOS/Linux startup script
    ├── package.json          # Deployment package config
    └── README.txt           # Client instructions
```

### Client Installation

**For Windows:**
1. Extract the ZIP file
2. Double-click `start-windows.bat`
3. Application opens in browser automatically

**For macOS/Linux:**
1. Extract the ZIP file
2. Open terminal in the extracted folder
3. Run `./start-unix.sh`
4. Application opens in browser automatically

## 🔒 Security & Privacy

- **Offline-Only:** No data sent to external servers
- **Local Storage:** All data stored in browser's IndexedDB
- **Privacy-First:** Perfect for sensitive business data
- **No Tracking:** No analytics or external connections

## 🔮 Future Enhancements

The architecture supports easy addition of:

- **API Synchronization:** Connect to remote servers when needed
- **Multi-User Support:** User accounts and permissions
- **Data Export/Import:** Backup and restore functionality
- **Advanced Reporting:** PDF reports and analytics
- **Barcode Integration:** Scanner support for inventory

## 🤝 Development

### Adding New Features

1. **Components:** Add to `src/components/`
2. **Pages:** Add to `src/pages/`
3. **Services:** Add to `src/services/`
4. **Types:** Update `src/types/index.ts`

### Database Schema Changes

The IndexedDB service in `src/services/indexedDBService.ts` handles schema migrations automatically.

## 📞 Support

For technical support or feature requests, please contact your development team.

---

**Built with ❤️ for Elegance Footwear**
