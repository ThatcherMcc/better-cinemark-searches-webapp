import { useState, useEffect } from 'react';
import { ExtensionScraper } from '../lib/extensionScraper';

export function useExtensionScraper() {
  const [scraper] = useState(() => new ExtensionScraper());
  const [isInstalled, setIsInstalled] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    scraper.checkInstalled().then(installed => {
      setIsInstalled(installed);
      setIsChecking(false);
    });
  }, [scraper]);

  return { scraper, isInstalled, isChecking };
}