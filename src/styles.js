export const CSS = `
.fx{
  --sans:ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,"Helvetica Neue",sans-serif;
  --mono:ui-monospace,"SF Mono",SFMono-Regular,Menlo,Consolas,monospace;
  /* Settings chrome stays dark whatever the scene is, the way a real
     preferences window would. */
  --ink:#ECECF2; --ink2:#9E9EAE; --ink3:#6E6E7E;
  --nav:#131318; --sheet:#0B0B0F; --card:#16161C;
  --line:rgba(255,255,255,.08); --line2:rgba(255,255,255,.16);
  --brand:#7C6BFF; --brandUp:#9080FF; --danger:#F0616D;
  position:fixed; inset:0; overflow:hidden; font-family:var(--sans);
  color:var(--paper); -webkit-font-smoothing:antialiased;
}
.fx *{box-sizing:border-box;}
.fx button{font-family:inherit;}

/* ── background ─────────────────────────────────────────── */
.fx-sky{position:absolute; inset:0; background:var(--sky);}
.fx-live{position:absolute; inset:0;}
.fx-live canvas{display:block; width:100%; height:100%;}
.fx-img{position:absolute; inset:0; background-size:cover; background-position:center;}
.fx-video{position:absolute; inset:0; overflow:hidden; pointer-events:none;}
.fx-video iframe{position:absolute; top:50%; left:50%; transform:translate(-50%,-50%);
  width:100vw; height:56.25vw; min-height:100vh; min-width:177.78vh; border:0;}
.fx-dim{position:absolute; inset:0; pointer-events:none;
  background:linear-gradient(to bottom, rgba(0,0,0,.34) 0%, rgba(0,0,0,0) 22%,
    rgba(0,0,0,0) 62%, rgba(0,0,0,.42) 100%);}
.fx-tint{position:absolute; inset:0; pointer-events:none; background:#000;}
.fx-yt{position:absolute; width:1px; height:1px; opacity:0; pointer-events:none; left:-9999px;}

/* ── stage ──────────────────────────────────────────────── */
.fx-stage{position:relative; z-index:1; height:100%; display:grid;
  grid-template-rows:auto 1fr auto; padding:22px 26px;}
.fx-top{display:flex; justify-content:space-between; align-items:flex-start; gap:20px;}
.fx-brand{font-size:21px; font-weight:700; letter-spacing:-.03em; opacity:.92;}
.fx-quote{max-width:min(38ch, 42vw); text-align:right; font-size:14.5px; line-height:1.5;
  opacity:.78; font-style:italic; margin:0;}
.fx-streak{font-family:var(--mono); font-size:10px; letter-spacing:.2em; text-transform:uppercase;
  opacity:.6; margin:8px 0 0; text-align:right; font-style:normal;}

.fx-mid{display:flex; flex-direction:column; align-items:center; justify-content:center;
  gap:20px; min-height:0;}

.fx-task{display:flex; align-items:center; gap:9px; max-width:min(90vw,560px);}
.fx-task b{font-size:23px; font-weight:600; letter-spacing:-.02em; overflow-wrap:anywhere;}
.fx-task > span{font-size:18px; opacity:.55;}
.fx-taskinput{font-family:inherit; font-size:23px; font-weight:600; letter-spacing:-.02em;
  text-align:center; color:var(--paper); background:transparent; outline:none; min-width:0;
  border:0; border-bottom:1.5px solid var(--accent); padding:2px 4px;}
.fx-taskinput::placeholder{color:var(--paper); opacity:.4;}
.fx-taskedit{background:none; border:0; padding:4px; cursor:pointer; color:inherit;
  opacity:.45; border-radius:7px; flex:0 0 auto;}
.fx-taskedit:hover{opacity:1;}
.fx-taskedit:focus-visible{outline:2px solid var(--paper); outline-offset:2px; opacity:1;}
.fx-taskedit svg{width:16px; height:16px; fill:none; stroke:currentColor; stroke-width:1.8;
  stroke-linecap:round; stroke-linejoin:round;}

/* ── phase pills ────────────────────────────────────────── */
.fx-pills{display:flex; gap:10px;}
.fx-pill{font-size:14px; font-weight:600; letter-spacing:-.01em; padding:11px 22px;
  border-radius:999px; cursor:pointer; color:var(--paper);
  border:1.5px solid rgba(255,255,255,.34); background:rgba(255,255,255,.06);
  backdrop-filter:blur(14px); -webkit-backdrop-filter:blur(14px);
  transition:background .16s, border-color .16s, transform .1s;}
.fx-pill:hover{background:rgba(255,255,255,.15);}
.fx-pill:active{transform:translateY(1px);}
.fx-pill[aria-pressed="true"]{background:var(--accent); border-color:transparent;
  color:var(--onAccent); box-shadow:0 8px 26px -10px var(--accent);}
.fx-pill:focus-visible{outline:2px solid var(--paper); outline-offset:3px;}

.fx-pips{display:flex; gap:7px; align-items:center; height:8px;}
.fx-pip{width:7px; height:7px; border-radius:50%; background:rgba(255,255,255,.3);}
.fx-pip.on{background:var(--paper);}

/* ── the clock ──────────────────────────────────────────── */
.fx-clockwrap{position:relative; display:flex; align-items:center; justify-content:center;}
.fx-time{font-size:clamp(72px, 16.5vw, 190px); font-weight:800; letter-spacing:-.045em;
  line-height:.94; font-variant-numeric:tabular-nums;
  text-shadow:0 6px 44px rgba(0,0,0,.4);}
.fx-time.sm{font-size:clamp(60px, 12vw, 132px);}
/* The clock doubles as the length control when the segment is idle. A
   plain div gave no sign of that, so it becomes a real button with the
   usual affordances. */
.fx-timebtn{background:none; border:0; padding:0 6px; color:inherit; cursor:pointer;
  font-family:inherit; font-weight:inherit; letter-spacing:inherit; line-height:inherit;
  border-bottom:3px solid transparent; transition:border-color .16s;}
.fx-timebtn:hover{border-bottom-color:rgba(255,255,255,.35);}
.fx-timebtn:focus-visible{outline:2px solid var(--paper); outline-offset:8px; border-radius:14px;}
.fx-timeinput{background:transparent; outline:none; padding:0 6px; width:auto; min-width:0;
  border:0; border-bottom:3px solid var(--accent); color:var(--paper);
  font-family:inherit; font-weight:800; text-align:center;}
.fx-ring{position:absolute; inset:-9% -7%; pointer-events:none; overflow:visible;}
.fx-ring circle{fill:none; stroke-linecap:round;}
.fx-ring .track{stroke:rgba(255,255,255,.16);}
.fx-ring .fill{stroke:var(--accent); filter:drop-shadow(0 0 6px var(--accent));
  transition:stroke-dasharray .3s linear;}
.fx-progress{width:min(56vw,460px); height:5px; border-radius:5px; overflow:hidden;
  background:rgba(255,255,255,.17);}
.fx-progress i{display:block; height:100%; border-radius:5px; background:var(--accent);
  transition:width .3s linear;}
@media (prefers-reduced-motion:reduce){
  .fx-ring .fill,.fx-progress i{transition:none;}
}

.fx-controls{display:flex; align-items:center; gap:12px;}
.fx-go{font-size:15px; font-weight:700; letter-spacing:-.01em; padding:13px 42px;
  border-radius:999px; border:0; cursor:pointer;
  background:var(--accent); color:var(--onAccent);
  box-shadow:0 10px 30px -10px var(--accent); transition:filter .16s, transform .1s;}
.fx-go:hover{filter:brightness(1.08);}
.fx-go:active{transform:translateY(1px);}
.fx-go:focus-visible{outline:2px solid var(--paper); outline-offset:3px;}
.fx-round{width:42px; height:42px; border-radius:50%; cursor:pointer; color:var(--paper);
  display:flex; align-items:center; justify-content:center;
  border:1.5px solid rgba(255,255,255,.28); background:rgba(255,255,255,.06);
  backdrop-filter:blur(14px); -webkit-backdrop-filter:blur(14px); transition:background .16s;}
.fx-round:hover:not(:disabled){background:rgba(255,255,255,.16);}
.fx-round:disabled{opacity:.35; cursor:not-allowed;}
.fx-round:focus-visible{outline:2px solid var(--paper); outline-offset:3px;}
.fx-round svg{width:18px; height:18px; fill:none; stroke:currentColor; stroke-width:1.9;
  stroke-linecap:round; stroke-linejoin:round;}

/* ── corner clusters ────────────────────────────────────── */
.fx-bottom{display:flex; justify-content:space-between; align-items:flex-end; gap:16px;}
.fx-cluster{display:flex; gap:7px; align-items:center;}
.fx-tool{width:40px; height:40px; border-radius:13px; cursor:pointer; color:var(--paper);
  display:flex; align-items:center; justify-content:center; position:relative;
  border:1px solid rgba(255,255,255,.14); background:rgba(255,255,255,.08);
  backdrop-filter:blur(16px); -webkit-backdrop-filter:blur(16px); transition:background .16s;}
.fx-tool:hover{background:rgba(255,255,255,.2);}
.fx-tool:focus-visible{outline:2px solid var(--paper); outline-offset:3px;}
.fx-tool svg{width:18px; height:18px; fill:none; stroke:currentColor; stroke-width:1.8;
  stroke-linecap:round; stroke-linejoin:round;}
.fx-tool i{position:absolute; top:6px; right:6px; width:6px; height:6px; border-radius:50%;
  background:var(--accent);}
.fx-hidesm{display:flex;}

/* ── settings ───────────────────────────────────────────── */
.fx-modal{position:fixed; inset:0; z-index:40; display:flex; color:var(--ink);}
.fx-scrim{position:absolute; inset:0; border:0; padding:0; cursor:default;
  background:rgba(4,4,8,.62); backdrop-filter:blur(7px); -webkit-backdrop-filter:blur(7px);
  animation:fx-fade .18s ease;}
@keyframes fx-fade{from{opacity:0;}to{opacity:1;}}
.fx-sheet{position:relative; margin:auto; display:grid; grid-template-columns:236px 1fr;
  width:min(1040px, 94vw); height:min(760px, 92vh); border-radius:20px; overflow:hidden;
  background:var(--sheet); border:1px solid var(--line);
  box-shadow:0 40px 100px -30px rgba(0,0,0,.8);
  animation:fx-rise .24s cubic-bezier(.22,1,.36,1);}
@keyframes fx-rise{from{opacity:0; transform:translateY(14px) scale(.99);}to{opacity:1; transform:none;}}
@media (prefers-reduced-motion:reduce){ .fx-sheet,.fx-scrim{animation:none;} }

.fx-nav{background:var(--nav); border-right:1px solid var(--line);
  padding:14px 12px 16px; overflow-y:auto; display:flex; flex-direction:column; gap:2px;}
.fx-close{width:32px; height:32px; border-radius:9px; margin-bottom:10px; cursor:pointer;
  display:flex; align-items:center; justify-content:center; color:var(--ink2);
  background:transparent; border:0;}
.fx-close:hover{background:rgba(255,255,255,.07); color:var(--ink);}
.fx-close:focus-visible{outline:2px solid var(--brand); outline-offset:2px;}
.fx-close svg{width:16px; height:16px; fill:none; stroke:currentColor; stroke-width:1.9;
  stroke-linecap:round;}
.fx-navgroup{margin-bottom:12px;}
.fx-navlabel{font-family:var(--mono); font-size:9px; letter-spacing:.2em; text-transform:uppercase;
  color:var(--ink3); margin:8px 0 6px; padding-left:11px;}
.fx-navitem{display:flex; align-items:center; gap:10px; width:100%; text-align:left;
  font-size:13.5px; font-weight:500; padding:9px 11px; border-radius:10px; cursor:pointer;
  color:var(--ink2); background:transparent; border:0; transition:background .14s, color .14s;}
.fx-navitem:hover{background:rgba(255,255,255,.05); color:var(--ink);}
.fx-navitem.on{background:rgba(255,255,255,.09); color:var(--ink);}
.fx-navitem:focus-visible{outline:2px solid var(--brand); outline-offset:-2px;}
.fx-navitem svg{width:16px; height:16px; flex:0 0 auto; fill:none; stroke:currentColor;
  stroke-width:1.7; stroke-linecap:round; stroke-linejoin:round;}
.fx-navfoot{margin-top:auto; padding:12px 11px 0;}
.fx-navfoot p{font-size:11px; line-height:1.6; color:var(--ink3); margin:0;}

.fx-panel{overflow-y:auto; padding:26px 30px 40px;}
.fx-panelhead{margin-bottom:20px;}
.fx-panelhead h2{margin:0 0 5px; font-size:24px; font-weight:650; letter-spacing:-.02em;}
.fx-panelhead p{margin:0; font-size:13.5px; color:var(--ink2); line-height:1.5;}

.fx-card{background:var(--card); border:1px solid var(--line); border-radius:14px;
  padding:18px; margin-bottom:14px;}
.fx-cardhead{margin-bottom:14px;}
.fx-cardhead h3{margin:0; font-size:15px; font-weight:600; letter-spacing:-.01em;}
.fx-cardhead p{margin:4px 0 0; font-size:12.5px; color:var(--ink2); line-height:1.5;}

.fx-row{display:flex; align-items:center; justify-content:space-between; gap:16px;
  padding:11px 0; border-bottom:1px solid var(--line);}
.fx-row:last-child{border-bottom:0; padding-bottom:0;}
.fx-row:first-child{padding-top:0;}
.fx-rowtext span{font-size:13.5px; font-weight:500;}
.fx-rowtext p{margin:3px 0 0; font-size:12px; color:var(--ink2); line-height:1.5; max-width:46ch;}

.fx-switch{width:40px; height:23px; flex:0 0 auto; border-radius:999px; cursor:pointer;
  padding:2.5px; border:0; background:rgba(255,255,255,.15); transition:background .18s;}
.fx-switch span{display:block; width:18px; height:18px; border-radius:50%; background:#fff;
  transition:transform .18s;}
.fx-switch[aria-checked="true"]{background:var(--brand);}
.fx-switch[aria-checked="true"] span{transform:translateX(17px);}
.fx-switch:focus-visible{outline:2px solid var(--brand); outline-offset:2px;}

.fx-numlabel{display:block; font-size:12px; font-weight:500; color:var(--ink2); margin-bottom:6px;}
.fx-nums{display:grid; grid-template-columns:repeat(auto-fit,minmax(140px,1fr)); gap:12px;}
.fx-numbox{display:flex; align-items:center; gap:6px; padding:0 11px; height:40px;
  border-radius:10px; background:rgba(255,255,255,.05); border:1px solid var(--line);
  transition:border-color .14s;}
.fx-numbox:focus-within{border-color:var(--brand);}
.fx-numbox input{width:100%; min-width:0; background:none; border:0; outline:none;
  color:var(--ink); font-family:inherit; font-size:14px; font-variant-numeric:tabular-nums;}
.fx-numbox em{font-style:normal; font-size:11.5px; color:var(--ink3); flex:0 0 auto;}

.fx-select{display:block;}
.fx-selectbox{position:relative; display:block;}
.fx-selectbox select{width:100%; height:40px; padding:0 36px 0 11px; border-radius:10px;
  appearance:none; background:rgba(255,255,255,.05); border:1px solid var(--line);
  color:var(--ink); font-family:inherit; font-size:13.5px; outline:none; cursor:pointer;}
.fx-selectbox select:focus{border-color:var(--brand);}
.fx-selectbox svg{position:absolute; right:12px; top:50%; transform:translateY(-50%);
  width:15px; height:15px; pointer-events:none; fill:none; stroke:var(--ink2);
  stroke-width:1.9; stroke-linecap:round; stroke-linejoin:round;}

.fx-field{margin-bottom:16px;}
.fx-field:last-child{margin-bottom:0;}
.fx-hint{margin:7px 0 0; font-size:12px; color:var(--ink2); line-height:1.55;}
.fx-err{margin:9px 0 0; font-size:12.5px; color:var(--danger); line-height:1.5;}

.fx-input{width:100%; height:40px; padding:0 12px; border-radius:10px; outline:none;
  background:rgba(255,255,255,.05); border:1px solid var(--line);
  color:var(--ink); font-family:inherit; font-size:13.5px;}
.fx-input::placeholder{color:var(--ink3);}
.fx-input:focus{border-color:var(--brand);}
.fx-inline{display:flex; gap:9px; align-items:center;}

.fx-btn{height:40px; padding:0 18px; border-radius:10px; cursor:pointer; flex:0 0 auto;
  font-family:inherit; font-size:13px; font-weight:600; border:1px solid var(--line);
  background:rgba(255,255,255,.06); color:var(--ink); transition:background .14s, filter .14s;}
.fx-btn:hover{background:rgba(255,255,255,.12);}
.fx-btn.primary{background:var(--brand); border-color:transparent; color:#fff;}
.fx-btn.primary:hover{filter:brightness(1.1); background:var(--brand);}
.fx-btn.danger{background:rgba(240,97,109,.14); border-color:rgba(240,97,109,.3); color:#FF98A1;}
.fx-btn.danger:hover{background:rgba(240,97,109,.24);}
.fx-btn:focus-visible{outline:2px solid var(--brand); outline-offset:2px;}
.fx-actions{display:flex; gap:9px; margin-top:14px;}

.fx-drop{border:1.5px dashed var(--line2); border-radius:12px; padding:22px 16px;
  text-align:center; background:rgba(255,255,255,.02);}
.fx-drop p{margin:0; font-size:13.5px;}
.fx-drop small{display:block; margin-top:5px; font-size:11.5px; color:var(--ink3);}
.fx-link{color:var(--brand); cursor:pointer; text-decoration:underline; font-weight:600;}

.fx-range{-webkit-appearance:none; appearance:none; width:100%; height:4px; border-radius:4px;
  background:rgba(255,255,255,.16); outline:none;}
.fx-range::-webkit-slider-thumb{-webkit-appearance:none; width:16px; height:16px; border-radius:50%;
  background:#fff; cursor:pointer; box-shadow:0 1px 5px rgba(0,0,0,.4);}
.fx-range::-moz-range-thumb{width:16px; height:16px; border:0; border-radius:50%; background:#fff;
  cursor:pointer; box-shadow:0 1px 5px rgba(0,0,0,.4);}
.fx-range:focus-visible{outline:2px solid var(--brand); outline-offset:4px;}

.fx-scenes{display:grid; grid-template-columns:repeat(auto-fill,minmax(132px,1fr)); gap:12px;}
.fx-scene{padding:0; border-radius:12px; cursor:pointer; text-align:left;
  background:transparent; border:2px solid transparent;}
.fx-scene.on{border-color:var(--ink);}
.fx-scene:focus-visible{outline:2px solid var(--brand); outline-offset:2px;}
.fx-scenesky{display:block; height:74px; border-radius:9px; border:1px solid var(--line);
  background-size:cover;}
.fx-scene em{display:block; font-style:normal; font-size:12.5px; font-weight:500;
  color:var(--ink2); padding:7px 4px 5px;}
.fx-scene.on em{color:var(--ink);}

.fx-styles{display:grid; grid-template-columns:repeat(auto-fit,minmax(120px,1fr)); gap:12px;}
.fx-style{padding:0; border-radius:12px; cursor:pointer; text-align:left; background:transparent;
  border:2px solid transparent;}
.fx-style.on{border-color:var(--ink);}
.fx-style:focus-visible{outline:2px solid var(--brand); outline-offset:2px;}
.fx-stylepreview{display:flex; align-items:center; justify-content:center; height:74px;
  border-radius:9px; background:rgba(255,255,255,.05); border:1px solid var(--line);}
.fx-stylepreview b{font-size:19px; font-weight:700; letter-spacing:-.02em;}
.fx-stylepreview svg{width:42px; height:42px;}
.fx-stylepreview svg circle{fill:none; stroke-linecap:round;}
.fx-stylepreview svg .track{stroke:rgba(255,255,255,.16); stroke-width:3;}
.fx-stylepreview svg .fill{stroke:var(--brand); stroke-width:3.4;}
.fx-stylebar{display:block; width:64px; height:6px; border-radius:6px;
  background:rgba(255,255,255,.16); overflow:hidden;}
.fx-stylebar i{display:block; height:100%; background:var(--brand);}
.fx-style em{display:block; font-style:normal; font-size:12.5px; font-weight:500;
  color:var(--ink2); padding:7px 4px 5px;}
.fx-style.on em{color:var(--ink);}

.fx-slider{display:flex; align-items:center; gap:14px; padding:9px 0;}
.fx-slider span{width:74px; flex:0 0 auto; font-size:13px; color:var(--ink2);}
.fx-slider span.on{color:var(--ink);}

.fx-tasks{list-style:none; margin:14px 0 0; padding:0;}
.fx-taskrow{display:flex; align-items:center; gap:9px; padding:9px 0;
  border-bottom:1px solid var(--line);}
.fx-tasks li:last-child{border-bottom:0;}
.fx-check{width:19px; height:19px; flex:0 0 auto; border-radius:50%; cursor:pointer; padding:0;
  border:1.5px solid var(--line2); background:transparent; display:flex;
  align-items:center; justify-content:center;}
.fx-check svg{width:12px; height:12px; fill:none; stroke:#fff; stroke-width:2.6;
  stroke-linecap:round; stroke-linejoin:round; opacity:0;}
.fx-check.on{background:var(--brand); border-color:var(--brand);}
.fx-check.on svg{opacity:1;}
.fx-check:hover{border-color:var(--brand);}
.fx-check:focus-visible{outline:2px solid var(--brand); outline-offset:2px;}
.fx-tasktext{flex:1; text-align:left; background:none; border:0; cursor:pointer; padding:0;
  color:var(--ink); font-family:inherit; font-size:13.5px; line-height:1.45; overflow-wrap:anywhere;}
.fx-tasktext:hover{color:var(--brandUp);}
.fx-tasktext.done{opacity:.45; text-decoration:line-through;}
.fx-tasktext.on{color:var(--brandUp); font-weight:600;}
.fx-tasktext:focus-visible{outline:2px solid var(--brand); outline-offset:2px;}
.fx-iconbtn{width:26px; height:26px; border-radius:7px; cursor:pointer; flex:0 0 auto;
  display:flex; align-items:center; justify-content:center;
  background:transparent; border:0; color:var(--ink3); opacity:0; transition:opacity .14s;}
.fx-taskrow:hover .fx-iconbtn, .fx-iconbtn:focus-visible{opacity:1;}
.fx-iconbtn:hover{background:rgba(255,255,255,.08); color:var(--ink);}
.fx-iconbtn:disabled{opacity:0 !important; pointer-events:none;}
.fx-iconbtn:focus-visible{outline:2px solid var(--brand); outline-offset:-2px;}
.fx-iconbtn svg{width:14px; height:14px; fill:none; stroke:currentColor; stroke-width:2;
  stroke-linecap:round; stroke-linejoin:round;}
/* Touch has no hover, so row actions must stay visible. */
@media (hover:none){ .fx-iconbtn{opacity:.6;} }

.fx-stats{display:grid; grid-template-columns:repeat(auto-fit,minmax(110px,1fr)); gap:18px;}
.fx-stats b{display:block; font-size:29px; font-weight:300; letter-spacing:-.03em;
  font-variant-numeric:tabular-nums;}
.fx-stats small{display:block; margin-top:2px; font-family:var(--mono); font-size:9px;
  letter-spacing:.16em; text-transform:uppercase; color:var(--ink3);}
.fx-chart{display:flex; gap:5px; align-items:flex-end;}
.fx-bar{flex:1; display:flex; flex-direction:column; align-items:center; gap:6px; min-width:0;
  height:96px; justify-content:flex-end;}
.fx-bar > span{display:block; width:100%; min-height:2px; border-radius:4px;
  background:rgba(255,255,255,.2);}
.fx-bar > span.on{background:var(--brand);}
.fx-bar small{font-family:var(--mono); font-size:8.5px; color:var(--ink3);}
.fx-bar small.on{color:var(--brandUp);}

.fx-quotes{list-style:none; margin:14px 0 0; padding:0;}
.fx-quotes li{font-size:13px; color:var(--ink2); padding:8px 0; border-bottom:1px solid var(--line);
  font-style:italic;}
.fx-quotes li:last-child{border-bottom:0;}

.fx-keys{list-style:none; margin:0; padding:0;}
.fx-keys li{display:flex; justify-content:space-between; align-items:center; gap:14px;
  padding:9px 0; border-bottom:1px solid var(--line); font-size:13px;}
.fx-keys li:last-child{border-bottom:0;}
.fx-keys kbd{font-family:var(--mono); font-size:11px; padding:3px 8px; border-radius:6px;
  background:rgba(255,255,255,.07); border:1px solid var(--line2); color:var(--ink);}

@media (max-width:820px){
  .fx-sheet{grid-template-columns:1fr; grid-template-rows:auto 1fr;
    width:100vw; height:100vh; border-radius:0; border:0;}
  .fx-nav{flex-direction:row; overflow-x:auto; border-right:0; border-bottom:1px solid var(--line);
    padding:10px; gap:6px; align-items:center;}
  .fx-navgroup{display:flex; gap:6px; margin:0;}
  .fx-navlabel,.fx-navfoot{display:none;}
  .fx-navitem{white-space:nowrap;}
  .fx-panel{padding:20px 18px 40px;}
}
@media (max-width:640px){
  .fx-stage{padding:16px 16px 18px;}
  .fx-quote{display:none;}
  .fx-brand{font-size:18px;}
  .fx-hidesm{display:none;}
  .fx-go{padding:13px 32px;}
}
@media (max-height:560px){
  .fx-quote,.fx-task{display:none;}
}
`;
