# Ecommerce Tools Extension
🛍️ A browser extension that helps users shop online with various utility features. ✨

![Screenshot](./assets/screenshots/ss1.png)


![Screenshot](./assets/screenshots/ss2.png)


## Website Supports

- Tokopedia

## Features

- Salary Calculator: Helps calculate what percentage of salary will be used for shopping
- Coming Soon!

## Tech Stack

- React + TypeScript
- Tailwind CSS
- Shadcn/ui
- Chrome Extension API
- Plasmo

## Installation Guide

1. Clone this repository
```bash
git clone [repository-url]
```

2. Install dependencies
```bash
npm install
```

3. Build extension
```bash
npm run build
```

4. How to install in browser:
   - Open Chrome/Edge
   - Go to extensions page (chrome://extensions)
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `dist` folder from this project

## Development

For development mode:
```bash
npm run dev
```

## Project Structure

```
├── src/
│   ├── components/     # React Components
│   ├── hooks/         # Custom React hooks
│   ├── lib/           # Utilities and helpers
│   ├── popup.tsx      # Main extension popup
│   └── content.ts     # Content script
```

## Contributing

Please create a pull request to contribute. For major changes, please open an issue first to discuss the desired changes.

## License

[MIT License](LICENSE)
