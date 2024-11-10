<script>
    // @ts-nocheck
    import { browser } from "$app/environment";
    import { io } from "socket.io-client";
    import { get } from "svelte/store";
    import Zone from "$lib/zone.svelte";
    import { onMount, onDestroy, mount, unmount } from 'svelte';
    import { writable } from 'svelte/store';
	import { parse } from "svelte/compiler";

    const backendUrl = "http://localhost:3000";

    let viewportWidth = 0;
    let viewportHeight = 0;

    if (browser) {
        viewportWidth = window.innerWidth;
        viewportHeight = window.innerHeight;
    }

    $effect(() => {
        const socket = io(backendUrl);

        socket.on("connect", () => {
            console.log("Connected to server");
        });

        socket.on("disconnect", () => {
            console.log("Disconnected from server");
        });

        socket.on("message", (message) => {
            console.log("Message from server: ", message);
        });

        socket.on("error", (error) => {
            console.error("Error from server: ", error);
        });

        socket.on("connect_error", (error) => {
            console.error("Connection error: ", error);
        });

        socket.on("connect_timeout", (timeout) => {
            console.error("Connection timeout: ", timeout);
        });

        socket.on("reconnect", (attemptNumber) => {
            console.log("Reconnected to server. Attempt number: ", attemptNumber);
        });

        socket.on("reconnect_attempt", (attemptNumber) => {
            console.log("Reconnect attempt number: ", attemptNumber);
        });

        socket.on("reconnecting", (attemptNumber) => {
            console.log("Reconnecting to server. Attempt number: ", attemptNumber);
        });

        socket.on("reconnect_error", (error) => {
            console.error("Reconnect error: ", error);
        });

        socket.on("reconnect_failed", () => {
            console.error("Reconnect failed");
        });

        socket.on("ping", () => {
            console.log("Ping from server");
        });

        return () => {
            socket.disconnect();
            socket.offAny();
        };
    });
    

    async function getStatus() {
        if (!browser) {
            return;
        }

        const start = Date.now();

        let status = await fetch(backendUrl);
        let json = await status.json();

        json.requestTime = Date.now() - start;

        console.log("Status: ", json.status + " - DB Latency: " + json.latency + " - Client Latency: " + json.requestTime + "ms");
        alert("Server Status: " + json.status + " - Server-DB Latency: " + json.latency + " - Client Latency: " + json.requestTime + "ms");
    }

    function getEmptyArea() {
        return new Array(8).fill(null).map(() => new Array(8).fill(null));
    }

    let pos = $state({ x: 0, y: 0 });
    let canvas = $state();
    let zones = {};

    function addArea({ zoneX, zoneY }) {
        if (!browser) {
            return;
        }

        console.log("Adding zone: ", zoneX, zoneY);

        let offset = { x: zoneX * 400, y: zoneY * 400 };

        let zone = mount(Zone, {
            target: canvas,
            props: {
                pixels: getEmptyArea(),
                offset,
                pos: pos,
                zone: { x: zoneX, y: zoneY }
            },
        });

        zones[`${zoneX}_${zoneY}`] = zone;
    }

    function deleteArea({ zoneX, zoneY }) {
        if (!browser) {
            return;
        }

        console.log("Deleting zone: ", zoneX, zoneY);

        let zone = zones[`${zoneX}_${zoneY}`];

        if (zone) {
            unmount(zone);
            delete zones[`${zoneX}_${zoneY}`];
        }
    }

    let createdZones = 0;

    function checkAndManageZones() {
        if (!browser) return;

        // Calculate visible zone ranges based on position
        let minZoneX = Math.floor(((pos.x * -1) - viewportWidth) / 400) - 1;
        let maxZoneX = Math.ceil(((pos.x * -1) + viewportWidth) / 400) + 1;
        let minZoneY = Math.floor(((pos.y * -1) - viewportHeight) / 400) - 1;
        let maxZoneY = Math.ceil(((pos.y * -1) + viewportHeight) / 400) + 1;

        console.clear();

        console.log("Visible zones: ", minZoneX, maxZoneX, minZoneY, maxZoneY);
        console.log("Positions: ", pos.x, pos.y);
        console.log("Viewport: ", viewportWidth, viewportHeight);
        console.log("Created zones: ", createdZones);
        console.log("Zones: ", zones);

        // Log every calculation step
        console.log("Min Zone X: ", pos.x, " - ", viewportWidth, " = ", pos.x - viewportWidth, " / 400 = ", (pos.x - viewportWidth) / 400, " - ", minZoneX);
        console.log("Max Zone X: ", pos.x, " + ", viewportWidth, " = ", pos.x + viewportWidth, " / 400 = ", (pos.x + viewportWidth) / 400, " - ", maxZoneX);
        console.log("Min Zone Y: ", pos.y, " - ", viewportHeight, " = ", pos.y - viewportHeight, " / 400 = ", (pos.y - viewportHeight) / 400, " - ", minZoneY);
        console.log("Max Zone Y: ", pos.y, " + ", viewportHeight, " = ", pos.y + viewportHeight, " / 400 = ", (pos.y + viewportHeight) / 400, " - ", maxZoneY);

        console.log("Max zone X > Min zone X? ", maxZoneX > minZoneX);
        console.log("Max zone Y > Min zone Y? ", maxZoneY > minZoneY);

        // Remove zones that are out of view
        Object.keys(zones).forEach(key => {
            const [zoneX, zoneY] = key.split('_').map(Number);
            if (zoneX < minZoneX || zoneX > maxZoneX || 
                zoneY < minZoneY || zoneY > maxZoneY) {
                deleteArea({ zoneX, zoneY });
                createdZones--;
            }
        });

        // Create new zones in visible range
        for (let x = minZoneX; x <= maxZoneX; x++) {
            for (let y = minZoneY; y <= maxZoneY; y++) {
                if (!zones[`${x}_${y}`]) {
                    createdZones++;
                    addArea({ zoneX: x, zoneY: y });
                }
            }
        }
    }

    $effect(() => {
        checkAndManageZones();
    });

    $effect(() => {
        if (pos.x || pos.y) {
            checkAndManageZones();
        }
    });

    //$effect(() => {
    //    window.onscroll = (event) => {
    //        // Lower the scale of the .canvas
    //        console.log(event);
    //        let scale = 1 - window.scrollY / 100;
    //        scale = Math.max(0.2, Math.min(2.0, scale));
    //        canvas.style.transform = `scale(${scale})`;
    //        checkAndManageZones();
    //    };
    //    return () => {
    //        window.onscroll = null;
    //    };
    //});

    let mouseDown = false;

    function onmousedown(event) {
        mouseDown = true;
    }

    function onmouseup(event) {
        mouseDown = false;
    }

    let mousePosition = $state({ x: 0, y: 0 });
    let hoveringOnZone = $state({ x: 0, y: 0 });
    let viewport = $state({ width: 0, height: 0 });
    if (browser) {
        viewport = { width: viewportWidth, height: viewportHeight };
    }
