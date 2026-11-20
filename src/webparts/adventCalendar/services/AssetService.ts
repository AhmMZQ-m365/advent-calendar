import * as strings from 'AdventCalendarWebPartStrings';
import { format } from './format';
import { isNotFound, SPFI } from './pnp';

const FOLDER_NAME = 'AdventCalendar';
const MAX_IMAGE_SIZE_MB = 5;

/**
 * Upload des images dans « Ressources du site » (Site Assets) / AdventCalendar, et des illustrations
 * du contenu de démonstration dans Site Assets / AdventCalendarDemo (DefaultContentService).
 */
export class AssetService {
  private readonly _folders = new Map<string, Promise<string>>();

  public constructor(private readonly _sp: SPFI) {}

  public validateImage(file: File): string | undefined {
    if (!file.type.startsWith('image/')) {
      return strings.ErrorNotAnImage;
    }
    if (file.size > MAX_IMAGE_SIZE_MB * 1024 * 1024) {
      return format(strings.ErrorImageTooLarge, MAX_IMAGE_SIZE_MB);
    }
    return undefined;
  }

  /** Téléverse l'image et renvoie son URL absolue. */
  public async uploadImage(file: File): Promise<string> {
    const validationError = this.validateImage(file);
    if (validationError) {
      throw new Error(validationError);
    }

    const fileName = `${Date.now()}-${this._safeFileName(file.name)}`;
    return this.uploadFile(FOLDER_NAME, fileName, file);
  }

  /**
   * Téléverse un fichier dans un sous-dossier de « Ressources du site » (créé au besoin), en écrasant
   * un fichier de même nom, et renvoie son URL absolue.
   */
  public async uploadFile(folderName: string, fileName: string, content: Blob): Promise<string> {
    const folderUrl = await this._getFolderUrl(folderName);
    const uploaded = await this._sp.web
      .getFolderByServerRelativePath(folderUrl)
      .files.addUsingPath(fileName, content, { Overwrite: true });
    return new URL(uploaded.ServerRelativeUrl, window.location.origin).toString();
  }

  /** URL relative au serveur du sous-dossier de Ressources du site, créé au premier appel (mis en cache). */
  private _getFolderUrl(folderName: string): Promise<string> {
    let pending = this._folders.get(folderName);
    if (!pending) {
      pending = this._resolveFolder(folderName);
      this._folders.set(folderName, pending);
      // Un échec (droits, réseau) ne reste pas en cache : l'appel suivant réessaie.
      pending.catch(() => this._folders.delete(folderName));
    }
    return pending;
  }

  private async _resolveFolder(folderName: string): Promise<string> {
    const library = await this._sp.web.lists.ensureSiteAssetsLibrary();
    const root = await library.rootFolder.select('ServerRelativeUrl')<{ ServerRelativeUrl: string }>();
    const folderUrl = `${root.ServerRelativeUrl.replace(/\/$/, '')}/${folderName}`;
    await this._ensureFolder(folderUrl);
    return folderUrl;
  }

  private async _ensureFolder(folderUrl: string): Promise<void> {
    try {
      const info = await this._sp.web.getFolderByServerRelativePath(folderUrl).select('Exists')<{ Exists: boolean }>();
      if (info.Exists) {
        return;
      }
    } catch (error) {
      if (!isNotFound(error)) {
        throw error;
      }
    }
    await this._sp.web.folders.addUsingPath(folderUrl);
  }

  private _safeFileName(name: string): string {
    const normalized = name.normalize('NFD').replace(/[̀-ͯ]/g, '');
    return normalized.replace(/[^A-Za-z0-9._-]+/g, '-').replace(/-+/g, '-').slice(-80) || 'image';
  }
}
