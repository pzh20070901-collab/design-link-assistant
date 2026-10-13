const {chromium}=require('playwright');
const fs=require('fs'),http=require('http'),assert=require('assert/strict');
(async()=>{
const server=http.createServer((q,r)=>{r.setHeader('Content-Type','text/html; charset=utf-8');r.end(fs.readFileSync(__dirname+'/index.html'))}).listen(0,'127.0.0.1');await new Promise(r=>server.on('listening',r));
let browser;try{
browser=await chromium.launch({headless:true,executablePath:process.env.LINKSHELF_BROWSER});const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('http://127.0.0.1:'+server.address().port);
assert.equal(await page.locator('#totalCount').innerText(),'36');assert.equal(await page.locator('#linkGrid').getByText('Steam 官方下载',{exact:true}).count(),0);assert.equal(await page.locator('#linkGrid').getByText('Winstep 桌面美化',{exact:true}).count(),0);
await page.locator('[data-category="置顶"]').click();assert.equal(await page.locator('#linkGrid .card').count(),1);await page.locator('#openUtility').click();assert.equal(await page.locator('#utilityDialog').isVisible(),true);assert.equal(await page.locator('#utilityGrid .card').count(),3);assert.equal(await page.locator('#utilityGrid .source-badge.provided').count(),3);assert.equal(await page.locator('#utilityGrid .translate-link').count(),3);
await page.locator('#utilityGrid .favorite').first().click();assert.equal(await page.locator('#favoriteCount').innerText(),'1');await page.locator('#closeUtility').click();assert.equal(await page.locator('#utilityDialog').isVisible(),false);
await page.locator('#searchInput').fill('Steam');assert.equal(await page.locator('[data-open-url]').count(),0);assert.equal(await page.locator('#openUtility').count(),1);await page.locator('#searchInput').fill('');
await page.setViewportSize({width:375,height:812});await page.locator('#openUtility').click();assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));assert.deepEqual(errors,[]);console.log('PASS: collection-only visibility, pinned filter, three links, provenance, translation, favorites, search and mobile');
}finally{if(browser)await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1});