</script>

<style>
    .toolbar {
        margin: 25px;
        width: calc(100% - 50px);
        position: fixed;
    }
</style>

<div class="toolbar rounded-lg bg-gray-800 text-white p-8 z-50 flex items-center gap-2">
    <button class="rounded-lg bg-gray-500 status-btn p-3 hover:bg-gray-600 transition-all text-white dev-only" onclick={getStatus}>Get status</button>
    <button class="rounded-lg bg-gray-500 status-btn p-3 hover:bg-gray-600 transition-all text-white dev-only" onclick={checkAndManageZones}>Check zones</button>
    <button class="rounded-lg bg-gray-500 status-btn p-3 hover:bg-gray-600 transition-all text-white dev-only" onclick={() => (addArea({
        zoneX: parseInt(prompt("Enter zone X: ", 0)),
        zoneY: parseInt(prompt("Enter zone Y: ", 0))
    }))}>Add area</button>
    <div>
        <p>Grid position: {JSON.stringify(pos)}</p>
        <p>Mouse position: {JSON.stringify(mousePosition)}</p>
        <p>Hovering on zone: {JSON.stringify(hoveringOnZone)}</p>
        <p>Viewport: {JSON.stringify(viewport)}</p>
    </div>
</div>

<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<div class="canvas z-10 w-full h-full" role="application" bind:this={canvas} {onmousedown} {onmouseup} onmousemove={(event) => {
    mousePosition.x = event.clientX;
    mousePosition.y = event.clientY;

    if (event.target.classList.contains("zone")) {
        let zone = event.target;
        let zoneX = parseInt(zone.dataset.x);
        let zoneY = parseInt(zone.dataset.y);

        hoveringOnZone.x = zoneX;
        hoveringOnZone.y = zoneY;
    } else {
        hoveringOnZone.x = 0;
        hoveringOnZone.y = 0;
    }

    if (event.clientX === 0 && event.clientY === 0) {
        return;
    }

    if (!mouseDown) {
        return;
    }

    pos.x = pos.x + event.movementX;
    pos.y = pos.y + event.movementY;
}}>
</div>