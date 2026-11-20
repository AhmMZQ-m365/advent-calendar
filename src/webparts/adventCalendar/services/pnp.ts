// Point d'entrée unique pour les imports sélectifs PnPjs (ils enrichissent les objets `sp.web`, `list`…).
import '@pnp/sp/webs';
import '@pnp/sp/lists';
import '@pnp/sp/items';
import '@pnp/sp/fields';
import '@pnp/sp/views';
import '@pnp/sp/folders';
import '@pnp/sp/files';
import '@pnp/sp/security';
import '@pnp/sp/site-users/web';
import '@pnp/sp/site-groups/web';
import '@pnp/sp/profiles';
import '@pnp/sp/content-types';
import '@pnp/sp/batching';

import { IList } from '@pnp/sp/lists';
import { ISPQueryable, SPFI, SPQueryable, spPost } from '@pnp/sp';
import { body } from '@pnp/queryable';
import { IListDefinition } from '../models/listDefinitions';

export type { SPFI };

/** Résout les listes du calendrier par URL (stable) plutôt que par titre (affiché, modifiable). */
export class ListResolver {
  private readonly _webUrl: string;

  public constructor(private readonly _sp: SPFI, webServerRelativeUrl: string) {
    this._webUrl = webServerRelativeUrl.replace(/\/$/, '');
  }

  public listUrl(definition: IListDefinition): string {
    return `${this._webUrl}/Lists/${definition.urlName}`;
  }

  /** `sp`: another SPFI instance, e.g. a batched one (`sp.batched()`). */
  public getList(definition: IListDefinition, sp: SPFI = this._sp): IList {
    return sp.web.getList(this.listUrl(definition));
  }
}

/** Statut HTTP d'une erreur PnPjs (HttpRequestError), si disponible. */
function getHttpStatus(error: unknown): number | undefined {
  if (typeof error === 'object' && error !== null && 'status' in error) {
    const status = (error as { status: unknown }).status;
    return typeof status === 'number' ? status : undefined;
  }
  return undefined;
}

/** Ressource absente : 404, ou FileNotFoundException renvoyée par GetList sur une URL inexistante. */
export function isNotFound(error: unknown): boolean {
  return getHttpStatus(error) === 404
    || (error instanceof Error && error.message.indexOf('System.IO.FileNotFoundException') !== -1);
}

/** Multilingual resources (SP.UserResource) of a list, field or content type. */
export type UserResourceName = 'TitleResource' | 'DescriptionResource' | 'NameResource';

/**
 * Value of a multilingual resource for a UI culture (UserResource.GetValueForUICulture).
 * PnPjs v4 only exposes the read (regional-settings, with a property name bug for content types)
 * and not the write: both are called here through the same typed REST endpoint.
 */
export async function getResourceValue(owner: ISPQueryable, resource: UserResourceName, cultureName: string): Promise<string> {
  const result: unknown = await spPost(SPQueryable(owner, `${resource}/GetValueForUICulture`), body({ cultureName }));
  if (typeof result === 'string') {
    return result;
  }
  // Verbose OData: { GetValueForUICulture: "…" }.
  const value = typeof result === 'object' && result !== null ? (result as Record<string, unknown>).GetValueForUICulture : undefined;
  return typeof value === 'string' ? value : '';
}

/** Sets the translation of a multilingual resource for a UI culture (UserResource.SetValueForUICulture). */
export async function setResourceValue(owner: ISPQueryable, resource: UserResourceName, cultureName: string, value: string): Promise<void> {
  await spPost(SPQueryable(owner, `${resource}/SetValueForUICulture`), body({ cultureName, value }));
}
