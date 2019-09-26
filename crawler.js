const puppeteer = require('puppeteer-extra');
const pluginAnonymizeUA = require('puppeteer-extra-plugin-anonymize-ua');
const pluginStealth = require('puppeteer-extra-plugin-stealth');
const request = require('request');


puppeteer.use(pluginAnonymizeUA());
puppeteer.use(pluginStealth());


const initBrowser = () => new Promise((resolve, reject) => {
    (async () => {
        try {
            console.log('launching browser');
            browser = await puppeteer.launch({
                //headless: false,
                //args: ["--no-sandbox", "--disable-setuid-sandbox"]
            });

            console.log('browser is a go');
            resolve(browser);
        } catch (err) {
            console.error(err);
            reject(err);
        }
    })();
});

const destroyBrowser = (browser) => new Promise((resolve, reject) => {
    (async () => {
        try {
            console.log('destroying browser');
            browser.close();
            resolve();
        } catch (err) {
            console.error(err);
            reject(err);
        }
    })();
});


const getAllMavatPlans = (browser) => new Promise((resolve, reject) => {
    (async () => {
        try {
            const page = await browser.newPage();

            // increase devtools buffer sizes so that response content will not be evicted before we save it
            await page._client.send('Network.enable', {
                maxResourceBufferSize: 1024 * 1204 * 100,
                maxTotalBufferSize: 1024 * 1204 * 200,
            });

            await page.goto('https://mavat.iplan.gov.il/SV3?searchEntity=1');
            await page.waitFor(5000); // TODO: wait for navigation instead of timer

            // open advanced search form
            await page.click('#sv3-advanced-search-button__plans');
            await page.waitFor(1000);

            // basic filter to get all mavat's plans as results (sometimes it is needed, sometimes it isn't ¯\_(ツ)_/¯)
            await page.$eval('input[id=program-start-plans]', el => el.value = 0);
            await page.waitFor(1000);

            await page.setRequestInterception(true);
            page.on('request', request => {
                if (request.url() === 'https://mavat.iplan.gov.il/rest/api/sv3/Search') {
                    const postData = request.postData().replace('"toResult":20,', '"toResult":200000,');
                    request.continue({postData: postData});
                } else {
                    request.continue();
                }
            });

            const resultPromise = new Promise(function(resolve, reject) {
                page.on('response', response => {
                    if (response.url() === 'https://mavat.iplan.gov.il/rest/api/sv3/Search') {
                        console.log('got respone');

                        // disable javascript in an attempt to disrupt the rendering of all results
                        page.setJavaScriptEnabled(false);

                        response.text()
                            .then(t => resolve(JSON.parse(t)[0].result.dtResults))
                            .catch(err => reject(err));
                    }
                });

                // time out after 10 minutes
                setTimeout(function() {
                    reject('timed out waiting for search response');
                }, 600000);
            });

            await page.waitFor(1000);

            // search for plans
            await page.click('.sv3-save-control__search button');

            // check if recaptcha is displayed
            const isRecaptchaSpawned = await page.$('div #recaptchaChallengeContainer') !== null && 
                await page.$eval('div #recaptchaChallengeContainer', e => { const style = window.getComputedStyle(e); return style && style.display !== 'none' && style.visibility !== 'hidden'});

            if (isRecaptchaSpawned) {
                await page.close();
                reject('got recaptcha :/');
            } else {
                const plansData = await resultPromise;

                await page.close();
                resolve(plansData);
            }
        } catch (err) {
            console.error(err);
            reject(err);
        }
    })();
});

const scrapeSpecificPlanDetails = (planId) => new Promise((resolve, reject) => {
    request('https://mavat.iplan.gov.il/rest/api/SV4/1?pid=' + planId, { json: true }, (err, res, body) => {
        if (err) {
            reject(err);
        } else {
            resolve(body);
        }
    });
});

exports.initBrowser = initBrowser;
exports.destroyBrowser = destroyBrowser;
exports.getAllMavatPlans = getAllMavatPlans;
exports.scrapeSpecificPlanDetails = scrapeSpecificPlanDetails;
