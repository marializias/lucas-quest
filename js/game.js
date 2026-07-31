(() => {
  console.log("GAME 1.4 CARREGADO");
  "use strict";

  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = false;

  const W = canvas.width;
  const H = canvas.height;

  const roomBackgrounds = {
    livingroom: loadRoomImage("assets/backgrounds/livingroom.jpg"),
    kitchen: loadRoomImage("assets/backgrounds/kitchen.jpg"),
    hallway: loadRoomImage("assets/backgrounds/hallway.jpg"),
    bedroomCouple: loadRoomImage("assets/backgrounds/bedroomCouple.jpg"),
    bedroomML: loadRoomImage("assets/backgrounds/bedroomML.jpg"),
    bathroom: loadRoomImage("assets/backgrounds/bathroom.jpg")
  };

  function loadRoomImage(src){
    const image = new Image();
    image.src = src;
    return image;
  }

  function drawFinalRoomBackground(room){
    const image = roomBackgrounds[room];

    if(image && image.complete && image.naturalWidth > 0){
      ctx.drawImage(image, 0, 0, W, H);
      return;
    }

    roomBase("#ece8e1", "#d8d1c8");
  }


  const characterSprites = {
    lucas: {
      down: loadRoomImage("assets/characters/lucas_front.png"),
      up: loadRoomImage("assets/characters/lucas_back.png"),
      side: loadRoomImage("assets/characters/lucas_side.png")
    },
    maria: {
      down: loadRoomImage("assets/characters/maria_front.png"),
      up: loadRoomImage("assets/characters/maria_back.png"),
      side: loadRoomImage("assets/characters/maria_side.png")
    }
  };

  let audioContext = null;

  function ensureAudio(){
    if(!audioContext){
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }

    if(audioContext.state === "suspended"){
      audioContext.resume();
    }
  }

  function playTone(frequency, duration = 0.08, type = "square", volume = 0.035){
    ensureAudio();

    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();

    oscillator.type = type;
    oscillator.frequency.value = frequency;
    gain.gain.value = volume;

    oscillator.connect(gain);
    gain.connect(audioContext.destination);

    const now = audioContext.currentTime;
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    oscillator.start(now);
    oscillator.stop(now + duration);
  }

  function playItemSound(){
    playTone(523, 0.08);
    setTimeout(() => playTone(659, 0.08), 70);
    setTimeout(() => playTone(784, 0.12), 140);
  }

  function playDoorSound(){
    playTone(220, 0.06, "square", 0.025);
    setTimeout(() => playTone(165, 0.08, "square", 0.02), 55);
  }

  function playErrorSound(){
    playTone(150, 0.12, "sawtooth", 0.025);
  }

  const COLORS = {
    outline: "#3a281c",
    wall: "#d7c7ad",
    floor: "#efe7d8",
    accent: "#7c9c70",
    wood: "#9b6841",
    woodDark: "#68452d",
    grey: "#898989",
    blue: "#5d86b1",
    pink: "#bb6f92",
    yellow: "#f0c64f",
    white: "#fffaf0",
    black: "#1c1c1c"
  };

  const state = {
    screen: "menu",
    room: "livingroom",
    inventoryOpen: false,
    activePuzzle: null,
    message: "",
    messageTimer: 0,
    introStep: 0,
    introTimer: 0,
    allFound: false,
    finalTimer: 0,
    editor: {
      enabled: false,
      debugVisible: false,
      selected: null,
      dragging: false,
      dragOffsetX: 0,
      dragOffsetY: 0,
      notice: ""
    },
    roomBannerTimer: 0,
    transition: {
      active: false,
      alpha: 0,
      phase: "out",
      target: null,
      spawn: null
    },
    animations: {
      drawer: 0,
      fridge: 0,
      chest: 0,
      cabinet: 0,
      mirror: 0
    },
    collected: {
      wallet: false,
      watch: false,
      phone: false,
      houseKey: false,
      carKey: false
    },
    useful: {
      remote: false,
      bathroomKey: false
    },
    flags: {
      livingHint: false,
      mirrorRead: false,
      phoneRevealed: false,
      tvUnlocked: false,
      sofaSearched: false,
      kitchenNoteRead: false,
      ovenJokeSeen: false,
      mangaFound: false,
      kindleFound: false,
      suitcaseOpened: false,
      mlChestOpened: false,
      hallwayBasketSeen: false,
      mirrorArrowVisible: false,
      toothbrushCupChecked: false
    }
  };

  const itemMessages = {
    wallet: "A carteira estava na gaveta certa.",
    watch: "Maria Laura: “Relógio na geladeira. Clássico.”",
    phone: "O celular estava escondido atrás da TV.",
    houseKey: "A mala abriu com a senha MAIO.",
    carKey: "Maria Laura: “Última chave! Agora volte para a sala.”"
  };

  const player = {
    x: 480,
    y: 430,
    w: 30,
    h: 44,
    speed: 3.4,
    facing: "down",
    step: 0
  };

  const input = {
    held: new Set(),
    pressed: new Set()
  };

  // No celular, priorizamos a jogabilidade e evitamos colisões antigas
  // salvas no navegador bloqueando áreas que não correspondem ao cenário.
  const isTouchDevice = window.matchMedia("(pointer: coarse)").matches ||
    (navigator.maxTouchPoints || 0) > 0;

  const rooms = {
    livingroom: {
      name: "Sala",
      spawn: {x:480, y:430},
      obstacles: [
        {x:80,y:65,w:330,h:125},
        {x:665,y:70,w:215,h:105},
        {x:300,y:245,w:170,h:82},
        {x:500,y:285,w:145,h:92}
      ]
    },
    hallway: {
      name: "Corredor",
      spawn: {x:480, y:460},
      obstacles: []
    },
    kitchen: {
      name: "Cozinha",
      spawn: {x:95, y:270},
      obstacles: [
        {x:80,y:70,w:130,h:150},
        {x:270,y:70,w:315,h:95},
        {x:660,y:70,w:130,h:130},
        {x:350,y:300,w:230,h:105}
      ]
    },
    bedroomCouple: {
      name: "Quarto do casal",
      spawn: {x:480, y:465},
      obstacles: [
        {x:285,y:75,w:390,h:240},
        {x:65,y:75,w:125,h:270},
        {x:205,y:130,w:70,h:90},
        {x:690,y:130,w:70,h:90}
      ]
    },
    bedroomML: {
      name: "Quarto da Maria Laura",
      spawn: {x:480, y:465},
      obstacles: [
        {x:270,y:80,w:325,h:205},
        {x:620,y:80,w:220,h:115},
        {x:75,y:75,w:135,h:245}
      ]
    },
    bathroom: {
      name: "Banheiro",
      spawn: {x:480, y:465},
      obstacles: [
        {x:90,y:70,w:310,h:135},
        {x:610,y:80,w:190,h:135},
        {x:350,y:330,w:220,h:100}
      ]
    }
  };

  const doors = [
    {room:"livingroom", x:480,y:30,r:72,target:"hallway",spawn:{x:480,y:465},label:"Corredor"},
    {room:"livingroom", x:925,y:270,r:78,target:"kitchen",spawn:{x:95,y:270},label:"Cozinha"},
    {room:"hallway", x:480,y:505,r:75,target:"livingroom",spawn:{x:480,y:75},label:"Sala"},
    {room:"hallway", x:180,y:35,r:75,target:"bedroomCouple",spawn:{x:480,y:465},label:"Quarto do casal"},
    {room:"hallway", x:480,y:35,r:75,target:"bedroomML",spawn:{x:480,y:465},label:"Quarto da Maria Laura"},
    {room:"hallway", x:780,y:35,r:75,target:"bathroom",spawn:{x:480,y:465},label:"Banheiro"},
    {room:"kitchen", x:35,y:270,r:78,target:"livingroom",spawn:{x:885,y:270},label:"Sala"},
    {room:"bedroomCouple", x:480,y:505,r:75,target:"hallway",spawn:{x:180,y:80},label:"Corredor"},
    {room:"bedroomML", x:480,y:505,r:75,target:"hallway",spawn:{x:480,y:80},label:"Corredor"},
    {room:"bathroom", x:480,y:505,r:75,target:"hallway",spawn:{x:780,y:80},label:"Corredor"}
  ];

  const interactables = [
    // SALA
    {
      room:"livingroom", x:245,y:215,r:145,
      label:"procurar entre as almofadas do sofá",
      action(){
        if(state.flags.sofaSearched){
          say("Você já procurou aqui. Só tinha o controle remoto.");
          return;
        }
        state.activePuzzle={type:"sofa",cushion:0};
      }
    },
    {
      room:"livingroom", x:765,y:245,r:145,
      label:"usar a TV",
      action(){
        if(state.collected.phone){
          say("Nada mais está escondido atrás da TV.");
          return;
        }
        if(!state.useful.remote){
          say("A TV não responde. Talvez o controle esteja por perto.");
          playErrorSound();
          return;
        }
        if(!state.flags.tvUnlocked){
          state.activePuzzle={type:"tvPassword",digits:"",errors:0};
          return;
        }
        if(state.flags.phoneRevealed){
          addItem("phone","Celular");
          state.flags.phoneRevealed=false;
        }
      }
    },
    {
      room:"livingroom", x:565,y:410,r:120,
      label:"examinar as gavetas da mesa de jantar",
      action(){
        if(state.collected.wallet){
          say("As gavetas já foram examinadas.");
          return;
        }
        state.activePuzzle={type:"drawerChoice",cursor:0,opened:[false,false,false]};
      }
    },

    // COZINHA
    {
      room:"kitchen", x:470,y:245,r:120,
      label:"examinar o bilhete sobre a bancada",
      available(){ return !state.flags.kitchenNoteRead && !state.collected.watch; },
      action(){
        state.flags.kitchenNoteRead=true;
        state.activePuzzle={type:"kitchenNote"};
      }
    },
    {
      room:"kitchen", x:245,y:230,r:140,
      label:"abrir a geladeira",
      action(){
        if(state.collected.watch){
          say("Agora só tem comida aqui.");
          return;
        }
        if(!state.flags.kitchenNoteRead){
          say("A geladeira está bloqueada. Talvez haja uma pista na bancada.");
          playErrorSound();
          return;
        }
        state.animations.fridge=1;
        state.activePuzzle={type:"sequence",sequence:[],target:[3,2,1]};
      }
    },
    {
      room:"kitchen", x:720,y:245,r:115,
      label:"abrir o forno",
      action(){
        if(!state.flags.ovenJokeSeen){
          state.flags.ovenJokeSeen=true;
          state.activePuzzle={type:"ovenJoke"};
        }else{
          say("Agora só tem o forno mesmo.");
        }
      }
    },

    // CORREDOR
    {
      room:"hallway", x:480,y:260,r:135,
      label:"examinar a estante",
      action(){ state.activePuzzle={type:"hallwayShelf",page:0}; }
    },
    {
      room:"hallway", x:760,y:340,r:105,
      label:"abrir o cesto de roupa",
      action(){
        if(!state.flags.hallwayBasketSeen){
          state.flags.hallwayBasketSeen=true;
          say("Só roupa suja. Ainda bem que não era outro objeto perdido.",230);
        }else{
          say("Continua sendo só roupa suja.");
        }
      }
    },

    // QUARTO DO CASAL
    {
      room:"bedroomCouple", x:390,y:330,r:120,
      label:"olhar debaixo do travesseiro do Lucas",
      action(){
        if(!state.flags.mangaFound){
          state.flags.mangaFound=true;
          say("Encontrou um mangá debaixo do travesseiro dele.",220);
        }else{
          say("Só o travesseiro agora.");
        }
      }
    },
    {
      room:"bedroomCouple", x:570,y:330,r:120,
      label:"olhar debaixo do outro travesseiro",
      action(){
        if(!state.flags.kindleFound){
          state.flags.kindleFound=true;
          say("Encontrou o Kindle debaixo do travesseiro da mamãe.",220);
        }else{
          say("Só o travesseiro agora.");
        }
      }
    },
    {
      room:"bedroomCouple", x:245,y:365,r:190,
      label:"abrir o guarda-roupa e examinar as malas",
      action(){
        if(state.collected.houseKey){
          say("A mala está aberta e a chave já foi retirada.");
          return;
        }

        if(state.flags.suitcaseOpened){
          state.activePuzzle={
            type:"suitcaseOpen",
            stage:1
          };
          return;
        }

        state.activePuzzle={
          type:"wordLock",
          answer:"MAIO",
          input:"",
          title:"MALA",
          hint:"Mês em que tudo começou..."
        };
      }
    },

    // QUARTO DA MARIA LAURA
    {
      room:"bedroomML", x:610,y:340,r:130,
      label:"abrir o baú",
      action(){
        if(state.flags.mlChestOpened){
          say("O baú já está aberto.");
          return;
        }
        state.activePuzzle={
          type:"wordLock",
          answer:"AUSTIN",
          input:"",
          title:"BAÚ",
          hint:"Qual dos amigos é o meu preferido?"
        };
      }
    },
    {
      room:"bedroomML", x:145,y:250,r:120,
      label:"examinar a estante-casinha",
      action(){ say("Jogos de tabuleiro, livros e mais jogos de tabuleiro.",220); }
    },

    // BANHEIRO
    {
      room:"bathroom", x:255,y:230,r:140,
      label:"limpar o espelho embaçado",
      available(){ return !state.flags.mirrorRead; },
      action(){ state.activePuzzle={type:"mirrorClean",progress:0}; }
    },
    {
      room:"bathroom", x:720,y:250,r:150,
      label:"examinar o porta-escovas",
      available(){ return state.flags.mirrorRead; },
      action(){
        if(state.collected.carKey){
          say("O porta-escovas está vazio.");
          return;
        }
        state.activePuzzle={type:"toothbrushCup",stage:0};
      }
    }
  ];


  const HITBOX_STORAGE_KEY = "lucasQuestHitboxesV13";

  interactables.forEach((item,index)=>{
    if(!item.id){
      item.id = `interaction_${item.room}_${index}`;
    }
    item.kind = "interaction";
  });

  doors.forEach((door,index)=>{
    if(!door.id){
      door.id = `door_${door.room}_${door.target}_${index}`;
    }
    door.kind = "door";
  });

  function allHitboxes(){
    return [...interactables, ...doors];
  }

  function obstacleHitboxes(){

    return rooms[state.room].obstacles.map((o,index)=>({

        id:`obstacle_${state.room}_${index}`,

        kind:"obstacle",

        room:state.room,

        label:`OBSTÁCULO ${index+1}`,

        x:o.x+o.w/2,

        y:o.y+o.h/2,

        r:Math.max(o.w,o.h)/2,

        obstacle:o

    }));

}

function hitboxesInCurrentRoom(){

    return [

        ...allHitboxes().filter(item=>item.room===state.room),

        ...obstacleHitboxes()

    ];

}

function loadHitboxOverrides(){

    try{

        const saved = JSON.parse(
            localStorage.getItem(HITBOX_STORAGE_KEY) || "{}"
        );

        // Portas e interações
        allHitboxes().forEach(item=>{

            const value = saved[item.id];
            if(!value) return;

            if(Number.isFinite(value.x)) item.x = value.x;
            if(Number.isFinite(value.y)) item.y = value.y;
            if(Number.isFinite(value.r)) item.r = Math.max(12,value.r);

        });

        // Obstáculos
        Object.entries(rooms).forEach(([roomName,room])=>{

            room.obstacles.forEach((o,index)=>{

                const value = saved[`obstacle_${roomName}_${index}`];
                if(!value) return;

                if(Number.isFinite(value.x)) o.x = value.x;
                if(Number.isFinite(value.y)) o.y = value.y;
                if(Number.isFinite(value.w)) o.w = value.w;
                if(Number.isFinite(value.h)) o.h = value.h;

            });

        });

    }catch(error){

        console.warn("Não foi possível carregar as hitboxes.",error);

    }

}
function saveHitboxOverrides(){

    const data = {};

    // Portas e interações
    allHitboxes().forEach(item=>{

        data[item.id] = {

            room:item.room,
            kind:item.kind,
            label:item.label || item.target || item.id,
            x:Math.round(item.x),
            y:Math.round(item.y),
            r:Math.round(item.r)

        };

    });

    // Obstáculos
    Object.entries(rooms).forEach(([roomName,room])=>{

        room.obstacles.forEach((o,index)=>{

            data[`obstacle_${roomName}_${index}`]={
                room:roomName,
                kind:"obstacle",
                x:Math.round(o.x),
                y:Math.round(o.y),
                w:Math.round(o.w),
                h:Math.round(o.h)
            };

        });

    });

    localStorage.setItem(HITBOX_STORAGE_KEY,JSON.stringify(data));

    state.editor.notice="Coordenadas salvas.";
    setTimeout(()=>state.editor.notice="",1800);

}

  function resetHitboxOverrides(){
    localStorage.removeItem(HITBOX_STORAGE_KEY);
    state.editor.notice = "Posições salvas apagadas. Recarregue a página.";
    setTimeout(()=>{ state.editor.notice=""; },2600);
  }

  function exportHitboxes(){

    const data = {};

    // Portas e interações
    allHitboxes().forEach(item=>{

        data[item.id] = {

            room:item.room,
            kind:item.kind,
            label:item.label || item.target || item.id,
            x:Math.round(item.x),
            y:Math.round(item.y),
            r:Math.round(item.r)

        };

    });

    // Obstáculos
    Object.entries(rooms).forEach(([roomName,room])=>{

        room.obstacles.forEach((o,index)=>{

            data[`obstacle_${roomName}_${index}`]={

                room:roomName,
                kind:"obstacle",
                x:Math.round(o.x),
                y:Math.round(o.y),
                w:Math.round(o.w),
                h:Math.round(o.h)

            };

        });

    });

    const blob = new Blob(
        [JSON.stringify(data,null,2)],
        {type:"application/json"}
    );

    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "hitboxes-lucas-quest.json";

    document.body.appendChild(a);
    a.click();
    a.remove();

    URL.revokeObjectURL(url);

    state.editor.notice = "Arquivo exportado.";
    setTimeout(()=>state.editor.notice="",2000);

}

  function findEditorHitbox(x,y){
    const candidates = hitboxesInCurrentRoom()
      .map(item=>({item,distance:dist(x,y,item.x,item.y)}))
      .filter(entry=>entry.distance <= Math.max(entry.item.r,24))
      .sort((a,b)=>a.distance-b.distance);

    return candidates.length ? candidates[0].item : null;
  }

  loadHitboxOverrides();

  // Coordenadas finais aprovadas: valem igualmente no computador e no celular.
  const FINAL_APPROVED_HITBOXES = {"interaction_livingroom_0":{"room":"livingroom","kind":"interaction","label":"procurar entre as almofadas do sofá","x":257,"y":148,"r":153},"interaction_livingroom_1":{"room":"livingroom","kind":"interaction","label":"usar a TV","x":743,"y":153,"r":113},"interaction_livingroom_2":{"room":"livingroom","kind":"interaction","label":"examinar as gavetas da mesa de jantar","x":331,"y":392,"r":100},"interaction_kitchen_3":{"room":"kitchen","kind":"interaction","label":"examinar o bilhete sobre a bancada","x":458,"y":165,"r":100},"interaction_kitchen_4":{"room":"kitchen","kind":"interaction","label":"abrir a geladeira","x":209,"y":204,"r":140},"interaction_kitchen_5":{"room":"kitchen","kind":"interaction","label":"abrir o forno","x":732,"y":219,"r":67},"interaction_hallway_6":{"room":"hallway","kind":"interaction","label":"examinar a estante","x":471,"y":204,"r":159},"interaction_hallway_7":{"room":"hallway","kind":"interaction","label":"abrir o cesto de roupa","x":225,"y":339,"r":53},"interaction_bedroomCouple_8":{"room":"bedroomCouple","kind":"interaction","label":"olhar debaixo do travesseiro do Lucas","x":186,"y":253,"r":68},"interaction_bedroomCouple_9":{"room":"bedroomCouple","kind":"interaction","label":"olhar debaixo do outro travesseiro","x":325,"y":253,"r":72},"interaction_bedroomCouple_10":{"room":"bedroomCouple","kind":"interaction","label":"abrir o guarda-roupa e examinar as malas","x":589,"y":201,"r":142},"interaction_bedroomML_11":{"room":"bedroomML","kind":"interaction","label":"abrir o baú","x":397,"y":267,"r":58},"interaction_bedroomML_12":{"room":"bedroomML","kind":"interaction","label":"examinar a estante-casinha","x":838,"y":270,"r":120},"interaction_bathroom_13":{"room":"bathroom","kind":"interaction","label":"limpar o espelho embaçado","x":649,"y":123,"r":128},"interaction_bathroom_14":{"room":"bathroom","kind":"interaction","label":"examinar o porta-escovas","x":537,"y":202,"r":90},"door_livingroom_hallway_0":{"room":"livingroom","kind":"door","label":"Corredor","x":519,"y":90,"r":72},"door_livingroom_kitchen_1":{"room":"livingroom","kind":"door","label":"Cozinha","x":916,"y":243,"r":78},"door_hallway_livingroom_2":{"room":"hallway","kind":"door","label":"Sala","x":480,"y":505,"r":75},"door_hallway_bedroomCouple_3":{"room":"hallway","kind":"door","label":"Quarto do casal","x":733,"y":302,"r":87},"door_hallway_bedroomML_4":{"room":"hallway","kind":"door","label":"Quarto da Maria Laura","x":899,"y":415,"r":95},"door_hallway_bathroom_5":{"room":"hallway","kind":"door","label":"Banheiro","x":85,"y":308,"r":111},"door_kitchen_livingroom_6":{"room":"kitchen","kind":"door","label":"Sala","x":35,"y":270,"r":78},"door_bedroomCouple_hallway_7":{"room":"bedroomCouple","kind":"door","label":"Corredor","x":480,"y":505,"r":75},"door_bedroomML_hallway_8":{"room":"bedroomML","kind":"door","label":"Corredor","x":480,"y":505,"r":75},"door_bathroom_hallway_9":{"room":"bathroom","kind":"door","label":"Corredor","x":480,"y":505,"r":75}};
  allHitboxes().forEach(item => {
    const value = FINAL_APPROVED_HITBOXES[item.id];
    if(!value) return;
    if(Number.isFinite(value.x)) item.x = value.x;
    if(Number.isFinite(value.y)) item.y = value.y;
    if(Number.isFinite(value.r)) item.r = Math.max(12, value.r);
  });

  function dist(ax, ay, bx, by){
    return Math.hypot(bx - ax, by - ay);
  }

  function press(key){
    input.pressed.add(key);
  }

  function consume(...keys){
    for(const key of keys){
      if(input.pressed.has(key)){
        input.pressed.delete(key);
        return true;
      }
    }
    return false;
  }

  window.addEventListener("keydown", (e) => {
    const key = e.key.toLowerCase();
    console.log(key);

    if(key === "f2"){
      e.preventDefault();
      if(!e.repeat && state.screen === "game" && !state.activePuzzle){
        state.editor.enabled = !state.editor.enabled;
        state.editor.debugVisible = state.editor.enabled || state.editor.debugVisible;
        state.editor.selected = null;
        state.editor.dragging = false;
        state.editor.notice = state.editor.enabled
          ? "EDITOR ATIVO — arraste uma área; roda do mouse altera o tamanho."
          : "Editor fechado.";
      }
      return;
    }

    if(key === "f3"){
      e.preventDefault();
      if(!e.repeat && state.screen === "game"){
        state.editor.debugVisible = !state.editor.debugVisible;
      }
      return;
    }

    if(key === "f4"){
      e.preventDefault();
      if(!e.repeat && state.screen === "game"){
        exportHitboxes();
      }
      return;
    }

    if(key === "f8"){
      e.preventDefault();
      if(!e.repeat && state.editor.enabled){
        resetHitboxOverrides();
      }
      return;
    }

    if(key === "escape" && state.editor.enabled){
      e.preventDefault();
      state.editor.enabled = false;
      state.editor.selected = null;
      state.editor.dragging = false;
      return;
    }

    if(key === "tab"){
      e.preventDefault();

      if(
        !e.repeat &&
        state.screen === "game" &&
        !state.activePuzzle &&
        !state.transition.active
      ){
        state.inventoryOpen = !state.inventoryOpen;
        playTone(420, 0.05, "square", 0.018);
      }

      return;
    }

    if(!input.held.has(key)){
  press(key);
}

input.held.add(key);

if([
  "arrowup",
  "arrowdown",
  "arrowleft",
  "arrowright",
  " ",
  "e",
  "enter"
].includes(key)){
  e.preventDefault();
}
  });

  window.addEventListener("keyup", (e) => {
    input.held.delete(e.key.toLowerCase());
  });

  function canvasPoint(event){
    const rect = canvas.getBoundingClientRect();
    return {
      x:(event.clientX-rect.left)*(canvas.width/rect.width),
      y:(event.clientY-rect.top)*(canvas.height/rect.height)
    };
  }

  function handlePuzzleClick(x,y){
    const puzzle = state.activePuzzle;
    if(!puzzle) return false;

    if(puzzle.type === "tvPassword"){
      const buttons = [
        [1,330,245],[2,430,245],[3,530,245],
        [4,330,300],[5,430,300],[6,530,300],
        [7,330,355],[8,430,355],[9,530,355],
        [0,430,410]
      ];

      for(const [number,bx,by] of buttons){
        if(x>=bx-35 && x<=bx+35 && y>=by-22 && y<=by+22 && puzzle.digits.length<4){
          puzzle.digits += String(number);
          playTone(360 + number*25,0.04,"square",0.018);
          return true;
        }
      }

      if(x>=585 && x<=680 && y>=385 && y<=430){
        puzzle.digits = puzzle.digits.slice(0,-1);
        return true;
      }

      if(x>=690 && x<=785 && y>=385 && y<=430){
        if(puzzle.digits.length===4){
          checkTvPassword(puzzle);
        }else{
          playErrorSound();
          say("Digite os quatro números da senha.",130);
        }
        return true;
      }
    }
    if(puzzle.type==="sequence"){

  const buttons = [
    [1,330],
    [2,480],
    [3,630]
  ];

  for(const [number,bx] of buttons){

    if(
      x>=bx-50 &&
      x<=bx+50 &&
      y>=235 &&
      y<=315
    ){

      puzzle.sequence.push(number);

      const index = puzzle.sequence.length-1;

      if(puzzle.sequence[index]!==puzzle.target[index]){
        puzzle.sequence=[];
        playErrorSound();
        say("Sequência errada. Tente novamente.",130);
      }else if(puzzle.sequence.length===3){
        state.activePuzzle={type:"lunchbox",stage:0};
      }

      return true;
    }
  }

  return true;
}

    if(puzzle.type==="drawerChoice"){

  const drawerX = [300,480,660];

  for(let i=0;i<3;i++){

    if(
      x>=drawerX[i]-70 &&
      x<=drawerX[i]+70 &&
      y>=245 &&
      y<=350
    ){

      puzzle.cursor=i;

      puzzle.opened[i]=true;

      if(i===0){
        say("Gaveta esquerda: só toalhas de mesa.",150);
      }

      if(i===2){
        say("Gaveta direita: contas antigas.",150);
      }

      if(i===1){
        state.activePuzzle=null;
        addItem("wallet","Carteira");
      }

      return true;
    }
  }

  return true;
}

    if(["sofa","bathroom"].includes(puzzle.type)){
      press("e");
      return true;
    }

    return false;
  }


  canvas.addEventListener("pointerdown",(event)=>{
    if(!state.editor.enabled || state.screen !== "game") return;

    event.preventDefault();
    const point = canvasPoint(event);
    const selected = findEditorHitbox(point.x,point.y);
    state.editor.selected = selected;

    if(selected){
      state.editor.dragging = true;
      state.editor.dragOffsetX = point.x-selected.x;
      state.editor.dragOffsetY = point.y-selected.y;
      canvas.setPointerCapture?.(event.pointerId);
    }
});

    event.preventDefault();
    const point = canvasPoint(event);
    const selected = findEditorHitbox(point.x,point.y);
    state.editor.selected = selected;

    if(selected){
      state.editor.dragging = true;
      state.editor.dragOffsetX = point.x-selected.x;
      state.editor.dragOffsetY = point.y-selected.y;
      canvas.setPointerCapture?.(event.pointerId);
    }
  });

  canvas.addEventListener("pointermove",(event)=>{

    if(!state.editor.enabled || !state.editor.dragging || !state.editor.selected) return;

    event.preventDefault();

    const point = canvasPoint(event);

    const x = point.x - state.editor.dragOffsetX;
    const y = point.y - state.editor.dragOffsetY;

    if(state.editor.selected.kind === "obstacle"){

        const o = state.editor.selected.obstacle;

        o.x = x - o.w / 2;
        o.y = y - o.h / 2;

        state.editor.selected.x = x;
        state.editor.selected.y = y;

    }else{

        state.editor.selected.x = Math.max(0,Math.min(W,x));
        state.editor.selected.y = Math.max(0,Math.min(H,y));

    }

});

  function finishEditorDrag(event){
    if(!state.editor.enabled || !state.editor.dragging) return;
    event.preventDefault();
    state.editor.dragging = false;
    saveHitboxOverrides();
  }

  canvas.addEventListener("pointerup",finishEditorDrag);
  canvas.addEventListener("pointercancel",finishEditorDrag);

  canvas.addEventListener("wheel",(event)=>{
    if(!state.editor.enabled || !state.editor.selected) return;

    event.preventDefault();
    const delta = event.deltaY < 0 ? 6 : -6;

    if(state.editor.selected.kind === "obstacle"){
      const o = state.editor.selected.obstacle;
      const centerX = o.x + o.w/2;
      const centerY = o.y + o.h/2;
      o.w = Math.max(24,Math.min(W,o.w+delta));
      o.h = Math.max(24,Math.min(H,o.h+delta));
      o.x = centerX-o.w/2;
      o.y = centerY-o.h/2;
      state.editor.selected.x = centerX;
      state.editor.selected.y = centerY;
      state.editor.selected.r = Math.max(o.w,o.h)/2;
    }else{
      state.editor.selected.r = Math.max(12,Math.min(240,state.editor.selected.r+delta));
    }

    saveHitboxOverrides();
  },{passive:false});

  canvas.addEventListener("pointerdown", (event) => {
    ensureAudio();

    if(state.editor.enabled) return;

    const point = canvasPoint(event);
    if(handlePuzzleClick(point.x,point.y)) return;

if (state.screen === "menu") {

    const point = canvasPoint(event);

    // Iniciar aventura
    if (
        point.x >= 285 &&
        point.x <= 675 &&
        point.y >= 375 &&
        point.y <= 455
    ) {
        playTone(440, 0.08);
        setTimeout(() => playTone(660, 0.1), 70);
        startIntro();
    }

    return;

}

    if(state.screen === "final"){
      resetGame();
    }
  });

  document.querySelectorAll("[data-key]").forEach((button) => {
    const key = button.dataset.key;

    const start = (event) => {
      event.preventDefault();
      input.held.add(key);
    };

    const end = (event) => {
      event.preventDefault();
      input.held.delete(key);
    };

    button.addEventListener("pointerdown", start);
    button.addEventListener("pointerup", end);
    button.addEventListener("pointercancel", end);
    button.addEventListener("pointerleave", end);
  });

  function triggerInteractAction(){
  press("e");

  if(state.screen === "game" && state.activePuzzle){
    updatePuzzle();
  }
}

  const interactButton = document.querySelector("[data-action='interact']");
  interactButton.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    event.stopPropagation();
    ensureAudio();
    triggerInteractAction();
  });

  interactButton.addEventListener("contextmenu", (event) => {
    event.preventDefault();
  });

  document.querySelector("[data-action='inventory']").addEventListener("pointerdown", (event) => {
    event.preventDefault();
    ensureAudio();

    if(
      state.screen === "game" &&
      !state.activePuzzle &&
      !state.transition.active
    ){
      state.inventoryOpen = !state.inventoryOpen;
      playTone(420, 0.05, "square", 0.018);
    }
  });

  function resetGame(){
    state.screen = "menu";
    state.room = "livingroom";
    state.inventoryOpen = false;
    state.activePuzzle = null;
    state.message = "";
    state.messageTimer = 0;
    state.introStep = 0;
    state.introTimer = 0;
    state.allFound = false;
    state.finalTimer = 0;
    state.roomBannerTimer = 0;
    state.transition.active = false;
    state.transition.alpha = 0;
    state.transition.phase = "out";
    state.transition.target = null;
    state.transition.spawn = null;
    Object.keys(state.animations).forEach((key) => {
      state.animations[key] = 0;
    });
    state.flags.livingHint = false;
    state.flags.mirrorRead = false;
    state.flags.phoneRevealed = false;
    state.flags.tvUnlocked = false;
    state.flags.sofaSearched = false;
    state.flags.kitchenNoteRead = false;
    state.flags.ovenJokeSeen = false;
    state.flags.mangaFound = false;
    state.flags.kindleFound = false;
    state.flags.suitcaseOpened = false;
    state.flags.mlChestOpened = false;
    state.flags.hallwayBasketSeen = false;
    state.flags.mirrorArrowVisible = false;
    state.flags.toothbrushCupChecked = false;
    state.useful.remote = false;
    state.useful.bathroomKey = false;

    Object.keys(state.collected).forEach((key) => {
      state.collected[key] = false;
    });

    placePlayerSafely(480,430);
  }

  function startIntro(){
    state.screen = "intro";
    state.introStep = 0;
    state.introTimer = 0;
  }

  function startGame(){
    state.screen = "game";
    state.room = "livingroom";
    placePlayerSafely(480,430);
    state.roomBannerTimer = 110;
    say("Maria Laura escondeu cinco objetos pela casa. Boa sorte, papai!", 300);
  }

  function say(text, time = 160){
    state.message = text;
    state.messageTimer = time;
  }

  function addItem(key, label){
    if(state.collected[key]) return;

    state.collected[key] = true;
    playItemSound();
    say(label + " encontrado! " + itemMessages[key], 260);

    if(Object.values(state.collected).every(Boolean)){
      state.allFound = true;
      say("Você encontrou tudo! Volte para a sala.", 300);
    }
  }

  function currentObstacleCollision(x, y){
    // Os retângulos de colisão editáveis foram criados para o layout de desktop.
    // Em telas de toque eles estavam bloqueando zonas livres do background.
    if(isTouchDevice) return false;

    const left = x - player.w/2;
    const right = x + player.w/2;
    const top = y - player.h/2;
    const bottom = y + player.h/2;

    return rooms[state.room].obstacles.some((o) =>
      right > o.x &&
      left < o.x + o.w &&
      bottom > o.y &&
      top < o.y + o.h
    );
  }

  function collisionOverlapArea(x, y){
    const left = x - player.w/2;
    const right = x + player.w/2;
    const top = y - player.h/2;
    const bottom = y + player.h/2;

    return rooms[state.room].obstacles.reduce((total,o)=>{
      const overlapW = Math.max(0, Math.min(right,o.x+o.w)-Math.max(left,o.x));
      const overlapH = Math.max(0, Math.min(bottom,o.y+o.h)-Math.max(top,o.y));
      return total + overlapW*overlapH;
    },0);
  }

  function placePlayerSafely(preferredX, preferredY){
    player.x = Math.max(player.w/2, Math.min(W-player.w/2, preferredX));
    player.y = Math.max(player.h/2, Math.min(H-player.h/2, preferredY));

    if(!currentObstacleCollision(player.x,player.y)) return;

    const step = 20;
    for(let radius=step; radius<=Math.max(W,H); radius+=step){
      for(let angle=0; angle<Math.PI*2; angle+=Math.PI/8){
        const x = preferredX + Math.cos(angle)*radius;
        const y = preferredY + Math.sin(angle)*radius;
        const clampedX = Math.max(player.w/2, Math.min(W-player.w/2,x));
        const clampedY = Math.max(player.h/2, Math.min(H-player.h/2,y));
        if(!currentObstacleCollision(clampedX,clampedY)){
          player.x = clampedX;
          player.y = clampedY;
          return;
        }
      }
    }
  }

  function updatePlayer(){
    if(state.activePuzzle || state.inventoryOpen || state.transition.active) return;

    const oldX = player.x;
    const oldY = player.y;

    let moving = false;

    if(input.held.has("arrowleft") || input.held.has("a")){
      player.x -= player.speed;
      player.facing = "left";
      moving = true;
    }

    if(input.held.has("arrowright") || input.held.has("d")){
      player.x += player.speed;
      player.facing = "right";
      moving = true;
    }

    if(input.held.has("arrowup") || input.held.has("w")){
      player.y -= player.speed;
      player.facing = "up";
      moving = true;
    }

    if(input.held.has("arrowdown") || input.held.has("s")){
      player.y += player.speed;
      player.facing = "down";
      moving = true;
    }

    player.x = Math.max(player.w/2, Math.min(W - player.w/2, player.x));
    player.y = Math.max(player.h/2, Math.min(H - player.h/2, player.y));

    if(currentObstacleCollision(player.x, player.y)){
      const oldOverlap = collisionOverlapArea(oldX,oldY);
      const newOverlap = collisionOverlapArea(player.x,player.y);

      // Se o personagem já nasceu dentro de uma colisão ajustada pelo editor,
      // ele pode caminhar para fora dela. Entrar mais fundo continua bloqueado.
      if(oldOverlap === 0 || newOverlap >= oldOverlap){
        player.x = oldX;
        player.y = oldY;
      }
    }

    if(moving){
      player.step += 0.25;
    }
  }

  function nearbyDoor(){
    return doors.find((door) =>
      door.room === state.room &&
      dist(player.x, player.y, door.x, door.y) < door.r
    );
  }

  function nearbyInteraction(){
    let closest = null;
    let best = Infinity;

    for(const item of interactables){
      if(item.room !== state.room) continue;
      if(item.available && !item.available()) continue;

      const d = dist(player.x, player.y, item.x, item.y);
      if(d < item.r && d < best){
        closest = item;
        best = d;
      }
    }

    return closest;
  }

  function beginRoomTransition(target, spawn){
    if(state.transition.active) return;

    state.transition.active = true;
    state.transition.alpha = 0;
    state.transition.phase = "out";
    state.transition.target = target;
    state.transition.spawn = spawn;
    playDoorSound();
  }

  function updateTransition(){
    if(!state.transition.active) return;

    if(state.transition.phase === "out"){
      state.transition.alpha += 0.08;

      if(state.transition.alpha >= 1){
        state.transition.alpha = 1;
        state.room = state.transition.target;
        placePlayerSafely(state.transition.spawn.x,state.transition.spawn.y);
        state.roomBannerTimer = 100;
        state.transition.phase = "in";
      }
    }else{
      state.transition.alpha -= 0.08;

      if(state.transition.alpha <= 0){
        state.transition.alpha = 0;
        state.transition.active = false;
      }
    }
  }

  function updateWorldInteractions(){
    if(state.activePuzzle || state.inventoryOpen) return;

    const interaction = nearbyInteraction();
    const door = nearbyDoor();

    if(interaction){
      say("Pressione E para " + interaction.label, 3);

      if(consume("e"," ","enter")){
        interaction.action();
      }
      return;
    }

    if(door){
      if(door.target==="bathroom" && !state.useful.bathroomKey){
        say("A porta do banheiro está trancada. Talvez exista uma chave no quarto da Maria Laura.",3);
        if(consume("e"," ","enter")) playErrorSound();
        return;
      }

      say("Pressione E para entrar em " + door.label, 3);

      if(consume("e"," ","enter")){
        beginRoomTransition(door.target, door.spawn);
      }
    }
  }

  function consumeLetter(){
    const letters="abcdefghijklmnopqrstuvwxyz";
    for(const letter of letters){
      if(consume(letter)) return letter.toUpperCase();
    }
    return null;
  }

  function finishWordLock(puzzle){
    if(puzzle.input.toUpperCase()!==puzzle.answer){
      puzzle.input="";
      playErrorSound();
      say("Resposta incorreta. Tente novamente.",150);
      return;
    }

    if(puzzle.answer==="MAIO"){
      state.flags.suitcaseOpened=true;
      state.activePuzzle={
        type:"suitcaseOpen",
        stage:0
      };
      playTone(660,0.08);
      setTimeout(()=>playTone(880,0.12),80);
      say("Senha correta! A mala abriu.",180);
      return;
    }

    if(puzzle.answer==="AUSTIN"){
      state.activePuzzle=null;
      state.flags.mlChestOpened=true;
      state.useful.bathroomKey=true;
      playItemSound();
      say("Baú aberto! Você encontrou a chave do banheiro.",260);
    }
  }

  function checkTvPassword(puzzle){
    if(puzzle.digits === "9633"){
      state.flags.tvUnlocked = true;
      state.flags.phoneRevealed = true;
      state.activePuzzle = null;
      playTone(660,0.08);
      setTimeout(() => playTone(880,0.12),80);
      say("Senha correta! O painel deslizou e revelou o celular. Aproxime-se da TV e pegue-o.", 300);
      return;
    }

    puzzle.errors++;
    puzzle.digits = "";
    playErrorSound();

    if(puzzle.errors >= 3){
      say("Senha incorreta. Pai... você esqueceu a senha da mamãe?", 240);
    }else{
      say("Senha incorreta.", 130);
    }
  }

  function updatePuzzle(){
    const puzzle=state.activePuzzle;
    if(!puzzle) return;

    if(consume("escape")){
      state.activePuzzle=null;
      return;
    }

    if(puzzle.type==="sofa"){
      if(consume("e"," ","enter")){
        puzzle.cushion++;
        if(puzzle.cushion>=3){
          state.flags.sofaSearched=true;
          state.useful.remote=true;
          state.activePuzzle=null;
          playItemSound();
          say("Não encontrou o que procurava, mas pelo menos achou o controle da TV!",280);
        }
      }
      return;
    }

    if(puzzle.type==="tvPassword"){
      for(const n of ["0","1","2","3","4","5","6","7","8","9"]){
        if(consume(n) && puzzle.digits.length<4){
          puzzle.digits+=n;
          playTone(360+Number(n)*25,0.04,"square",0.018);
          return;
        }
      }
      if(consume("backspace")) puzzle.digits=puzzle.digits.slice(0,-1);
      if(consume("e"," ","enter")){
        if(puzzle.digits==="9633"){
          state.flags.tvUnlocked=true;
          state.flags.phoneRevealed=true;
          state.activePuzzle=null;
          playItemSound();
          say("Senha correta! O painel deslizou e revelou o celular.",260);
        }else{
          puzzle.errors++;
          puzzle.digits="";
          playErrorSound();
          say(puzzle.errors>=3?"Pai... você esqueceu a senha da mamãe?":"Senha incorreta.",180);
        }
      }
      return;
    }


    if(puzzle.type==="drawerChoice"){
  if(consume("arrowleft","a")){
    puzzle.cursor = Math.max(0, puzzle.cursor - 1);
  }

  if(consume("arrowright","d")){
    puzzle.cursor = Math.min(2, puzzle.cursor + 1);
  }

  if(consume("e"," ","enter")){
    puzzle.opened[puzzle.cursor] = true;

    if(puzzle.cursor === 0){
      say("Gaveta esquerda: só toalhas de mesa.",150);
    }

    if(puzzle.cursor === 2){
      say("Gaveta direita: contas antigas.",150);
    }

    if(puzzle.cursor === 1){
      state.activePuzzle = null;
      addItem("wallet","Carteira");
    }
  }

  return;
}

    if(puzzle.type==="kitchenNote"){
      if(consume("e"," ","enter")){
        state.activePuzzle=null;
        say("Pista guardada: azul, amarelo, vermelho.",220);
      }
      return;
    }

    if(puzzle.type==="sequence"){
      for(const n of ["1","2","3"]){
        if(consume(n)){
          puzzle.sequence.push(Number(n));
          const index=puzzle.sequence.length-1;
          if(puzzle.sequence[index]!==puzzle.target[index]){
            puzzle.sequence=[];
            playErrorSound();
            say("Sequência errada. Tente novamente.",130);
          }else if(puzzle.sequence.length===3){
            state.activePuzzle={type:"lunchbox",stage:0};
          }
          return;
        }
      }
      return;
    }

    if(puzzle.type==="lunchbox"){
      if(consume("e"," ","enter")){
        puzzle.stage++;
        if(puzzle.stage>=2){
          state.activePuzzle=null;
          addItem("watch","Smartwatch");
        }
      }
      return;
    }

    if(puzzle.type==="ovenJoke"){
      if(consume("e"," ","enter")){
        state.activePuzzle=null;
        say("TDAH ataca novamente...",240);
      }
      return;
    }

    if(puzzle.type==="hallwayShelf"){
      if(consume("arrowright","d","e"," ","enter")) puzzle.page++;
      if(consume("arrowleft","a")) puzzle.page=Math.max(0,puzzle.page-1);
      if(puzzle.page>3) state.activePuzzle=null;
      return;
    }

    if(puzzle.type==="wordLock"){
      const letter=consumeLetter();
      if(letter && puzzle.input.length<puzzle.answer.length) puzzle.input+=letter;
      if(consume("backspace")) puzzle.input=puzzle.input.slice(0,-1);
      if(consume("e"," ","enter")) finishWordLock(puzzle);
      return;
    }

    if(puzzle.type==="suitcaseOpen"){
      if(consume("e"," ","enter")){
        puzzle.stage++;

        if(puzzle.stage===1){
          say("A mala está aberta. Tem alguma coisa embaixo das roupas.",180);
          return;
        }

        if(puzzle.stage>=2){
          state.activePuzzle=null;
          addItem("houseKey","Chave da casa");
        }
      }
      return;
    }

    if(puzzle.type==="mirrorClean"){
      if(consume("e"," ","enter")){
        puzzle.progress+=20;
        if(puzzle.progress>=100){
          state.flags.mirrorRead=true;
          state.flags.mirrorArrowVisible=true;
          state.activePuzzle=null;
          playItemSound();
          say("O espelho limpo mostra uma seta apontando para o reflexo do porta-escovas.",300);
        }
      }
      return;
    }

    if(puzzle.type==="toothbrushCup"){
      if(consume("e"," ","enter")){
        puzzle.stage++;
        if(puzzle.stage>=3){
          state.activePuzzle=null;
          state.flags.toothbrushCupChecked=true;
          addItem("carKey","Chave do carro");
        }
      }
    }
  }

  function updateIntro(){
    state.introTimer++;

    const durations = [90,120,140,160];

    if(state.introTimer > durations[state.introStep]){
      state.introStep++;
      state.introTimer = 0;

      if(state.introStep >= 4){
        startGame();
      }
    }
  }

  function updateFinal(){
    if(!state.allFound || state.room !== "livingroom") return;

    if(dist(player.x, player.y, 480, 260) < 160){
      state.screen = "final";
      state.finalTimer = 0;
    }
  }

  function update(){
    if(state.messageTimer > 0){
      state.messageTimer--;
    }else{
      state.message = "";
    }

    if(state.screen === "intro"){
      updateIntro();
      return;
    }

    if(state.screen === "final"){
      state.finalTimer++;
      return;
    }

    if(state.screen !== "game") return;

    if(state.roomBannerTimer > 0){
      state.roomBannerTimer--;
    }

    updateTransition();

    if(state.transition.active){
      return;
    }

    updatePlayer();
    updatePuzzle();

    if(!state.activePuzzle){
      updateWorldInteractions();
    }

    updateFinal();
  }

  function drawText(text, x, y, size, color = COLORS.white, align = "left", weight = "normal"){
    ctx.fillStyle = color;
    ctx.textAlign = align;
    ctx.font = `${weight} ${size}px Arial`;
    ctx.fillText(text, x, y);
    ctx.textAlign = "left";
  }

  function drawPixelPanel(x,y,w,h,title){
    ctx.fillStyle = "#5b3c24";
    ctx.fillRect(x,y,w,h);

    ctx.fillStyle = "#e8cf9d";
    ctx.fillRect(x+8,y+8,w-16,h-16);

    ctx.strokeStyle = "#8a5b34";
    ctx.lineWidth = 4;
    ctx.strokeRect(x+8,y+8,w-16,h-16);

    if(title){
      drawText(title, x+w/2, y+38, 24, "#392615", "center", "bold");
    }
  }

