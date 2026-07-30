# Photo Management Backend

A Node.js/Express backend API for managing photo records with metadata.

## Features

- ✅ Create, Read, Update, Delete (CRUD) operations for photo records
- ✅ Image upload with multer
- ✅ File storage in local filesystem
- ✅ JSON-based data persistence
- ✅ RESTful API design
- ✅ CORS enabled for frontend integration

## API Endpoints

### Records

- `POST /api/records` - Create a new record with image
- `GET /api/records` - Get all records
- `GET /api/records/:id` - Get a single record
- `PUT /api/records/:id` - Update a record
- `DELETE /api/records/:id` - Delete a record

### Health Check

- `GET /api/health` - Check if API is running

## Installation

```bash
npm install
```

## Running the Server

Development mode (with auto-restart):
```bash
npm run dev
```

Production mode:
```bash
npm start
```

The server will run on `http://localhost:5000` by default.

## Project Structure

```
Backend/
├── controllers/       # Request handlers
├── routes/           # API routes
├── services/         # Business logic
├── utils/            # Utility functions
├── data/             # JSON data storage
├── uploads/          # Uploaded images
├── server.js         # Entry point
└── package.json      # Dependencies
```

## Technologies Used

- **Express.js** - Web framework
- **Multer** - File upload handling
- **UUID** - Unique ID generation
- **CORS** - Cross-origin resource sharing
