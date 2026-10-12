
(()=>{
  document.querySelectorAll('[data-year],#year').forEach(el=>el.textContent=new Date().getFullYear());

  const toggle=document.querySelector('.menu-toggle');
  const menu=document.querySelector('#mobile-menu');
  toggle?.addEventListener('click',()=>{
    const open=toggle.getAttribute('aria-expanded')==='true';
    toggle.setAttribute('aria-expanded',String(!open));
    menu.hidden=open;
  });
  menu?.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>{
    menu.hidden=true;
    toggle.setAttribute('aria-expanded','false');
  }));

  const imageDialog=document.querySelector('#image-dialog');
  if(imageDialog&&typeof imageDialog.showModal==='function'){
    let previous;
    let imageScrollY=0;
    const pic=imageDialog.querySelector('img');
    document.querySelectorAll('[data-zoom]').forEach(link=>link.addEventListener('click',e=>{
      if(e.ctrlKey||e.metaKey||e.shiftKey||e.altKey)return;
      e.preventDefault();
      imageScrollY=window.scrollY;
      previous=link;
      pic.src=link.querySelector('img').src;
      pic.alt=link.querySelector('img').alt;
      imageDialog.showModal();
      document.body.classList.add('modal-open');
    }));
    imageDialog.querySelector('button').addEventListener('click',()=>imageDialog.close());
    imageDialog.addEventListener('click',e=>{if(e.target===imageDialog)imageDialog.close();});
    imageDialog.addEventListener('close',()=>{
      document.body.classList.remove('modal-open');
      pic.removeAttribute('src');
      previous?.focus({preventScroll:true});
      requestAnimationFrame(()=>window.scrollTo({top:imageScrollY,left:0,behavior:'auto'}));
    });
  }

  // Drive embeds have no public pause API: activate one and reload it to stop.
  const videos=[...document.querySelectorAll('video')];
  const slots=[...document.querySelectorAll('.film-slot')];
  const positions=new WeakMap();
  let activeSlot=null,expanded=null,nativeFull=null,restoring=false,restoreToken=0,scrollFrame=0;
  const fullElement=()=>document.fullscreenElement||document.webkitFullscreenElement;
  const isFull=()=>expanded||nativeFull||fullElement()||videos.some(v=>v.webkitDisplayingFullscreen);
  const snapshot=anchor=>({anchor,offset:anchor.getBoundingClientRect().top,x:window.scrollX,y:window.scrollY});
  const remember=video=>{
    if(!isFull()&&!restoring)positions.set(video,snapshot(video.closest('.web-video')||video));
  };
  const cancelRestore=()=>{restoreToken++;restoring=false;};
  const restore=(saved,focus)=>{
    if(!saved)return;
    const token=++restoreToken;restoring=true;
    const move=()=>{
      if(token!==restoreToken||isFull())return;
      const top=saved.anchor.isConnected?saved.anchor.getBoundingClientRect().top+window.scrollY-saved.offset:saved.y;
      window.scrollTo({left:saved.x,top:Math.max(0,top),behavior:'instant'});
    };
    focus?.focus({preventScroll:true});
    requestAnimationFrame(()=>requestAnimationFrame(move));
    setTimeout(move,150);
    setTimeout(()=>{move();if(token===restoreToken)restoring=false;},400);
  };
  ['pointerdown','touchstart','wheel','keydown'].forEach(type=>
    window.addEventListener(type,cancelRestore,{capture:true,passive:true}));
  window.addEventListener('scroll',()=>{
    if(isFull()||restoring||scrollFrame)return;
    scrollFrame=requestAnimationFrame(()=>{scrollFrame=0;videos.forEach(remember);});
  },{passive:true});

  const stopDrive=()=>{
    if(!activeSlot)return;
    const slot=activeSlot,frame=slot.querySelector('iframe');activeSlot=null;
    frame.inert=true;frame.tabIndex=-1;
    frame.src=frame.dataset.preview; // navigation stops both audio and video
    slot.dataset.active='false';
    slot.querySelector('.film-activate').hidden=false;
    slot.querySelector('.film-fullscreen').hidden=true;
  };
  const stopOthers=except=>{
    videos.forEach(video=>{if(video!==except)video.pause();});
    if(activeSlot!==except)stopDrive();
  };
  const activate=slot=>{
    stopOthers(slot);
    activeSlot=slot;slot.dataset.active='true';
    const frame=slot.querySelector('iframe');frame.inert=false;frame.tabIndex=0;
    slot.querySelector('.film-activate').hidden=true;
    slot.querySelector('.film-fullscreen').hidden=false;
    frame.focus({preventScroll:true});
  };
  const releaseExpanded=()=>{
    if(!expanded)return;
    const state=expanded;expanded=null;
    state.player.classList.remove('is-expanded');
    state.player.removeAttribute('role');state.player.removeAttribute('aria-modal');
    state.button.textContent='Fullscreen';state.button.setAttribute('aria-expanded','false');
    document.body.classList.remove('video-expanded');
    state.disabled.forEach(el=>{el.inert=false;});
    restore(state.saved,state.button);
    if(state.historyKey&&history.state?.portfolioVideoFullscreen===state.historyKey)history.back();
  };
  const exitExpanded=()=>{
    if(fullElement()){
      const exit=document.exitFullscreen||document.webkitExitFullscreen;
      if(exit){try{Promise.resolve(exit.call(document)).catch(releaseExpanded);}catch{releaseExpanded();}return;}
    }
    releaseExpanded();
  };
  const fallbackHistory=state=>{
    if(expanded!==state)return;
    state.historyKey='portfolio-video-'+Date.now();
    try{history.pushState({portfolioVideoFullscreen:state.historyKey},'');}catch{state.historyKey=null;}
  };
  const expand=slot=>{
    if(expanded){exitExpanded();return;}
    cancelRestore();
    if(activeSlot!==slot)activate(slot);
    const player=slot.querySelector('.film-player'),button=slot.querySelector('.film-fullscreen');
    const state={slot,player,button,saved:snapshot(slot),disabled:[],historyKey:null};expanded=state;
    // The slot remains in normal flow, reserving the video's original height.
    player.classList.add('is-expanded');player.setAttribute('role','dialog');player.setAttribute('aria-modal','true');
    button.textContent='Exit fullscreen';button.setAttribute('aria-expanded','true');
    document.body.classList.add('video-expanded');
    for(let node=player;node.parentElement&&node!==document.body;node=node.parentElement){
      [...node.parentElement.children].forEach(sibling=>{
        if(sibling!==node&&!sibling.inert){sibling.inert=true;state.disabled.push(sibling);}
      });
    }
    button.focus({preventScroll:true});
    const request=player.requestFullscreen||player.webkitRequestFullscreen;
    if(request){try{Promise.resolve(request.call(player)).catch(()=>fallbackHistory(state));}catch{fallbackHistory(state);}}
    else fallbackHistory(state); // iPhone fallback uses the whole visible viewport.
  };
  slots.forEach(slot=>{
    const frame=slot.querySelector('iframe');frame.dataset.preview=frame.getAttribute('src');
    frame.inert=true;frame.tabIndex=-1;
    slot.querySelector('.film-activate').addEventListener('click',()=>activate(slot));
    slot.querySelector('.film-fullscreen').addEventListener('click',()=>expand(slot));
  });
  videos.forEach(video=>{
    video.addEventListener('play',()=>stopOthers(video));
    ['pointerdown','touchstart','focus','keydown'].forEach(type=>video.addEventListener(type,()=>remember(video),{passive:true}));
    video.addEventListener('webkitbeginfullscreen',()=>{
      nativeFull={video,saved:positions.get(video)||snapshot(video.closest('.web-video')||video)};
    });
    video.addEventListener('webkitendfullscreen',()=>{
      if(!nativeFull)return;const state=nativeFull;nativeFull=null;restore(state.saved,state.video);
    });
    remember(video);
  });
  const fullscreenChanged=()=>{
    const element=fullElement();
    if(element){
      if(expanded||nativeFull)return;
      const video=videos.find(v=>v===element||element.contains(v));
      if(video)nativeFull={video,saved:positions.get(video)||snapshot(video.closest('.web-video')||video)};
    }else if(expanded)releaseExpanded();
    else if(nativeFull){const state=nativeFull;nativeFull=null;restore(state.saved,state.video);}
  };
  document.addEventListener('fullscreenchange',fullscreenChanged);
  document.addEventListener('webkitfullscreenchange',fullscreenChanged);
  document.addEventListener('keydown',event=>{
    if(event.key==='Escape'&&expanded){event.preventDefault();exitExpanded();}
  });
  window.addEventListener('popstate',()=>{
    if(expanded?.historyKey&&history.state?.portfolioVideoFullscreen!==expanded.historyKey){
      expanded.historyKey=null;exitExpanded();
    }
  });
  document.querySelectorAll('.film-fallback').forEach(link=>link.addEventListener('click',()=>stopOthers(null)));

})();
