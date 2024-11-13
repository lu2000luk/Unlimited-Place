<script>
// @ts-nocheck

    let { pixels = $bindable(new Array(8).fill(null).map(() => new Array(8).fill(null))), pos = $bindable({ x: 0, y: 0 }), offset = $bindable({ x: 0, y: 0 }), zone = $bindable({ x: 0, y: 0 }) } = $props();
</script>

<div class="absolute zone zone-{zone.x}_{zone.y}" 
    style="top: {pos.y + offset.y}px; left: {pos.x + offset.x}px; width: 400px; height: 400px;" 
    id="zone-{zone.x}-{zone.y}"
    data-x={zone.x}
    data-y={zone.y}
    >

    <div class="grid grid-cols-8 grid-rows-8">
        {#each pixels as pixel_row, rowIndex}
            {#each pixel_row as pixel, colIndex}
                {#if pixel}
                    <div    class="pixel absolute"
                            id="pixel-{rowIndex + 8 * zone.x}-{colIndex + 8 * zone.y}"
                            style=" background-color: #{pixel};
                                    top: {((colIndex) * 50)}px;
                                    left: {((rowIndex) * 50)}px;
                    "></div>
                {/if}
            {/each}
        {/each}
    </div>
    
</div>
