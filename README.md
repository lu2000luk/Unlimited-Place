# Unlimited r/Place

This my recreation of r/Place but it has virtually unlimited slots.

## The DB and the Server

DB: Redis on localhost port 32770 (Docker Hub: redis/redis-stack-server)
Server: *Just* a websocket server

## Develop locally

### Requires
- [Docker](https://www.docker.com/) (or Docker Desktop)
- [Bun](https://bun.sh/)

### Run it
1. Host a local redis stack docker container on port 32770
2. Then install dependencies using the command `bun i` in the folders `server/` and `/`
3. In a terminal (inside the project's root) run `bun dev --open`
4. Then in another terminal at the `/server` directory run `bun run index.ts`
