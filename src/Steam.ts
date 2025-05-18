import Winreg from "winreg";
import os from 'os';
import path from 'path';
import {promises as fs} from 'fs';

export class Steam {

    platform = os.platform();

    async getSteamInstallPath():Promise<string|null> {
        try {
            switch(this.platform) {
                case 'win32': return await this.getSteamInstallPath_Windows();
                case 'linux': return await this.getSteamInstallPath_Linux();
                default: return null;
            }
        } catch(err) {
            throw new Error("Error: Failed to get Steam install path.");
        }
    }

    getSteamInstallPath_Linux(): Promise<string> {
        return new Promise(async (resolve, reject) => {
            const homeDir = os.homedir();
            const possiblePaths = [
                path.join(homeDir, '.steam', 'steam'),
                path.join(homeDir, '.local', 'share', 'Steam'),
                '/usr/lib/steam',
                '/usr/share/steam'
            ];
            for (const dir of possiblePaths) {
                try {
                    const steamShPath = path.join(dir, 'steam.sh');
                    await fs.access(steamShPath);
                    return resolve(dir);
                } catch (_) {}
            }
            reject(new Error('Steam installation not found on Linux.'));
        });
    }

    getSteamInstallPath_Windows(): Promise<string> {
        return new Promise((resolve, reject) => {
            const regKey = new Winreg({ hive: Winreg.HKLM, key: '\\Software\\WOW6432Node\\Valve\\Steam' });
            regKey.get('InstallPath', (err, item) => {
                if (err) return reject(err);
                if (!item) return reject(new Error('InstallPath registry key not found'));
                resolve(item.value);
            });
        });
    }

}