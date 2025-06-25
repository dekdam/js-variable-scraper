# JavaScript Variable Web Scraper

A Node.js web application that scrapes webpages and extracts JavaScript variables from `<script>` tags, displaying them in a beautiful, formatted interface.

## Features

- 🔍 **URL Input & Scraping**: Simple form to input any URL for scraping
- 📊 **Variable Detection**: Automatically detects JavaScript variables in script tags
- 🎨 **Beautiful Formatting**: Objects and JSON are displayed in formatted, readable format
- 📱 **Responsive Design**: Modern, mobile-friendly interface
- 🚀 **Real-time Results**: Live scraping with loading indicators
- 🏷️ **Type Detection**: Identifies variable types (object, array, string, number, boolean, function)

## Installation

1. **Clone or create the project directory**
   ```bash
   mkdir js-variable-scraper
   cd js-variable-scraper
   ```

2. **Create the project files**
   - Copy the `app.js` code to the root directory
   - Create a `public` folder and add the `index.html` file
   - Copy the `package.json` file to the root directory

3. **Install dependencies**
   ```bash
   npm install
   ```

## Usage

1. **Start the server**
   ```bash
   npm start
   ```
   
   For development with auto-restart:
   ```bash
   npm run dev
   ```

2. **Open your browser**
   Navigate to `http://localhost:3000`

3. **Scrape a webpage**
   - Enter a URL in the input field (e.g., `https://example.com`)
   - Click "Extract JSON"
   - View the extracted JavaScript variables with beautiful formatting

## Project Structure

```
js-variable-scraper/
├── app.js              # Main server file
├── package.json        # Dependencies and scripts
├── public/
│   └── index.html     # Frontend interface
└── README.md          # This file
```

## How It Works

1. **Frontend**: Beautiful web interface with URL input and results display
2. **Backend API**: Express.js server that handles scraping requests
3. **Web Scraping**: Uses Axios to fetch webpage content
4. **HTML Parsing**: Cheerio parses HTML and extracts script tags
5. **Variable Extraction**: Acorn parses patterns identify JavaScript variables
6. **Formatting**: Objects and JSON are beautified for display

## Variable Types Detected

- 📦 **Objects**: JSON objects with pretty formatting
- 📋 **Arrays**: JavaScript arrays with syntax highlighting

## API Endpoints

### POST `/api/scrape`
Scrapes a URL and extracts JavaScript variables.

**Request Body:**
```json
{
  "url": "https://example.com"
}
```

**Response:**
```json
{
  "success": true,
  "url": "https://example.com",
  "totalScripts": 5,
  "scriptsWithVariables": 3,
  "results": [
    {
      "scriptIndex": 1,
      "variables": [
        {
          "name": "config",
          "value": "{\n  \"apiUrl\": \"https://api.example.com\",\n  \"version\": \"1.0\"\n}",
          "type": "object",
          "original": "{\"apiUrl\": \"https://api.example.com\", \"version\": \"1.0\"}"
        }
      ]
    }
  ]
}
```

## Dependencies

- **express**: Web framework for Node.js
- **axios**: HTTP client for making requests
- **cheerio**: Server-side jQuery implementation for HTML parsing
- **acorn**: Server-side parses patterns identify JavaScript variables
- **nodemon**: (dev) Auto-restart server during development

## Error Handling

The application handles various error scenarios:
- Invalid URLs
- Network timeouts
- Unreachable websites
- Malformed JavaScript
- Server errors

## Security Considerations

- Input validation for URLs
- Request timeouts to prevent hanging
- User-Agent headers to avoid blocking
- Error message sanitization

## Limitations

- Only extracts variables from inline `<script>` tags
- External JavaScript files are not parsed
- Complex variable assignments might not be detected
- Obfuscated code may not be parsed correctly

## Contributing

Feel free to submit issues, fork the repository, and create pull requests for any improvements.

## License

MIT License - feel free to use this project for learning and development purposes.