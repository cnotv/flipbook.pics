# flipbook.pics

Pick your video and cover to generate your own offline flipbook animation!

[Try it out!](https://flipbook-pics.netlify.app/)

![Preview image](src/assets/preview.gif)

## How to Use Flipbook.pics

### 🚀 Quick Start

1. **Visit the app**: Go to [flipbook-pics.netlify.app](https://flipbook-pics.netlify.app/)
2. **Upload or paste a video**: Choose from local files or YouTube URLs
3. **Generate frames**: The app automatically creates flipbook frames from your video
4. **Customize**: Adjust frame count, size, and layout
5. **Print**: Download your printable flipbook as a PDF

### 📱 Install as Mobile App (PWA)

**On iPhone/iPad (Safari):**
1. Open [flipbook-pics.netlify.app](https://flipbook-pics.netlify.app/) in Safari
2. Tap the **Share** button (box with arrow up)
3. Scroll down and tap **"Add to Home Screen"**
4. Tap **"Add"** to confirm
5. The app will appear on your home screen

**On Android (Chrome):**
1. Open [flipbook-pics.netlify.app](https://flipbook-pics.netlify.app/) in Chrome
2. Tap the **three dots menu** (⋮) in the top right
3. Tap **"Add to Home screen"**
4. Tap **"Add"** to confirm
5. The app will appear on your home screen

### 💻 Install as Desktop App

**On Chrome/Edge/Opera:**
1. Visit [flipbook-pics.netlify.app](https://flipbook-pics.netlify.app/)
2. Look for the **install icon** (⊕) in the address bar
3. Click **"Install Flipbook.pics"**
4. The app will open in its own window and appear in your applications

**Alternative method:**
1. Click the **three dots menu** (⋮) in your browser
2. Select **"Install Flipbook.pics..."** or **"Apps" → "Install this site as an app"**

### 🎥 Video Sources

**Upload Local Videos:**
- Click **"Choose File"** or drag & drop video files
- Supports: MP4, WebM, AVI, MOV, and most video formats
- Works completely offline after installation!

**YouTube Videos:**
Not supported, download file first.

### ⚙️ Customization Options

**Frame Settings:**
- **Frame Count**: Adjust how many frames to extract (8-50 frames)
- **Size**: Choose small, medium, or large flipbook dimensions
- **Start/End**: Trim video to focus on specific sections

**Layout Options:**
- **Grid Layout**: Frames arranged in printable rows and columns
- **Page Format**: Optimized for standard printer paper sizes
- **Margins**: Proper spacing for cutting and binding

### 🖨️ Printing Your Flipbook

1. **Generate PDF**: Click the **print button** to create your flipbook
2. **Download**: Save the PDF file to your device
3. **Print Settings**:
   - Use **standard paper** (A4 or Letter size), better if 120 grams paper or higher
   - Set to **100% scale** (no scaling)
   - Choose **high quality** print settings
4. **Assembly**:
   - Cut along the dotted lines
   - Stack frames in order
   - Bind with staples, clips, or rubber band
   - Flip through to see your animation!

### Tech Stack

- **Vue 3** with TypeScript and Composition API
- **Vite** for fast development and building
- **PWA** with service worker for offline functionality
- **PDF Generation** using PDFMake
- **Video Processing** with HTML5 Canvas API
