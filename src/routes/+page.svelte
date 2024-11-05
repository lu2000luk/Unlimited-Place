<script>
	import { browser } from "$app/environment";
    import { io } from "socket.io-client";
	import { get } from "svelte/store";
    import Zone from "$lib/zone.svelte";

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

    let pos = $state({ x: 0, y: 0 });


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

<div class="canvas z-10" role="application" ondrag={(event) => {
    if (event.clientX === 0 && event.clientY === 0) {
        return;
    }

    pos.x = event.clientX;
    pos.y = event.clientY;
    console.log("X: ", pos.x, "Y: ", pos.y);
}}>
    <Zone pixels={getEmptyArea()} bind:pos={pos} />
</div>