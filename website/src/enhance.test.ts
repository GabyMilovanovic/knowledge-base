import {expect,test} from "bun:test";
import {Window} from "happy-dom";
import {enhance} from "./enhance";
const fixture=()=>{
 const window=new Window({url:"https://preview.example/"});
 window.document.body.innerHTML='<div class="search"><input aria-controls="results" aria-expanded="false"></div><section><input class="collection-filter"><ul><li class="article-list-item">Voice guide</li><li class="article-list-item">Messaging setup</li></ul></section>';
 return window;
};
const settle=()=>new Promise(resolve=>setTimeout(resolve,0));
test("enhancement loads search only on use, supports keyboard navigation and filters collections",async()=>{
 const w=fixture();let calls=0,destination="";
 const request=(async()=>{calls++;return new Response(JSON.stringify([{slug:"1-voice",title:"Voice",description:"Calling guide"},{slug:"2-sms",title:"SMS",description:"Messaging guide"}]));}) as (url: string) => Promise<Response>;
 enhance(w.document as unknown as Document,request,url=>{destination=url;});
 expect(calls).toBe(0);
 const input=w.document.querySelector('.search input')! as unknown as HTMLInputElement;
 input.value="voice";input.dispatchEvent(new w.Event("input") as unknown as Event);await settle();
 expect(calls).toBe(1);expect(w.document.querySelector('.search-panel')?.hasAttribute("hidden")).toBe(false);
 expect(w.document.querySelector('.search-result-title')?.textContent).toBe("Voice");
 input.dispatchEvent(new w.KeyboardEvent("keydown",{key:"ArrowDown"}) as unknown as Event);
 expect(input.getAttribute("aria-activedescendant")).toBe("results-option-0");
 input.dispatchEvent(new w.KeyboardEvent("keydown",{key:"Enter"}) as unknown as Event);expect(destination).toBe("https://preview.example/en/articles/1-voice");
 input.dispatchEvent(new w.KeyboardEvent("keydown",{key:"Escape"}) as unknown as Event);expect(input.getAttribute("aria-expanded")).toBe("false");
 const filter=w.document.querySelector('.collection-filter')! as unknown as HTMLInputElement;
 filter.value="voice";filter.dispatchEvent(new w.Event("input") as unknown as Event);
 expect(w.document.querySelectorAll('.article-list-item[hidden]')).toHaveLength(1);
 filter.value="absent";filter.dispatchEvent(new w.Event("input") as unknown as Event);expect(w.document.querySelector('.collection-filter-empty')?.hasAttribute("hidden")).toBe(false);
 filter.value="";filter.dispatchEvent(new w.Event("input") as unknown as Event);expect(w.document.querySelectorAll('.article-list-item[hidden]')).toHaveLength(0);
 w.happyDOM.abort();
});
test("search can retry an index failure and ignores results after closing",async()=>{
 const w=fixture();let count=0;
 enhance(w.document as unknown as Document,(async()=>{count++;return count===1?new Response("",{status:503}):new Response('[{"slug":"1-voice","title":"Voice","description":null}]');}) as (url: string) => Promise<Response>);
 const input=w.document.querySelector('.search input')! as unknown as HTMLInputElement;input.value="voice";
 input.dispatchEvent(new w.Event("input") as unknown as Event);await settle();expect(w.document.querySelector('.search-panel')?.textContent).toContain("could not load");
 input.dispatchEvent(new w.Event("input") as unknown as Event);await settle();expect(w.document.querySelector('.search-result-title')?.textContent).toBe("Voice");expect(count).toBe(2);
 input.dispatchEvent(new w.Event("input") as unknown as Event);input.dispatchEvent(new w.KeyboardEvent("keydown",{key:"Escape"}) as unknown as Event);await settle();expect(input.getAttribute("aria-expanded")).toBe("false");
 w.happyDOM.abort();
});
