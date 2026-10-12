
(()=>{
  const dialog=document.getElementById('document-dialog');
  if(!dialog||typeof dialog.showModal!=='function')return;

  const pic=document.getElementById('document-image');
  const frame=document.getElementById('document-frame');
  const title=document.getElementById('document-title');
  const select=document.getElementById('document-page');
  const stage=dialog.querySelector('.document-stage');
  const controls=dialog.querySelector('.document-controls');
  const status=dialog.querySelector('.document-status');
  const prev=dialog.querySelector('[data-document-prev]');
  const next=dialog.querySelector('[data-document-next]');
  const enlarge=dialog.querySelector('[data-document-enlarge]');

  let documents,current,page=0,opener,documentScrollY=0;

  const resetSize=()=>{
    stage.dataset.enlarged='false';
    enlarge.setAttribute('aria-pressed','false');
    enlarge.textContent='Enlarge page';
    stage.scrollTop=0;
    stage.scrollLeft=0;
  };

  const showPage=index=>{
    page=Math.max(0,Math.min(index,current.pages.length-1));
    const item=current.pages[page];
    pic.hidden=false;
    frame.hidden=true;
    frame.removeAttribute('src');
    controls.hidden=false;
    dialog.classList.remove('preview-mode');
    pic.width=item.width;
    pic.height=item.height;
    pic.alt=current.title+' - page '+(page+1)+' of '+current.pages.length;
    pic.src=item.src;
    select.value=String(page);
    status.textContent=(page+1)+' of '+current.pages.length;
    prev.disabled=page===0;
    next.disabled=page===current.pages.length-1;
    resetSize();
  };

  const showPreview=()=>{
    pic.hidden=true;
    pic.removeAttribute('src');
    controls.hidden=true;
    dialog.classList.add('preview-mode');
    frame.hidden=false;
    frame.src=current.preview;
    resetSize();
  };

  document.querySelectorAll('[data-document]').forEach(button=>button.addEventListener('click',()=>{
    documents??=JSON.parse(document.getElementById('document-pages').textContent);
    current=documents[button.dataset.document];
    if(!current)return;

    documentScrollY=window.scrollY;
    opener=button;
    title.textContent=current.title;
    select.replaceChildren();

    if(current.preview){
      showPreview();
    }else{
      current.pages.forEach((_,i)=>{
        const option=document.createElement('option');
        option.value=String(i);
        option.textContent=String(i+1);
        select.append(option);
      });
      showPage(0);
    }

    dialog.showModal();
    document.body.classList.add('modal-open');
  }));

  prev.addEventListener('click',()=>showPage(page-1));
  next.addEventListener('click',()=>showPage(page+1));
  select.addEventListener('change',()=>showPage(Number(select.value)));
  enlarge.addEventListener('click',()=>{
    if(!current?.pages)return;
    const on=stage.dataset.enlarged!=='true';
    stage.dataset.enlarged=String(on);
    enlarge.setAttribute('aria-pressed',String(on));
    enlarge.textContent=on?'Fit page':'Enlarge page';
    stage.scrollTop=0;
    stage.scrollLeft=0;
  });

  dialog.querySelector('.document-close').addEventListener('click',()=>dialog.close());
  dialog.addEventListener('click',event=>{if(event.target===dialog)dialog.close();});
  dialog.addEventListener('keydown',event=>{
    if(!current?.pages||event.target.tagName==='SELECT'||event.ctrlKey||event.metaKey||event.altKey||stage.dataset.enlarged==='true')return;
    if(event.key==='ArrowRight'){event.preventDefault();showPage(page+1);}
    if(event.key==='ArrowLeft'){event.preventDefault();showPage(page-1);}
  });

  dialog.addEventListener('close',()=>{
    document.body.classList.remove('modal-open');
    pic.removeAttribute('src');
    frame.removeAttribute('src');
    frame.hidden=true;
    controls.hidden=false;
    dialog.classList.remove('preview-mode');
    resetSize();
    opener?.focus({preventScroll:true});
    requestAnimationFrame(()=>window.scrollTo({top:documentScrollY,left:0,behavior:'auto'}));
  });
})();
