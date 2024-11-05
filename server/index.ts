/* eslint-disable @typescript-eslint/no-unused-vars */
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
//@ts-nocheck

import express from 'express';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { Server } from 'socket.io';
import { stat } from 'node:fs';
import { createClient } from 'redis';
import cors from 'cors';

const app = express();
const server = createServer(app);
const io = new Server(server, {
    cors: {
      origin: "*",
    }
  });
const client = createClient({
    url: 'redis://localhost:32768'
});

app.use(cors());

await client.connect();

app.get('/', async (req, res) => {
    const start = Date.now();
    await client.ping()

    res.json({ status: 'online', latency: Date.now() - start + 'ms' });
});

io.on('connection', (socket) => {
    console.log('A user connected');

    socket.on('disconnect', () => {
        console.log('User disconnected');
    });

    socket.on('get_area', async (data) => {
        let { x, y, zone } = data;

        if (!zone) {
            zone = true;
            x = Math.floor(x / 8);
            y = Math.floor(y / 8);
        }

        const key = `area:${x}:${y}`;

        const area = await client.get(key);

        socket.join(`area_${x}_${y}`);

        if (area) {
            socket.emit('area', { x, y, area: JSON.parse(area) });
            return;
        } else {
            const area = new Array(8).fill(null).map(() => new Array(8).fill(null));

            await client.set(key, JSON.stringify(area));

            socket.emit('area', { x, y, area });
        }
    });

    socket.on('set_pixel', async (data) => {
        const { x, y, color } = data;

        const areaKey = `area:${Math.floor(x / 8)}:${Math.floor(y / 8)}`;

        const area = JSON.parse(await client.get(areaKey));

        if (!area) {
            socket.emit('error', 'Zone not found, render it first');
            return;
        }

        area[x % 8][y % 8] = color;

        await client.set(areaKey, JSON.stringify(area));

        io.to(`area_${Math.floor(x / 8)}_${Math.floor(y / 8)}`).emit('pixel_updated', { x, y, color });
    });

    socket.on('leave_area', (data) => {
        let { x, y, zone } = data;

        if (!zone) {
            zone = true;
            x = Math.floor(x / 8);
            y = Math.floor(y / 8);
        }

        socket.leave(`area_${x}_${y}`);
    });

    socket.on('join_area', (data) => {
        let { x, y, zone } = data;

        if (!zone) {
            zone = true;
            x = Math.floor(x / 8);
            y = Math.floor(y / 8);
        }

        socket.join(`area_${x}_${y}`);
    });
});

client.on('error', err => console.log('Redis Client Error', err));

server.listen(3000, async () => {
    console.log('Server running at http://localhost:3000');
});