<script>
// @ts-nocheck

    let { pixels = $bindable(new Array(8).fill(null).map(() => new Array(8).fill(null))), pos = $bindable({ x: 0, y: 0 }) } = $props();
</script>

<div class="absolute" style="top: {pos.y}px; left: {pos.x}px;">
    <div class="zone grid grid-cols-8 grid-rows-8">
        {#each pixels as row}
            {#each row as pixel}
                <div class="pixel" style="color: {pixel};"></div>
            {/each}
        {/each}
    </div>
</div>
