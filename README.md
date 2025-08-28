# Realtime Map Chat

An interactive web application that combines OpenAI's Realtime API voice chat capabilities with Mapbox mapping functionality. Have natural voice conversations with AI while visualizing locations on an interactive map.

## Features

- **Voice Chat**: Real-time voice conversations with OpenAI's GPT model using WebRTC
- **Interactive Map**: Mapbox-powered map with markers and location visualization
- **Low Latency**: WebRTC-based communication for minimal delay
- **Event Logging**: Real-time display of conversation events and API interactions

## Prerequisites

- Node.js (v14 or higher)
- OpenAI API key with Realtime API access
- Mapbox API key

## Installation

1. Clone the repository:
```bash
git clone https://github.com/milind-soni/realtime-map-chat.git
cd realtime-map-chat
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the root directory:
```bash
cp .env.example .env
```

4. Add your API keys to the `.env` file:
```
OPENAI_API_KEY="your-openai-api-key"
MAPBOX_API_KEY="your-mapbox-api-key"
```

## Usage

Start the development server:
```bash
npm run dev
```

The application will be available at [http://localhost:3000](http://localhost:3000)

### How to use:

1. Open the application in your browser
2. Click "Start Session" to begin a voice chat
3. Allow microphone access when prompted
4. Speak naturally to interact with the AI assistant
5. View the map with interactive markers for various locations
6. Monitor the conversation events in the right panel

## Project Structure

```
realtime-map-chat/
├── client/                 # React frontend
│   ├── components/        # React components
│   │   ├── App.jsx       # Main application component
│   │   ├── MapPanel.jsx  # Mapbox map component
│   │   ├── EventLog.jsx  # Event logging component
│   │   └── SessionControls.jsx # Voice session controls
│   └── index.html        # Entry HTML file
├── server.js             # Express server
├── package.json          # Project dependencies
└── vite.config.js        # Vite configuration
```

## Technologies Used

- **Frontend**: React, Vite, Tailwind CSS
- **Backend**: Node.js, Express
- **APIs**: OpenAI Realtime API, Mapbox GL JS
- **Communication**: WebRTC for real-time audio streaming

## Features in Development

- Voice-controlled map navigation
- Dynamic marker creation through conversation
- Location-based queries and responses
- Multi-user session support

## License

MIT

## Acknowledgments

Built on top of OpenAI's Realtime Console example, enhanced with Mapbox mapping capabilities.