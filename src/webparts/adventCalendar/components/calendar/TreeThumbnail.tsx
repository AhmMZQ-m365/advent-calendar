import * as React from 'react';
import { IThemeProfile } from '../../models/IThemeProfile';
import { getDefaultEdition } from '../../services/dateUtils';
import { getThemeCssVariables } from '../../services/ThemeService';
import { buildPreviewDoors } from './calendarModel';
import { TreeScene } from './TreeScene';

export interface ITreeThumbnailProps {
  /** Profil (ou modèle converti en profil) à représenter. */
  profile: IThemeProfile;
}

const PREVIEW_DOORS = buildPreviewDoors();

/** Sapin miniature non interactif aux couleurs d'un profil : cartes des profils, modèles et aperçu en direct. */
export const TreeThumbnail: React.FC<ITreeThumbnailProps> = ({ profile }) => {
  const style = React.useMemo(() => getThemeCssVariables(profile) as React.CSSProperties, [profile]);
  return (
    <div style={style}>
      <TreeScene doors={PREVIEW_DOORS} year={getDefaultEdition(new Date())} theme={profile} isPreview />
    </div>
  );
};
