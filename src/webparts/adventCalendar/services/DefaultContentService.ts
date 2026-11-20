import { buildDemoPublications, demoIllustrationFileName } from '../defaults/demo/demoContent';
import { AssetService } from './AssetService';
import { getErrorMessage } from './format';
import { UiLanguage } from './locale';
import { PublicationService } from './PublicationService';

/** Dossier de « Ressources du site » (Site Assets) qui reçoit les illustrations importées. */
const DEMO_ASSETS_FOLDER = 'AdventCalendarDemo';

export interface IImportResult {
  created: number;
  skipped: number;
  /** Publications créées sans illustration (copie dans Ressources du site impossible). */
  imagesFailed: number;
  /** Première erreur rencontrée lors de la copie d'une illustration. */
  imageError: string | undefined;
}

/**
 * Import du contenu de démonstration (defaults/demo/demoContent.ts) dans la liste AdventPublications,
 * pour une édition donnée, afin de pouvoir le modifier dans l'administration.
 * - Les jours qui ont déjà une publication (publiée ou brouillon) ne sont pas modifiés.
 * - L'illustration de chaque jour créé est copiée dans Ressources du site / AdventCalendarDemo
 *   (`day-01.svg`…, fichier de même nom écrasé : le dossier est réservé au contenu de démonstration,
 *   et un nouvel import garde des URL stables) ; `AdvImage` pointe vers cette copie, car l'URL du
 *   fichier dans le package de l'app change à chaque version.
 * - Si la copie d'une illustration échoue, la publication est créée sans image (bandeau généré) et
 *   l'échec est compté dans le résultat.
 */
export class DefaultContentService {
  public constructor(
    private readonly _publications: PublicationService,
    private readonly _assets: AssetService,
    /** Langue du contenu importé (langue de l'interface de l'administrateur qui importe). */
    private readonly _language: UiLanguage
  ) {}

  public async importDemo(year: number, onProgress: (done: number, total: number) => void): Promise<IImportResult> {
    const existing = await this._publications.getByYear(year, false);
    const usedDays = new Set(existing.map((publication) => publication.day));
    const demo = buildDemoPublications(year, this._language);
    const result: IImportResult = { created: 0, skipped: 0, imagesFailed: 0, imageError: undefined };

    for (let index = 0; index < demo.length; index++) {
      const publication = demo[index];
      if (usedDays.has(publication.day)) {
        result.skipped++;
      } else {
        let imageUrl: string | undefined;
        try {
          imageUrl = await this._copyIllustration(publication.day, publication.imageUrl);
        } catch (error) {
          result.imagesFailed++;
          result.imageError = result.imageError ?? getErrorMessage(error);
        }
        await this._publications.save({
          title: publication.title,
          day: publication.day,
          year: publication.year,
          unlockDate: publication.unlockDate,
          imageUrl,
          body: publication.body,
          linkUrl: publication.linkUrl,
          linkText: publication.linkText,
          published: publication.published
        }, undefined);
        result.created++;
      }
      onProgress(index + 1, demo.length);
    }
    return result;
  }

  /** Copie l'illustration du jour (fichier du package de l'app) dans Ressources du site et renvoie sa nouvelle URL. */
  private async _copyIllustration(day: number, sourceUrl: string | undefined): Promise<string | undefined> {
    if (!sourceUrl) {
      return undefined;
    }
    const response = await fetch(sourceUrl, { credentials: 'same-origin' });
    if (!response.ok) {
      throw new Error(`${response.status} ${response.statusText} (${sourceUrl})`);
    }
    const svg = await response.text();
    const content = new Blob([svg], { type: 'image/svg+xml' });
    return this._assets.uploadFile(DEMO_ASSETS_FOLDER, demoIllustrationFileName(day), content);
  }
}
