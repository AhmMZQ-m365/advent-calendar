import * as strings from 'AdventCalendarWebPartStrings';
import { IPublication, IPublicationInput, IPublicationItem, IUrlFieldValue } from '../models/IPublication';
import { PUBLICATIONS_LIST } from '../models/listDefinitions';
import { Nullable } from '../models/spTypes';
import { parseSharePointDate } from './dateUtils';
import { format, safeHttpUrl } from './format';
import { sanitizeHtml } from './htmlSanitizer';
import { ListResolver } from './pnp';

const SELECT_FIELDS = ['Id', 'Title', 'AdvDay', 'AdvYear', 'AdvUnlockDate', 'AdvImage', 'AdvBody', 'AdvLink', 'AdvPublished'];

function mapItem(item: IPublicationItem): IPublication {
  return {
    id: item.Id,
    title: item.Title ?? '',
    day: item.AdvDay ?? 0,
    year: item.AdvYear ?? 0,
    unlockDate: parseSharePointDate(item.AdvUnlockDate),
    imageUrl: safeHttpUrl(item.AdvImage?.Url),
    body: item.AdvBody ?? '',
    linkUrl: safeHttpUrl(item.AdvLink?.Url),
    linkText: item.AdvLink?.Description || undefined,
    published: item.AdvPublished === true
  };
}

function urlValue(url: string | undefined, description: string | undefined): Nullable<IUrlFieldValue> {
  return url ? { Url: url, Description: description || url } : null;
}

/** Clé d'unicité (année, jour) portée par la colonne AdvKey, unique et indexée. */
export function publicationKey(year: number, day: number): string {
  return `${year}-${String(day).padStart(2, '0')}`;
}

export class PublicationService {
  public constructor(private readonly _lists: ListResolver) {}

  public async getByYear(year: number, publishedOnly: boolean): Promise<IPublication[]> {
    const filter = publishedOnly ? `AdvYear eq ${year} and AdvPublished eq 1` : `AdvYear eq ${year}`;
    const items = await this._lists.getList(PUBLICATIONS_LIST).items
      .select(...SELECT_FIELDS)
      .filter(filter)
      .orderBy('AdvDay', true)
      .top(100)<IPublicationItem[]>();
    return items.map(mapItem).filter((publication) => publication.day >= 1 && publication.day <= 24);
  }

  /** Crée (id indéfini) ou met à jour une publication, après contrôle d'unicité (année, jour). */
  public async save(input: IPublicationInput, id: number | undefined): Promise<void> {
    const list = this._lists.getList(PUBLICATIONS_LIST);
    const duplicates = await list.items
      .select('Id')
      .filter(`AdvYear eq ${input.year} and AdvDay eq ${input.day}`)
      .top(2)<Array<{ Id: number }>>();
    if (duplicates.some((item) => item.Id !== id)) {
      throw new Error(format(strings.ErrorDuplicateDay, input.day, input.year));
    }

    const payload = {
      Title: input.title.trim(),
      AdvDay: input.day,
      AdvYear: input.year,
      AdvKey: publicationKey(input.year, input.day),
      AdvUnlockDate: input.unlockDate ? input.unlockDate.toISOString() : null,
      AdvImage: urlValue(input.imageUrl, input.title),
      AdvBody: sanitizeHtml(input.body),
      AdvLink: urlValue(input.linkUrl, input.linkText),
      AdvPublished: input.published
    };

    if (id === undefined) {
      await list.items.add(payload);
    } else {
      await list.items.getById(id).update(payload);
    }
  }

  /** Suppression via la corbeille du site (récupérable). */
  public async remove(id: number): Promise<void> {
    await this._lists.getList(PUBLICATIONS_LIST).items.getById(id).recycle();
  }
}
