let originalText = "";
let matches = [];
let lang="en";

function loadExample(){
  // dummy load; user will replace with API call
  fetch("response.json").then(r=>r.json()).then(j=>{
    originalText=j.payload.rtn.text;
    matches=j.payload.rtn.matches.map((m,i)=>({...m,id:i,ignored:false}));
    render();
  });
}

function buildTokens(text, matches){
  const result=[]; let cursor=0;
  matches.forEach(m=>{
    if(m.ignored)return;
    const before=text.slice(cursor,m.offset);
    if(before.length) result.push({type:"text",text:before});
    const wrong=text.slice(m.offset,m.offset+m.length);
    result.push({type:"match",id:m.id,wrong,correct:m.value,data:m});
    cursor=m.offset+m.length;
  });
  if(cursor<text.length) result.push({type:"text",text:text.slice(cursor)});
  return result;
}

function render(){
  const tokens=buildTokens(originalText,matches);
  const viewer=document.getElementById("viewer");
  viewer.innerHTML="";
  tokens.forEach(t=>{
    if(t.type==="text"){
      viewer.append(t.text);
    }else{
      const w=document.createElement("span");
      w.className="wrong";
      w.textContent=t.wrong;
      w.onclick=e=>openPopup(t,e.pageX,e.pageY);
      viewer.append(w);

      if(t.correct){
        const c=document.createElement("span");
        c.className="correct";
        c.textContent=t.correct;
        c.onclick=e=>openPopup(t,e.pageX,e.pageY);
        viewer.append(c);
      }
    }
  });
}

function openPopup(m,x,y){
  window.currentID=m.id;
  document.getElementById("popup-original").textContent=m.wrong;
  document.getElementById("popup-suggest").textContent=m.correct;
  document.getElementById("popup-body").textContent=lang==="en"?m.data.feedback:m.data.feedback_ko;
  const p=document.getElementById("popup");
  p.style.left=x+"px"; p.style.top=y+"px"; p.classList.remove("hidden");
}

document.getElementById("langToggle").onclick=()=>{
  lang=lang==="en"?"ko":"en";
  const m=matches[window.currentID];
  document.getElementById("popup-body").textContent=lang==="en"?m.feedback:m.feedback_ko;
};

document.getElementById("btn-accept").onclick=()=>{
  const m=matches[window.currentID];
  originalText =
    originalText.slice(0,m.offset)+
    m.value+
    originalText.slice(m.offset+m.length);
  closePopup();
  render();
};

document.getElementById("btn-ignore").onclick=()=>{
  matches[window.currentID].ignored=true;
  closePopup();
  render();
};

function applyAll(){
  matches.forEach(m=>{
    originalText=
      originalText.slice(0,m.offset)+
      m.value+
      originalText.slice(m.offset+m.length);
  });
  closePopup(); render();
}

function ignoreAll(){
  matches.forEach(m=>m.ignored=true);
  closePopup(); render();
}

function closePopup(){
  document.getElementById("popup").classList.add("hidden");
}

window.onload=loadExample;
