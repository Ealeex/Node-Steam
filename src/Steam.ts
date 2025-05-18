import Winreg from "winreg";
import os from 'os';
import path from 'path';
import { promises as fs } from 'fs';
import { parse } from 'vdf-parser';

interface Library {
    path: string;
    label: string;
    contentid: number;
    totalsize: number;
    update_clean_bytes_tally: number;
    time_last_update_verified: number;
    apps: { [app_id: string]: [size_on_disk: number] };
}

interface App {
    appid: number;
    universe: number;
    LauncherPath: string;
    name: string;
    StateFlags: number;
    installdir: string;
    LastUpdated: number;
    LastPlayed: number;
    SizeOnDisk: number;
    StagingSize: number;
    buildid: number;
    LastOwner: number;
    DownloadType: number;
    UpdateResult: number;
    BytesToDownload: number;
    BytesDownloaded: number;
    BytesToStage: number;
    BytesStaged: number;
    TargetBuildID: number;
    AutoUpdateBehavior: number;
    AllowOtherDownloadsWhileRunning: number;
    ScheduledAutoUpdate: number;
    InstalledDepots: any;
    UserConfig: any;
    MountedConfig: any;
}

export class Steam {

    platform = os.platform();
    steamPath: string | null = null;

    static async initialize() {
        const instance = new Steam();
        instance.steamPath = await instance.getSteamInstallPath();
        return instance;
    }

    async loadLibraryVDF(): Promise<Library[]> {
        if (!this.steamPath) throw new Error("Error: Steam path not found.");
        let libraryVDFPath = path.join(this.steamPath, 'steamapps', 'libraryfolders.vdf');
        let libraryVDF = await parse(await fs.readFile(libraryVDFPath, { encoding: 'utf-8' }));
        return Object.values(libraryVDF['libraryfolders']);
    }

    async fetchAppManifest(libraryPath: string): Promise<string[]> {
        return (await fs.readdir(path.join(libraryPath, 'steamapps')))
            .filter(manifest => manifest.includes('appmanifest_'))
            .map(manifest => path.join(libraryPath, 'steamapps', manifest));
    }

    async loadAppACF(manifestPath: string): Promise<App> {
        let appACF = await parse(await fs.readFile(manifestPath, { encoding: 'utf-8' }));
        return appACF['AppState'];
    }

    async getInstalledApps(): Promise<App[]> {
        try {
            const libraries = await this.loadLibraryVDF();
            const installedApps: App[] = [];
            for (const library of libraries) {
                const manifestPaths = await this.fetchAppManifest(library.path);
                for (const manifestPath of manifestPaths) {
                    const app = await this.loadAppACF(manifestPath);
                    if(app) installedApps.push(app);
                }
            }
            return installedApps;
        } catch (err) {
            throw err;
        }
    }

    async getSteamInstallPath(): Promise<string | null> {
        try {
            switch (this.platform) {
                case 'win32': return await this.getSteamInstallPath_Windows();
                case 'linux': return await this.getSteamInstallPath_Linux();
                default: return null;
            }
        } catch (err) {
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
                } catch (_) { }
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