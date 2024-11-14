/* eslint-disable prefer-const */
/* eslint-disable no-compare-neg-zero */
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
    url: 'redis://localhost:32770'
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
        try {
            let { x, y, zone } = data;

            if (!zone) {
                zone = true;
                x = Math.floor(x / 8);
                y = Math.floor(y / 8);
            }

            let manipulatedX = false;
            let manipulatedY = false;

            if (x === -1) {x = "-1Fix"; manipulatedX = true};
            if (y === -1) {y = "-1Fix"; manipulatedY = true};

            const key = `area:${x}:${y}`;

            const area = await client.get(key);

            if (manipulatedX) x = -1;
            if (manipulatedY) y = -1;

            socket.join(`area_${x}_${y}`);

            if (area) {
                socket.emit('area_' + x + "_" + y, { x, y, area: JSON.parse(area) });
                console.log(x," _ ",y,' area sent to ', socket.id);
                return;
            } else {
                const area = new Array(8).fill(null).map(() => new Array(8).fill(null));

                await client.set(key, JSON.stringify(area));

                socket.emit('area_' + x + "_" + y, { x, y, area });
            }
        } catch (e) {
            socket.emit('error', 'Invalid data');
            return;
        }
        
    });

    socket.on('set_pixel', async (data) => {
        try {
            const { x, y, color, zoneX, zoneY } = data;

            // Make sure the color is a valid hex color without a # in front and can have uppercase or lowercase letters
            if (!color.match(/^[0-9a-fA-F]{6}$/)) {
                socket.emit('error', 'Invalid color, make sure it dosent have a # in front and is a valid hex color (uppercase or lowercase letters). Color input: ' + color);
                return;
            }

            // Handle negative coordinates for area calculation
            let areaX = zoneX;
            let areaY = zoneY;

            let manipulatedX = false;
            let manipulatedY = false;

            if (areaX === -1) {
                manipulatedX = true;
            }

            if (areaY === -1) {
                manipulatedY = true;
            };

            let renderAreaX = areaX;
            let renderAreaY = areaY

            if (areaX < 0 && x !== -8 && x !== 0) renderAreaX++;
            if (areaY < 0 && y !== -8 && y !== 0) renderAreaY++;

            let keyAreaX = areaX;
            let keyAreaY = areaY;
            
            if (manipulatedX) keyAreaX = "-1Fix";
            if (manipulatedY) keyAreaY = "-1Fix";
            const areaKey = `area:${keyAreaX}:${keyAreaY}`;

            const area = JSON.parse(await client.get(areaKey));

            // Handle negative coordinates for pixel position within area
            const pixelX = ((x % 8) + 8) % 8;
            const pixelY = ((y % 8) + 8) % 8;

            area[pixelX][pixelY] = color;

            await client.set(areaKey, JSON.stringify(area));

            console.log('Pixel set at', x, y, 'with color', color, 'in area', areaX, areaY);

            io.to(`area_${areaX}_${areaY}`).emit('pixel_updated', { x: x + renderAreaX * 8, y: y + renderAreaY * 8, color, zoneX, zoneY });

            socket.emit("debug", { x, y, color, areaX, areaY, pixelX, pixelY, area, areaKey, zoneX, zoneY, manipulatedX, manipulatedY, keyAreaX, keyAreaY });
        } catch (e) {
            socket.emit('error', 'Failed to set pixel: ' + e + " | Data: " + JSON.stringify(data));
            console.error(e);
        }
    });

    socket.on('leave_area', (data) => {
        try {
            let { x, y, zone } = data;

            if (!zone) {
                zone = true;
                x = Math.floor(x / 8);
                y = Math.floor(y / 8);
            }

            socket.leave(`area_${x}_${y}`);
        } catch (e) {
            socket.emit('error', 'Failed to leave area');
        }
    });

    socket.on('join_area', (data) => {
        try {
            let { x, y, zone } = data;

            if (!zone) {
                zone = true;
                x = Math.floor(x / 8);
                y = Math.floor(y / 8);
            }

            socket.join(`area_${x}_${y}`);

            console.log("Making ", socket.id, " join area ", x, y);
        } catch (e) {
            socket.emit('error', 'Failed to join area');
        }
    });
});

client.on('error', err => console.log('Redis Client Error', err));

server.listen(3000, async () => {
    console.log('Server running at http://localhost:3000');
});