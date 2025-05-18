import { Steam } from "./Steam.js";

(async()=>{
    console.clear();
    const steam = await Steam.initialize();
    let apps = await steam.getInstalledApps();
    console.log(apps.map(app => ({ appid: app.appid, name: app.name })));
})();
