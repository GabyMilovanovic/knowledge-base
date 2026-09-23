import {expect,test} from "bun:test";
import {findSearchResults} from "./search";
test("searches bodies and headings and ranks titles first",()=>{
 const rows=[{slug:"incidental",title:"Country guidelines",description:null,terms:"gambling prohibited"},{slug:"forbidden",title:"Forbidden messaging use cases",description:null,headings:"Gambling",terms:"online casinos gambling platforms"},{slug:"title",title:"Gambling policy",description:null}];
 expect(findSearchResults(rows,"gambling").map(a=>a.slug)).toEqual(["title","forbidden","incidental"]);
 expect(findSearchResults(rows,"gambl").map(a=>a.slug)).toEqual(["title","forbidden","incidental"]);
 expect(findSearchResults(rows,"forbidden gambling").map(a=>a.slug)).toEqual(["forbidden"]);
 expect(findSearchResults(rows,"gambling zebra")).toEqual([]);
});
test("normalizes punctuation and accents and avoids mid-word matches",()=>{
 const rows=[{slug:"one",title:"Toll-free café",description:null,terms:"porting"}];
 expect(findSearchResults(rows,"CAFE toll free")).toEqual(rows);
 expect(findSearchResults(rows,"!!!")).toEqual([]);
 expect(findSearchResults(rows,"sport")).toEqual([]);
});
test("ranks all candidates before limiting to eight",()=>{
 const rows=Array.from({length:12},(_,i)=>({slug:String(i),title:`Guide ${i}`,description:null,terms:"gambling"}));
 rows.push({slug:"best",title:"Gambling",description:null,terms:""});
 const results=findSearchResults(rows,"gambling");expect(results).toHaveLength(8);expect(results[0].slug).toBe("best");
});
