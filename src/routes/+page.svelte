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
	import { env } from '$env/dynamic/public'

	const backendUrl = env.BACKEND_URL || "http://localhost:3000/";

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

    let clickFunctions = [];

    let cursor = $state();

    let selectedColor = $state("#000000");

	onMount(async () => {
		const socket = io(backendUrl);

		socket.on('connect', () => {
			console.log('Connected to server');

			Object.keys(zones).forEach((zone) => {
				socket.emit("join_area", { x: zone.split("_")[0], y: zone.split("_")[1], zone: true });
			});
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

        socket.on("pixel_updated", (data) => {
            console.log('Pixel updated at ', data);

			let { zoneX, zoneY } = data;
            let tryPixelElement = document.querySelector(`#pixel-${data.x}-${data.y}`);

            if (tryPixelElement) {
                tryPixelElement.style.backgroundColor = `#${data.color}`;
            } else {
                deleteArea({ zoneX, zoneY });
                addArea({ zoneX, zoneY });
            }
        });

		socket.on("debug", (data) => {
			console.log("Debug: ", data);
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

            console.log('Requesting zone data for ', { x: zoneX, y: zoneY });

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

            console.log('Creating zone ', { x: zoneX, y: zoneY });

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
                socket.emit('leave_area', { x: zoneX, y: zoneY, zone: true });

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

            async function setPixel() {
                // Calculate the zone and pixel where the cursor element is

                let zoneX = Math.floor((pos.x * -1 + cursor.offsetLeft) / 400);
                let zoneY = Math.floor((pos.y * -1 + cursor.offsetTop) / 400);

                let pixelX = Math.floor((pos.x * -1 + cursor.offsetLeft) % 400 / 50);
                let pixelY = Math.floor((pos.y * -1 + cursor.offsetTop) % 400 / 50);

                console.log('Cursor is at zone ', { x: zoneX, y: zoneY }, ' and pixel ', { x: pixelX, y: pixelY });

                clickFunctions = [];
                clickFunctions.push(setPixel);

                socket.emit('set_pixel', { x: pixelX, y: pixelY, color: selectedColor.replaceAll("#", ""), zoneX, zoneY });

                console.log('Pixel set at ', { x: pixelX + zoneX * 8, y: pixelY + zoneY * 8 }, ' in zone ', { x: zoneX, y: zoneY });
            }

            clickFunctions.push(setPixel);
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

            clickFunctions = [];
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
    let mouseDownSince = 0;

	function onmousedown(event) {
		mouseDown = true;
        mouseDownSince = Date.now();
	}

	function onmouseup(event) {
		mouseDown = false;
        if (Date.now() - mouseDownSince < 2000) {
            console.log('Click');
            clickFunctions.forEach((func) => func());
        }
	}
</script>

<svelte:head>
	<title>Unlimited Place</title>
	<meta name="description" content="Unlimited Place, r/Place but unlimited, the grid is infinite, there is no delay and the color rage is also infinite (limited my the RGB colors but lets say its infinite)" />
	<meta name="keywords" content="Unlimited Place" />
	<meta name="author" content="lu2000luk" />
</svelte:head>

<div class="toolbar z-50 flex items-center gap-2 rounded-lg bg-gray-800 bg-opacity-35 backdrop-blur-sm border-4 p-2" style="border-color: {selectedColor};">
    <input type="color" class="rounded w-10 h-10 p-0 m-0 outline-none" bind:value={selectedColor} />
</div>

<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<div
	class="canvas z-10 h-full w-full cursor-none"
	role="application"
	bind:this={canvas}
	{onmousedown}
	{onmouseup}
	onmousemove={(event) => {
        if (mouseDown) {
            cursor.style.display = 'none';
        }

        let gridX = Math.floor(event.clientX / 50) * 50;
        let gridY = Math.floor(event.clientY / 50) * 50;

        let plusOffsetx = gridX + pos.x % 50;
        let plusOffsety = gridY + pos.y % 50;

        cursor.style.left = plusOffsetx + 'px';
        cursor.style.top = plusOffsety + 'px';

		if (event.clientX === 0 && event.clientY === 0) {
			return;
		}

		if (!mouseDown) {
            cursor.style.display = 'block';
			return;
		}

		pos.x = pos.x + event.movementX;
		pos.y = pos.y + event.movementY;
	}}
></div>

<div class="cursor select-none pointer-events-none" bind:this={cursor}></div>

<style>
	.toolbar {
		margin: 25px;
		position: fixed;
	}
</style>
