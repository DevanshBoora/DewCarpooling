# DewCarpooling Backend

This directory contains the Node.js, Express, and MongoDB backend for the DewCarpooling mobile app.

## Setup and Installation

### Prerequisites

- Node.js (v14 or later)
- MongoDB (local instance or a MongoDB Atlas cluster)

### Steps

1.  **Navigate to the backend directory:**

    ```bash
    cd backend
    ```

2.  **Install dependencies:**

    ```bash
    npm install
    ```

3.  **Configure environment variables:**

    Create a `.env` file in the `backend` directory and add your MongoDB connection string:

    ```
    MONGO_URI=your_mongodb_connection_string
    PORT=5001
    ```

4.  **Run the database seed script (optional):**

    To populate the database with sample data, run the following command:

    ```bash
    npx ts-node src/scripts/seed.ts
    ```

5.  **Start the server:**

    To start the development server with automatic reloading, run:

    ```bash
    npx nodemon src/server.ts
    ```

    The server will be running at `http://localhost:5001`.

## API Endpoints

### Users

-   `GET /api/users/:id`: Fetch user profile data.
-   `PUT /api/users/:id`: Update user profile.

### Communities

-   `GET /api/communities`: List all communities.
-   `POST /api/communities`: Create a new community.
-   `GET /api/communities/:id/places`: Get all places within a community.

### Places

-   `GET /api/places?community=:id`: List places for a specific community.

### Rides

-   `GET /api/rides?community=:id`: List all rides in a community.
-   `POST /api/rides`: Create a new ride.
-   `GET /api/rides/:id`: Fetch details for a specific ride.
-   `PUT /api/rides/:id`: Update a ride (e.g., change status).
-   `POST /api/rides/:id/join`: Add a user to a ride.