const titleScreen = new Image();
titleScreen.src = "assets/ui/title-screen.png";

let menuFade = 0;

function drawMenu() {

    ctx.clearRect(0, 0, W, H);

    if (titleScreen.complete && titleScreen.naturalWidth > 0) {

        ctx.drawImage(titleScreen, 0, 0, W, H);

    } else {

        ctx.fillStyle = "#111";
        ctx.fillRect(0, 0, W, H);

        drawText(
            "Carregando...",
            W / 2,
            H / 2,
            28,
            "#fff",
            "center",
            "bold"
        );
    }

    if (menuFade < 1) {
        menuFade += 0.02;
    }

    ctx.fillStyle = `rgba(0,0,0,${1 - menuFade})`;
    ctx.fillRect(0, 0, W, H);
}
  function drawIntro(){
    ctx.fillStyle = "#111";
    ctx.fillRect(0,0,W,H);

    const texts = [
      ["Sábado", "08:12"],
      ["Lucas procura as coisas para sair...", ""],
      ["A televisão liga sozinha.", ""],
      ["“Bom dia, papai! Escondi cinco coisas pela casa.”", "— Maria Laura"]
    ];

    const current = texts[Math.min(state.introStep, texts.length-1)];

    if(state.introStep >= 2){
      ctx.fillStyle = "#2b2b2b";
      ctx.fillRect(330,100,300,130);
      ctx.fillStyle = state.introStep === 3 ? "#8cc0d4" : "#111";
      ctx.fillRect(345,115,270,100);

      if(state.introStep === 3){
        drawMariaLaura(480,205,1.3);
      }
    }

    drawText(current[0], 480, 320, state.introStep === 3 ? 28 : 42, "#fff", "center", "bold");

    if(current[1]){
      drawText(current[1], 480, 375, 26, "#ddd", "center");
    }
  }

  function drawRoom(){
    ctx.clearRect(0,0,W,H);

    if(state.room === "livingroom") drawLivingRoom();
    if(state.room === "hallway") drawHallway();
    if(state.room === "kitchen") drawKitchen();
    if(state.room === "bedroomCouple") drawBedroomCouple();
    if(state.room === "bedroomML") drawBedroomML();
    if(state.room === "bathroom") drawBathroom();

    drawPlayer();
    drawHUD();
    drawHitboxEditor();

    if(state.roomBannerTimer > 0){
      const alpha = Math.min(1, state.roomBannerTimer / 25, (100 - state.roomBannerTimer) / 20 + 0.2);
      ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
      drawPixelPanel(350,82,260,62);
      drawText(rooms[state.room].name.toUpperCase(),480,121,22,"#392615","center","bold");
      ctx.globalAlpha = 1;
    }

    const interaction = nearbyInteraction();
    if(interaction && !state.activePuzzle && !state.inventoryOpen){
      drawMarker(interaction.x, interaction.y);
    }

    if(state.inventoryOpen){
      drawInventory();
    }

    if(state.activePuzzle){
      drawPuzzle();
    }

    if(state.message){
      drawMessage();
    }

    if(state.transition.active){
      ctx.fillStyle = `rgba(0,0,0,${state.transition.alpha})`;
      ctx.fillRect(0,0,W,H);
    }
  }

  function roomBase(floorColor="#efe7d8", wallColor="#d7c7ad"){
    ctx.fillStyle = floorColor;
    ctx.fillRect(0,0,W,H);

    // Piso quadriculado
    for(let y=40; y<H; y+=40){
      for(let x=0; x<W; x+=40){
        if(((x+y)/40)%2===0){
          ctx.fillStyle = "rgba(255,255,255,.12)";
          ctx.fillRect(x,y,40,40);
        }
      }
    }

    ctx.fillStyle = wallColor;
    ctx.fillRect(0,0,W,42);

    ctx.fillStyle = "#9b6841";
    ctx.fillRect(0,38,W,8);
  }

  function drawLivingRoom(){
    drawFinalRoomBackground("livingroom");
  }

  function drawHallway(){
    drawFinalRoomBackground("hallway");
  }

  function drawKitchen(){
    drawFinalRoomBackground("kitchen");
  }

  function drawBedroomCouple(){
    drawFinalRoomBackground("bedroomCouple");
  }

  function drawBedroomML(){
    drawFinalRoomBackground("bedroomML");
  }

  function drawBathroom(){
    drawFinalRoomBackground("bathroom");
  }

  function drawPlayer(){
    drawLucas(player.x, player.y, 1);
}

  function drawSpriteCharacter(spriteSet,x,y,scale=1,facing="down"){
    let image = spriteSet.down;
    let flip = false;

    if(facing === "up"){
      image = spriteSet.up;
    }else if(facing === "left" || facing === "right"){
      image = spriteSet.side;
      flip = facing === "right";
    }

    if(!image || !image.complete || !image.naturalWidth){
      return false;
    }

    const moving =
      input.held.has("arrowup") || input.held.has("w") ||
      input.held.has("arrowdown") || input.held.has("s") ||
      input.held.has("arrowleft") || input.held.has("a") ||
      input.held.has("arrowright") || input.held.has("d");

    const bob = moving ? Math.sin(player.step*1.5)*2 : 0;
    const targetHeight = 110 * scale;
    const targetWidth = image.naturalWidth/image.naturalHeight*targetHeight;

    ctx.save();
    ctx.translate(x,y+bob);

    if(flip){
      ctx.scale(-1,1);
    }

    ctx.drawImage(
      image,
      -targetWidth/2,
      -targetHeight+20*scale,
      targetWidth,
      targetHeight
    );
    ctx.restore();
    return true;
  }

  function drawLucas(x,y,scale=1){
    if(drawSpriteCharacter(characterSprites.lucas,x,y,scale,player.facing)) return;

    ctx.fillStyle="#f7f3ec";
    ctx.fillRect(x-12*scale,y-22*scale,24*scale,44*scale);
  }

  function drawMariaLaura(x,y,scale=1){
    if(drawSpriteCharacter(characterSprites.maria,x,y,scale,"down")) return;

    ctx.fillStyle="#7f3558";
    ctx.fillRect(x-11*scale,y-22*scale,22*scale,44*scale);
  }

  function drawMarker(x,y){
    const pulse = 14 + Math.sin(Date.now()/140)*3;

    ctx.strokeStyle = COLORS.yellow;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(x,y,pulse,0,Math.PI*2);
    ctx.stroke();

    drawText("E", x, y+6, 17, COLORS.yellow, "center", "bold");
  }

  function drawHUD(){
    drawPixelPanel(14,14,340,62);
    const count = Object.values(state.collected).filter(Boolean).length;
    drawText(`ITENS: ${count}/5`, 35, 53, 20, "#392615", "left", "bold");
    drawText(rooms[state.room].name, 330, 53, 17, "#60462e", "right", "bold");
  }


  function drawHitboxEditor(){
    if(!state.editor.debugVisible && !state.editor.enabled) return;

    const items = hitboxesInCurrentRoom();

    ctx.save();
    items.forEach(item=>{
      const selected = item === state.editor.selected;
      ctx.fillStyle = item.kind === "door"
        ? "rgba(75,160,255,.16)"
        : "rgba(255,190,60,.16)";
      ctx.strokeStyle = selected
        ? "#ff4d88"
        : item.kind === "door" ? "#55b8ff" : "#ffd34f";
      ctx.lineWidth = selected ? 5 : 3;
      ctx.beginPath();
      ctx.arc(item.x,item.y,item.r,0,Math.PI*2);
      ctx.fill();
      ctx.stroke();

      const name = item.kind === "door"
        ? `PORTA → ${item.label || item.target}`
        : item.label;

      ctx.fillStyle="rgba(0,0,0,.82)";
      const labelWidth=Math.min(340,Math.max(105,ctx.measureText(name).width+18));
      ctx.fillRect(item.x-labelWidth/2,item.y-item.r-28,labelWidth,22);
      drawText(name,item.x,item.y-item.r-11,12,"#fff","center","bold");
      drawText(`${Math.round(item.x)}, ${Math.round(item.y)}, r${Math.round(item.r)}`,
        item.x,item.y+5,12,"#fff","center","bold");
    });

    ctx.fillStyle="rgba(4,10,18,.91)";
    ctx.fillRect(12,78,420,90);
    ctx.strokeStyle="#77c5ff";
    ctx.lineWidth=3;
    ctx.strokeRect(12,78,420,90);
    drawText(state.editor.enabled ? "EDITOR DE HITBOXES — F2" : "HITBOXES VISÍVEIS — F3",
      24,102,17,"#ffd34f","left","bold");
    drawText("Clique e arraste • roda: tamanho • F4: exportar JSON",24,127,14,"#fff");
    drawText("F8: apagar posições salvas • ESC: fechar editor",24,150,14,"#fff");

    if(state.editor.notice){
      ctx.fillStyle="rgba(0,0,0,.88)";
      ctx.fillRect(245,488,470,35);
      drawText(state.editor.notice,480,512,14,"#fff","center","bold");
    }
// Obstáculos (colisão)
ctx.strokeStyle = "#ff2d55";
ctx.fillStyle = "rgba(255,45,85,0.18)";
ctx.lineWidth = 2;

rooms[state.room].obstacles.forEach(o => {
    ctx.fillRect(o.x, o.y, o.w, o.h);
    ctx.strokeRect(o.x, o.y, o.w, o.h);
});
    ctx.restore();
  }

  function drawInventory(){
    ctx.fillStyle="rgba(0,0,0,.75)";
    ctx.fillRect(0,0,W,H);
    drawPixelPanel(145,50,670,440,"INVENTÁRIO");

    const entries=[
      ["wallet","Carteira"],["watch","Smartwatch"],["phone","Celular"],
      ["houseKey","Chave da casa"],["carKey","Chave do carro"]
    ];
    drawText("OBJETOS PRINCIPAIS",205,115,19,"#60462e","left","bold");
    entries.forEach(([key,label],i)=>{
      const y=155+i*42;
      drawText(state.collected[key]?"✓":"□",205,y,24,state.collected[key]?"#4b7a43":"#6c5843","left","bold");
      drawText(label,245,y,21,"#392615");
    });

    drawText("ITENS ÚTEIS",505,115,19,"#60462e","left","bold");
    drawText(state.useful.remote?"✓":"□",505,158,24,state.useful.remote?"#4b7a43":"#6c5843","left","bold");
    drawText("Controle remoto",545,158,20,"#392615");
    drawText(state.useful.bathroomKey?"✓":"□",505,202,24,state.useful.bathroomKey?"#4b7a43":"#6c5843","left","bold");
    drawText("Chave do banheiro",545,202,20,"#392615");

    drawText("Pressione TAB para fechar.",480,455,17,"#60462e","center");
  }

  function drawMessage(){
    ctx.fillStyle = "rgba(30,20,14,.88)";
    ctx.fillRect(20,462,920,58);

    ctx.strokeStyle = "#e8cf9d";
    ctx.lineWidth = 4;
    ctx.strokeRect(20,462,920,58);

    drawText(state.message, 40, 499, 19, "#fff");
  }

  function drawPuzzle(){
    ctx.fillStyle="rgba(0,0,0,.82)";
    ctx.fillRect(0,0,W,H);
    drawPixelPanel(105,50,750,440);
    ctx.fillStyle = "#ff0000";
ctx.fillRect(0,0,60,60);
    const p=state.activePuzzle;

    if(p.type==="sofa"){
      drawText("PROCURANDO NO SOFÁ",480,115,30,"#392615","center","bold");
      drawText("Pressione E para levantar cada almofada.",480,175,21,"#60462e","center");
      [310,480,650].forEach((x,i)=>{
        ctx.fillStyle=i<p.cushion?"#b4b4b4":"#858585";
        ctx.fillRect(x-65,i<p.cushion?245:275,130,70);
      });
      drawText(`${Math.min(p.cushion,3)}/3 almofadas`,480,390,22,"#60462e","center","bold");
    }

    if(p.type==="tvPassword"){
  drawText("SMART TV",480,100,30,"#392615","center","bold");
  drawText("Digite a senha da mamãe",480,150,21,"#60462e","center");

  drawText(
    (p.digits+"____")
      .slice(0,4)
      .split("")
      .map(v=>v==="_"?"_":"●")
      .join("  "),
    480,
    215,
    36,
    "#392615",
    "center",
    "bold"
  );

  const buttons = [
    [1,330,245],[2,430,245],[3,530,245],
    [4,330,300],[5,430,300],[6,530,300],
    [7,330,355],[8,430,355],[9,530,355],
    [0,430,410]
  ];

  buttons.forEach(([n,x,y])=>{
    ctx.fillStyle="#9b6841";
    ctx.fillRect(x-35,y-22,70,44);

    ctx.strokeStyle="#5b3c24";
    ctx.lineWidth=2;
    ctx.strokeRect(x-35,y-22,70,44);

    drawText(String(n),x,y+8,22,"#fff","center","bold");
  });

  ctx.fillStyle="#7c9c70";
  ctx.fillRect(690,385,95,45);
  drawText("OK",737,414,20,"#fff","center","bold");

  ctx.fillStyle="#b15d5d";
  ctx.fillRect(585,385,95,45);
  drawText("⌫",632,414,20,"#fff","center","bold");
}

    if(p.type==="drawerChoice"){
      drawText("AS TRÊS GAVETAS",480,115,30,"#392615","center","bold");
      [300,480,660].forEach((x,i)=>{
        ctx.fillStyle=i===p.cursor?"#f0c64f":"#9b6841";
        ctx.fillRect(x-70,245,140,105);
        if(p.opened[i]){ctx.fillStyle="#332219";ctx.fillRect(x-58,258,116,60);}
      });
      drawText("Use ← → e E.",480,405,20,"#60462e","center");
    }

    if(p.type==="kitchenNote"){
      drawText("BILHETE",480,110,30,"#392615","center","bold");
      drawText("L",330,230,54,"#5e84aa","center","bold");
      drawText("+",410,230,44,"#392615","center","bold");
      drawText("M",490,230,54,"#d4b34c","center","bold");
      drawText("=",575,230,44,"#392615","center","bold");
      drawText("ML",680,230,54,"#bd5d5d","center","bold");
      drawText("Pressione E para guardar a pista.",480,385,19,"#60462e","center");
    }

    if(p.type==="sequence"){
  drawText("TRAVA DA GELADEIRA",480,110,30,"#392615","center","bold");
  drawText("Vermelho = 1   Amarelo = 2   Azul = 3",480,180,21,"#60462e","center");

  const data=[
    [1,"#bd5d5d",330],
    [2,"#d4b34c",480],
    [3,"#5e84aa",630]
  ];

  data.forEach(([n,c,x])=>{
    ctx.fillStyle=c;
    ctx.fillRect(x-50,235,100,80);

    ctx.strokeStyle="#5b3c24";
    ctx.lineWidth=2;
    ctx.strokeRect(x-50,235,100,80);

    drawText(String(n),x,285,32,"#fff","center","bold");
  });

  drawText(
    "Digitado: "+(p.sequence.join(" - ")||"..."),
    480,
    390,
    24,
    "#392615",
    "center",
    "bold"
  );

  drawText("Toque nos números.",480,435,18,"#60462e","center");
}

    if(p.type==="lunchbox"){
      drawText("DENTRO DA GELADEIRA",480,115,30,"#392615","center","bold");
      ctx.fillStyle="#b46d4c";ctx.fillRect(370,230,220,110);
      ctx.fillStyle=p.stage?"#5f3a29":"#d7b28d";ctx.fillRect(380,p.stage?190:215,200,35);
      drawText(p.stage?"Pressione E para pegar o smartwatch.":"Pressione E para abrir a marmita.",480,395,20,"#60462e","center");
    }

    if(p.type==="ovenJoke"){
      drawText("FORNO",480,115,30,"#392615","center","bold");
      ctx.fillStyle="#e8edf0";ctx.fillRect(420,210,120,180);
      ctx.fillStyle="#6d8fb2";ctx.fillRect(455,245,50,95);
      drawText("Uma garrafa de iogurte.",480,420,20,"#60462e","center");
      drawText("Pressione E.",480,452,17,"#60462e","center");
    }

    if(p.type==="hallwayShelf"){
      const messages=[
        "Livros: ainda não conseguiu ler metade.",
        "Porta-retrato: parece que foi ontem...",
        "Noite Estrelada de blocos: deu trabalho para montar.",
        "Casinha decorativa: ficou bonita aqui."
      ];
      drawText("ESTANTE DO CORREDOR",480,120,30,"#392615","center","bold");
      drawText(messages[Math.min(p.page,3)],480,270,23,"#60462e","center");
      drawText("Pressione E para continuar.",480,410,19,"#60462e","center");
    }

    if(p.type==="wordLock"){
      drawText(p.title+" TRANCADO",480,110,30,"#392615","center","bold");
      drawText(p.hint,480,180,22,"#60462e","center");
      drawText((p.input+"_".repeat(p.answer.length)).slice(0,p.answer.length).split("").join("  "),480,285,34,"#392615","center","bold");
      drawText("Digite no teclado e pressione ENTER.",480,390,20,"#60462e","center");
    }

    if(p.type==="suitcaseOpen"){
      drawText("MALA ABERTA",480,110,30,"#392615","center","bold");

      ctx.fillStyle="#343434";
      ctx.fillRect(330,220,300,150);
      ctx.strokeStyle="#111";
      ctx.lineWidth=6;
      ctx.strokeRect(330,220,300,150);

      ctx.fillStyle="#666";
      ctx.fillRect(345,175,270,55);
      ctx.strokeStyle="#222";
      ctx.lineWidth=5;
      ctx.strokeRect(345,175,270,55);

      if(p.stage===0){
        ctx.fillStyle="#9a6b83";
        ctx.fillRect(370,250,220,65);
        drawText("Pressione E para afastar as roupas.",480,420,20,"#60462e","center");
      }else{
        ctx.fillStyle="#d8d0c8";
        ctx.fillRect(370,250,220,65);

        ctx.fillStyle="#d2ad43";
        ctx.fillRect(468,270,45,18);
        ctx.fillRect(503,263,9,32);

        drawText("Pressione E para pegar a chave da casa.",480,420,20,"#60462e","center");
      }
    }

    if(p.type==="mirrorClean"){
      drawText("ESPELHO EMBAÇADO",480,110,30,"#392615","center","bold");
      ctx.fillStyle="#d5d9dc";ctx.fillRect(280,170,400,180);
      ctx.fillStyle="#8fa8b4";ctx.fillRect(280,170,400*(p.progress/100),180);
      drawText(`Limpeza: ${p.progress}%`,480,405,22,"#60462e","center","bold");
      drawText("Pressione E repetidamente.",480,440,18,"#60462e","center");
    }

    if(p.type==="toothbrushCup"){
      drawText("PORTA-ESCOVAS",480,110,30,"#392615","center","bold");
      drawText(["Retire as escovas.","Retire o copo.","A chave está no fundo!"][Math.min(p.stage,2)],480,205,23,"#60462e","center");
      ctx.fillStyle="#9da4a8";ctx.fillRect(425,245,110,120);
      for(let i=p.stage;i<3;i++){ctx.fillStyle=["#555","#777","#999"][i];ctx.fillRect(445+i*25,190,8,75);}
      drawText("Pressione E.",480,420,19,"#60462e","center");
    }

    drawText("ESC para sair",480,468,16,"#60462e","center");
  }

  function drawFinal(){
    ctx.fillStyle = "#203958";
    ctx.fillRect(0,0,W,H);

    // Confetes
    for(let i=0;i<45;i++){
      const x = (i*83 + state.finalTimer*1.2) % W;
      const y = (i*47 + state.finalTimer*2) % H;
      ctx.fillStyle = [COLORS.yellow,"#d56d75","#78a76d","#79a5cc"][i%4];
      ctx.fillRect(x,y,8,12);
    }

    drawPixelPanel(125,60,710,420);

    const progress = Math.min(1, state.finalTimer / 100);
    const lucasX = 350 + 90 * progress;
    const mlX = 610 - 90 * progress;

    drawLucas(lucasX,340,2);
    drawMariaLaura(mlX,340,2);

    if(progress >= 1){
      ctx.fillStyle = "#7f3558";
      ctx.fillRect(462,305,36,12);
      drawText("♥",480,292,30,"#d56d75","center","bold");
    }

    drawText("MISSÃO CONCLUÍDA!",480,135,38,"#392615","center","bold");
    drawText("Você encontrou todos os objetos.",480,190,23,"#60462e","center");

    drawText("FELIZ DIA DOS PAIS, LUCAS!",480,255,32,"#8a5b34","center","bold");
    drawText("Nenhum videogame é mais divertido",480,395,22,"#60462e","center");
    drawText("do que crescer ao seu lado.",480,425,22,"#60462e","center");

    drawText("Com amor, Maria Laura ♥",480,460,21,"#7f3558","center","bold");
  }

  function draw(){
    if(state.screen === "menu"){
      drawMenu();
      return;
    }

    if(state.screen === "intro"){
      drawIntro();
      return;
    }

    if(state.screen === "final"){
      drawFinal();
      return;
    }

    drawRoom();
  }

  function loop(){
    update();
    draw();
    requestAnimationFrame(loop);
  }

  loop();
})();
