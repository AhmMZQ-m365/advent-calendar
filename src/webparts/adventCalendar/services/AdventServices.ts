import { AdminService } from './AdminService';
import { AssetService } from './AssetService';
import { DefaultContentService } from './DefaultContentService';
import { UiLanguage } from './locale';
import { OpenedDaysStore } from './OpenedDaysStore';
import { PermissionService } from './PermissionService';
import { ListResolver, SPFI } from './pnp';
import { ProvisioningService } from './ProvisioningService';
import { PublicationService } from './PublicationService';
import { SecurityService } from './SecurityService';
import { SettingsService } from './SettingsService';
import { ViewsService } from './ViewsService';

export interface IAdventServices {
  /** Langue de l'interface (fr / en) : langue du contenu de démonstration affiché et importé. */
  language: UiLanguage;
  provisioning: ProvisioningService;
  permissions: PermissionService;
  publications: PublicationService;
  settings: SettingsService;
  admins: AdminService;
  security: SecurityService;
  assets: AssetService;
  openedDays: OpenedDaysStore;
  defaultContent: DefaultContentService;
  views: ViewsService;
}

export interface IAdventServicesContext {
  language: UiLanguage;
  webServerRelativeUrl: string;
  /** Default language of the site (e.g. fr-FR): receives a translation of the list titles. */
  webLanguageName: string;
  webId: string;
  userLoginName: string;
}

export function createAdventServices(sp: SPFI, context: IAdventServicesContext): IAdventServices {
  const lists = new ListResolver(sp, context.webServerRelativeUrl);
  const publications = new PublicationService(lists);
  const assets = new AssetService(sp);
  return {
    language: context.language,
    provisioning: new ProvisioningService(sp, lists, { language: context.language, webLanguageName: context.webLanguageName }),
    permissions: new PermissionService(sp),
    publications,
    settings: new SettingsService(lists),
    admins: new AdminService(sp, lists),
    security: new SecurityService(sp, lists),
    assets,
    openedDays: new OpenedDaysStore(context.webId, context.userLoginName),
    defaultContent: new DefaultContentService(publications, assets, context.language),
    views: new ViewsService(lists)
  };
}
