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
3. Change the `backendUrl` varible in `src/routes/+page.svelte` to `localhost:3000` to develop using your DB & server, if you are planning on using the main DB and server you can also ignore steps 1 and 5 (You wont be able to change server-side stuff)
4. In a terminal (inside the project's root) run `bun dev --open`
5. Then in another terminal at the `/server` directory run `bun run index.ts`
