const async = require('async');

const { initBrowser, destroyBrowser, getAllMavatPlans, scrapeSpecificPlanDetails } = require('./crawler');


const CONCURRENT_PLAN_DETAILS_REQUESTS = 5;


initBrowser().then(browser => {
    getAllMavatPlans(browser)
        .then(plansData => {
            // destroy browser as soon as possible to free up memory and cpu
            destroyBrowser(browser);

            // TODO: filter based on our db and PLAN_ID and UPDATE_DATE fields

            console.log('w00t got plans: ' + plansData.length);
            
            // create a queue for specific plan details requests
            var q = async.queue(function(task, callback) {
                scrapeSpecificPlanDetails(task.planId)
                    .then(planDetails => {
                        console.log('plan details: ' + planDetails.planDetails.NUMB );//JSON.stringify(planDetails)));

                        // mismachei hatochnit
                        planDetails.rsPlanDocs.forEach(doc => {
                            // TODO: download file

                            // doc.ID
                            // doc.FILE_TYPE
                            // doc.DOC_NAME
                            // doc.FILE_DATA.fname

                            console.log('DOC: ' + doc.ID + ' ' + doc.FILE_TYPE + ' ' + doc.DOC_NAME + ' ' + doc.FILE_DATA.fname);
                        });

                        // mismachin nosafim
                        planDetails.tsPlanDocsAdd.forEach(add => {
                            // TODO: download file

                            // add.ID
                            // add.FILE_TYPE
                            // add.DOC_NAME
                            // add.FILE_DATA.fname

                            console.log('DOC ADD: ' + add.ID + ' ' + add.FILE_TYPE + ' ' + add.DOC_NAME + ' ' + add.FILE_DATA.fname);
                        });

                        // hachlatot mosdot tichnun
                        planDetails.rsDes.forEach((des, i) => {
                            // TODO: download all files

                            // des.MEETING_NO
                            console.log('MEETING NO: ' + des.MEETING_NO);

                            // for attachment downloads: https://mavat.iplan.gov.il/rest/api/Attacments/?eid=1000497780571&fn=doc_fbe9dcf7-7352-4e97-860b-028b2738205c.docx&edn=temp-default

                            // seder yom
                            // des.ENTITY_DOC_ID_10
                            // des.FILE_TYPE_10

                            console.log('MEETING SEDER YOM: ' + des.ENTITY_DOC_ID_10 + ' ' + des.FILE_TYPE_10);

                            // mismach hachlatot
                            // des.ENTITY_DOC_ID_110
                            // des.FILE_TYPE_110

                            console.log('MEETING HACHLATOT: ' + des.ENTITY_DOC_ID_110 + ' ' + des.FILE_TYPE_110);

                            // protocol
                            // des.ENTITY_DOC_ID
                            // des.FILE_TYPE

                            console.log('MEETING PROTOCOL: ' + des.ENTITY_DOC_ID + ' ' + des.FILE_TYPE);

                            // tamlil hayeshiva
                            // des.ENTITY_DOC_ID1
                            // des.FILE_TYPE1

                            console.log('MEETING TAMLIL: ' + des.ENTITY_DOC_ID1 + ' ' + des.FILE_TYPE1);

                            // mismachei havaada?
                            // des.
                            // des.

                            // meeting invited
                            // planDetails.rsDesInvited[i]
                        });

                        // nosachei pirsum
                        planDetails.rsPubDocs.forEach(doc => {
                            // TODO: download file

                            // doc.DOC_ID
                            // doc.FILE_TYPE
                            // doc.PLAN_ENTITY_DOC_ID

                            console.log('PUB DOC: ' + doc.DOC_ID + ' ' + doc.FILE_TYPE + ' ' + doc.PLAN_ENTITY_DOC_ID);
                        });

                        // hitnagduiot
                        planDetails.rsOppositions.forEach(opp => {
                            // TODO: download file

                            // opp.OPPONENT_TYPE
                            // opp.OPPONENT_FIRST_NAME
                            // opp.OPPONENT_LAST_NAME
                            // opp.OPPONENT_COMP_NAME
                            // opp.ENTITY_DOC_ID
                            // opp.FILE_TYPE

                            console.log('OPPOSITION: ' + opp.OPPONENT_TYPE + ' ' + opp.OPPONENT_FIRST_NAME + ' ' + opp.OPPONENT_LAST_NAME + ' ' + opp.OPPONENT_COMP_NAME + ' ' + opp.ENTITY_DOC_ID + ' ' + opp.FILE_TYPE);
                        });

                        // TODO: save data to db
                    })
                    .catch(err => console.log('failed to get specific plan details: ' + err))
                    .finally(() => callback());
            }, CONCURRENT_PLAN_DETAILS_REQUESTS);

            q.error(function(err, task) {
                console.error('task "' + task + '" got error: ' + err);
            });

            // do not map to push all tasks because of the amount of tasks :/
            for (const i of Array(3).keys()) {
                q.push({planId: plansData[i].PLAN_ID});
            }

            q.drain(function() {
                console.log('done scraping plans');
                return;
            });
        })
        .catch(err => {
            console.log('boo: ' + err);
            destroyBrowser(browser);
            return;
        });
});
