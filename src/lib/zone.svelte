<script>
// @ts-nocheck

    let { pixels = $bindable(new Array(8).fill(null).map(() => new Array(8).fill(null))), pos = $bindable({ x: 0, y: 0 }), offset = { x: 0, y: 0 }, zone = { x: 0, y: 0 } } = $props();
</script>

<div class="absolute zone grid grid-cols-8 grid-rows-8" 
    style="top: {pos.y + offset.y}px; left: {pos.x + offset.x}px; width: 400px; height: 400px; border: 1px solid black;" 
    id="zone-{zone.x}-{zone.y}">
    {#each pixels.flat() as pixel}
        {#if pixel !== null}
            <div class="pixel" 
                style="background-color: {pixel};" 
                data-zone-x={zone.x} 
                data-zone-y={zone.y}>
            </div>
        {/if}
    {/each}
</div>
