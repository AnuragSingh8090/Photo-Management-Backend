import os from 'os';
import path from 'path';
import fs from 'fs';

export const getMediaDataPath = () => {
  // Check if OneDrive is managing the Desktop
  const oneDriveDesktop = path.join(os.homedir(), 'OneDrive', 'Desktop');
  const defaultDesktop = path.join(os.homedir(), 'Desktop');
  
  const desktopPath = fs.existsSync(oneDriveDesktop) ? oneDriveDesktop : defaultDesktop;
  return path.join(desktopPath, 'Media Data');
};
