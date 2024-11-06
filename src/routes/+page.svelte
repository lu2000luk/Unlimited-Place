<script>
    // @ts-nocheck
    import { browser } from "$app/environment";
    import { io } from "socket.io-client";
    import { get } from "svelte/store";
    import Zone from "$lib/zone.svelte";
    import { onMount, onDestroy, mount } from 'svelte';
    import { writable } from 'svelte/store';

    const backendUrl = "http://localhost:3000";

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

    let pos = $state({ x: 50, y: 50 });
    let canvas = $state();
    let zones = $state({});

    function addArea({ zoneX, zoneY }) {
        if (!browser) {
            return;
        }

        let offset = { x: zoneX * 400, y: zoneY * 400 };

        let zone = mount(Zone, {
            target: canvas,
            props: {
                pixels: getEmptyArea(),
                offset,
                pos,
                zone: { x: zoneX, y: zoneY }
            },
        });

        zones[`${zoneX}_${zoneY}`] = zone;
    }

    function deleteArea({ zoneX, zoneY }) {
        if (!browser) {
            return;
        }

        let zone = zones[`${zoneX}_${zoneY}`];
        if (zone) {
            zone.$destroy();
            delete zones[`${zoneX}_${zoneY}`];
        }
    }

    onMount(() => {
        addArea({ zoneX: 2, zoneY: 1 });
        addArea({ zoneX: 2, zoneY: 2 });
    });

    let createdZones = 0;

    function checkAndAddNewZones() {
        if (!browser) return;

        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        
        // Calculate visible zone ranges based on position
        const minZoneX = Math.floor((pos.x - viewportWidth) / 400);
        const maxZoneX = Math.ceil((pos.x + viewportWidth) / 400);
        const minZoneY = Math.floor((pos.y - viewportHeight) / 400);
        const maxZoneY = Math.ceil((pos.y + viewportHeight) / 400);

        // Create new zones in visible range
        for (let x = minZoneX; x <= maxZoneX; x++) {
            for (let y = minZoneY; y <= maxZoneY; y++) {
                const zoneElement = canvas?.querySelector(`#zone-${x}-${y}`);
                if (!zoneElement) {
                    createdZones++;
                    addArea({ zoneX: x, zoneY: y });
                }
            }
        }
    }

    $effect(() => {
        checkAndAddNewZones();
    });

    $effect(() => {
        if (pos.x || pos.y) {
            checkAndAddNewZones();
        }
    });
</script>

<style>
    .toolbar {
        margin: 25px;
        width: calc(100% - 50px);
        position: fixed;
    }
</style>

<div class="toolbar rounded-lg bg-gray-800 text-white p-8 z-50">
    <button class="rounded-lg bg-gray-500 status-btn p-3 hover:bg-gray-600 transition-all text-white dev-only" onclick={getStatus}>Get status</button>
</div>

<div class="canvas z-10" role="application" bind:this={canvas} ondrag={(event) => {
    if (event.clientX === 0 && event.clientY === 0) {
        return;
    }

    console.log(event)

    pos.x = pos.x + event.offsetX;
    pos.y = pos.y + event.offsetY;
    console.log("X: ", pos.x, "Y: ", pos.y);
}}>
    <Zone pixels={getEmptyArea()} pos={pos} zone={{ x: 0, y: 0 }} />
    <Zone pixels={getEmptyArea()} pos={pos} offset={{x: 400, y: 0}} zone={{ x: 1, y: 0 }} />
    <!-- New zones here -->
    
</div>