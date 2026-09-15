#!/usr/bin/env python3
"""Check a GSC/backlink CSV against the temporary site. Read-only; no browser.

Example: python3 scripts/audit-migration-urls.py growth.csv --output results.json
URL column: URL, Page, Top pages, Target URL, or Target page.
Preserves query strings/fragments, records every redirect hop, and orders failures
by clicks, then impressions, then backlinks. No invented traffic weights.
"""
import argparse,csv,json,re,urllib.parse,urllib.request,urllib.error
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self,*args,**kwargs):return None

def check(row,base,url_column):
    source=row[url_column].strip();u=urllib.parse.urlsplit(source)
    if u.netloc and u.hostname not in ('support.telnyx.com','d27az1l5lty0u1.cloudfront.net'):
        return {**row,'source_url':source,'error':'Not a support URL; excluded'}
    url=base+('/'+u.path.lstrip('/'))+('?' +u.query if u.query else '')
    fragment=urllib.parse.unquote(u.fragment);hops=[];opener=urllib.request.build_opener(NoRedirect)
    result={**row,'source_url':source,'hops':hops}
    try:
        for _ in range(8):
            req=urllib.request.Request(url,headers={'User-Agent':'TelnyxMigrationAudit/1.0'})
            try:response=opener.open(req,timeout=30)
            except urllib.error.HTTPError as e:response=e
            with response:
                status=response.code;location=response.headers.get('Location');body=response.read().decode('utf-8','replace')
            hops.append({'url':url,'status':status,'location':location})
            if status in (301,302,303,307,308) and location:
                next_url=urllib.parse.urljoin(url,location)
                if urllib.parse.urlsplit(next_url).netloc!=urllib.parse.urlsplit(base).netloc:
                    result['error']='Redirect leaves temporary site';break
                url=next_url;continue
            result.update(final_url=url,status=status,canonical=(re.search(r'<link\b[^>]*rel="canonical"[^>]*href="([^"]+)"',body) or [None,None])[1])
            if status!=200:result['error']=f'HTTP {status}'
            elif not result['canonical']:result['error']='Missing initial canonical'
            elif fragment and not fragment.startswith(':~:text=') and not re.search(r'\bid=["\']'+re.escape(fragment)+r'["\']',body):result['error']='Missing fragment target'
            break
        else:result['error']='Too many redirects'
    except Exception as e:result['error']=str(e)
    return result

def main():
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('csv',type=Path);p.add_argument('--origin',default='https://d27az1l5lty0u1.cloudfront.net');p.add_argument('--url-column');p.add_argument('--output',type=Path,required=True);args=p.parse_args()
    origin=urllib.parse.urlsplit(args.origin)
    if origin.hostname not in ('127.0.0.1','localhost','d27az1l5lty0u1.cloudfront.net') or origin.path not in ('','/') or origin.query or origin.fragment:raise SystemExit('Use the temporary CloudFront origin or local preview')
    with args.csv.open(encoding='utf-8-sig',newline='') as f:
        reader=csv.DictReader(f);fields=reader.fieldnames or [];rows=list(reader)
    column=args.url_column or next((f for f in fields if f.lower() in ('url','page','top pages','target url','target page')),None)
    if column not in fields:raise SystemExit('Specify --url-column; no recognized URL column found')
    def number(row,name):
        v=next((v for k,v in row.items() if k.lower()==name),'0')
        try:return float((v or '0').replace(',',''))
        except ValueError:return 0
    with ThreadPoolExecutor(max_workers=4) as pool:results=list(pool.map(lambda row:check(row,args.origin.rstrip('/'),column),rows))
    results.sort(key=lambda r:('error' not in r,-number(r,'clicks'),-number(r,'impressions'),-number(r,'backlinks')))
    output={'origin':args.origin,'rows':len(results),'failures':sum('error' in r for r in results),'has_traffic_weights':any(k.lower() in ('clicks','impressions','backlinks') for k in fields),'results':results}
    args.output.parent.mkdir(parents=True,exist_ok=True);args.output.write_text(json.dumps(output,indent=2)+'\n');print(f"Checked {len(results)} rows; {output['failures']} failures; {args.output}")
if __name__=='__main__':main()
