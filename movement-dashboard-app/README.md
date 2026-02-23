# Movement Dashboard App

## Overview
The Movement Dashboard App is a Next.js application that allows users to manage movement records through a user-friendly interface. It interacts with a Flask API to create new movement records.

## Project Structure
```
movement-dashboard-app
├── app
│   ├── dashboard
│   │   └── page.tsx          # Dashboard page component
│   ├── layout.tsx            # Main layout component
│   └── page.tsx              # Main entry page component
├── components
│   └── movement
│       └── CreateMovementButton.tsx  # Button component for creating movements
├── lib
│   └── api
│       └── flask.ts          # API-related functions
├── types
│   └── movement.ts           # TypeScript types for movement records
├── package.json               # NPM configuration file
├── tsconfig.json             # TypeScript configuration file
├── next.config.ts            # Next.js configuration file
└── README.md                 # Project documentation
```

## Features
- **Dashboard**: A dedicated page to view and manage movement records.
- **Create Movement**: A button that triggers the creation of a new movement record via a POST request to the Flask API.

## Installation
1. Clone the repository:
   ```
   git clone <repository-url>
   ```
2. Navigate to the project directory:
   ```
   cd movement-dashboard-app
   ```
3. Install the dependencies:
   ```
   npm install
   ```

## Usage
To start the development server, run:
```
npm run dev
```
Visit `http://localhost:3000` in your browser to access the application.

## API Integration
The application communicates with a Flask API to manage movement records. Ensure the API is running and accessible for the application to function correctly.

## Contributing
Contributions are welcome! Please open an issue or submit a pull request for any enhancements or bug fixes.

## License
This project is licensed under the MIT License.