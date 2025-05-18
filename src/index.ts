import { Steam } from "./Steam.js";

const steam = new Steam();

(async()=>{
    console.log(await steam.getSteamInstallPath());
})();
