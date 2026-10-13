const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const http=require('node:http');
(async()=>{
 const html=fs.readFileSync(__dirname+'/index.html','utf8');
 const server=http.createServer((req,res)=>{res.setHeader('Content-Type','text/html; charset=utf-8');res.end(html)}).listen(0,'127.0.0.1');
 await new Promise(r=>server.on('listening',r));
 let browser;
 try{
 browser=await chromium.launch({headless:true,...(process.env.LINKSHELF_BROWSER?{executablePath:process.env.LINKSHELF_BROWSER}:{})});
 const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:'+server.address().port);
 assert.equal(await page.locator('.card').count(),33);
 assert.equal(await page.locator('.translate-link').count(),33);
 const translated=await page.locator('.card h3 a').evaluateAll(a=>a.every(x=>{const u=new URL(x.href);return u.hostname==='translate.google.com'&&u.searchParams.get('tl')==='zh-CN'&&Boolean(u.searchParams.get('u'))}));assert.ok(translated);
 await page.locator('#translateToggle').click();assert.equal(await page.locator('.card h3 a').first().getAttribute('href'),'https://www.core77.com/');
 await page.reload();assert.equal(await page.locator('#translateToggle').getAttribute('aria-pressed'),'false');
 await page.locator('#translateToggle').click();await page.locator('#searchInput').fill('Core77');assert.ok((await page.locator('[data-open-url]').first().getAttribute('data-open-url')).includes('translate.google.com'));await page.locator('#searchInput').fill('');
 await page.locator('#searchInput').fill('日本 字体');assert.equal(await page.locator('.card').count(),1);
 await page.locator('#searchInput').fill('');
 for(const [category,count] of Object.entries({'产品设计':3,'环境设计':4,'视觉传达':3,'交互设计':2})){await page.locator('[data-category='+category+']').click();assert.equal(await page.locator('.card').count(),count);} 
 await page.locator('[data-category=全部]').click();
 await page.locator('[data-category="其他"]').click();assert.equal(await page.locator('.card').count(),0);
 await page.locator('#addBtn').click();await page.locator('#siteName').fill('测试网站');await page.locator('#siteUrl').fill('https://example.com');await page.locator('#siteCategory').selectOption('其他');await page.locator('[type="submit"]').click();assert.equal(await page.locator('.card').count(),34);
 await page.locator('[data-edit]').click();await page.locator('#siteName').fill('已编辑');await page.locator('[type="submit"]').click();assert.equal(await page.locator('.card').filter({has:page.locator('[data-edit]')}).locator('h3').innerText(),'已编辑');
 await page.locator('.favorite').first().click();assert.equal(await page.locator('#favoriteCount').innerText(),'1');
 await page.reload();assert.equal(await page.locator('#favoriteCount').innerText(),'1');
 await page.evaluate(()=>{localStorage.setItem('linkshelf_custom_v1','{"bad":true}');localStorage.setItem('linkshelf_favorites_v1','{}')});await page.reload();assert.equal(await page.locator('.card').count(),33);
 const validation=await page.evaluate(()=>normalizeLinks([{name:'bad',url:'javascript:alert(1)'},{name:'ok',url:'https://example.com',tags:123,category:'fake'}]));assert.equal(validation.length,1);assert.deepEqual(validation[0].tags,[]);assert.equal(validation[0].category,'其他');
 await page.setViewportSize({width:375,height:812});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await page.screenshot({path:__dirname+'/preview-mobile.png',fullPage:true});
 await page.setViewportSize({width:1440,height:1000});await page.screenshot({path:__dirname+'/preview-desktop.png',fullPage:true});
 assert.deepEqual(errors,[]);console.log('PASS: render, multiword search, category, add, edit, favorite persistence, corrupt storage, unsafe URL, malformed tags, mobile overflow; no page errors');
 }finally{if(browser)await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1});