<script>
	// @ts-nocheck
	import { browser } from '$app/environment';
	import { io } from 'socket.io-client';
	import { get } from 'svelte/store';
	import Zone from '$lib/zone.svelte';
	import { onMount, onDestroy, mount, unmount } from 'svelte';
	import { writable } from 'svelte/store';
	import { parse } from 'svelte/compiler';
	import { on } from 'svelte/events';

	const backendUrl = 'http://localhost:3000';

	let viewportWidth = 0;
	let viewportHeight = 0;

	if (browser) {
		viewportWidth = window.innerWidth;
		viewportHeight = window.innerHeight;
	};

    let pos = $state({ x: 0, y: 0 });
	let canvas = $state();
	let zones = {};
    let zonePixels = $state({});

	onMount(async () => {
		const socket = io(backendUrl);

		socket.on('connect', () => {
			console.log('Connected to server');
		});

		socket.on('disconnect', () => {
			console.log('Disconnected from server');
		});

		socket.on('message', (message) => {
			console.log('Message from server: ', message);
		});

		socket.on('error', (error) => {
			console.error('Error from server: ', error);
		});

		socket.on('connect_error', (error) => {
			console.error('Connection error: ', error);
		});

		socket.on('connect_timeout', (timeout) => {
			console.error('Connection timeout: ', timeout);
		});

		socket.on('reconnect', (attemptNumber) => {
			console.log('Reconnected to server. Attempt number: ', attemptNumber);
		});

		socket.on('reconnect_attempt', (attemptNumber) => {
			console.log('Reconnect attempt number: ', attemptNumber);
		});

		socket.on('reconnecting', (attemptNumber) => {
			console.log('Reconnecting to server. Attempt number: ', attemptNumber);
		});

		socket.on('reconnect_error', (error) => {
			console.error('Reconnect error: ', error);
		});

		socket.on('reconnect_failed', () => {
			console.error('Reconnect failed');
		});

		socket.on('ping', () => {
			console.log('Ping from server');
		});

		function getEmptyArea() {
			return new Array(8).fill(null).map(() => new Array(8).fill(null));
		}

		async function addArea({ zoneX, zoneY }) {
			if (!browser) {
				return;
			};

            if (zones[`${zoneX}_${zoneY}`]) {
                return;
            }

            socket.emit('get_area', { x: zoneX, y: zoneY, zone: true });

            let resolvePromise;
            let solved = false;

            let pixel = "unset";

            zones[`${zoneX}_${zoneY}`] = true;

            socket.once('area_'+zoneX+"_"+zoneY, (zone) => {
                zonePixels[`${zoneX}_${zoneY}`] = zone.area;
                pixel = zone.area;
                try {
                    resolvePromise();
                } catch {};
                solved = true;
            });

            await new Promise((resolve, reject) => {
                    resolvePromise = resolve;
                    setTimeout(() => {
                        if (!solved) {
                            console.error('Zone data not received in time.');
                            pixel = getEmptyArea();
                            zonePixels[`${zoneX}_${zoneY}`] = pixel;
                            resolve();
                        }
                    }, 2800);
            });

			let offset = { x: zoneX * 400, y: zoneY * 400 };

			let zone = mount(Zone, {
				target: canvas,
				props: {
					pixels: zonePixels[`${zoneX}_${zoneY}`],
					offset,
					pos: pos,
					zone: { x: zoneX, y: zoneY }
				}
			});

			zones[`${zoneX}_${zoneY}`] = zone;
		}

		async function deleteArea({ zoneX, zoneY }) {
			if (!browser) {
				return;
			}

			let zone = zones[`${zoneX}_${zoneY}`];

            if (zone === true) {
                console.error("Zone ", { x: zoneX, y: zoneY }, " has not been created yet...");
                return;
            }

			if (zone) {
				unmount(zone);
				delete zones[`${zoneX}_${zoneY}`];
                delete zonePixels[`${zoneX}_${zoneY}`];
			}
		}

		let createdZones = 0;

		async function checkAndManageZones() {
			if (!browser) return;

			// Calculate visible zone ranges based on position
			let minZoneX = Math.floor((pos.x * -1 - viewportWidth) / 400) - 1;
			let maxZoneX = Math.ceil((pos.x * -1 + viewportWidth) / 400) + 1;
			let minZoneY = Math.floor((pos.y * -1 - viewportHeight) / 400) - 1;
			let maxZoneY = Math.ceil((pos.y * -1 + viewportHeight) / 400) + 1;

			// Remove zones that are out of view
			Object.keys(zones).forEach(async (key) => {
				const [zoneX, zoneY] = key.split('_').map(Number);
				if (zoneX < minZoneX || zoneX > maxZoneX || zoneY < minZoneY || zoneY > maxZoneY) {
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

		checkAndManageZones();

		$effect(() => {
			if (pos.x || pos.y) {
				checkAndManageZones();
			}
		});

        onDestroy(() => {
            socket.disconnect();
            socket.offAny();
        });
	});

	async function getStatus() {
		if (!browser) {
			return;
		}

		const start = Date.now();

		let status = await fetch(backendUrl);
		let json = await status.json();

		json.requestTime = Date.now() - start;

		console.log(
			'Status: ',
			json.status +
				' - DB Latency: ' +
				json.latency +
				' - Client Latency: ' +
				json.requestTime +
				'ms'
		);
		alert(
			'Server Status: ' +
				json.status +
				' - Server-DB Latency: ' +
				json.latency +
				' - Client Latency: ' +
				json.requestTime +
				'ms'
		);
	}

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
</script>

<div class="toolbar z-50 flex items-center gap-2 rounded-lg bg-gray-800 p-8 text-white">
	<button
		class="status-btn dev-only rounded-lg bg-gray-500 p-3 text-white transition-all hover:bg-gray-600"
		onclick={getStatus}>Get status</button
	>
	<div>
		<p>Grid position: {JSON.stringify(pos)}</p>
	</div>
</div>

<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<div
	class="canvas z-10 h-full w-full"
	role="application"
	bind:this={canvas}
	{onmousedown}
	{onmouseup}
	onmousemove={(event) => {
		if (event.clientX === 0 && event.clientY === 0) {
			return;
		}

		if (!mouseDown) {
			return;
		}

		pos.x = pos.x + event.movementX;
		pos.y = pos.y + event.movementY;
	}}
></div>

<style>
	.toolbar {
		margin: 25px;
		width: calc(100% - 50px);
		position: fixed;
	}
</style>
