# Collaborative Courtroom Navigator

A real-time, collaborative PDF viewer that allows multiple users to join a room, upload documents, and see each other's actions simultaneously. This application is built with Flask and Socket.IO on the backend and vanilla JavaScript on the frontend.

## Features

- **Real-Time Collaboration:** Synchronized document viewing for all participants in a room.
- **Dynamic Rooms:** Create or join rooms by entering a name.
- **Multi-User & Multi-Document:** Supports multiple participants and multiple documents per room.
- **Text Highlighting:** Select text in PDFs to create highlights that are shared in real-time with all room participants.
- **Interactive PDF Viewer:** Built with react-pdf for better text selection and highlighting capabilities.
- **"Follow" Mode:** Click on a participant to mirror their view—see the same document, page, and highlights.
- **Persistent Data:** Uses a SQLite database to store all rooms, users, and documents.
- **Secure Configuration:** Manages secret keys and other configurations using environment variables.
- **Mobile-Friendly:** Responsive design that works well on desktop and mobile devices.

## Project Structure

```
/
|-- app.py              # Main Flask application and Socket.IO logic
|-- config.py           # Configuration management (dev, prod)
|-- database.py         # SQLAlchemy database models
|-- requirements.txt    # Python dependencies
|-- .gitignore          # Files to be ignored by Git
|-- .env.example        # Example environment variables
|-- static/
|   |-- main.js         # Frontend JavaScript logic
|-- templates/
|   |-- index.html      # Main HTML file
|-- documents/          # Default folder for uploaded PDFs
```

## Setup and Installation

### 1. Prerequisites

- Python 3.7+
- pip (Python package installer)

### 2. Clone the Repository

```bash
git clone <repository_url>
cd <repository_directory>
```

### 3. Set Up the Environment

It is highly recommended to use a virtual environment to manage the project's dependencies.

```bash
# Create a virtual environment
python -m venv venv

# Activate it
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate
```

### 4. Install Dependencies

Install all the required Python packages using pip:

```bash
pip install -r requirements.txt
```

### 5. Configure Environment Variables

The application uses environment variables for configuration. See `ENVIRONMENT_SETUP.md` for detailed instructions.

**Quick Setup:**

1. **Backend Environment:**
   ```bash
   cp env.example .env
   # Edit .env with your configuration
   ```

2. **Frontend Environment:**
   ```bash
   cd frontend
   cp env.example .env
   # Edit .env with your configuration
   ```

3. **Generate a secure SECRET_KEY:**
   ```bash
   python -c "import secrets; print(secrets.token_hex(24))"
   ```
   Add the generated key to your `.env` file.

## How to Run the Application

With the setup complete, you can now run the application.

1.  **Initialize the Database and Start the Server:**
    The application will automatically create the SQLite database file if it doesn't exist.
    ```bash
    python app.py
    ```

2.  **Access the Application:**
    Open your web browser and navigate to `http://127.0.0.1:5000`.

3.  **Test Collaboration:**
    To see the real-time features in action, open the same URL in a second browser window or tab and join the same room. Any action you take in one window (like uploading a document or changing pages) will be instantly reflected in the other.

## Text Highlighting Features

The application now includes advanced text highlighting capabilities:

### How to Use Highlights

1. **Select Text:** Click and drag to select text in any PDF document
2. **Create Highlight:** Click the "Highlight" button or press `Ctrl+H` (or `Cmd+H` on Mac)
3. **Real-Time Sharing:** Highlights are immediately shared with all participants in the room
4. **View Highlights:** Hover over highlights to see who created them

### Highlight Features

- **Semi-transparent yellow highlighting** that doesn't interfere with text selection
- **User attribution** showing who created each highlight
- **Persistent storage** - highlights are saved and persist across sessions
- **Cross-platform compatibility** with keyboard shortcuts
- **Mobile-friendly** touch interactions

### Technical Implementation

- **Frontend:** React with react-pdf for PDF rendering and text layer access
- **Backend:** Flask-SocketIO for real-time highlight synchronization
- **Database:** JSON storage for highlight data with user associations
- **Styling:** Tailwind CSS for responsive design and smooth animations
