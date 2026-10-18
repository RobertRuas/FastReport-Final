<script>
  let { name, size = 24, stroke = 2, fill = false } = $props();
  const P = {
    back: 'M15 4l-8 8 8 8',
    chevron: 'M9 5l7 7-7 7',
    plus: 'M12 5v14M5 12h14',
    gear: 'M12 15.5a3.5 3.5 0 100-7 3.5 3.5 0 000 7zM19.4 13.5l1.6 1.2-2 3.4-1.9-.7a7.6 7.6 0 01-2.3 1.3L14.5 21h-4l-.3-2.3a7.6 7.6 0 01-2.3-1.3l-1.9.7-2-3.4 1.6-1.2a7.7 7.7 0 010-3L4 9.3l2-3.4 1.9.7a7.6 7.6 0 012.3-1.3L10.5 3h4l.3 2.3a7.6 7.6 0 012.3 1.3l1.9-.7 2 3.4-1.6 1.2a7.7 7.7 0 010 3z',
    more: 'M12 21a9 9 0 100-18 9 9 0 000 18zM7.5 12h.01M12 12h.01M16.5 12h.01',
    inbox: 'M3 13l2.5-8h13L21 13v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM3 13h5l1.5 3h5L16 13h5',
    review: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z',
    delivery: 'M9 11l3 3 8-8M20 12v7a1 1 0 01-1 1H5a1 1 0 01-1-1V5a1 1 0 011-1h10',
    close: 'M6 6l12 12M18 6L6 18',
    undo: 'M9 14L4 9l5-5M4 9h11a5 5 0 010 10h-3',
    rotate: 'M20 11a8 8 0 10-2.3 6.3M20 4v7h-7',
    flip: 'M12 3v18M8 7L3 17h5V7zM16 7l5 10h-5V7z',
    crop: 'M6 2v16h16M2 6h16v16',
    trash: 'M4 7h16M10 11v6M14 11v6M5 7l1 13h12l1-13M9 7V4h6v3',
    share: 'M12 15V3M8 7l4-4 4 4M5 11v9h14v-9',
    photos: 'M4 6h12a1 1 0 011 1v12a1 1 0 01-1 1H4a1 1 0 01-1-1V7a1 1 0 011-1zM7 3h13a1 1 0 011 1v13M3 17l4-4 3 3 3-3 4 4',
    camera: 'M4 8h3l2-3h6l2 3h3a1 1 0 011 1v10a1 1 0 01-1 1H4a1 1 0 01-1-1V9a1 1 0 011-1zM12 17a4 4 0 100-8 4 4 0 000 8z',
    check: 'M5 12.5l4.5 4.5L19 7.5',
    box: 'M3 5h18v4H3zM5 9v10h14V9M10 13h4',
    skip: 'M5 5l7 7-7 7M13 5l7 7-7 7',
    prev: 'M15 5l-7 7 7 7',
    shield: 'M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3zM8.5 12l2.5 2.5 4.5-5',
    globe: 'M12 21a9 9 0 100-18 9 9 0 000 18zM3 12h18M12 3c2.5 2.5 3.5 5.5 3.5 9s-1 6.5-3.5 9c-2.5-2.5-3.5-5.5-3.5-9s1-6.5 3.5-9z',
    info: 'M12 21a9 9 0 100-18 9 9 0 000 18zM12 11v6M12 7.5h.01',
    grid: 'M3 3h5v5H3zM10 3h4v5h-4zM16 3h5v5h-5zM3 10h5v4H3zM10 10h4v4h-4zM16 10h5v4h-5zM3 16h5v5H3zM10 16h4v5h-4zM16 16h5v5h-5z',
    image: 'M4 4h16v16H4zM4 16l5-5 4 4 2-2 5 5M15 9h.01',
    refresh: 'M4 12a8 8 0 0114-5.3M20 4v5h-5M20 12a8 8 0 01-14 5.3M4 20v-5h5'
  };
</script>

<svg style:width="{size / 16}rem" style:height="{size / 16}rem" style:flex="none" viewBox="0 0 24 24" fill={fill ? 'currentColor' : 'none'} stroke="currentColor" stroke-width={stroke} stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d={P[name]} /></svg>
