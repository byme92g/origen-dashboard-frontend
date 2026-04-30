<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import { BarChart, PieChart } from 'echarts/charts';
  import { GridComponent, LegendComponent, TooltipComponent } from 'echarts/components';
  import { init, use, type EChartsType } from 'echarts/core';
  import { CanvasRenderer } from 'echarts/renderers';
  import type { EChartsOption } from 'echarts';

  use([BarChart, PieChart, GridComponent, LegendComponent, TooltipComponent, CanvasRenderer]);

  export let option: EChartsOption;
  export let height = '280px';

  let el: HTMLDivElement;
  let chart: EChartsType | null = null;
  let ro: ResizeObserver | null = null;

  onMount(() => {
    chart = init(el, undefined, { renderer: 'canvas' });
    chart.setOption(option, true);
    ro = new ResizeObserver(() => chart?.resize());
    ro.observe(el);
  });

  $: if (chart && option) {
    chart.setOption(option, true);
  }

  onDestroy(() => {
    ro?.disconnect();
    chart?.dispose();
  });
</script>

<div bind:this={el} class="echart" style:height></div>

<style>
  .echart {
    width: 100%;
    min-width: 0;
  }
</style>
