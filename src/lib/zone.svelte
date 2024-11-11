<script>
// @ts-nocheck

    let { pixels = $bindable(new Array(8).fill(null).map(() => new Array(8).fill(null))), pos = $bindable({ x: 0, y: 0 }), offset = $bindable({ x: 0, y: 0 }), zone = $bindable({ x: 0, y: 0 }) } = $props();
</script>

<div class="absolute zone zone-{zone.x}_{zone.y}" 
    style="top: {pos.y + offset.y}px; left: {pos.x + offset.x}px; width: 400px; height: 400px; border: 1px solid black;" 
    id="zone-{zone.x}-{zone.y}"
    data-x={zone.x}
    data-y={zone.y}
    >

    <div class="grid grid-cols-8 grid-rows-8">
        {#each pixels as pixel_row}
            {#each pixel_row as pixel}
                {#if pixel}
                    <div class="pixel" 
                        style="background-color: {pixel};">
                    </div>
                {/if}
            {/each}
        {/each}
    </div>
    
</div>
