document.body.classList.add("loading");
const loader=document.getElementById("loader"), flash=document.getElementById("flash");
setTimeout(()=>{flash.animate([{opacity:0},{opacity:1,offset:.18},{opacity:1,offset:.42},{opacity:0}],{duration:1150,easing:"ease-out",fill:"forwards"});loader.style.opacity="0";},1500);
setTimeout(()=>{loader.remove();document.body.classList.remove("loading")},2250);
