# Instructions for running the code locally

## Prerequisites

1. Docker
2. Node.js
3. npm

## Setup

1. Clone the repository

```bash
git clone https://github.com/DevKrishnasai/realtime-chat-app.git
```

2. run the docker-compose file

```bash
docker compose up -d
```

## frontend setup

1. installing client dependencies

```bash
cd client
npm i --legacy-peer-deps
```

2. run the client

```bash
npm start
```

## backend setup

1. installing server dependencies

```bash
cd server
npm i --legacy-peer-deps
```

2. rename the .env.example file to .env and add the required environment variables

3. run the server

```bash
npm run dev
```
